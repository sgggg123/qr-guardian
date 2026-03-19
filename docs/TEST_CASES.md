# QR Guardian — 탐지 테스트 케이스

> 각 등급별로 어떤 URL이 어떤 결과를 내는지 정리한 문서입니다.
> 직접 앱에 입력해서 결과를 확인할 수 있습니다.

---

## 🟢 GREEN (안전) — 예상 점수 0~2.9점

신뢰 도메인 목록에 등록된 사이트 또는 위협 요소가 없는 URL입니다.

| URL | 이유 |
|-----|------|
| `https://google.com` | 신뢰 도메인, HTTPS, 오래된 도메인 |
| `https://naver.com` | 신뢰 도메인, HTTPS, 오래된 도메인 |
| `https://github.com` | 신뢰 도메인, HTTPS |
| `https://youtube.com` | 신뢰 도메인, HTTPS |
| `https://samsung.com` | 신뢰 도메인, HTTPS |
| `https://kakao.com` | 신뢰 도메인, HTTPS |

---

## 🟡 YELLOW (주의) — 예상 점수 3.0~6.9점

위협은 아니지만 주의가 필요한 특징이 있는 URL입니다.

| URL | 이유 | 예상 점수 |
|-----|------|-----------|
| `http://example.com` | HTTP 사용 (SSL 없음) | SSL 3.0점 |
| `https://bit.ly/3xyz` | 단축 URL — 최종 목적지 불명 | WARNING 플래그 |
| `https://tinyurl.com/abc123` | 단축 URL | WARNING 플래그 |
| 신생 `.xyz` 도메인 | 의심스러운 TLD + 새 도메인 | 3.0~5.0점 |
| `http://some-site.tk` | HTTP + 의심 TLD (.tk) | 5.0점 이상 |

> 단축 URL은 리다이렉트 추적 후 최종 목적지에 따라 RED로 바뀔 수 있습니다.

---

## 🔴 RED (위험) — 예상 점수 7.0점 이상 또는 DANGER 플래그

즉시 위험으로 판정되는 URL입니다.

### 타이포스쿼팅 (브랜드 사칭)

| URL | 사칭 대상 | 탐지 플래그 |
|-----|-----------|------------|
| `https://navar.com` | naver.com | `typosquatting` |
| `https://gooogle.com` | google.com | `typosquatting` |
| `https://paypa1.com` | paypal.com | `typosquatting` |
| `https://arnazon.com` | amazon.com | `typosquatting` |

> 위 도메인들은 실제 접속해도 아무것도 없거나 주차 페이지입니다. 안전하게 테스트 가능합니다.

---

### 악성 파일 확장자

URL 경로에 아래 확장자가 포함되면 즉시 RED입니다.

| URL 패턴 예시 | 탐지 플래그 |
|--------------|------------|
| `http://123.45.67.89/malware.exe` | `malware_extension` + `ip_address` |
| `http://123.45.67.89/payload.sh` | `malware_extension` + `ip_address` |
| `http://site.com/dropper.ps1` | `malware_extension` |
| `http://site.com/installer.msi` | `malware_extension` |

---

### IP 주소 직접 사용 + 비표준 포트

| URL 패턴 예시 | 탐지 플래그 | 예상 점수 |
|--------------|------------|-----------|
| `http://123.45.67.89/` | `ip_address` + HTTP | 5.0점 |
| `http://123.45.67.89:8080/` | `ip_address` + `suspicious_port` + HTTP | 6.5점 |
| `http://123.45.67.89:43575/bin.sh` | 전부 해당 | 8.5점 이상 |

---

### ClearFake / 악성코드 패턴

| URL 패턴 예시 | 탐지 플래그 |
|--------------|------------|
| `https://abc.xyz.in.net/verification.google` | `phishing_pattern` + `suspicious_tld` |
| `https://random.domain.in.net/update-browser` | `phishing_pattern` + `suspicious_tld` |

---

### URLhaus DB 등록 URL

URLhaus(`urlhaus.abuse.ch`)에서 **Online** 상태인 URL을 복사해서 테스트하면 됩니다.

탐지 시 결과 화면에 아래 문구가 표시됩니다:
```
알려진 악성 URL 데이터베이스에 등록된 위협입니다 (ACRStealer, ClearFake)
```

> ⚠️ URLhaus URL은 절대 직접 브라우저로 접속하지 마세요. 앱 입력창에만 붙여넣기 하세요.

---

## 점수 계산 예시

### `http://125.42.232.134:43575/bin.sh`

| 항목 | 점수 |
|------|------|
| HTTP (SSL 없음) | +3.0 |
| IP 주소 사용 | +2.0 |
| 비표준 포트 (43575) | +1.5 |
| 악성 파일 확장자 (.sh) | +3.0 (DANGER → 즉시 RED) |
| **합계** | **RED** |

### `https://navar.com`

| 항목 | 점수 |
|------|------|
| HTTPS 유효 | +0.0 |
| 타이포스쿼팅 (naver 사칭) | +3.0 (DANGER → 즉시 RED) |
| **합계** | **RED** |

### `https://google.com`

| 항목 | 점수 |
|------|------|
| 신뢰 도메인 | 모든 검사 스킵 |
| **합계** | **GREEN** |
