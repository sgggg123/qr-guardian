# 주요 버그 수정 기록

> 커밋 `9cb5944`, `3eb0357` 에서 수정한 3가지 핵심 버그

---

## 1. 신뢰 도메인 오탐지 (toss.im, google.com 등이 YELLOW/RED로 뜨던 문제)

### 증상

google.com, toss.im 같은 대형 사이트를 스캔하면 안전(GREEN)이 아니라 주의(YELLOW)나 위험(RED)이 나옴.

### 원인 3가지

**① 결제 폼 오탐**

```python
# 기존: "card"만 포함되면 결제 폼으로 탐지
r'card.*number'
r'credit.*card'
```

HTML `<meta name="twitter:card" ...>` 태그에 "card"가 포함되어, 거의 모든 사이트가 "결제 정보 요청" 플래그를 받음.

**② 신뢰 도메인에 SSL/도메인 경고가 붙음**

Let's Encrypt 인증서를 쓰는 신뢰 도메인(예: toss.im)에 `low_trust_issuer` 경고가 붙어서 YELLOW로 판정됨.

**③ 신뢰 도메인인데도 개인정보/결제 플래그가 WARNING**

네이버, 쿠팡 같은 사이트도 로그인/결제 폼이 있으니 WARNING 플래그 → 위험도 상승.

### 수정 내용

**① 결제 폼 패턴을 `<input>` 태그 안에 있는 것만 탐지하도록 변경**

```python
# 수정 후: HTML input 필드 안에 있는 경우만 탐지
r'<input[^>]*card[^>]*number'
r'name=["\']?card'
r'placeholder=["\']?카드'
```

→ `twitter:card` 메타태그는 더 이상 매칭되지 않음

**② 신뢰 도메인이면 SSL/도메인 risk factor 플래그를 안 붙임**

```python
# scan.py
is_trusted = _is_trusted_domain(final_url)
if not is_trusted:  # ← 신뢰 도메인이면 skip
    for factor in domain_result.get("risk_factors", []):
        all_flags.append(...)
```

**③ 신뢰 도메인의 개인정보/결제 플래그를 INFO로 다운그레이드**

```python
# threat_detector.py
severity=Severity.INFO if is_trusted else Severity.WARNING
message="결제 기능이 있는 페이지입니다" if is_trusted else "결제 정보 입력을 요청하는 페이지입니다"
```

INFO 플래그는 위험도 계산에 영향을 주지 않음 → 신뢰 도메인은 GREEN 유지.

### 수정 파일

- `backend/app/routers/scan.py` — 신뢰 도메인 SSL 플래그 제외
- `backend/app/services/threat_detector.py` — 결제 폼 패턴 수정, 신뢰 도메인 INFO 다운그레이드

---

## 2. 타이포스쿼팅 탐지 버그 (문자 치환이 양방향이라 정상 도메인도 탐지되던 문제)

### 증상

정상적인 도메인인데도 타이포스쿼팅(사칭)으로 오탐되거나, 반대로 실제 사칭 도메인을 놓치는 경우 발생.

### 원인

```python
# 기존: 양방향 매핑 (문제!)
substitutions = {
    'o': '0', '0': 'o',   # o→0 도 매핑, 0→o 도 매핑
    'l': '1', '1': 'l',
    ...
}
```

양방향이면 `google` → `g00gle` 을 잡지만, 정상 도메인도 브랜드와 "치환하면 비슷하다"로 잘못 판정될 수 있음. 또한 문자 1개만 다른 경우만 잡아서, `g00gle` (2글자 다름) 같은 사칭을 놓침.

### 수정 내용

**① 단방향 char_map으로 변경 (가짜 → 진짜)**

```python
# 수정 후: 가짜 문자를 진짜 문자로 정규화
char_map = {
    '0': 'o',   # 숫자 0 → 영문 o
    '1': 'l',   # 숫자 1 → 영문 l
    '3': 'e',   # 숫자 3 → 영문 e
    '$': 's',   # 달러 → s
    '@': 'a',   # 골뱅이 → a
    'rn': 'm',  # rn → m (모양이 비슷)
    'vv': 'w',  # vv → w
    ...
}
```

**② normalize 함수 도입**

도메인과 브랜드 이름 모두 정규화한 뒤 비교:

```python
def normalize(text):
    result = text.lower()
    result = result.replace('rn', 'm').replace('vv', 'w')
    for fake, real in char_map.items():
        if len(fake) == 1:
            result = result.replace(fake, real)
    return result
```

- `g00gle` → normalize → `google` → 브랜드와 일치 → 탐지!
- `google` → normalize → `google` → 자기 자신과 일치 → 정상 (화이트리스트로 통과)

**③ 문자 차이 허용을 1개 → 2개로 확대**

```python
# 정규화 후에도 문자 2개까지 차이나면 의심
diff_count = sum(1 for a, b in zip(normalized_domain, normalized_brand) if a != b)
if diff_count <= 2:
    return True
```

### 수정 파일

- `backend/app/services/threat_detector.py` → `_is_typosquat_variant()`

---

## 3. 리다이렉트 시 원본 URL 타이포스쿼팅 검사 누락

### 증상

`naverr.com` → (리다이렉트) → `naver.com` 으로 연결되는 경우, 최종 URL인 `naver.com`만 검사하므로 타이포스쿼팅을 놓침.

### 원인

기존에는 `final_url`에 대해서만 `analyze_url_structure()`를 호출:

```python
# 기존: final_url만 검사
structure_flags = threat_detector.analyze_url_structure(final_url, domain_info)
```

사칭 도메인이 진짜 사이트로 리다이렉트하는 경우 (피싱의 흔한 수법), 최종 URL은 정상이라 탐지 실패.

### 수정 내용

원본 URL과 최종 URL이 다른 경우, 원본 URL에 대해서도 타이포스쿼팅 검사를 추가:

```python
# scan.py
if url != final_url:
    original_domain_info = url_analyzer.extract_domain_info(url)
    original_flags = threat_detector.analyze_url_structure(url, original_domain_info)
    for flag in original_flags:
        if flag.type == "typosquatting" and flag.type not in [f.type for f in all_flags]:
            all_flags.append(flag)
```

또한 `analyze_url_structure()`에서 신뢰 도메인이면 바로 빈 리스트를 반환하도록 하여, 정상 도메인에 대한 불필요한 검사를 스킵:

```python
# threat_detector.py
def analyze_url_structure(self, url, domain_info):
    if self._is_trusted_domain(domain_info["domain"]):
        return []  # 신뢰 도메인은 검사 불필요
```

### 수정 파일

- `backend/app/routers/scan.py` — 원본 URL 타이포스쿼팅 추가 검사
- `backend/app/services/threat_detector.py` — 신뢰 도메인 검사 스킵

---

## 요약

| # | 버그 | 핵심 원인 | 수정 방향 |
|---|------|-----------|-----------|
| 1 | 신뢰 도메인이 YELLOW/RED | `twitter:card` 오탐 + 신뢰 도메인에 SSL 경고 | 패턴 정밀화 + 신뢰 도메인 플래그 제외/다운그레이드 |
| 2 | 타이포스쿼팅 오탐/미탐 | 양방향 char_map + 1글자 차이만 허용 | 단방향 normalize + 2글자까지 허용 |
| 3 | 리다이렉트 시 사칭 못 잡음 | final_url만 검사 | 원본 URL도 타이포스쿼팅 검사 |
