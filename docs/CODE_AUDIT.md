# QR Guardian — 코드 감사 보고서

> **작성일**: 2026-02-21
> **최종 업데이트**: 2026-02-23 (PWA 아이콘 PNG 수정, Railway BACKEND_CORS_ORIGINS 크래시 수정)
> **감사 대상**: 전체 소스코드 (백엔드 + 프론트엔드)
> **목적**: 기능 정상 동작 확인 · 활성/비활성 코드 분리 · 백-프론트 연결 상태 점검

---

## 1. 프로젝트 개요

**QR Guardian**은 QR 코드로 추출한 URL의 악성 여부를 분석하는 보안 스캐너 웹 애플리케이션이다.

| 항목 | 내용 |
|------|------|
| **백엔드** | FastAPI (Python 3.12) |
| **프론트엔드** | React 18 + TypeScript (Vite 빌드) |
| **배포** | Railway (백엔드: `qr-guardianbackend-production.up.railway.app`, 프론트엔드: 별도 서비스) |
| **AI 요약** | Google Gemini API (`gemini-2.5-flash`, SDK: `google-genai`) |
| **위협 DB** | Google Safe Browsing API |
| **개발 목적** | QR 코드를 통한 피싱·악성 URL 피해 방지 |

---

## 2. 전체 시스템 상태 요약

| 시스템 | 상태 | 비고 |
|--------|------|------|
| 백엔드 API 서버 | ✅ 정상 | FastAPI + Uvicorn, Railway 배포 |
| 프론트엔드 SPA | ✅ 정상 | React + Vite, Railway 배포 |
| CORS 설정 | ✅ 정상 | Railway 와일드카드 패턴 포함 |
| URL 스캔 엔드포인트 | ✅ 정상 | `/api/scan` |
| 대량 스캔 엔드포인트 | ✅ 정상 | `/api/bulk-scan` |
| URL 신고 엔드포인트 | ✅ 정상 | `/api/report` |
| Google Safe Browsing | ✅ 정상 | API 키 설정됨 |
| Google Gemini AI 요약 | ✅ 정상 | SDK: google-genai / 모델: gemini-2.5-flash / 동작 검증 완료 |
| 레이트 리미터 | ✅ 정상 | slowapi, IP 기반 |
| 스캔 캐시 | ✅ 정상 | 인메모리 TTL 10분 |
| 다크모드 | ✅ 정상 | localStorage 연동 |
| 알림음/진동 | ✅ 정상 | Web Audio API / Vibration API |
| QR 카메라 스캔 | ✅ 정상 | html5-qrcode |
| QR 이미지 붙여넣기 | ✅ 정상 | jsQR (Ctrl+V) |
| QR 코드 생성 | ✅ 정상 | qrcode.react |
| 스캔 히스토리 | ✅ 정상 | localStorage 기반 |
| 공유 기능 | ✅ 정상 | Web Share API / 클립보드 복사 |

---

## 3. 백엔드 코드 현황

### 3-1. 엔트리포인트 및 인프라

#### `backend/app/main.py`
- **역할**: FastAPI 앱 초기화, CORS 미들웨어, 라우터 등록
- **상태**: ✅ 활성
- **핵심 로직**:
  - CORS: `_exact_origins` + `_origin_regex` 분리 처리 (Railway `*.up.railway.app` 와일드카드 포함)
  - 레이트리미터 예외 핸들러 등록
  - 프로덕션 환경에서 Swagger docs 비활성화
  - `/health`, `/` 엔드포인트

```
GET  /health   → {"status": "healthy"}
GET  /         → {"name": "QR Guardian API", "version": "1.0.0"}
```

---

#### `backend/app/core/config.py`
- **역할**: 환경변수 기반 전역 설정 (`pydantic-settings`)
- **상태**: ✅ 활성
- **주요 설정값**:

| 설정 | 기본값 | 용도 |
|------|--------|------|
| `GOOGLE_SAFE_BROWSING_API_KEY` | `""` | Safe Browsing API |
| `GEMINI_API_KEY` | `""` | Gemini AI 요약 |
| `BACKEND_CORS_ORIGINS` | localhost + Railway | CORS 허용 도메인 |
| `MAX_REDIRECTS` | 10 | 리다이렉트 최대 추적 수 |
| `REQUEST_TIMEOUT` | 10.0초 | HTTP 요청 타임아웃 |
| `SUSPICIOUS_TLDS` | 14개 | 의심 TLD 목록 |
| `SHORTENER_DOMAINS` | 45개+ | 단축 URL 도메인 목록 |
| `POPULAR_BRANDS` | 50개+ | 타이포스쿼팅 탐지용 브랜드 |
| `TRUSTED_DOMAINS` | 100개+ | 신뢰 도메인 화이트리스트 |

---

#### `backend/app/core/logging.py`
- **역할**: JSON 구조화 로깅 (`get_logger()`, `setup_logging()`)
- **상태**: ✅ 활성 — 모든 서비스 모듈에서 사용

#### `backend/app/core/rate_limiter.py`
- **역할**: IP 기반 글로벌 레이트리미터 인스턴스
- **상태**: ✅ 활성 — 모든 라우터에 적용

---

### 3-2. 데이터 모델

#### `backend/app/models/schemas.py`
- **역할**: 요청/응답 Pydantic 스키마 정의
- **상태**: ✅ 활성

| 스키마 | 용도 |
|--------|------|
| `ScanRequest` | `POST /api/scan` 요청 |
| `ScanResponse` / `ScanData` | 스캔 결과 응답 |
| `BulkScanRequest` / `BulkScanResponse` | 대량 스캔 |
| `ReportRequest` / `ReportResponse` | URL 신고 |
| `DomainAnalysis`, `SSLInfo`, `RedirectHop` | 도메인 분석 세부항목 |
| `RiskBreakdownItem` | 위험도 점수 세부항목 |
| `Flag`, `Severity`, `RiskLevel` | 위협 플래그 |

---

### 3-3. API 라우터

#### `backend/app/routers/scan.py` — `POST /api/scan`
- **역할**: 단일 URL 보안 스캔의 메인 오케스트레이터
- **상태**: ✅ 활성
- **레이트리밋**: 30회/분
- **캐시**: 인메모리 TTL 10분 (최대 500개)

**스캔 처리 흐름**:
```
1. URL 유효성 검증 + 캐시 확인
2. 단축 URL 감지 (45개 도메인 DB)
3. 리다이렉트 체인 추적 (최대 10홉)
4. URL 구조 분석 (타이포스쿼팅, 피싱 패턴 등)
5. 페이지 콘텐츠 분석 (로그인폼, 결제폼, 개인정보 요청)
6. Google Safe Browsing API 검사
7. 도메인 분석 (SSL, WHOIS 나이, 신뢰점수)
8. 위험도 점수 합산 (0.0 ~ 10.0)
9. 자연어 요약 생성 (템플릿 기반)
10. AI 요약 생성 (Gemini API, 선택사항)
11. 응답 캐싱 + 반환
```

**위험도 점수 구성요소**:

| 요소 | 최대 점수 | 기준 |
|------|----------|------|
| SSL 상태 | 3.0 | HTTP=3.0, 만료=2.0, 저신뢰=1.0 |
| 도메인 나이 | 4.0 | 30일 미만=4.0, 90일 미만=2.0, 1년 미만=1.0 |
| WHOIS 실패 | 1.0 | 조회 불가 시 |
| Safe Browsing | 2.0 | 위협 DB 등록 시 |
| URL 패턴 | 3.0 | 타이포스쿼팅=3.0, 피싱패턴=3.0 |

**위험 등급 결정 기준**:

| 등급 | 조건 |
|------|------|
| 🟢 GREEN | 신뢰 도메인 + Safe Browsing 통과, 또는 점수 < 3.0 |
| 🟡 YELLOW | 점수 3.0~4.0 또는 경고 플래그 |
| 🔴 RED | 점수 ≥ 7.0, Safe Browsing 위협, 타이포스쿼팅, 피싱패턴 |

---

#### `backend/app/routers/bulk.py` — `POST /api/bulk-scan`
- **역할**: 최대 20개 URL 병렬 스캔
- **상태**: ✅ 활성
- **레이트리밋**: 5회/분
- **병렬 처리**: `asyncio.gather()` 사용

---

#### `backend/app/routers/report.py` — `POST /api/report`, `GET /api/reports/stats`
- **역할**: 사용자 URL 신고 접수 + 통계
- **상태**: ✅ 활성
- **저장**: `backend/data/reports.json` (최대 1000건, FIFO)

---

### 3-4. 서비스 레이어

#### `backend/app/services/ai_summarizer.py`
- **역할**: Google Gemini API로 한국어 AI 요약 + 행동 수칙 생성
- **상태**: ✅ 활성 (2026-02-21 Claude → Gemini 전환, SDK 최신화)
- **SDK**: `google-genai` (구 `google-generativeai` deprecated → 교체 완료)
- **모델**: `gemini-2.5-flash` (gemini-2.0-flash Free Tier 소진 이슈로 교체)
- **설정**: `GEMINI_API_KEY` 없으면 graceful skip (템플릿 요약으로 자동 폴백)
- **출력**: `{"ai_summary": "...", "action_guidelines": ["수칙1", ...]}`

---

#### `backend/app/services/url_analyzer.py`
- **역할**: URL 파싱, 리다이렉트 추적, 도메인 정보 추출
- **상태**: ✅ 활성
- **주요 기능**:
  - `is_shortened_url()`: 단축 URL 도메인 45개+ 검사
  - `resolve_redirects_with_chain()`: 리다이렉트 전체 체인 + 상태코드 추적
  - `extract_domain_info()`: 도메인, TLD, IP 여부, 포트 추출

---

#### `backend/app/services/threat_detector.py`
- **역할**: URL 구조 + 페이지 콘텐츠 위협 탐지
- **상태**: ✅ 활성
- **탐지 항목**:

| 탐지 유형 | 방법 |
|----------|------|
| 의심 TLD | 14개 목록 비교 |
| IP 직접 접근 | 정규식 (IPv4) |
| 비표준 포트 | URL 파싱 |
| 긴 서브도메인 | 문자 길이 임계값 |
| 타이포스쿼팅 | 유사도 70~85% + 문자치환 패턴 |
| 피싱 URL 패턴 | 정규식 95개 (한국어 + 영어) |
| 로그인 폼 | 페이지 HTML 분석 |
| 결제 폼 | 페이지 HTML 분석 |
| 개인정보 요청 | 페이지 HTML 분석 |

---

#### `backend/app/services/safe_browsing.py`
- **역할**: Google Safe Browsing API v4로 URL 위협 확인
- **상태**: ✅ 활성 (API 키 설정됨)
- **탐지 위협 유형**: MALWARE, SOCIAL_ENGINEERING, UNWANTED_SOFTWARE, POTENTIALLY_HARMFUL_APPLICATION
- **키 미설정 시**: 항상 안전으로 처리 (graceful degradation)

---

#### `backend/app/services/domain_analyzer.py`
- **역할**: SSL 인증서 분석 + WHOIS 도메인 나이 조회 + 신뢰점수 계산
- **상태**: ✅ 활성
- **SSL 신뢰등급**:

| 발급기관 | 신뢰점수 |
|----------|---------|
| DigiCert, Comodo, GlobalSign 등 | 100 |
| Let's Encrypt | 80 |
| ZeroSSL | 70 |
| 기타 | 60 |

---

#### `backend/app/services/summary_generator.py`
- **역할**: 템플릿 기반 한국어 자연어 요약 생성 (AI 미설정 시 기본 요약)
- **상태**: ✅ 활성
- **구성**: 판정문 + 위협 상세 + 행동 안내

---

## 4. 프론트엔드 코드 현황

### 4-1. 핵심 인프라

#### `frontend/src/main.tsx`
- **역할**: React 앱 진입점, BrowserRouter 마운트
- **상태**: ✅ 활성

#### `frontend/src/App.tsx`
- **역할**: 라우팅 정의, ThemeProvider + Layout 래핑
- **상태**: ✅ 활성
- **라우트**:

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | `Home` | QR 스캔 메인 |
| `/result` | `Result` | 스캔 결과 |
| `/history` | `History` | 스캔 히스토리 |
| `/settings` | `Settings` | 설정 |
| `/generate` | `Generate` | QR 생성 |
| `/bulk` | `BulkScan` | 대량 스캔 |
| `/help` | `Help` | 도움말 + 데모 |

#### `frontend/src/types/index.ts`
- **역할**: 전체 TypeScript 타입 정의 (백엔드 스키마와 1:1 대응)
- **상태**: ✅ 활성

---

### 4-2. 서비스 레이어

#### `frontend/src/services/api.ts`
- **역할**: 백엔드 HTTP 통신 전담
- **상태**: ✅ 활성
- **엔드포인트 매핑**:

| 함수 | 메서드 | 경로 |
|------|--------|------|
| `scanUrl()` | POST | `/api/scan` |
| `bulkScanUrls()` | POST | `/api/bulk-scan` |
| `reportUrl()` | POST | `/api/report` |
| `healthCheck()` | GET | `/health` |
| `getScreenshotUrl()` | — | microlink.io 외부 서비스 |

- **API URL 결정 로직**: `VITE_API_URL` 환경변수 → 없으면 `https://qr-guardianbackend-production.up.railway.app` 폴백

#### `frontend/src/services/scanHistory.ts`
- **역할**: 스캔 히스토리 localStorage 관리
- **상태**: ✅ 활성
- **기능**: 최대 50개 저장, 최근 20개는 전체 데이터, 그 이전은 요약만 보관

#### `frontend/src/services/notifications.ts`
- **역할**: 위험도별 알림음 + 진동 피드백
- **상태**: ✅ 활성
- **알림음 주파수**: GREEN 800~1000Hz / YELLOW 600~400Hz / RED 300~200Hz

#### `frontend/src/services/share.ts`
- **역할**: 스캔 결과 공유 (Web Share API / 클립보드 복사)
- **상태**: ✅ 활성

---

### 4-3. 페이지 컴포넌트

#### `frontend/src/pages/Home.tsx`
- **역할**: QR 카메라 스캔 + URL 수동 입력 + 이미지 붙여넣기(Ctrl+V)
- **상태**: ✅ 활성
- **사용 서비스**: `api.ts`, `scanHistory.ts`, `notifications.ts`
- **로딩 UI**: 7단계 진행 메시지 + 퍼센트 프로그레스 바 + 단계 인디케이터 (2026-02-21 개선)

#### `frontend/src/pages/Result.tsx`
- **역할**: 스캔 결과 전체 표시
- **상태**: ✅ 활성
- **표시 항목**:
  - TrafficLight (위험 등급)
  - URL 정보, 플래그 목록
  - 정보 민감도 레벨
  - Safe Browsing 결과
  - 도메인 분석 (SSL, 나이, 신뢰점수, 위험 분석 표)
  - 리다이렉트 체인
  - **분석 요약 카드** (AI 요약 우선 표시, 없으면 템플릿 폴백 / AI 뱃지 구분)
  - **행동 수칙** (Gemini 설정 시)
  - 웹사이트 미리보기 (microlink.io)
  - 신고 버튼, 공유 버튼, 열기 버튼

#### `frontend/src/pages/Generate.tsx`
- **역할**: URL → QR 코드 생성 + PNG 다운로드
- **상태**: ✅ 활성

#### `frontend/src/pages/History.tsx`
- **역할**: 스캔 히스토리 목록 + 통계 (총계, 오늘, 이번주, 등급별 비율)
- **상태**: ✅ 활성

#### `frontend/src/pages/BulkScan.tsx`
- **역할**: 최대 20개 URL 일괄 스캔 UI
- **상태**: ✅ 활성

#### `frontend/src/pages/Help.tsx`
- **역할**: 사용법 안내 + 데모 URL 3개 실시간 스캔
- **상태**: ✅ 활성

#### `frontend/src/pages/Settings.tsx`
- **역할**: 다크모드, 알림음, 진동 설정
- **상태**: ✅ 활성

---

### 4-4. UI 컴포넌트

#### `frontend/src/components/Layout.tsx`
- **역할**: 상단 헤더 + 하단 네비게이션 바 (스캔 / QR생성 / 히스토리 / 설정)
- **상태**: ✅ 활성

#### `frontend/src/components/QRScanner.tsx`
- **역할**: 카메라 QR 스캔 + 파일 업로드 QR 디코딩
- **상태**: ✅ 활성 (html5-qrcode 라이브러리)

#### `frontend/src/components/ResultCard.tsx`
- **역할**: 결과 표시용 서브컴포넌트 모음
- **상태**: ✅ 활성
- **제공 컴포넌트**:
  - `FlagCard`, `FlagsList`: 위협 플래그 표시
  - `UrlInfo`: 원본/최종 URL 표시
  - `InfoRequirementCard`: 정보 민감도 등급
  - `SafeBrowsingCard`: Safe Browsing 결과
  - `DomainAnalysisCard`: 도메인 분석 세부정보
  - `RedirectChainCard`: 리다이렉트 체인 시각화

#### `frontend/src/components/TrafficLight.tsx`
- **역할**: 신호등 방식 위험도 시각화 (sm / md / lg 사이즈)
- **상태**: ✅ 활성

#### `frontend/src/contexts/ThemeContext.tsx`
- **역할**: 다크/라이트 테마 전역 상태 관리
- **상태**: ✅ 활성

---

## 5. 백엔드 ↔ 프론트엔드 연결 상태

### API 연결 맵

```
[프론트엔드]                      [백엔드]
─────────────────────────────────────────────────────────
Home.tsx
  └─ scanUrl()               →  POST /api/scan
       └─ api.ts                  └─ scan.py
                                      ├─ url_analyzer.py
                                      ├─ threat_detector.py
                                      ├─ safe_browsing.py
                                      ├─ domain_analyzer.py
                                      ├─ summary_generator.py
                                      └─ ai_summarizer.py

BulkScan.tsx
  └─ bulkScanUrls()          →  POST /api/bulk-scan
       └─ api.ts                  └─ bulk.py

Result.tsx
  └─ reportUrl()             →  POST /api/report
       └─ api.ts                  └─ report.py
```

### 데이터 흐름 (스캔 결과)

```
백엔드 ScanData 필드           프론트엔드 표시 위치
──────────────────────────────────────────────────
risk_level          →  TrafficLight 컴포넌트
summary             →  Result.tsx 요약 섹션
flags               →  FlagsList 컴포넌트
safe_browsing       →  SafeBrowsingCard 컴포넌트
domain_analysis     →  DomainAnalysisCard 컴포넌트
redirect_chain      →  RedirectChainCard 컴포넌트
risk_score          →  도메인 분석 카드
risk_breakdown      →  위험도 세부항목 테이블
ai_summary          →  Result.tsx AI 요약 카드
action_guidelines   →  Result.tsx 행동 수칙 목록
info_requirement    →  InfoRequirementCard 컴포넌트
```

**연결 상태**: ✅ 모든 필드 정상 연결 확인. 백엔드 스키마와 프론트엔드 타입(`types/index.ts`) 완전 일치.

---

## 6. 활성 코드 vs 비활성(더미) 코드 분리

### 6-1. 백엔드 코드

| 파일 | 상태 | 비고 |
|------|------|------|
| `app/main.py` | ✅ 활성 | 앱 진입점 |
| `app/core/config.py` | ✅ 활성 | 전체에서 참조 |
| `app/core/logging.py` | ✅ 활성 | 전체 모듈에서 사용 |
| `app/core/rate_limiter.py` | ✅ 활성 | 모든 라우터 적용 |
| `app/models/schemas.py` | ✅ 활성 | 요청/응답 전체 |
| `app/routers/scan.py` | ✅ 활성 | 핵심 엔드포인트 |
| `app/routers/bulk.py` | ✅ 활성 | 대량 스캔 |
| `app/routers/report.py` | ✅ 활성 | 신고 기능 |
| `app/services/ai_summarizer.py` | ✅ 활성 | Gemini AI |
| `app/services/url_analyzer.py` | ✅ 활성 | 리다이렉트 추적 |
| `app/services/threat_detector.py` | ✅ 활성 | 위협 탐지 |
| `app/services/safe_browsing.py` | ✅ 활성 | Safe Browsing |
| `app/services/domain_analyzer.py` | ✅ 활성 | 도메인 분석 |
| `app/services/summary_generator.py` | ✅ 활성 | 템플릿 요약 |

**더미(비활성) 백엔드 코드: 없음** — 모든 백엔드 파일이 실제 로직에서 호출됨.

---

### 6-2. 프론트엔드 코드

| 파일 | 상태 | 비고 |
|------|------|------|
| `src/main.tsx` | ✅ 활성 | React 진입점 |
| `src/App.tsx` | ✅ 활성 | 라우터 |
| `src/types/index.ts` | ✅ 활성 | 타입 정의 |
| `src/services/api.ts` | ✅ 활성 | API 통신 |
| `src/services/scanHistory.ts` | ✅ 활성 | 히스토리 |
| `src/services/notifications.ts` | ✅ 활성 | 알림음/진동 |
| `src/services/share.ts` | ✅ 활성 | 공유 |
| `src/pages/Home.tsx` | ✅ 활성 | 메인 페이지 |
| `src/pages/Result.tsx` | ✅ 활성 | 결과 페이지 |
| `src/pages/Generate.tsx` | ✅ 활성 | QR 생성 |
| `src/pages/History.tsx` | ✅ 활성 | 히스토리 |
| `src/pages/BulkScan.tsx` | ✅ 활성 | 대량 스캔 |
| `src/pages/Help.tsx` | ✅ 활성 | 도움말/데모 |
| `src/pages/Settings.tsx` | ✅ 활성 | 설정 |
| `src/components/Layout.tsx` | ✅ 활성 | 내비게이션 |
| `src/components/QRScanner.tsx` | ✅ 활성 | 카메라 스캔 |
| `src/components/ResultCard.tsx` | ✅ 활성 | 결과 카드 |
| `src/components/TrafficLight.tsx` | ✅ 활성 | 위험도 표시 |
| `src/contexts/ThemeContext.tsx` | ✅ 활성 | 테마 |

**더미(비활성) 프론트엔드 코드: 없음** — 라우트에 등록된 모든 페이지가 실제 기능을 가짐.

---

### 6-3. 개발 중 제거된 코드 (히스토리)

| 항목 | 이전 상태 | 현재 상태 |
|------|----------|----------|
| `anthropic` 패키지 | requirements.txt에 포함 | 제거됨 (2026-02-21) |
| `CLAUDE_API_KEY` 설정 | config.py에 존재 | `GEMINI_API_KEY`로 교체 |
| Claude 기반 ai_summarizer | 활성 | Gemini로 전환 완료 |
| `google-generativeai` 패키지 | requirements.txt에 포함 | deprecated → `google-genai`로 교체 (2026-02-21) |
| Gemini 모델 | `gemini-2.0-flash` | `gemini-2.5-flash`로 교체 (Free Tier 소진 이슈) |
| 로딩 UI | 스피너 + 고정 텍스트 | 7단계 메시지 + 퍼센트 프로그레스 바 (2026-02-21) |
| 요약 카드 구조 | 템플릿 카드 + AI 카드 별도 2개 | 하나의 카드로 통합 (AI 우선, 템플릿 폴백) |

---

## 7. 발견된 이슈 목록

### 🔴 주의 (보안)

| # | 위치 | 이슈 | 영향 |
|---|------|------|------|
| 1 | `report.py:87-114` | `/api/reports/stats` 엔드포인트에 인증 없음 | 누구나 신고 통계 열람 가능 |

---

### 🟡 경미 (기능/성능)

| # | 위치 | 이슈 | 영향 |
|---|------|------|------|
| 2 | `scan.py:39-43` | 캐시 정리가 500개 초과 시에만 발생 | 고트래픽 시 메모리 증가 가능 |
| 3 | `domain_analyzer.py` | WHOIS 결과 캐싱 없음 | 동일 도메인 반복 조회 시 지연 |
| 4 | `url_analyzer.py` | IPv6 주소 탐지 불가 | IPv6 기반 악성 URL 미탐지 |
| 5 | `App.tsx` | React Error Boundary 없음 | 컴포넌트 오류 시 빈 화면 |
| 6 | `api.ts:4` | 프로덕션 백엔드 URL 하드코딩 | 배포 환경 변경 시 수동 수정 필요 |

---

### 🟢 참고 (개선 가능)

| # | 위치 | 이슈 |
|---|------|------|
| 7 | `report.py` | 신고 데이터를 JSON 파일에 저장 (규모 확장 시 DB 필요) |
| 8 | `config.py` | 신뢰 도메인 목록 하드코딩 (동적 갱신 불가) |
| 9 | `scanHistory.ts` | localStorage 기반으로 기기/브라우저 간 동기화 불가 |
| 10 | `Result.tsx` | 단일 파일 내 로직 집중 (서브컴포넌트 분리 권장) |
| 11 | `threat_detector.py` | 정규식 패턴 95개 (대규모 트래픽 시 컴파일 캐싱 권장) |
| 12 | `BulkScan.tsx` | 빈 줄도 URL로 전송될 수 있음 |
| 13 | `ai_summarizer.py` | 모델명 하드코딩 (`gemini-1.5-flash`) — config로 이동 권장 |
| 14 | `share.ts` | `document.execCommand` deprecated — 최신 브라우저에서 미래에 제거될 수 있음 |

---

## 8. 의존성 현황

### 백엔드 (`backend/requirements.txt`)

| 패키지 | 버전 | 용도 | 상태 |
|--------|------|------|------|
| fastapi | 0.109.0 | 웹 프레임워크 | ✅ 활성 |
| uvicorn[standard] | 0.27.0 | ASGI 서버 | ✅ 활성 |
| pydantic | 2.5.3 | 데이터 검증 | ✅ 활성 |
| pydantic-settings | 2.1.0 | 환경변수 설정 | ✅ 활성 |
| httpx | 0.26.0 | 비동기 HTTP 클라이언트 | ✅ 활성 |
| python-multipart | 0.0.6 | 멀티파트 요청 | ✅ 활성 |
| python-dotenv | >=1.0.0 | `.env` 파일 로딩 | ✅ 활성 |
| slowapi | >=0.1.9 | 레이트 리미팅 | ✅ 활성 |
| python-whois | >=0.9.4 | WHOIS 조회 | ✅ 활성 |
| google-generativeai | >=0.8.0 | Gemini AI API | ✅ 활성 |

### 프론트엔드 (`frontend/package.json`) 주요 패키지

| 패키지 | 버전 | 용도 | 상태 |
|--------|------|------|------|
| react | 18.2.0 | UI 프레임워크 | ✅ 활성 |
| react-router-dom | 6.21.0 | 클라이언트 라우팅 | ✅ 활성 |
| html5-qrcode | 2.3.8 | 카메라 QR 스캔 | ✅ 활성 |
| jsqr | 1.4.0 | 이미지 QR 디코딩 | ✅ 활성 |
| qrcode.react | 3.1.0 | QR 코드 생성 | ✅ 활성 |
| tailwindcss | 3.4.0 | CSS 유틸리티 | ✅ 활성 |
| vite | 5.0.10 | 빌드 도구 | ✅ 활성 |
| vite-plugin-pwa | 0.17.4 | PWA 지원 | ✅ 활성 (설정됨) |

---

## 9. 결론

### 전체 코드 건전성

```
백엔드 코드  : 14/14 파일 활성 (더미 없음)
프론트엔드   : 19/19 파일 활성 (더미 없음)
API 연결     : 백-프론트 전 엔드포인트 연결 확인
AI 요약      : Gemini 전환 완료, 배포 완료
```

**QR Guardian의 모든 코드는 실제 기능에 연결되어 있으며 더미 코드는 존재하지 않는다.** 위협 탐지 로직이 다층적으로 구성되어 있고 (URL 구조 → 페이지 콘텐츠 → Safe Browsing → WHOIS → SSL → AI 요약), 각 레이어가 독립적으로 graceful degradation을 지원한다.

### 즉시 조치 권장 사항

1. **Railway 대시보드**: `GEMINI_API_KEY` 환경변수 추가 확인 필수
2. **`/api/reports/stats`** 엔드포인트: 관리자 접근 제한 고려
3. **캐시 전략**: 고트래픽 대비 LRU 캐시 또는 Redis 도입 검토

---

*이 보고서는 코드 감사 시점(2026-02-21) 기준으로 작성되었습니다.*
