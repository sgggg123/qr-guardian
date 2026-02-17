# QR Guardian - 시스템 전체 설명서

> 최종 업데이트: 2026-02-13

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [프로젝트 디렉토리 구조](#4-프로젝트-디렉토리-구조)
5. [Backend 상세](#5-backend-상세)
6. [Frontend 상세](#6-frontend-상세)
7. [데이터 흐름 (스캔 파이프라인)](#7-데이터-흐름-스캔-파이프라인)
8. [API 명세](#8-api-명세)
9. [위험도 판정 시스템](#9-위험도-판정-시스템)
10. [자연어 요약 시스템](#10-자연어-요약-시스템)
11. [위험도 점수 시스템](#11-위험도-점수-시스템)
12. [로컬 개발 환경](#12-로컬-개발-환경)
13. [배포](#13-배포)
14. [테스트](#14-테스트)
15. [협업 가이드](#15-협업-가이드)

---

## 1. 프로젝트 개요

**QR Guardian**은 QR 코드에 포함된 URL을 스캔하고, 여러 관점에서 보안 위협을 분석하여 사용자에게 알기 쉬운 결과를 보여주는 **모바일 우선 PWA** 애플리케이션입니다.

### 핵심 기능

| 기능 | 설명 |
|------|------|
| QR 코드 스캔 | 카메라 실시간 스캔 + 이미지 업로드 |
| URL 직접 입력 | QR 없이도 URL 검사 가능 |
| 단축 URL 해제 | bit.ly, han.gl 등 단축 URL의 실제 목적지 추적 |
| 피싱 탐지 | URL 패턴, 페이지 콘텐츠 기반 피싱 탐지 |
| 타이포스쿼팅 탐지 | naver → navar 같은 유사 도메인 사칭 탐지 |
| SSL 인증서 분석 | 발급기관 신뢰도, 만료 상태, 인증서 나이 |
| 리다이렉트 체인 시각화 | 시작 → 경유지 → 최종 목적지 전체 경로 표시 |
| 위험도 점수 | 0~10점 risk_score (높을수록 위험) |
| 신호등 UI | GREEN / YELLOW / RED 3단계 위험도 |
| AI 요약 | Claude API 기반 한국어 분석 요약 + 행동 수칙 |
| 자연어 요약 | 분석 결과를 한국어 2~3문장으로 요약 |
| QR 이미지 붙여넣기 | Ctrl+V로 QR 코드 이미지 붙여넣기 디코딩 |
| 스캔 기록 | localStorage 기반 히스토리 + 통계 |
| QR 코드 생성 | URL → QR 코드 이미지 생성 및 다운로드 |
| 알림 | 위험도별 효과음 + 진동 |
| 결과 공유 | Web Share API / 클립보드 복사 |
| PWA | 홈 화면 추가, 오프라인 지원 |

### 차별점

- 단순 블랙리스트가 아닌 **패턴 기반** 위협 탐지
- SSL 인증서 발급기관까지 분석하는 **다층 신뢰도 평가**
- 화이트리스트 기반 **대형 사이트 자동 안전 판정** (google.com, naver.com 등)
- 분석 결과를 사람이 읽기 쉬운 **자연어 한 문단으로 요약**

---

## 2. 기술 스택

### Frontend

| 기술 | 용도 |
|------|------|
| React 18 + TypeScript | UI 프레임워크 |
| Vite 5 | 빌드 도구 |
| TailwindCSS 3 | 유틸리티 CSS 스타일링 |
| React Router 6 | SPA 라우팅 |
| html5-qrcode | 카메라 QR 코드 스캔 |
| qrcode.react | QR 코드 이미지 생성 |
| jsQR | QR 코드 이미지 디코딩 (클립보드 붙여넣기) |

### Backend

| 기술 | 용도 |
|------|------|
| FastAPI | Python 비동기 웹 프레임워크 |
| Pydantic v2 | 요청/응답 데이터 검증 |
| httpx | 비동기 HTTP 클라이언트 (리다이렉트 추적, 콘텐츠 분석) |
| slowapi | IP 기반 Rate Limiting |
| python-whois | WHOIS 도메인 등록일 조회 |
| uvicorn | ASGI 서버 |
| anthropic | Claude AI 요약 서비스 |
| pytest | 테스트 프레임워크 |

### 배포

| 기술 | 용도 |
|------|------|
| Railway | 클라우드 호스팅 (Backend + Frontend 각각 서비스) |
| Docker | 컨테이너화 |
| GitHub Actions | CI/CD (pytest + tsc --noEmit) |
| GitHub | 소스 코드 + main 브랜치 push 시 자동 배포 |

---

## 3. 시스템 아키텍처

```
사용자 (모바일/데스크톱 브라우저)
         │
         │  QR 스캔 또는 URL 입력
         ▼
┌─────────────────────────────────────────────────────┐
│                  Frontend (React)                    │
│                                                     │
│   Home.tsx ──scanUrl()──→ api.ts ──POST /api/scan─┐ │
│                                                   │ │
│   Result.tsx ← scanData (JSON) ← ─────────────── ┘ │
│     ├─ TrafficLight    (신호등)                      │
│     ├─ 요약 카드        (summary)                    │
│     ├─ UrlInfo         (원본/최종 URL)               │
│     ├─ FlagsList       (위험 요소 목록)               │
│     ├─ DomainAnalysis  (도메인/SSL 분석)             │
│     └─ RedirectChain   (리다이렉트 경로)              │
└──────────────────────────┬──────────────────────────┘
                           │ POST /api/scan { url }
                           ▼
┌─────────────────────────────────────────────────────┐
│                  Backend (FastAPI)                   │
│                                                     │
│  scan.py (라우터 - 오케스트레이터)                      │
│    │                                                │
│    ├─ url_analyzer      단축URL 판별, 리다이렉트 추적  │
│    ├─ threat_detector   URL 구조 분석, 콘텐츠 분석     │
│    ├─ safe_browsing     Google Safe Browsing API     │
│    ├─ domain_analyzer   SSL 인증서, WHOIS 도메인 나이  │
│    ├─ summary_generator 자연어 요약 생성              │
│    └─ ai_summarizer     Claude AI 한국어 요약     │
│                                                     │
│  bulk.py   (벌크 스캔 - 최대 20개 URL 병렬 검사)       │
│  report.py (URL 신고 접수 + 통계)                     │
│                                                     │
│  Rate Limiting: slowapi (IP당 요청 제한)              │
│  Caching: 인메모리 TTL 캐시 (10분)                    │
│  Logging: 구조화된 JSON 로그                          │
│                                                     │
│  config.py (설정)                                    │
│    ├─ TRUSTED_DOMAINS   신뢰 도메인 화이트리스트       │
│    ├─ POPULAR_BRANDS    타이포스쿼팅 탐지용 브랜드      │
│    ├─ SHORTENER_DOMAINS 단축 URL 서비스 목록          │
│    └─ SUSPICIOUS_TLDS   의심스러운 TLD 목록           │
└─────────────────────────────────────────────────────┘
```

---

## 4. 프로젝트 디렉토리 구조

```
qr/
├── docs/
│   └── SYSTEM_ARCHITECTURE.md   ← 이 문서
│
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 진입점, CORS, Rate Limiting, 라우터 등록
│   │   ├── core/
│   │   │   ├── config.py        # 환경변수, 화이트리스트, 브랜드 목록 등 설정
│   │   │   └── logging.py       # 구조화된 JSON 로깅 설정
│   │   ├── routers/
│   │   │   ├── scan.py          # POST /api/scan (파이프라인 오케스트레이터 + 캐시)
│   │   │   ├── bulk.py          # POST /api/bulk-scan (벌크 스캔)
│   │   │   └── report.py        # POST /api/report + GET /api/reports/stats
│   │   ├── services/
│   │   │   ├── url_analyzer.py      # 단축URL 판별, 리다이렉트 체인 추적
│   │   │   ├── threat_detector.py   # URL 구조 분석, 타이포스쿼팅, 콘텐츠 분석
│   │   │   ├── safe_browsing.py     # Google Safe Browsing API 연동
│   │   │   ├── domain_analyzer.py   # SSL 인증서(비동기), WHOIS, 신뢰 점수
│   │   │   ├── ai_summarizer.py       # Claude API 기반 AI 요약
│   │   │   └── summary_generator.py # 자연어 요약 생성 (템플릿 기반)
│   │   └── models/
│   │       └── schemas.py       # Pydantic 모델 (ScanRequest, ScanData, BulkScan 등)
│   ├── tests/
│   │   ├── test_summary_generator.py  # 요약 생성기 regression 테스트 (11건)
│   │   ├── test_scan_api.py           # API 통합 테스트 (12건)
│   │   └── test_threat_detector.py    # 위협 탐지 단위 테스트 (26건)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # 라우팅 설정 (/, /result, /history, /settings, /generate, /bulk)
│   │   ├── main.tsx             # React 렌더링 시작점
│   │   ├── index.css            # 전역 스타일 (TailwindCSS)
│   │   ├── components/
│   │   │   ├── Layout.tsx       # 전체 레이아웃 (헤더 + 하단 네비게이션 바)
│   │   │   ├── QRScanner.tsx    # 카메라 QR 코드 스캐너 (html5-qrcode)
│   │   │   ├── TrafficLight.tsx # 신호등 위험도 표시 (GREEN/YELLOW/RED)
│   │   │   └── ResultCard.tsx   # 결과 카드 컴포넌트 모음 (6개 export)
│   │   ├── pages/
│   │   │   ├── Home.tsx         # 메인 페이지 (QR 스캔 + URL 입력 + 스켈레톤 로딩)
│   │   │   ├── Result.tsx       # 분석 결과 (신호등, 요약, 스크린샷, 신고)
│   │   │   ├── History.tsx      # 스캔 기록 + 통계 (클릭 시 상세 재열람)
│   │   │   ├── Settings.tsx     # 테마, 효과음, 진동 설정
│   │   │   ├── Generate.tsx     # QR 코드 생성기
│   │   │   └── BulkScan.tsx     # 벌크 URL 검사 (최대 20개)
│   │   ├── services/
│   │   │   ├── api.ts           # Backend API (scanUrl, bulkScanUrls, reportUrl, healthCheck)
│   │   │   ├── scanHistory.ts   # localStorage 히스토리 (최근 20건 ScanData 포함)
│   │   │   ├── notifications.ts # Web Audio API 효과음 + 진동
│   │   │   └── share.ts        # 결과 공유 (Web Share API + 클립보드)
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx  # 다크/라이트 테마 Context
│   │   └── types/
│   │       └── index.ts         # TypeScript 타입 정의 (ScanData, Flag 등)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── railway.json
│
├── README.md                    # 프로젝트 소개 및 빠른 시작
└── railway.json                 # Railway 모노레포 설정
```

---

## 5. Backend 상세

### 5.1 `main.py` — 앱 진입점

- FastAPI 인스턴스 생성 (API 문서: 개발 환경에서만 활성화)
- CORS 미들웨어 등록 (config 기반 origin 제한 + regex)
- slowapi Rate Limiting (429 핸들러 포함)
- 구조화된 JSON 로깅 초기화
- `scan.router`, `bulk.router`, `report.router` 등록
- `GET /health` 헬스체크 엔드포인트

### 5.2 `core/config.py` — 설정

`pydantic_settings` 기반. 환경변수 또는 `.env` 파일에서 읽음.

| 설정 | 설명 |
|------|------|
| `GOOGLE_SAFE_BROWSING_API_KEY` | Safe Browsing API 키 (미설정시 Safe Browsing 검사 스킵) |
| `CLAUDE_API_KEY` | Anthropic Claude API 키 (미설정시 AI 요약 비활성) |
| `TRUSTED_DOMAINS` | 자동 안전 판정 도메인 (~90개: google.com, naver.com, go.kr 등) |
| `POPULAR_BRANDS` | 타이포스쿼팅 탐지 대상 브랜드 (~50개: google, naver, kakao 등) |
| `SHORTENER_DOMAINS` | 단축 URL 서비스 (~30개: bit.ly, han.gl, vo.la 등) |
| `SUSPICIOUS_TLDS` | 위험 TLD (~16개: .xyz, .tk, .ml 등) |
| `MAX_REDIRECTS` | 리다이렉트 최대 추적 횟수 (기본 10) |
| `REQUEST_TIMEOUT` | HTTP 요청 타임아웃 (기본 10초) |

### 5.3 `routers/scan.py` — 스캔 파이프라인 오케스트레이터

이 파일이 전체 분석 파이프라인을 조율하는 핵심 파일입니다.

```
POST /api/scan 요청 수신
  │
  ├─ 1. URL 유효성 검사 + https:// 자동 추가
  ├─ 2. url_analyzer.is_shortened_url()     → 단축URL 플래그
  ├─ 3. url_analyzer.resolve_redirects_with_chain() → 최종URL + 리다이렉트 체인
  ├─ 4. threat_detector.analyze_url_structure()     → URL 구조 플래그
  ├─ 5. threat_detector.analyze_page_content()      → 콘텐츠 플래그
  ├─ 6. safe_browsing_service.check_url()           → Safe Browsing 플래그
  ├─ 7. domain_analyzer.analyze_domain()            → SSL/도메인 플래그
  ├─ 8. _calculate_flag_risk()                       → 플래그 기반 risk_score 계산
  ├─ 9. _calculate_risk_level()                     → GREEN / YELLOW / RED 판정
  ├─ 10. _deduplicate_flags()                       → 중복 플래그 제거
  ├─ 11. generate_summary()                         → 자연어 요약 생성
  ├─ 12. ai_summarizer                              → Claude AI 한국어 요약 + 행동 수칙
  └─ 13. ScanResponse 반환
```

주요 내부 함수:
- `_is_trusted_domain(url)` — 화이트리스트 도메인 체크 (서브도메인 포함)
- `_calculate_flag_risk(flags)` — 플래그 기반 risk_score 계산
- `_calculate_risk_level(flags, is_safe, final_url, risk_score)` — 최종 위험도 계산
- `_deduplicate_flags(flags)` — type 기준 중복 제거

### 5.4 `services/url_analyzer.py` — URL 분석

| 메서드 | 기능 |
|--------|------|
| `is_shortened_url(url)` | 단축 URL 서비스 도메인인지 판별 |
| `resolve_redirects_with_chain(url)` | 리다이렉트를 최대 10회 따라가며 전체 체인 기록 |
| `extract_domain_info(url)` | 도메인, TLD, IP 여부, 포트 등 파싱 |

### 5.5 `services/threat_detector.py` — 위협 탐지

**URL 구조 분석** (`analyze_url_structure`):

| 탐지 항목 | 플래그 타입 | 심각도 |
|-----------|-------------|--------|
| 의심스러운 TLD (.xyz, .tk 등) | `suspicious_tld` | WARNING |
| IP 주소를 도메인으로 사용 | `ip_address` | WARNING |
| 비표준 포트 사용 | `non_standard_port` | WARNING |
| 긴 서브도메인 | `long_subdomain` | WARNING |
| 타이포스쿼팅 (유사 도메인) | `typosquatting` | DANGER |
| 피싱 URL 패턴 | `phishing_pattern` | DANGER |

타이포스쿼팅 탐지 방식:
- difflib 유사도 (0.7~1.0 사이면 의심)
- 문자 치환 패턴 (0→o, 1→l, rn→m 등)

**콘텐츠 분석** (`analyze_page_content`):

| 탐지 항목 | 플래그 타입 | 심각도 |
|-----------|-------------|--------|
| 로그인 폼 | `login_form` | INFO |
| 로그인 경로 | `login_path` | INFO |
| 개인정보 입력 요청 | `personal_info_request` | WARNING |
| 결제 정보 요청 | `payment_form` | WARNING |

### 5.6 `services/safe_browsing.py` — Google Safe Browsing

- `GOOGLE_SAFE_BROWSING_API_KEY`가 있으면 실제 Google API 호출
- API 키 없거나 API 호출 실패 시 안전(True, [])으로 처리 + 경고 로그
- 반환: `(is_safe: bool, threats: list[str])`

### 5.7 `services/domain_analyzer.py` — 도메인/SSL 분석

| 기능 | 설명 |
|------|------|
| SSL 인증서 추출 | 비동기 `asyncio.open_connection` 기반. 발급기관, 유효기간, 만료 여부 |
| 발급기관 신뢰도 평가 | DigiCert(100), GlobalSign(100), Let's Encrypt(60) 등 |
| 도메인 나이 조회 | python-whois로 실제 등록일 조회, 실패 시 SSL 발급일 fallback |
| 위험도 점수 | 0~10점 가점 방식 (risk_score + risk_breakdown) |

### 5.8 `services/summary_generator.py` — 자연어 요약

템플릿 기반으로 분석 결과를 한국어 2~3문장으로 요약합니다. 상세 내용은 [10. 자연어 요약 시스템](#10-자연어-요약-시스템) 참조.

### 5.9 `services/ai_summarizer.py` — AI 요약

Claude API(anthropic SDK)를 사용하여 분석 결과를 한국어로 요약하고 행동 수칙을 생성합니다.

| 기능 | 설명 |
|------|------|
| AI 요약 | risk_score, risk_breakdown, 플래그 기반 한국어 2~3문장 요약 |
| 행동 수칙 | 번호 매긴 구체적 행동 가이드 리스트 |
| Fallback | API 키 없거나 실패 시 기존 템플릿 요약 사용 |

### 5.10 `models/schemas.py` — 데이터 모델

| 모델 | 용도 |
|------|------|
| `ScanRequest` | 요청 바디 (`url: str`) |
| `ScanData` | 응답 데이터 본체 |
| `ScanResponse` | 최종 응답 래퍼 (`status` + `data`) |
| `Flag` | 탐지된 위험 요소 (`type`, `severity`, `message`) |
| `RiskLevel` | 위험도 enum (`GREEN`, `YELLOW`, `RED`) |
| `Severity` | 플래그 심각도 enum (`info`, `warning`, `danger`) |
| `SSLInfo` | SSL 인증서 정보 |
| `DomainAnalysis` | 도메인 분석 결과 |
| `RedirectHop` | 리다이렉트 체인 한 단계 |
| `InfoRequirement` | 요구 정보 수준 (LOW/MEDIUM/HIGH) |
| `SafeBrowsingResult` | Safe Browsing 검사 결과 |

---

## 6. Frontend 상세

### 6.1 라우팅 (`App.tsx`)

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | `Home.tsx` | 메인 - QR 스캔 + URL 입력 |
| `/result` | `Result.tsx` | 분석 결과 (스크린샷, 신고 포함) |
| `/history` | `History.tsx` | 스캔 기록 + 통계 (클릭 시 상세 재열람) |
| `/settings` | `Settings.tsx` | 테마, 효과음, 진동 설정 |
| `/generate` | `Generate.tsx` | QR 코드 생성기 |
| `/bulk` | `BulkScan.tsx` | 벌크 URL 일괄 검사 (최대 20개) |

하단 네비게이션 바에 스캔, 생성, 기록, 설정 4개 탭이 항상 표시됩니다.

### 6.2 컴포넌트 (`components/`)

#### `Layout.tsx`
- 전체 앱 레이아웃 (헤더 + 컨텐츠 영역 + 하단 네비게이션)
- 헤더: 로고 + "QR Guardian" 텍스트
- 하단 네비: 스캔 / 생성 / 기록 / 설정 4개 탭

#### `QRScanner.tsx`
- html5-qrcode 라이브러리 사용
- 카메라 스트림 → QR 인식 → `onScan(url)` 콜백

#### `TrafficLight.tsx`
- GREEN/YELLOW/RED 신호등 UI
- 활성화된 불 + 글로우 애니메이션
- 크기: sm / md / lg

#### `ResultCard.tsx` (6개 컴포넌트 export)

| 컴포넌트 | 표시 내용 |
|----------|-----------|
| `UrlInfo` | 원본 URL / 최종 URL (다르면 둘 다 표시) |
| `FlagsList` | 탐지된 위험 요소 목록 (severity별 색상 구분) |
| `InfoRequirementCard` | 요구 정보 수준 (LOW/MEDIUM/HIGH) |
| `SafeBrowsingCard` | Safe Browsing 검사 결과 (안전/위협) |
| `DomainAnalysisCard` | 도메인 분석 (신뢰 점수 바, SSL 정보, 도메인 나이) |
| `RedirectChainCard` | 리다이렉트 경로 (단계별 도메인 + 상태코드) |

### 6.3 페이지 (`pages/`)

#### `Home.tsx` — 메인 페이지
1. QR 스캐너 표시
2. "또는 직접 입력" 구분선
3. URL 입력 폼 + "URL 검사" 버튼
4. 분석 중 스켈레톤 로딩 오버레이 (신호등 + 카드 placeholder)
5. 스캔 완료 → `navigate('/result', { state: { scanData } })`
6. 스캔 기록 자동 저장 (`addScanToHistory`)
7. 위험도별 알림음/진동 재생 (`notifyRiskLevel`)
8. Ctrl+V 이미지 붙여넣기 → jsQR로 QR 디코딩 → 자동 분석

#### `Result.tsx` — 결과 페이지
표시 순서:
1. 신호등 (`TrafficLight`)
2. **자연어 요약 카드** (`summary`)
3. **AI 요약 카드** (`ai_summary`)
4. **행동 수칙 카드** (`action_guidelines`)
5. URL 정보 (`UrlInfo`)
6. 위험 요소 목록 (`FlagsList`)
7. 요구 정보 수준 (`InfoRequirementCard`)
8. Safe Browsing 결과 (`SafeBrowsingCard`)
9. 도메인 분석 (`DomainAnalysisCard`)
10. 리다이렉트 경로 (`RedirectChainCard`)
11. 사이트 스크린샷 미리보기 (Microlink API, 재시도+타임아웃)
12. 버튼: URL 열기 / URL 복사 / 결과 공유 / URL 신고 / 다시 스캔

#### `History.tsx` — 스캔 기록
- localStorage에 최대 50건 저장 (최근 20건은 전체 ScanData 포함)
- 통계: 전체/오늘/이번 주 스캔 수, 안전/주의/위험 비율 바
- 항목 클릭 → Result 페이지에서 상세 결과 재열람
- 개별 삭제 + 전체 삭제

#### `Settings.tsx` — 설정
- 다크/라이트 테마 토글
- 효과음 ON/OFF + 테스트
- 진동 ON/OFF + 테스트
- 앱 버전 정보

#### `Generate.tsx` — QR 코드 생성
- URL 입력 → QR 코드 이미지 생성 (qrcode.react)
- 다운로드 (PNG) / 클립보드 복사

### 6.4 서비스 (`services/`)

#### `api.ts`
```typescript
scanUrl(url: string): Promise<ScanResponse>          // POST /api/scan
bulkScanUrls(urls: string[]): Promise<BulkScanResponse>  // POST /api/bulk-scan
reportUrl(url: string, reason?: string, riskScore?: number, aiSummary?: string): Promise<...>  // POST /api/report
getScreenshotUrl(url: string): string                     // Microlink 스크린샷 URL
healthCheck(): Promise<boolean>                            // GET /health
```
- `VITE_API_URL` 환경변수 또는 프로덕션 Railway URL 사용

#### `scanHistory.ts`
- localStorage 키: `qr-guardian-history`
- 최대 50건 (FIFO), 최근 20건은 전체 `ScanData` 포함 (상세 재열람용)
- `addScanToHistory()`, `getScanHistory()`, `clearScanHistory()`, `deleteScanItem()`, `getScanStats()`

#### `notifications.ts`
- Web Audio API로 위험도별 효과음 재생
  - GREEN: 높은 주파수 차임 (800, 1000Hz)
  - YELLOW: 중간 주파수 경고음 (600, 400Hz)
  - RED: 낮은 주파수 경보음 (300, 200, 300Hz)
- `navigator.vibrate()`로 위험도별 진동 패턴

#### `share.ts`
- Web Share API (모바일) 우선, 실패 시 클립보드 복사
- 공유 텍스트: 위험도 이모지 + URL + 신뢰 점수 + 위험 요소 목록

### 6.5 타입 (`types/index.ts`)

Backend `schemas.py`와 1:1 대응하는 TypeScript 인터페이스:

```typescript
ScanData {
  original_url, final_url, risk_level, summary,
  risk_score?, risk_breakdown?, ai_summary?, action_guidelines?,
  flags, info_requirement, safe_browsing,
  domain_analysis?, redirect_chain?
}
```

### 6.6 컨텍스트 (`contexts/ThemeContext.tsx`)

- `dark` / `light` 테마 관리
- localStorage 키: `qr-guardian-theme`
- 시스템 설정(prefers-color-scheme) 자동 감지

---

## 7. 데이터 흐름 (스캔 파이프라인)

사용자가 URL을 스캔/입력하면 아래 순서로 처리됩니다:

```
[사용자] QR 스캔 또는 URL 입력
    │
    ▼
[Home.tsx] analyzeUrl(url) 호출
    │
    ▼
[api.ts] POST /api/scan { url } → Backend
    │
    ▼
[scan.py] 파이프라인 시작
    │
    ├─① URL 기본 검증 + https:// 자동 추가
    │
    ├─② 단축 URL 확인 → shortened_url 플래그
    │
    ├─③ 리다이렉트 추적 (최대 10회)
    │   └─ 결과: final_url + redirect_chain
    │   └─ 3회 초과 → multiple_redirects 플래그
    │   └─ 2개 이상 도메인 경유 → cross_domain_redirect 플래그
    │
    ├─④ URL 구조 분석 (final_url + original_url)
    │   └─ 타이포스쿼팅, 피싱 패턴, 의심 TLD, IP주소 등
    │
    ├─⑤ 페이지 콘텐츠 분석 (final_url)
    │   └─ 로그인 폼, 개인정보 입력, 결제 폼 등
    │
    ├─⑥ Google Safe Browsing 검사
    │   └─ 위협 감지 시 → safe_browsing_threat 플래그
    │
    ├─⑦ 도메인 분석 (SSL + 도메인 나이)
    │   └─ 신뢰 도메인이 아닌 경우에만 플래그 추가
    │
    ├─⑧ 위험도 계산 → GREEN / YELLOW / RED
    │
    ├─⑨ 플래그 중복 제거
    │
    ├─⑩ 자연어 요약 생성
    │
    └─⑪ ScanResponse 반환
         │
         ▼
[Home.tsx] 응답 수신
    ├─ 스캔 기록 저장 (localStorage)
    ├─ 알림음/진동 재생
    └─ Result 페이지로 이동
         │
         ▼
[Result.tsx] 결과 표시
    ├─ 신호등 (TrafficLight)
    ├─ 자연어 요약 카드
    ├─ 상세 분석 카드들
    └─ 액션 버튼 (URL 열기, 복사, 공유, 다시 스캔)
```

---

## 8. API 명세

### `POST /api/scan`

URL을 분석합니다.

**요청:**
```json
{
  "url": "https://bit.ly/example"
}
```

**성공 응답:**
```json
{
  "status": "success",
  "data": {
    "original_url": "https://bit.ly/example",
    "final_url": "https://example.com/page",
    "risk_level": "YELLOW",
    "summary": "일부 주의가 필요한 요소가 발견되었습니다. 단축 URL로 실제 목적지가 숨겨져 있습니다. 개인정보 입력 시 주의하세요.",
    "risk_score": 2.5,
    "risk_breakdown": {"ssl": 0, "domain_age": 1.5, "url_pattern": 1.0},
    "ai_summary": "이 URL은 단축 URL을 통해 실제 목적지를 숨기고 있으며, 비교적 최근에 등록된 도메인입니다.",
    "action_guidelines": ["1. 개인정보 입력을 자제하세요", "2. 로그인 정보를 요구하면 의심하세요"],
    "flags": [
      {
        "type": "shortened_url",
        "severity": "warning",
        "message": "단축 URL이 감지되었습니다. 실제 목적지가 숨겨져 있을 수 있습니다."
      }
    ],
    "info_requirement": {
      "level": "LOW",
      "evidence": []
    },
    "safe_browsing": {
      "is_safe": true,
      "threats": []
    },
    "domain_analysis": {
      "domain": "example.com",
      "ssl_info": {
        "issuer": "Let's Encrypt",
        "valid_from": "2026-01-01T00:00:00",
        "valid_until": "2026-04-01T00:00:00",
        "trust_level": "low",
        "is_expired": false,
        "days_until_expiry": 54
      },
      "domain_age_days": 36,
      "risk_score": 2.5,
      "risk_factors": []
    },
    "redirect_chain": [
      {"url": "https://bit.ly/example", "status_code": 0, "domain": "bit.ly"},
      {"url": "https://example.com/page", "status_code": 301, "domain": "example.com"}
    ]
  }
}
```

**에러 응답:**
```json
{
  "status": "error",
  "message": "URL 분석에 실패했습니다",
  "detail": "Connection timeout"
}
```

### `GET /health`

서버 상태 확인.

```json
{ "status": "healthy", "service": "qr-guardian-api" }
```

### `POST /api/bulk-scan`

여러 URL을 한꺼번에 분석합니다 (최대 20개). Rate limit: 5회/분.

**요청:**
```json
{
  "urls": ["https://google.com", "https://navar.com"]
}
```

**응답:**
```json
{
  "status": "success",
  "results": [
    { "url": "https://google.com", "risk_level": "GREEN", "summary": "Google 공식 사이트입니다." },
    { "url": "https://navar.com", "risk_level": "RED", "summary": "...", "error": null }
  ]
}
```

### `POST /api/report`

URL을 신고합니다. Rate limit: 10회/분.

**요청:**
```json
{
  "url": "https://suspicious-site.com",
  "reason": "피싱 의심"
}
```

**응답:**
```json
{ "status": "success", "message": "신고가 접수되었습니다" }
```

### `GET /api/reports/stats`

신고 통계를 조회합니다.

### `GET /`

API 정보.

```json
{ "name": "QR Guardian API", "version": "1.0.0" }
```

---

## 9. 위험도 판정 시스템

`scan.py`의 `_calculate_risk_level()` 함수가 담당합니다.

### 판정 순서

1. **화이트리스트 도메인 + Safe Browsing 안전** → 즉시 `GREEN`
2. **Safe Browsing 위협** → 즉시 `RED`
3. **타이포스쿼팅/피싱 플래그 존재** → `RED`
4. **risk_score >= 7.0** → `RED`
5. **risk_score >= 3.0** → `YELLOW`
6. **유의미한 WARNING 1개 이상** (suspicious_tld, new_domain, ip_address 등) → `YELLOW`
7. **그 외** → `GREEN`

### 플래그 전체 목록

| 플래그 타입 | 심각도 | 설명 | 발생 출처 |
|-------------|--------|------|-----------|
| `shortened_url` | WARNING | 단축 URL | url_analyzer |
| `multiple_redirects` | WARNING | 3회 이상 리다이렉트 | scan.py |
| `cross_domain_redirect` | WARNING | 여러 도메인 경유 | scan.py |
| `suspicious_tld` | WARNING | 의심스러운 TLD | threat_detector |
| `ip_address` | WARNING | IP 주소 사용 | threat_detector |
| `non_standard_port` | WARNING | 비표준 포트 | threat_detector |
| `long_subdomain` | WARNING | 긴 서브도메인 | threat_detector |
| `typosquatting` | DANGER | 브랜드 사칭 의심 | threat_detector |
| `phishing_pattern` | DANGER | 피싱 URL 패턴 | threat_detector |
| `login_form` | INFO | 로그인 폼 존재 | threat_detector |
| `login_path` | INFO | 로그인 경로 | threat_detector |
| `personal_info_request` | WARNING | 개인정보 입력 요청 | threat_detector |
| `payment_form` | WARNING | 결제 정보 요청 | threat_detector |
| `safe_browsing_threat` | DANGER | 알려진 악성 URL | safe_browsing |
| `new_domain` | WARNING | 30일 미만 신규 도메인 | domain_analyzer |
| `low_trust_issuer` | WARNING | 무료/저신뢰 인증서 | domain_analyzer |
| `expired_cert` | DANGER | 만료된 SSL 인증서 | domain_analyzer |
| `expiring_soon` | WARNING | 30일 이내 만료 예정 | domain_analyzer |

---

## 10. 자연어 요약 시스템

`summary_generator.py`가 분석 결과를 한국어 2~3문장으로 요약합니다.

### 생성 과정 (3단계)

```
1단계 (판정문)  + 2단계 (위협 상세)  + 3단계 (행동 가이드)
     ↓                  ↓                    ↓
"이 사이트는     'naver'을 사칭하는      절대 로그인하거나
 위험할 수       것으로 의심됩니다."    개인정보를 입력하지
 있습니다."                              마세요."
```

### 1단계: 메인 판정문

| 조건 | 출력 |
|------|------|
| GREEN + 신뢰 도메인 | "{도메인} 공식 사이트입니다. 안심하고 이용하셔도 됩니다." |
| GREEN + 일반 | "특별한 위험 요소가 발견되지 않았습니다." |
| YELLOW | "일부 주의가 필요한 요소가 발견되었습니다." |
| RED | "이 사이트는 위험할 수 있습니다." |

### 2단계: 위협 상세 (플래그 조합)

| 플래그 | 출력 |
|--------|------|
| `typosquatting` | "'{brand}'을(를) 사칭하는 것으로 의심됩니다." |
| `phishing_pattern` | "피싱 공격에 사용되는 URL 패턴이 포함되어 있습니다." |
| `safe_browsing_threat` | "보안 데이터베이스에 위험 사이트로 등록되어 있습니다." |
| `expired_cert` | "SSL 인증서가 만료된 상태입니다." |
| `shortened_url` + `cross_domain_redirect` | "단축 URL 뒤에 여러 사이트를 거쳐 연결됩니다." |
| `new_domain` + `low_trust_issuer` | "최근 만들어진 사이트이며 무료 인증서를 사용합니다." |
| `ip_address` | "도메인 대신 IP 주소를 사용합니다." |
| `suspicious_tld` | "의심스러운 도메인 확장자를 사용합니다." |

### 3단계: 행동 가이드

| 조건 | 출력 |
|------|------|
| GREEN | "정상적으로 이용 가능합니다." |
| YELLOW | "개인정보 입력 시 주의하세요." |
| RED + typosquatting/phishing | "절대 로그인하거나 개인정보를 입력하지 마세요." |
| RED + safe_browsing | "이 사이트에 접속하지 않는 것을 권장합니다." |

### 출력 예시

| 시나리오 | 요약 |
|----------|------|
| google.com (GREEN, trusted) | "Google 공식 사이트입니다. 안심하고 이용하셔도 됩니다." |
| 일반 사이트 (GREEN) | "특별한 위험 요소가 발견되지 않았습니다. 정상적으로 이용 가능합니다." |
| 단축URL + 새 도메인 (YELLOW) | "일부 주의가 필요한 요소가 발견되었습니다. 단축 URL로 실제 목적지가 숨겨져 있습니다. 최근 만들어진 사이트입니다. 개인정보 입력 시 주의하세요." |
| 타이포스쿼팅 naver (RED) | "이 사이트는 위험할 수 있습니다. 'naver'을(를) 사칭하는 것으로 의심됩니다. 절대 로그인하거나 개인정보를 입력하지 마세요." |
| Safe Browsing 위험 (RED) | "이 사이트는 위험할 수 있습니다. 보안 데이터베이스에 위험 사이트로 등록되어 있습니다. 이 사이트에 접속하지 않는 것을 권장합니다." |

### 확장 가능성

`generate_summary()` 함수의 인터페이스(입력/출력)를 유지하면서 내부를 LLM API 호출로 교체하면, 나머지 코드 변경 없이 더 자연스러운 요약 생성이 가능합니다.

---

## 11. 위험도 점수 시스템

`domain_analyzer.py`가 0~10점 가점 방식으로 계산합니다 (높을수록 위험).

### 가점 요인

| 요인 | 최대 점수 |
|------|-----------|
| SSL 인증서 (무료/만료/미확인) | max 3점 |
| 도메인 나이 (신규/짧은 이력) | max 4점 |
| Safe Browsing 위협 | max 2점 |
| URL 패턴 (의심 TLD/IP 사용 등) | max 3점 |
| WHOIS 조회 실패 | max 1점 |

### 점수 → 위험도 판정

| 점수 범위 | 위험도 |
|-----------|--------|
| 0 ~ 2.9 | GREEN |
| 3.0 ~ 6.9 | YELLOW |
| 7.0 이상 | RED |

---

## 12. 로컬 개발 환경

### 필수 설치

- Node.js 18+
- Python 3.11+

### Backend 실행

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- API 문서: http://localhost:8000/api/docs

### Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

- 앱: http://localhost:5173

### Docker (전체 스택)

```bash
docker-compose -f docker-compose.dev.yml up
```

### 환경 변수

| 변수 | 위치 | 설명 | 기본값 |
|------|------|------|--------|
| `GOOGLE_SAFE_BROWSING_API_KEY` | Backend `.env` | Safe Browsing API 키 | (미설정시 Safe Browsing 스킵) |
| `CLAUDE_API_KEY` | Backend `.env` | Anthropic Claude API 키 | (미설정시 AI 요약 비활성) |
| `ENVIRONMENT` | Backend `.env` | 실행 환경 | `development` |
| `VITE_API_URL` | Frontend `.env` | Backend URL | 프로덕션 Railway URL |

### 테스트 URL 예시

```bash
# 안전한 URL
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}'

# 단축 URL
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://bit.ly/test"}'
```

---

## 13. 배포

### Railway 구성

```
Railway Project
├── Backend Service
│   ├── 소스: backend/
│   ├── 빌드: Dockerfile
│   └── 포트: 8000
│
└── Frontend Service
    ├── 소스: frontend/
    ├── 빌드: Dockerfile
    ├── 환경변수: VITE_API_URL=<Backend URL>
    └── 포트: 8080
```

### 자동 배포 흐름

```
git push origin main → GitHub 웹훅 → Railway 감지 → Docker 빌드 → 배포 → 헬스체크
```

---

## 14. 테스트

### Backend 테스트

```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

현재 테스트 (총 49건):
- `tests/test_summary_generator.py` — 요약 생성기 11개 테스트
- `tests/test_scan_api.py` — API 통합 테스트 12개 (TestClient 기반)
- `tests/test_threat_detector.py` — 위협 탐지 단위 테스트 26개

### Frontend 타입 체크

```bash
cd frontend
npx tsc --noEmit
```

---

## 15. 협업 가이드

### 브랜치

| 브랜치 | 용도 | 배포 |
|--------|------|------|
| `main` | 안정 버전 (배포용) | Railway 자동 배포 |
| `dev` | 개발용 | 배포 안 됨 |

### 작업 흐름

```bash
# 1. 최신 코드 받기
git checkout dev && git pull origin dev

# 2. 작업 후 커밋
git add . && git commit -m "feat: 새 기능 추가"

# 3. dev에 푸시
git push origin dev

# 4. 배포 (main에 병합)
git checkout main && git merge dev && git push origin main
```

### 커밋 메시지 규칙

- `feat:` 새 기능
- `fix:` 버그 수정
- `docs:` 문서 수정
- `refactor:` 리팩토링
- `test:` 테스트 추가/수정

### 주요 수정 포인트

| 수정하고 싶은 것 | 파일 |
|------------------|------|
| UI 스타일 | `frontend/src/index.css` |
| QR 스캐너 동작 | `frontend/src/components/QRScanner.tsx` |
| 결과 화면 레이아웃 | `frontend/src/pages/Result.tsx` |
| 위협 탐지 규칙 추가 | `backend/app/services/threat_detector.py` |
| 요약 메시지 수정 | `backend/app/services/summary_generator.py` |
| 화이트리스트 도메인 추가 | `backend/app/core/config.py` → `TRUSTED_DOMAINS` |
| 브랜드 추가 (타이포스쿼팅) | `backend/app/core/config.py` → `POPULAR_BRANDS` |
| 단축URL 서비스 추가 | `backend/app/core/config.py` → `SHORTENER_DOMAINS` |
| API 응답 필드 추가 | `backend/app/models/schemas.py` + `frontend/src/types/index.ts` 동시 수정 |

### 문제 해결

```bash
# npm 문제
rm -rf frontend/node_modules frontend/package-lock.json
cd frontend && npm install

# Python 가상환경 문제
rm -rf backend/venv
cd backend && python -m venv venv
source venv/bin/activate && pip install -r requirements.txt

# 포트 충돌 (Linux/Mac)
lsof -i :8000 && kill -9 <PID>

# 포트 충돌 (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```
