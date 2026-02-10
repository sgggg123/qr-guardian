# QR Guardian 코드 완전 해부

> 이 문서는 QR Guardian의 **모든 소스 파일**을 데이터 흐름 순서대로 설명합니다.
> 코드를 읽으면서 "이 파일이 왜 필요하고, 어떤 순서로 실행되는지"를 이해할 수 있도록 구성했습니다.

---

## 목차

1. [전체 그림 — 사용자 액션부터 응답까지](#1-전체-그림)
2. [Frontend 진입점 — 앱이 켜지는 순간](#2-frontend-진입점)
3. [프론트엔드 레이아웃과 라우팅](#3-프론트엔드-레이아웃과-라우팅)
4. [Home 페이지 — QR 스캔과 URL 입력](#4-home-페이지)
5. [QRScanner 컴포넌트 — 카메라와 이미지 인식](#5-qrscanner-컴포넌트)
6. [API 서비스 — 프론트→백엔드 통신](#6-api-서비스)
7. [Backend 진입점 — FastAPI 앱 설정](#7-backend-진입점)
8. [설정 파일 — 화이트리스트와 환경변수](#8-설정-파일)
9. [스캔 라우터 — 파이프라인의 심장](#9-스캔-라우터)
10. [URL 분석기 — 단축URL과 리다이렉트 추적](#10-url-분석기)
11. [위협 탐지기 — 타이포스쿼팅과 피싱 탐지](#11-위협-탐지기)
12. [Safe Browsing 서비스 — Google 위협 DB 연동](#12-safe-browsing-서비스)
13. [도메인 분석기 — SSL과 WHOIS](#13-도메인-분석기)
14. [요약 생성기 — 자연어 한국어 요약](#14-요약-생성기)
15. [위험도 판정과 응답 조립](#15-위험도-판정과-응답-조립)
16. [Result 페이지 — 결과 표시](#16-result-페이지)
17. [결과 카드 컴포넌트들](#17-결과-카드-컴포넌트들)
18. [신호등 컴포넌트](#18-신호등-컴포넌트)
19. [히스토리 시스템](#19-히스토리-시스템)
20. [알림 시스템 — 효과음과 진동](#20-알림-시스템)
21. [공유 시스템](#21-공유-시스템)
22. [테마 시스템 — 다크/라이트 모드](#22-테마-시스템)
23. [벌크 스캔](#23-벌크-스캔)
24. [URL 신고 기능](#24-url-신고-기능)
25. [QR 코드 생성](#25-qr-코드-생성)
26. [설정 페이지](#26-설정-페이지)
27. [데이터 모델 — Backend Pydantic 스키마](#27-데이터-모델)
28. [데이터 타입 — Frontend TypeScript 타입](#28-데이터-타입)
29. [로깅 시스템](#29-로깅-시스템)
30. [테스트 코드](#30-테스트-코드)
31. [CI/CD 파이프라인](#31-cicd-파이프라인)
32. [빌드 설정 파일들](#32-빌드-설정-파일들)
33. [파일 전체 목록 요약](#33-파일-전체-목록-요약)

---

## 1. 전체 그림

```
사용자가 QR 스캔 또는 URL 입력
        │
        ▼
  ┌──[Frontend]──────────────────────────────────┐
  │ Home.tsx → api.ts → POST /api/scan { url }   │
  └──────────────────────┬───────────────────────┘
                         │ HTTP 요청
                         ▼
  ┌──[Backend]───────────────────────────────────┐
  │ main.py (Rate Limit, CORS)                   │
  │   └→ scan.py (캐시 확인 → 파이프라인 실행)      │
  │        ├→ url_analyzer.py     (리다이렉트 추적)  │
  │        ├→ threat_detector.py  (피싱/타이포 탐지) │
  │        ├→ safe_browsing.py    (Google DB 조회)  │
  │        ├→ domain_analyzer.py  (SSL/WHOIS 분석)  │
  │        ├→ _calculate_risk_level() (GREEN/YELLOW/RED)
  │        └→ summary_generator.py (한국어 요약)    │
  └──────────────────────┬───────────────────────┘
                         │ JSON 응답
                         ▼
  ┌──[Frontend]──────────────────────────────────┐
  │ Home.tsx → 히스토리 저장 → 알림음/진동          │
  │   └→ Result.tsx (신호등 + 요약 + 카드들)       │
  └──────────────────────────────────────────────┘
```

핵심은 **scan.py가 오케스트레이터**라는 것입니다. 5개 서비스를 순서대로 호출하고, 결과를 모아서 위험도를 판정합니다.

---

## 2. Frontend 진입점

### `frontend/src/main.tsx`

```
React 앱의 시작점. 브라우저가 index.html을 로드하면 이 파일이 실행됩니다.
```

**흐름:**
1. `ReactDOM.createRoot()` — DOM의 `#root` 요소에 React를 마운트
2. `<BrowserRouter>` — React Router 활성화 (URL 기반 페이지 전환)
3. `<App />` — 실제 앱 컴포넌트 렌더링

**핵심 개념:**
- `React.StrictMode` — 개발 중 잠재적 문제를 감지 (이중 렌더링으로 사이드이펙트 확인)
- `BrowserRouter` — `history.pushState` API를 사용하여 페이지 새로고침 없이 URL 변경

### `frontend/src/index.css`

TailwindCSS의 3개 레이어를 가져오는 파일:
```css
@tailwind base;       /* 브라우저 기본 스타일 리셋 */
@tailwind components; /* 컴포넌트 클래스 */
@tailwind utilities;  /* 유틸리티 클래스 (bg-*, text-*, p-* 등) */
```

---

## 3. 프론트엔드 레이아웃과 라우팅

### `frontend/src/App.tsx`

```
모든 페이지의 라우팅을 정의합니다.
```

**구조:**
```tsx
<ThemeProvider>          // 다크/라이트 테마 Context
  <Layout>               // 헤더 + 하단 네비 + 컨텐츠 영역
    <Routes>
      <Route path="/" element={<Home />} />           // QR 스캔
      <Route path="/result" element={<Result />} />    // 분석 결과
      <Route path="/history" element={<History />} />  // 스캔 기록
      <Route path="/settings" element={<Settings />} /> // 설정
      <Route path="/generate" element={<Generate />} /> // QR 생성
      <Route path="/bulk" element={<BulkScan />} />    // 벌크 스캔
    </Routes>
  </Layout>
</ThemeProvider>
```

**학습 포인트:**
- `ThemeProvider`가 가장 바깥 → 모든 하위 컴포넌트에서 `useTheme()` 사용 가능
- `Layout`이 `Routes`를 감싸므로 → 헤더와 하단 네비가 모든 페이지에 공통 적용
- `Route`의 `element` prop — React Router v6 방식 (v5에서는 `component` prop이었음)

### `frontend/src/components/Layout.tsx`

```
앱의 전체 레이아웃을 구성합니다: 헤더 + 컨텐츠 + 하단 네비게이션 바
```

**3개 영역:**
1. **Header** (상단 고정) — 방패 아이콘 + "QR Guardian" 텍스트
2. **Main** (스크롤 가능) — `{children}` = 각 페이지 컴포넌트
3. **Bottom Nav** (하단 고정) — 스캔 / 생성 / 기록 / 설정 4개 탭

**학습 포인트:**
- `sticky top-0 z-50` — 스크롤해도 헤더가 상단에 고정
- `fixed bottom-0` — 하단 네비가 항상 아래에 고정
- `pb-24` — 하단 네비에 가려지는 것을 방지하는 패딩
- `useLocation()` — 현재 URL 경로를 읽어서 활성 탭을 하이라이트
- `backdrop-blur-sm` — 글래스모피즘 효과 (배경 블러)
- `dark:` prefix — TailwindCSS 다크 모드 조건부 스타일

**라이트/다크 패턴:**
```
bg-gray-50 dark:bg-slate-900      ← 배경색
text-gray-900 dark:text-white      ← 텍스트 색
border-gray-200 dark:border-slate-700  ← 테두리 색
```
이 패턴이 **모든 컴포넌트에 일관되게** 적용됩니다.

---

## 4. Home 페이지

### `frontend/src/pages/Home.tsx`

```
메인 페이지. QR 스캔 + URL 직접 입력 + 로딩 UI + 에러 표시.
```

**상태(State):**
```tsx
const [isLoading, setIsLoading] = useState(false)    // 스캔 중 여부
const [error, setError] = useState<string | null>(null)  // 에러 메시지
const [manualUrl, setManualUrl] = useState('')        // 입력된 URL
```

**핵심 함수 — `analyzeUrl(url)`:**
```
1. setIsLoading(true)              → 로딩 UI 표시
2. scanUrl(url)                    → Backend API 호출
3. addScanToHistory(response.data) → localStorage에 결과 저장
4. notifyRiskLevel(risk_level)     → 효과음 + 진동
5. navigate('/result', { state })  → Result 페이지로 이동 (데이터 전달)
```

**스켈레톤 로딩 UI:**
`isLoading`이 `true`일 때 전체 화면에 반투명 오버레이가 뜨고, 그 안에 신호등 + 카드 형태의 깜빡이는 placeholder가 표시됩니다:
```
animate-pulse  ← TailwindCSS의 깜빡임 애니메이션
```

**데이터 전달 방식:**
React Router의 `navigate(path, { state })` — URL 파라미터가 아닌 **메모리에 데이터를 실어서** 다음 페이지로 전달합니다. Result 페이지에서 `useLocation().state`로 받습니다.

---

## 5. QRScanner 컴포넌트

### `frontend/src/components/QRScanner.tsx`

```
카메라 실시간 QR 인식 + 이미지 파일 QR 인식을 담당합니다.
```

**사용 라이브러리:** `html5-qrcode` — 브라우저의 `getUserMedia` API를 감싸서 카메라 스트림에서 QR 코드를 인식합니다.

**두 가지 인식 방법:**

| 방법 | 함수 | 원리 |
|------|------|------|
| 카메라 | `startCamera()` | `Html5Qrcode.start()` — 실시간 비디오 프레임을 분석 |
| 이미지 | `handleFileSelect()` | `Html5Qrcode.scanFile()` — 정적 이미지에서 QR 검출 |

**카메라 흐름:**
```
startCamera() → Html5Qrcode.start(facingMode: 'environment')
                → fps: 10으로 초당 10프레임 분석
                → QR 발견 시 onScan(decodedText) 콜백 호출
                → 자동으로 stopCamera()
```

**학습 포인트:**
- `useRef` — DOM 요소 직접 접근 (스캐너 인스턴스, 파일 input)
- `useEffect` 클린업 — 컴포넌트 언마운트 시 카메라 스트림을 반드시 해제
- `facingMode: 'environment'` — 모바일에서 후면 카메라 사용
- `qrbox: { width: 250, height: 250 }` — 인식 영역을 중앙 250x250으로 제한

---

## 6. API 서비스

### `frontend/src/services/api.ts`

```
Backend와의 모든 HTTP 통신을 담당합니다.
```

**API 기본 URL 결정 로직:**
```ts
const rawApiUrl = import.meta.env.VITE_API_URL || PRODUCTION_API
// 1순위: 환경변수 VITE_API_URL (개발 시 localhost:8000)
// 2순위: 프로덕션 Railway URL
```

**5개 함수:**

| 함수 | HTTP | 엔드포인트 | 용도 |
|------|------|-----------|------|
| `scanUrl(url)` | POST | `/api/scan` | URL 보안 분석 |
| `bulkScanUrls(urls)` | POST | `/api/bulk-scan` | 여러 URL 일괄 분석 |
| `reportUrl(url, reason)` | POST | `/api/report` | URL 신고 |
| `getScreenshotUrl(url)` | - | thum.io URL 생성 | 사이트 스크린샷 미리보기 URL |
| `healthCheck()` | GET | `/health` | 서버 상태 확인 |

**에러 처리 패턴:**
```ts
if (!response.ok) {
  const error = await response.json()
  throw new Error(error.detail || '기본 에러 메시지')
}
```
→ `response.ok`는 HTTP 200~299일 때만 `true`. 400, 500 에러는 JSON 바디의 `detail` 필드를 에러 메시지로 사용합니다.

---

## 7. Backend 진입점

### `backend/app/main.py`

```
FastAPI 앱의 모든 설정을 담당합니다. 앱이 시작될 때 한 번 실행됩니다.
```

**실행 순서:**
```python
# 1. 환경 판별
is_production = settings.ENVIRONMENT == "production"

# 2. 로깅 초기화
setup_logging(level="INFO" if is_production else "DEBUG")

# 3. Rate Limiter 생성
limiter = Limiter(key_func=get_remote_address, default_limits=["30/minute"])

# 4. FastAPI 인스턴스 생성
app = FastAPI(
    docs_url=None if is_production else "/api/docs",  # 프로덕션에서 API 문서 비활성화
)

# 5. Rate Limit 초과 핸들러 등록
@app.exception_handler(RateLimitExceeded)

# 6. CORS 설정
app.add_middleware(CORSMiddleware, ...)

# 7. 라우터 등록
app.include_router(scan.router)     # /api/scan
app.include_router(report.router)   # /api/report
app.include_router(bulk.router)     # /api/bulk-scan
```

**CORS 처리의 핵심:**
```python
_exact_origins = ["http://localhost:5173", ...]           # 정확한 도메인
_wildcard_patterns = ["https://*.railway.app", ...]       # 와일드카드 패턴
_origin_regex = "https://.*\\.railway\\.app"              # 정규식으로 변환
```
`allow_origins`에는 정확한 URL만, `allow_origin_regex`에는 패턴을 넣습니다. `*`(와일드카드)를 쓰면 보안 문제가 생기므로 config 기반으로 제한합니다.

**학습 포인트:**
- `Limiter(key_func=get_remote_address)` — 클라이언트 IP 주소 기반으로 요청을 카운팅
- `app.state.limiter = limiter` — FastAPI의 전역 상태에 리미터를 저장 (slowapi 요구사항)
- 프로덕션에서 `docs_url=None` → `/api/docs` 접근 불가 (보안)

---

## 8. 설정 파일

### `backend/app/core/config.py`

```
모든 설정값의 중앙 저장소. 환경변수와 하드코딩된 리스트들을 관리합니다.
```

**pydantic_settings 원리:**
```python
class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    GOOGLE_SAFE_BROWSING_API_KEY: str = ""
    ...
    class Config:
        env_file = ".env"
```
→ 환경변수가 있으면 그 값을 사용하고, 없으면 기본값을 사용합니다. `.env` 파일도 자동 로드합니다.

**4개의 핵심 리스트:**

| 리스트 | 개수 | 용도 | 사용처 |
|--------|------|------|--------|
| `TRUSTED_DOMAINS` | ~90개 | 무조건 GREEN 판정 | scan.py, threat_detector.py |
| `POPULAR_BRANDS` | ~50개 | 타이포스쿼팅 비교 대상 | threat_detector.py |
| `SHORTENER_DOMAINS` | ~30개 | 단축URL 서비스 목록 | url_analyzer.py |
| `SUSPICIOUS_TLDS` | ~16개 | 의심스러운 도메인 확장자 | threat_detector.py |

**TRUSTED_DOMAINS의 서브도메인 매칭:**
`"google.com"`이 등록되면 → `mail.google.com`, `drive.google.com` 등 서브도메인도 자동으로 신뢰됩니다. (scan.py의 `_is_trusted_domain()`에서 `.endswith(".google.com")` 체크)

---

## 9. 스캔 라우터

### `backend/app/routers/scan.py`

```
전체 분석 파이프라인의 오케스트레이터. 이 파일이 시스템의 심장입니다.
```

**인메모리 캐시:**
```python
_scan_cache: dict[str, tuple[float, ScanResponse]] = {}
_CACHE_TTL = 600  # 10분

def _get_cached(key: str) -> ScanResponse | None:
    entry = _scan_cache.get(key)
    if entry and (time.time() - entry[0]) < _CACHE_TTL:
        return entry[1]  # 캐시 히트!
    ...
```
→ 같은 URL을 10분 이내에 다시 스캔하면 캐시된 결과를 즉시 반환합니다. 500개 초과 시 만료된 것들을 정리합니다.

**파이프라인 11단계:**

```
①  URL 기본 검증 + https:// 자동 추가
②  단축 URL 판별                      → shortened_url 플래그
③  리다이렉트 추적 (최대 10회)          → final_url + redirect_chain
④  리다이렉트 횟수 체크                 → multiple_redirects 플래그
⑤  크로스 도메인 리다이렉트 체크         → cross_domain_redirect 플래그
⑥  URL 구조 분석 (최종URL + 원본URL)   → 타이포스쿼팅, 피싱 등 플래그
⑦  페이지 콘텐츠 분석                  → 로그인폼, 개인정보 등 플래그
⑧  Google Safe Browsing 검사          → safe_browsing_threat 플래그
⑨  도메인 분석 (SSL + WHOIS)          → new_domain, expired_cert 등
⑩  위험도 계산 (GREEN/YELLOW/RED)
⑪  자연어 요약 생성
```

**위험도 계산 — `_calculate_risk_level()`:**

```python
# 우선순위 높은 것부터:
1. 신뢰 도메인 + Safe Browsing 안전  → GREEN (즉시 반환)
2. Safe Browsing 위협 감지           → RED
3. DANGER 플래그 존재               → RED
4. 신뢰 점수 30 미만                → RED
5. WARNING 3개 이상 또는 신뢰 점수 60 미만 → YELLOW
6. 유의미한 WARNING 1개 이상          → YELLOW
7. 그 외                            → GREEN
```

**"유의미한 WARNING"이란?**
`suspicious_tld`, `multiple_redirects`, `ip_address`, `payment_form`, `personal_info_request`, `new_domain`, `low_trust_issuer` — 이것들은 실제로 위험 신호이므로 YELLOW로 올립니다. 반면 `shortened_url` 같은 단순 정보성 WARNING은 단독으로는 YELLOW를 트리거하지 않습니다.

**플래그 중복 제거 — `_deduplicate_flags()`:**
같은 `type`의 플래그가 여러 개 있으면 첫 번째만 남깁니다. 예: 원본 URL과 최종 URL 양쪽에서 `typosquatting`이 감지된 경우.

---

## 10. URL 분석기

### `backend/app/services/url_analyzer.py`

```
URL 파싱, 단축URL 판별, 리다이렉트 추적을 담당합니다.
```

**클래스: `URLAnalyzer`**

**`is_shortened_url(url)`:**
```python
domain = urlparse(url).netloc.lower()
return domain in self.shortener_domains  # config의 30개 단축URL과 비교
```
→ `bit.ly`, `han.gl` 등 알려진 단축 URL 서비스인지 단순 비교합니다.

**`resolve_redirects_with_chain(url)` — 핵심 함수:**
```
최대 10회까지 리다이렉트를 따라가며 전체 경로를 기록합니다.

1. httpx.AsyncClient(follow_redirects=False)  ← 수동 추적을 위해 자동 리다이렉트 비활성화
2. HEAD 요청 전송
3. 응답 코드가 301/302/303/307/308이면:
   - Location 헤더에서 다음 URL 추출
   - 상대 경로면 절대 경로로 변환 ("/path" → "https://domain/path")
   - redirect_chain에 {url, status_code, domain} 추가
4. 그 외 코드면 종료
```

**반환값:** `(final_url, redirect_chain, redirect_count)`

**`extract_domain_info(url)` — URL 파싱:**
```python
return {
    "domain": "example.com",      # www. 제거된 도메인
    "tld": ".com",                # 최상위 도메인
    "is_ip": False,               # IP 주소 여부
    "uses_suspicious_port": False, # 비표준 포트 여부
    "path": "/page",              # URL 경로
    "query": "q=test",            # 쿼리 문자열
    "scheme": "https"             # 프로토콜
}
```

**학습 포인트:**
- `httpx.AsyncClient` — Python의 비동기 HTTP 클라이언트 (`requests`의 async 버전)
- `HEAD` 메서드 — 바디 없이 헤더만 가져오므로 빠름 (리다이렉트 추적에 적합)
- `urlparse` — Python 표준 라이브러리의 URL 파서

---

## 11. 위협 탐지기

### `backend/app/services/threat_detector.py`

```
URL 구조 분석과 페이지 콘텐츠 분석으로 위협을 탐지합니다.
시스템에서 가장 복잡한 서비스입니다.
```

**클래스: `ThreatDetector`**

### Part A: URL 구조 분석 — `analyze_url_structure()`

신뢰 도메인이면 빈 리스트를 즉시 반환합니다 (검사 불필요).

**6가지 검사 항목:**

| 순서 | 검사 | 플래그 | 심각도 | 예시 |
|------|------|--------|--------|------|
| 1 | 의심 TLD | `suspicious_tld` | WARNING | `.xyz`, `.tk` |
| 2 | IP 주소 | `ip_address` | WARNING | `192.168.1.1/page` |
| 3 | 비표준 포트 | `suspicious_port` | WARNING | `:8888` |
| 4 | 긴 서브도메인 | `long_subdomain` | WARNING | `a.b.c.d.example.com` |
| 5 | 타이포스쿼팅 | `typosquatting` | **DANGER** | `navar.com` (naver 사칭) |
| 6 | 피싱 패턴 | `phishing_pattern` | **DANGER** | URL에 `secure.*login` 포함 |

### 타이포스쿼팅 탐지 — `_detect_typosquatting()`

**2단계 탐지:**

```
Step 1: 유사도 비교 (SequenceMatcher)
   domain_base = "navar"
   brand = "naver"
   similarity = 0.8  →  threshold(0.7) 이상이므로 의심!

   ※ 브랜드 4자 이하면 threshold를 0.85로 상향 (오탐 방지)
      예: "kakao"(5자) → 0.7, "toss"(4자) → 0.85

Step 2: 문자 치환 패턴 (_is_typosquat_variant)
   char_map으로 정규화 후 비교:
   "g00gle" → normalize → "google" → 브랜드와 일치!
```

**normalize() 함수의 원리:**
```python
# 가짜 문자를 진짜 문자로 변환 (한 방향만!)
'0' → 'o'   (숫자 0을 영문 o로)
'1' → 'l'   (숫자 1을 영문 l로)
'rn' → 'm'  (rn은 m처럼 보이므로)
'vv' → 'w'  (vv는 w처럼 보이므로)
```

**정규화 후 추가 비교:**
- 완전 일치 → 타이포스쿼팅 확정
- 문자 2개 이내 차이 → 타이포스쿼팅 의심
- 문자 1개 추가/삭제 → 타이포스쿼팅 의심

### 피싱 패턴 — `phishing_patterns`

영문 + 한글 합계 **약 60개 정규식 패턴**:
```python
# 영문 (20개)
r"secure.*login", r"account.*verify", ...

# 한글 기본 (9개)
r"본인.*인증", r"계정.*확인", ...

# 택배 사칭 (6개)
r"택배.*조회", r"배송.*확인", ...

# 정부기관 사칭 (8개)
r"국세청.*환급", r"건강보험.*확인", ...

# 금융 사칭 (7개)
r"카드.*결제.*취소", r"해외.*결제.*승인", ...

# 경조사 사칭 (4개)
r"청첩장.*확인", r"돌잔치.*초대", ...
```

### Part B: 콘텐츠 분석 — `analyze_page_content()`

**실제로 URL에 HTTP GET 요청**을 보내서 HTML 바디를 분석합니다.

```python
async with httpx.AsyncClient() as client:
    response = await client.get(url, follow_redirects=True)
    content = response.text.lower()
```

**3가지 콘텐츠 검사:**

| 검사 | 함수 | 원리 |
|------|------|------|
| 로그인 폼 | `_has_login_form()` | `type="password"` input 태그 검색 |
| 개인정보 필드 | `_detect_personal_info_fields()` | 주민번호, 휴대폰, 주소, 생년월일 패턴 |
| 결제 폼 | `_has_payment_form()` | `<input>` 태그 내 card/카드 관련 속성 검색 |

**신뢰 도메인 처리:**
신뢰 도메인(네이버, 쿠팡 등)도 로그인/결제 폼이 있지만, 이건 정상입니다. 그래서 **신뢰 도메인이면 severity를 INFO로 다운그레이드**합니다:
```python
severity=Severity.INFO if is_trusted else Severity.WARNING
```
→ INFO 플래그는 위험도 계산에 영향을 주지 않으므로 GREEN을 유지합니다.

### Part C: 요구 정보 수준 — `determine_info_requirement()`

```
LOW    → 개인정보 요청 없음
MEDIUM → 로그인 정보 요청 (WARNING 이상 플래그 기준)
HIGH   → 결제/개인정보 요청 (WARNING 이상 플래그 기준)
```

---

## 12. Safe Browsing 서비스

### `backend/app/services/safe_browsing.py`

```
Google Safe Browsing API v4 연동. 알려진 악성 URL 데이터베이스를 조회합니다.
```

**두 가지 모드:**

| 모드 | 조건 | 동작 |
|------|------|------|
| API 모드 | `GOOGLE_SAFE_BROWSING_API_KEY` 설정됨 | 실제 Google API 호출 |
| Mock 모드 | API 키 없음 | 하드코딩된 테스트 URL만 감지 |

**API 호출 구조:**
```python
payload = {
    "threatInfo": {
        "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", ...],
        "threatEntries": [{"url": url}]
    }
}
# POST https://safebrowsing.googleapis.com/v4/threatMatches:find?key=...
```
→ 응답에 `matches`가 있으면 해당 URL은 위험합니다.

**Mock 모드의 `is_mock_mode` 프로퍼티:**
```python
@property
def is_mock_mode(self) -> bool:
    return not bool(self.api_key)
```
→ 프론트엔드에서 이 값을 받아 "Safe Browsing API 미연동 상태" 경고를 표시합니다.

**반환값:** `(is_safe: bool, threats: list[str])`
- `True, []` → 안전
- `False, ["악성코드"]` → 위험

---

## 13. 도메인 분석기

### `backend/app/services/domain_analyzer.py`

```
SSL 인증서 분석과 WHOIS 도메인 나이 조회를 담당합니다.
```

**`analyze_domain()` 메인 흐름:**
```
1. domain 추출 (www. 제거)
2. SSL 인증서 분석 (_get_ssl_info)  → 발급기관, 유효기간, 만료 여부
3. SSL 결과로 신뢰 점수 조정 (_adjust_score_for_ssl)
4. WHOIS 도메인 나이 조회 (_get_whois_age)
5. WHOIS 실패 시 SSL 발급일로 fallback
6. 도메인 나이 기반 risk factor 추가
7. 결과 dict 반환
```

**비동기 SSL 분석 — `_get_ssl_info()`:**
```python
reader, writer = await asyncio.wait_for(
    asyncio.open_connection(domain, 443, ssl=ssl_context, server_hostname=domain),
    timeout=5,
)
ssl_object = writer.get_extra_info("ssl_object")
cert = ssl_object.getpeercert()
```
→ 이전에는 동기 `socket.create_connection`이었으나, 비동기로 변환하여 이벤트 루프를 블로킹하지 않습니다.

**인증서 발급기관 신뢰도:**

| 등급 | 발급기관 | 기본 점수 | trust_level |
|------|----------|-----------|-------------|
| 최고 | DigiCert, GlobalSign | 100 | high |
| 높음 | Comodo, Sectigo | 95 | high |
| 중간 | GoDaddy, Amazon | 90 | medium |
| 중간 | Google Trust, Cloudflare | 85 | medium |
| 낮음 | Let's Encrypt | 60 | low |

**신뢰 점수 감점 — `_adjust_score_for_ssl()`:**

| 상황 | 감점 | 플래그 |
|------|------|--------|
| Let's Encrypt (무료) | -15 | `low_trust_issuer` |
| 알 수 없는 발급기관 | -10 | `unknown_issuer` |
| 인증서 만료됨 | -30 | `expired_cert` (DANGER) |
| 30일 이내 만료 예정 | -10 | `expiring_soon` |

**WHOIS 조회 — `_get_whois_age()`:**
```python
import whois
w = whois.whois(domain)
creation_date = w.creation_date  # datetime 또는 list[datetime]
return (datetime.now() - creation_date).days
```
→ 실패 시 `None` 반환 → SSL 발급일로 fallback

**도메인 나이 기반 감점:**
- 30일 미만 → -20점 + `new_domain` (WARNING)
- 90일 미만 → -5점 + `young_domain` (INFO)

---

## 14. 요약 생성기

### `backend/app/services/summary_generator.py`

```
분석 결과를 한국어 2~3문장으로 요약합니다. 템플릿 기반입니다.
```

**3단계 구성:**
```
_build_verdict()   → "이 사이트는 위험할 수 있습니다."
_build_details()   → "'naver'을 사칭하는 것으로 의심됩니다."
_build_guide()     → "절대 로그인하거나 개인정보를 입력하지 마세요."

→ 3개를 공백으로 합침 → 하나의 자연스러운 문단
```

**1단계 — 판정문 (`_build_verdict`):**

| 조건 | 출력 |
|------|------|
| GREEN + 신뢰 도메인 | "Google 공식 사이트입니다. 안심하고 이용하셔도 됩니다." |
| GREEN + 일반 | "특별한 위험 요소가 발견되지 않았습니다." |
| YELLOW | "일부 주의가 필요한 요소가 발견되었습니다." |
| RED | "이 사이트는 위험할 수 있습니다." |

`_friendly_domain("google.com")` → `"Google"` (첫 글자 대문자)

**2단계 — 위협 상세 (`_build_details`):**

가장 위험한 것부터 순서대로 문장을 추가합니다:
```
typosquatting → phishing → safe_browsing → expired_cert
→ shortened_url + cross_domain → new_domain + low_trust_issuer
→ suspicious_tld → ip_address → personal_info → payment_form
```

조합 패턴도 있습니다:
- `shortened_url` + `cross_domain_redirect` → "단축 URL 뒤에 여러 사이트를 거쳐 연결됩니다."
- `new_domain` + `low_trust_issuer` → "최근 만들어진 사이트이며 무료 인증서를 사용합니다."

**3단계 — 행동 가이드 (`_build_guide`):**

| 조건 | 출력 |
|------|------|
| GREEN | "정상적으로 이용 가능합니다." |
| YELLOW | "개인정보 입력 시 주의하세요." |
| RED + 타이포스쿼팅/피싱 | "절대 로그인하거나 개인정보를 입력하지 마세요." |
| RED + Safe Browsing | "이 사이트에 접속하지 않는 것을 권장합니다." |

---

## 15. 위험도 판정과 응답 조립

scan.py의 파이프라인 마지막 부분입니다.

**응답 조립 순서:**
```python
# 1. SSL 정보를 SSLInfo Pydantic 모델로 변환
ssl_info_data = SSLInfo(issuer=..., valid_from=..., ...)

# 2. 도메인 분석 결과를 DomainAnalysis 모델로 변환
domain_analysis_data = DomainAnalysis(domain=..., ssl_info=ssl_info_data, ...)

# 3. 리다이렉트 체인을 RedirectHop 모델 리스트로 변환
redirect_chain_data = [RedirectHop(url=..., status_code=..., domain=...) for ...]

# 4. 최종 ScanResponse 조립
response = ScanResponse(
    status="success",
    data=ScanData(
        original_url=..., final_url=..., risk_level=...,
        summary=..., flags=..., info_requirement=...,
        safe_browsing=SafeBrowsingResult(is_safe=..., threats=..., mock_mode=...),
        domain_analysis=..., redirect_chain=...
    )
)

# 5. 캐시에 저장
_set_cache(url, response)
```

---

## 16. Result 페이지

### `frontend/src/pages/Result.tsx`

```
분석 결과를 시각적으로 표시하는 핵심 페이지입니다.
```

**데이터 수신:**
```tsx
const location = useLocation()
const scanData = location.state?.scanData as ScanData | undefined
if (!scanData) return <Navigate to="/" replace />  // 데이터 없으면 홈으로
```

**화면 구성 (위에서 아래로):**
```
1. 신호등 (TrafficLight)
2. 자연어 요약 카드 (summary)
3. URL 정보 (UrlInfo)
4. 위험 요소 목록 (FlagsList)
5. 요구 정보 수준 (InfoRequirementCard)
6. Safe Browsing 결과 (SafeBrowsingCard)
7. 도메인 분석 (DomainAnalysisCard)
8. 리다이렉트 경로 (RedirectChainCard)
9. 사이트 스크린샷 미리보기
10. 액션 버튼들
```

**스크린샷 미리보기:**
```tsx
<img src={getScreenshotUrl(scanData.final_url)} />
// → https://image.thum.io/get/width/600/crop/400/{encoded_url}
```
→ thum.io 외부 서비스가 해당 URL의 스크린샷을 찍어서 이미지로 반환합니다. 직접 접속하지 않고도 사이트 모습을 확인할 수 있습니다.

**액션 버튼들:**

| 버튼 | 동작 |
|------|------|
| URL 열기 | `window.open(url, '_blank', 'noopener,noreferrer')` + 확인 대화상자 |
| 복사 | `navigator.clipboard.writeText(url)` |
| 공유 | Web Share API (모바일) 또는 클립보드 복사 |
| 신고 | `reportUrl(url)` API 호출 |
| 다시 스캔 | 홈으로 이동 |

GREEN일 때는 "URL 열기" 버튼이 초록색, 그 외에는 "위험을 감수하고 열기"로 회색 표시됩니다.

---

## 17. 결과 카드 컴포넌트들

### `frontend/src/components/ResultCard.tsx`

```
6개의 컴포넌트를 하나의 파일에서 export합니다.
```

**1) `FlagCard` (내부 전용)**
— 단일 플래그를 severity별 색상 카드로 표시
```
info    → 파란색 배경/테두리/아이콘
warning → 노란색
danger  → 빨간색
```

**2) `UrlInfo`**
— 원본 URL과 최종 URL을 표시. 두 URL이 같으면 하나만 표시합니다.

**3) `FlagsList`**
— `FlagCard`를 리스트로 렌더링. flags 배열이 비면 `null` 반환 (아무것도 렌더링 안 함).

**4) `InfoRequirementCard`**
— LOW(초록)/MEDIUM(노란)/HIGH(빨강) 뱃지 + 감지된 입력 필드 목록

**5) `SafeBrowsingCard`**
— 방패 아이콘으로 안전/위험 표시. **mock_mode일 때 노란색 경고 배너:**
```
"Safe Browsing API 미연동 상태 (제한된 검사만 수행)"
```

**6) `DomainAnalysisCard`**
— 신뢰 점수 게이지 바 (0~100), 도메인 나이, SSL 발급기관, 인증서 신뢰도 뱃지, 만료 경고

**7) `RedirectChainCard`**
— 리다이렉트 경로를 단계별로 시각화 (번호 + 도메인 + HTTP 상태코드). 2회 이상이면 경고 메시지 표시.

---

## 18. 신호등 컴포넌트

### `frontend/src/components/TrafficLight.tsx`

```
GREEN/YELLOW/RED를 실제 신호등 모양으로 표시합니다.
```

**구조:**
```
세로 원형 컨테이너 (bg-gray-100 dark:bg-slate-800)
  ├─ RED 원    (활성 시 bg-risk-red + 글로우 + 펄스)
  ├─ YELLOW 원 (활성 시 bg-risk-yellow + 글로우 + 펄스)
  └─ GREEN 원  (활성 시 bg-risk-green + 글로우 + 펄스)
```

비활성 원은 `bg-gray-300 dark:bg-slate-700` (회색).
활성 원은 색상 + `shadow-lg` + `animate-pulse-slow` (3초 주기 깜빡임).

아래에 텍스트 라벨: "안전" / "주의" / "위험" + 설명문.

---

## 19. 히스토리 시스템

### `frontend/src/services/scanHistory.ts`

```
localStorage에 스캔 기록을 저장하고 관리합니다.
```

**저장 구조:**
```typescript
interface ScanHistoryItem {
  id: string              // 고유 ID (timestamp + random)
  url: string             // 원본 URL
  finalUrl: string        // 최종 URL
  riskLevel: RiskLevel    // GREEN/YELLOW/RED
  trustScore: number | null
  scannedAt: string       // ISO 날짜
  scanData?: ScanData     // 전체 분석 데이터 (최근 20건만)
}
```

**용량 관리:**
- 최대 50건 저장 (FIFO — 새 것이 앞에, 오래된 것 삭제)
- 최근 20건만 `scanData` 전체를 저장 (상세 재열람용)
- 21번째부터는 `scanData`를 제거하여 localStorage 용량 절약
- `localStorage`가 가득 차면 20건으로 줄이고 `scanData`를 전부 제거

### `frontend/src/pages/History.tsx`

**통계 표시:**
- 전체/오늘/이번 주 스캔 수
- 안전/주의/위험 비율 바 (색상 분할된 수평 게이지)

**리스트 표시:**
- 각 항목: 위험도 뱃지 + 신뢰도 점수 + URL + 시간 (상대 시간: "5분 전", "3일 전")
- `scanData`가 있는 항목 → 클릭 시 Result 페이지로 이동하여 상세 재열람
- `scanData`가 없는 항목 → 클릭 불가 (화살표 아이콘 미표시)
- 개별 삭제 (X 버튼) + 전체 삭제

---

## 20. 알림 시스템

### `frontend/src/services/notifications.ts`

```
위험도별 효과음과 진동 패턴을 재생합니다.
```

**효과음 — Web Audio API:**
```
GREEN  → 800Hz, 1000Hz (높은 차임음, sine 파형)    → 기분 좋은 소리
YELLOW → 600Hz, 400Hz  (중간 경고음, square 파형)  → 긴장감
RED    → 300Hz, 200Hz, 300Hz (낮은 경보음, square) → 위험!
```

**원리:**
```javascript
const oscillator = audioContext.createOscillator()
oscillator.frequency.value = 800  // 주파수 설정
oscillator.type = 'sine'          // 파형: sine(부드러움) / square(날카로움)
```

**진동 — Vibration API:**
```
GREEN  → [100]               → 짧은 한 번
YELLOW → [100, 50, 100]      → 두 번 (50ms 쉬고)
RED    → [200, 100, 200, 100, 200] → 세 번
```

**설정 저장:** `localStorage` 키 `qr-guardian-notifications`에 `{ sound: true, vibration: true }` 저장

---

## 21. 공유 시스템

### `frontend/src/services/share.ts`

```
분석 결과를 텍스트로 만들어 공유합니다.
```

**공유 텍스트 생성 — `generateShareText()`:**
```
[QR Guardian 분석 결과]

🔴 위험도: 위험

이 사이트는 위험할 수 있습니다. 'naver'을 사칭하는 것으로 의심됩니다.

원본 URL: https://navar.com
신뢰 점수: 45/100
도메인: navar.com

탐지된 위험 요소:
🔴 'naver' 브랜드를 사칭하는 것으로 의심됩니다
---
QR Guardian으로 검사됨
```

**공유 방법 (우선순위):**
1. `navigator.share()` — 모바일 네이티브 공유 시트 (카카오톡, 문자 등으로 직접 공유)
2. `navigator.clipboard.writeText()` — 클립보드 복사 (데스크톱)
3. `document.execCommand('copy')` — 구형 브라우저 fallback

---

## 22. 테마 시스템

### `frontend/src/contexts/ThemeContext.tsx`

```
React Context API를 사용하여 다크/라이트 테마를 전역 관리합니다.
```

**초기화 순서:**
```
1. localStorage에서 저장된 테마 확인
2. 없으면 시스템 설정 확인 (prefers-color-scheme)
3. 기본값: dark
```

**테마 적용 원리:**
```tsx
document.documentElement.classList.add(theme)
// → <html class="dark"> 또는 <html class="light">
```
TailwindCSS의 `darkMode: 'class'` 설정과 연동:
- `<html class="dark">` → `dark:bg-slate-900` 클래스가 적용됨
- `<html class="light">` → `dark:` prefix 무시, 기본 스타일만 적용

**사용 방법:**
```tsx
const { toggleTheme, isDark } = useTheme()
```

---

## 23. 벌크 스캔

### `backend/app/routers/bulk.py`

```
여러 URL을 한번에 병렬 스캔합니다.
```

**핵심:** `asyncio.gather`로 최대 20개 URL을 **동시에** 스캔합니다.
```python
results = await asyncio.gather(*[_scan_one(u) for u in urls])
```
→ 각 URL은 기존 `scan_url()` 함수를 그대로 재사용합니다. 하나가 실패해도 다른 것에 영향 없음.

**Rate limit:** 5회/분 (일반 스캔의 30회/분보다 엄격)

### `frontend/src/pages/BulkScan.tsx`

- textarea에 URL을 줄바꿈으로 입력
- 최대 20개 제한 (초과 시 에러 메시지)
- 결과: 각 URL별 위험도 뱃지(안전/주의/위험) + 요약

---

## 24. URL 신고 기능

### `backend/app/routers/report.py`

```
의심스러운 URL을 신고받아 인메모리 리스트에 저장합니다.
```

**저장소:** `_reports: list[dict]` — 최대 1000건 (FIFO)

**두 개 엔드포인트:**

| 엔드포인트 | 용도 |
|-----------|------|
| `POST /api/report` | URL + 사유를 접수 (10회/분 제한) |
| `GET /api/reports/stats` | 총 신고 수 + 가장 많이 신고된 URL top 10 |

→ 현재는 인메모리이므로 서버 재시작 시 데이터가 사라집니다. 향후 DB 연동 필요.

---

## 25. QR 코드 생성

### `frontend/src/pages/Generate.tsx`

```
URL을 입력하면 QR 코드 이미지를 생성합니다.
```

**사용 라이브러리:** `qrcode.react`의 `QRCodeSVG`

```tsx
<QRCodeSVG value={url} size={200} level="H" includeMargin={true} />
```
- `level="H"` — 에러 정정 수준 High (QR 코드의 30%가 손상되어도 인식 가능)

**다운로드 원리:**
```
1. SVG 요소를 XMLSerializer로 문자열화
2. Image 객체에 SVG를 data URI로 로드
3. Canvas에 그리기 (512x512, 흰 배경)
4. canvas.toDataURL('image/png')로 PNG 변환
5. 가상 <a> 태그의 download 속성으로 다운로드 트리거
```

**클립보드 복사:**
```
Canvas → toBlob() → navigator.clipboard.write(ClipboardItem)
```

---

## 26. 설정 페이지

### `frontend/src/pages/Settings.tsx`

```
테마 토글 + 알림 설정 + 알림 테스트를 제공합니다.
```

**3개 섹션:**

| 섹션 | 기능 |
|------|------|
| 테마 | 다크/라이트 토글 스위치 (useTheme 연동) |
| 알림 | 효과음 ON/OFF + 진동 ON/OFF (각각 토글 시 테스트 재생) |
| 알림 테스트 | 안전/주의/위험 버튼 → 해당 위험도의 소리+진동 테스트 |

**토글 스위치 UI:**
```tsx
<button className={`w-12 h-6 rounded-full ${enabled ? 'bg-primary-600' : 'bg-gray-300'}`}>
  <span className={`w-4 h-4 rounded-full bg-white ${enabled ? 'left-7' : 'left-1'}`} />
</button>
```
→ CSS transition으로 흰 원이 좌우로 슬라이드합니다.

---

## 27. 데이터 모델

### `backend/app/models/schemas.py`

```
Backend의 모든 요청/응답 데이터 구조를 Pydantic 모델로 정의합니다.
```

**핵심 모델 관계도:**
```
ScanRequest { url }
    ↓
ScanResponse
  ├─ status: "success"
  └─ data: ScanData
       ├─ original_url, final_url
       ├─ risk_level: RiskLevel (GREEN | YELLOW | RED)
       ├─ summary: str
       ├─ flags: List[Flag]
       │     └─ { type, severity: Severity, message }
       ├─ info_requirement: InfoRequirement
       │     └─ { level: LOW|MEDIUM|HIGH, evidence: [] }
       ├─ safe_browsing: SafeBrowsingResult
       │     └─ { is_safe, threats: [], mock_mode }
       ├─ domain_analysis?: DomainAnalysis
       │     ├─ domain, domain_age_days, trust_score
       │     ├─ ssl_info?: SSLInfo { issuer, valid_from, ... }
       │     └─ risk_factors: []
       └─ redirect_chain?: List[RedirectHop]
              └─ { url, status_code, domain }
```

**벌크/신고 모델:**
```
BulkScanRequest  { urls: List[str] }
BulkScanResponse { status, results: List[BulkScanItem] }
ReportRequest    { url, reason }
ReportResponse   { status, message }
```

**Pydantic의 역할:**
- 요청 바디 자동 검증 (타입이 안 맞으면 422 에러)
- 응답 JSON 자동 직렬화 (Python 객체 → JSON)
- OpenAPI 문서 자동 생성 (`/api/docs`)

---

## 28. 데이터 타입

### `frontend/src/types/index.ts`

```
Backend schemas.py와 1:1 대응하는 TypeScript 인터페이스입니다.
```

**Python ↔ TypeScript 매핑:**

| Python (schemas.py) | TypeScript (index.ts) |
|---------------------|----------------------|
| `class RiskLevel(str, Enum)` | `type RiskLevel = 'GREEN' \| 'YELLOW' \| 'RED'` |
| `class Flag(BaseModel)` | `interface Flag { type, severity, message }` |
| `Optional[DomainAnalysis]` | `domain_analysis?: DomainAnalysis` |
| `List[str]` | `string[]` |

→ 양쪽의 필드명과 타입을 **항상 동기화**해야 합니다. 한쪽만 바꾸면 런타임 에러가 발생합니다.

---

## 29. 로깅 시스템

### `backend/app/core/logging.py`

```
구조화된 JSON 형식으로 로그를 출력합니다.
```

**JSONFormatter 출력 예시:**
```json
{
  "timestamp": "2026-02-09T12:34:56.789Z",
  "level": "INFO",
  "logger": "qr_guardian.scan",
  "message": "Scan completed",
  "url": "https://example.com",
  "risk_level": "GREEN",
  "duration_ms": 1234
}
```

**네임스페이스:** `qr_guardian.scan`, `qr_guardian.bulk`, `qr_guardian.report` 등

**노이즈 억제:**
```python
logging.getLogger("httpx").setLevel(logging.WARNING)     # httpx 디버그 로그 숨김
logging.getLogger("uvicorn.access").setLevel(logging.WARNING) # 요청 로그 숨김
```

---

## 30. 테스트 코드

### `backend/tests/test_summary_generator.py` (11건)

요약 생성기의 regression 테스트. 각 시나리오별 출력 키워드를 검증합니다:
```python
def test_green_trusted():
    result = generate_summary(risk_level="GREEN", is_trusted=True, ...)
    assert "공식 사이트" in result
    assert "안심" in result
```

### `backend/tests/test_scan_api.py` (12건)

FastAPI TestClient로 `/api/scan` 엔드포인트를 테스트합니다:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_scan_google():
    response = client.post("/api/scan", json={"url": "https://google.com"})
    assert response.status_code == 200
    assert response.json()["data"]["risk_level"] == "GREEN"
```

### `backend/tests/test_threat_detector.py` (26건)

위협 탐지의 정확도를 검증합니다:
- 타이포스쿼팅 탐지 (true positive): `navar.com` → naver 감지
- 타이포스쿼팅 미탐지 (true negative): `google.com` → 정상
- 피싱 패턴 매칭
- URL 구조 분석 (IP 주소, 의심 TLD 등)

---

## 31. CI/CD 파이프라인

### `.github/workflows/ci.yml`

```
GitHub Actions로 push/PR 시 자동으로 테스트를 실행합니다.
```

**3개 Job:**

```
backend (Python 3.11)
  → pip install → py_compile (문법 검사) → import 테스트 → pytest

frontend (Node.js 20)
  → npm ci → tsc --noEmit (타입 검사) → npm run build (빌드 성공 확인)

docker (backend + frontend 완료 후)
  → Docker 이미지 빌드 테스트
```

**트리거:** `main` 또는 `dev` 브랜치에 push/PR

---

## 32. 빌드 설정 파일들

### `frontend/tailwind.config.js`

```javascript
darkMode: 'class',    // HTML에 'dark' 클래스가 있을 때 dark: prefix 적용
```

**커스텀 색상:**
```javascript
primary: { 50~900 }   // 파란 계열 메인 색상
risk: {
  green: '#22c55e',    // 안전 신호등 색
  yellow: '#eab308',   // 주의 신호등 색
  red: '#ef4444',      // 위험 신호등 색
}
```

**커스텀 애니메이션:**
- `pulse-slow` — 3초 주기 깜빡임 (신호등에 사용)
- `scan-line` — 스캔 라인 이동 (QR 스캐너에 사용)

### `frontend/vite.config.ts`

Vite 빌드 도구 설정. React 플러그인을 등록합니다.

### `frontend/tsconfig.json`

TypeScript 컴파일러 설정. `strict: true`로 엄격한 타입 체크를 적용합니다.

### `backend/requirements.txt`

Python 의존성 목록:
```
fastapi, uvicorn    — 웹 서버
httpx               — 비동기 HTTP 클라이언트
pydantic-settings   — 환경변수 기반 설정
slowapi              — Rate Limiting
python-whois        — WHOIS 도메인 조회
pytest, httpx[http2] — 테스트
```

---

## 33. 파일 전체 목록 요약

### Backend (19개 .py 파일)

| 파일 | 한 줄 설명 |
|------|-----------|
| `app/main.py` | FastAPI 앱 설정 (CORS, Rate Limit, 라우터 등록) |
| `app/core/config.py` | 환경변수 + 화이트리스트/브랜드 목록 |
| `app/core/logging.py` | JSON 구조화 로깅 |
| `app/models/schemas.py` | Pydantic 데이터 모델 (요청/응답 스키마) |
| `app/routers/scan.py` | 스캔 파이프라인 오케스트레이터 + 캐시 |
| `app/routers/bulk.py` | 벌크 스캔 (asyncio.gather 병렬) |
| `app/routers/report.py` | URL 신고 (인메모리 저장) |
| `app/services/url_analyzer.py` | 단축URL 판별 + 리다이렉트 추적 |
| `app/services/threat_detector.py` | 타이포스쿼팅 + 피싱 + 콘텐츠 분석 |
| `app/services/safe_browsing.py` | Google Safe Browsing API 연동 |
| `app/services/domain_analyzer.py` | SSL 인증서 + WHOIS 도메인 나이 |
| `app/services/summary_generator.py` | 한국어 자연어 요약 생성 |
| `tests/test_scan_api.py` | API 통합 테스트 (12건) |
| `tests/test_summary_generator.py` | 요약 생성기 테스트 (11건) |
| `tests/test_threat_detector.py` | 위협 탐지 테스트 (26건) |
| `app/__init__.py` | (빈 파일 — 패키지 선언) |
| `app/core/__init__.py` | (빈 파일) |
| `app/models/__init__.py` | (빈 파일) |
| `app/routers/__init__.py` | (빈 파일) |
| `app/services/__init__.py` | (빈 파일) |

### Frontend (17개 .tsx/.ts 파일)

| 파일 | 한 줄 설명 |
|------|-----------|
| `src/main.tsx` | React 앱 진입점 (BrowserRouter 설정) |
| `src/App.tsx` | 라우팅 정의 (6개 페이지) |
| `src/components/Layout.tsx` | 전체 레이아웃 (헤더 + 하단 네비) |
| `src/components/QRScanner.tsx` | 카메라/이미지 QR 인식 |
| `src/components/TrafficLight.tsx` | 신호등 UI |
| `src/components/ResultCard.tsx` | 결과 카드 6종 |
| `src/pages/Home.tsx` | 메인 페이지 (스캔 + URL 입력) |
| `src/pages/Result.tsx` | 분석 결과 표시 |
| `src/pages/History.tsx` | 스캔 기록 + 통계 |
| `src/pages/Settings.tsx` | 테마/알림 설정 |
| `src/pages/Generate.tsx` | QR 코드 생성 |
| `src/pages/BulkScan.tsx` | 벌크 URL 검사 |
| `src/services/api.ts` | Backend API 통신 |
| `src/services/scanHistory.ts` | localStorage 히스토리 관리 |
| `src/services/notifications.ts` | 효과음 + 진동 |
| `src/services/share.ts` | 결과 공유 |
| `src/contexts/ThemeContext.tsx` | 다크/라이트 테마 Context |
| `src/types/index.ts` | TypeScript 타입 정의 |
| `src/vite-env.d.ts` | Vite 환경변수 타입 선언 (자동 생성) |
| `src/index.css` | TailwindCSS 3개 레이어 import |

### 인프라 (주요 설정 파일)

| 파일 | 용도 |
|------|------|
| `.github/workflows/ci.yml` | GitHub Actions CI/CD |
| `frontend/tailwind.config.js` | TailwindCSS 테마 + 다크모드 |
| `frontend/vite.config.ts` | Vite 빌드 설정 |
| `frontend/tsconfig.json` | TypeScript 컴파일러 설정 |
| `backend/requirements.txt` | Python 의존성 |
| `frontend/postcss.config.js` | PostCSS 설정 (TailwindCSS 플러그인 등록) |
| `frontend/tsconfig.node.json` | Vite용 TypeScript 설정 |
| `frontend/package.json` | npm 의존성 + 스크립트 |
| `backend/Dockerfile` | Backend 컨테이너 |
| `frontend/Dockerfile` | Frontend 컨테이너 |
| `docker-compose.yml` | 프로덕션 Docker 구성 |
| `docker-compose.dev.yml` | 개발용 Docker 구성 |
| `railway.json` | Railway 배포 설정 |
