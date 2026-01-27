# QR Guardian 시스템 아키텍처 문서

## 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [시스템 구조](#시스템-구조)
4. [Frontend 상세](#frontend-상세)
5. [Backend 상세](#backend-상세)
6. [배포 구조](#배포-구조)
7. [API 명세](#api-명세)

---

## 프로젝트 개요

**QR Guardian**은 QR 코드의 URL을 스캔하고 보안 위협을 분석하는 PWA(Progressive Web App) 애플리케이션입니다.

### 주요 기능
- QR 코드 실시간 스캔 (카메라 사용)
- URL 직접 입력 검사
- 단축 URL 해제 및 최종 목적지 추적
- 피싱/악성 URL 패턴 탐지
- 타이포스쿼팅(유사 도메인) 탐지
- 위험도 시각화 (신호등 UI: 초록/노랑/빨강)

### 차별점
- 단순 블랙리스트가 아닌 **패턴 기반** 위협 탐지
- **오프라인 지원** (PWA)
- 모바일/데스크톱 모두 지원

---

## 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18.x | UI 프레임워크 |
| TypeScript | 5.x | 타입 안정성 |
| Vite | 5.x | 빌드 도구 (빠른 개발 서버) |
| TailwindCSS | 3.x | 스타일링 (유틸리티 CSS) |
| html5-qrcode | 2.x | QR 코드 스캔 라이브러리 |
| React Router | 6.x | 페이지 라우팅 |

### Backend
| 기술 | 버전 | 용도 |
|------|------|------|
| FastAPI | 0.109.x | Python 웹 프레임워크 |
| Pydantic | 2.x | 데이터 검증 |
| httpx | 0.26.x | 비동기 HTTP 클라이언트 |
| uvicorn | 0.27.x | ASGI 서버 |

### 배포
| 기술 | 용도 |
|------|------|
| Railway | 클라우드 호스팅 |
| Docker | 컨테이너화 |
| GitHub | 소스 코드 관리 |

---

## 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                         사용자                               │
│                    (모바일/데스크톱 브라우저)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│                 https://xxx.up.railway.app                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  QRScanner  │  │    Home     │  │   Result    │         │
│  │  (카메라)    │  │  (메인페이지) │  │  (결과표시)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────┬───────────────────────────────────┘
                          │ POST /api/scan
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                        │
│                 https://xxx.up.railway.app                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ URL Analyzer│  │   Threat    │  │    Safe     │         │
│  │ (URL 분석)   │  │  Detector   │  │  Browsing   │         │
│  │             │  │ (위협 탐지)  │  │  (외부 API)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend 상세

### 디렉토리 구조

```
frontend/
├── src/
│   ├── components/          # 재사용 가능한 UI 컴포넌트
│   │   ├── Layout.tsx       # 전체 레이아웃 (헤더, 푸터)
│   │   ├── QRScanner.tsx    # QR 코드 스캐너
│   │   ├── TrafficLight.tsx # 신호등 위험도 표시
│   │   └── ResultCard.tsx   # 결과 카드 컴포넌트들
│   │
│   ├── pages/               # 페이지 컴포넌트
│   │   ├── Home.tsx         # 메인 페이지 (스캔 화면)
│   │   └── Result.tsx       # 결과 페이지
│   │
│   ├── hooks/               # 커스텀 React 훅
│   │   └── useScanner.ts    # QR 스캐너 로직
│   │
│   ├── services/            # 외부 서비스 연동
│   │   └── api.ts           # Backend API 호출
│   │
│   ├── types/               # TypeScript 타입 정의
│   │   └── index.ts         # 공통 타입
│   │
│   ├── App.tsx              # 앱 진입점, 라우팅 설정
│   ├── main.tsx             # React 렌더링 시작점
│   └── index.css            # 전역 스타일
│
├── public/                  # 정적 파일
│   └── icons/               # PWA 아이콘
│
├── package.json             # 의존성 및 스크립트
├── vite.config.ts           # Vite 설정
├── tailwind.config.js       # TailwindCSS 설정
└── Dockerfile               # Docker 빌드 설정
```

### 주요 컴포넌트 설명

#### 1. QRScanner.tsx
```
역할: 카메라를 통한 QR 코드 스캔
사용 라이브러리: html5-qrcode

동작 흐름:
1. 사용자가 "카메라 시작" 버튼 클릭
2. 브라우저 카메라 권한 요청
3. 카메라 스트림을 화면에 표시
4. QR 코드 인식 시 onScan 콜백 호출
5. 추출된 URL을 부모 컴포넌트로 전달
```

#### 2. TrafficLight.tsx
```
역할: 위험도를 신호등 형태로 시각화

입력: risk_level (GREEN | YELLOW | RED)
출력:
  - GREEN: 안전 (초록불)
  - YELLOW: 주의 (노란불)
  - RED: 위험 (빨간불)
```

#### 3. Home.tsx
```
역할: 메인 페이지

기능:
1. QR 스캐너 표시
2. URL 직접 입력 폼
3. 스캔/입력된 URL을 Backend로 전송
4. 분석 결과 받으면 Result 페이지로 이동
```

#### 4. Result.tsx
```
역할: 분석 결과 표시

표시 내용:
1. 신호등 (위험도)
2. 원본 URL / 최종 URL
3. 탐지된 위험 요소 목록
4. 요구 정보 수준 (LOW/MEDIUM/HIGH)
5. URL 열기/복사 버튼
```

### API 호출 (services/api.ts)

```typescript
// Backend로 URL 분석 요청
export async function scanUrl(url: string): Promise<ScanResponse> {
  const response = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return response.json()
}
```

---

## Backend 상세

### 디렉토리 구조

```
backend/
├── app/
│   ├── main.py              # FastAPI 앱 진입점
│   │
│   ├── core/                # 핵심 설정
│   │   └── config.py        # 환경 변수, 설정값
│   │
│   ├── routers/             # API 엔드포인트
│   │   └── scan.py          # /api/scan 라우터
│   │
│   ├── services/            # 비즈니스 로직
│   │   ├── url_analyzer.py  # URL 분석 (리다이렉트 추적)
│   │   ├── threat_detector.py # 위협 탐지 로직
│   │   └── safe_browsing.py # Google Safe Browsing 연동
│   │
│   └── models/              # 데이터 모델
│       └── schemas.py       # Pydantic 스키마 (요청/응답)
│
├── requirements.txt         # Python 의존성
└── Dockerfile               # Docker 빌드 설정
```

### 주요 모듈 설명

#### 1. main.py
```python
# FastAPI 앱 생성 및 설정
# - CORS 설정 (Frontend에서 접근 허용)
# - 라우터 등록
# - 헬스체크 엔드포인트
```

#### 2. routers/scan.py
```
역할: /api/scan 엔드포인트 처리

처리 흐름:
1. URL 수신
2. URL 유효성 검사
3. 단축 URL 여부 확인
4. 리다이렉트 추적 (최종 URL 획득)
5. URL 구조 분석
6. 페이지 콘텐츠 분석
7. Safe Browsing 검사
8. 위험도 계산
9. 결과 반환
```

#### 3. services/url_analyzer.py
```
역할: URL 분석

기능:
- is_shortened_url(): 단축 URL 여부 확인
  → bit.ly, tinyurl.com 등 알려진 단축 서비스 체크

- resolve_redirects(): 리다이렉트 추적
  → 최대 10회까지 리다이렉트를 따라가서 최종 URL 획득

- extract_domain_info(): 도메인 정보 추출
  → TLD, IP 여부, 포트 번호 등
```

#### 4. services/threat_detector.py
```
역할: 위협 탐지

탐지 항목:
1. 의심스러운 TLD (.xyz, .tk 등)
2. IP 주소 사용 (도메인 대신)
3. 비표준 포트
4. 긴 서브도메인
5. 타이포스쿼팅 (gooogle.com 등)
6. 로그인 페이지 패턴
7. 개인정보 요청 패턴
8. 피싱 URL 패턴

위험도 계산:
- DANGER 플래그 1개 이상 → RED
- WARNING 플래그 2개 이상 → YELLOW
- WARNING 플래그 1개 → YELLOW
- 그 외 → GREEN
```

#### 5. services/safe_browsing.py
```
역할: Google Safe Browsing API 연동

동작:
- API 키가 있으면 → 실제 API 호출
- API 키가 없으면 → Mock 데이터로 테스트
  (알려진 테스트용 악성 URL만 탐지)
```

### 설정값 (core/config.py)

```python
# 의심스러운 TLD 목록
SUSPICIOUS_TLDS = [".xyz", ".top", ".tk", ...]

# 단축 URL 서비스 목록
SHORTENER_DOMAINS = ["bit.ly", "tinyurl.com", ...]

# 타이포스쿼팅 탐지용 유명 브랜드
POPULAR_BRANDS = ["google", "facebook", "naver", ...]
```

---

## 배포 구조

### Railway 배포 구성

```
Railway Project
├── Backend Service
│   ├── GitHub: sgggg123/qr-guardian (backend/)
│   ├── 빌드: Dockerfile
│   ├── 포트: 8000
│   └── URL: https://xxx.up.railway.app
│
└── Frontend Service
    ├── GitHub: sgggg123/qr-guardian (frontend/)
    ├── 빌드: Dockerfile
    ├── 포트: 8080
    ├── 환경변수: VITE_API_URL=<Backend URL>
    └── URL: https://xxx.up.railway.app
```

### 자동 배포 흐름

```
git push origin main
       │
       ▼
GitHub 웹훅 → Railway 감지
       │
       ▼
Docker 이미지 빌드
       │
       ▼
컨테이너 배포
       │
       ▼
헬스체크 → 서비스 활성화
```

---

## API 명세

### POST /api/scan

QR 코드에서 추출한 URL을 분석합니다.

**Request:**
```json
{
  "url": "https://bit.ly/example"
}
```

**Response (성공):**
```json
{
  "status": "success",
  "data": {
    "original_url": "https://bit.ly/example",
    "final_url": "https://example.com/login",
    "risk_level": "YELLOW",
    "flags": [
      {
        "type": "shortened_url",
        "severity": "warning",
        "message": "단축 URL이 감지되었습니다"
      },
      {
        "type": "login_form",
        "severity": "warning",
        "message": "로그인 폼이 감지되었습니다"
      }
    ],
    "info_requirement": {
      "level": "MEDIUM",
      "evidence": ["이메일 입력 필드", "비밀번호 입력 필드"]
    },
    "safe_browsing": {
      "is_safe": true,
      "threats": []
    }
  }
}
```

**Response (에러):**
```json
{
  "status": "error",
  "message": "URL 분석에 실패했습니다",
  "detail": "Connection timeout"
}
```

### GET /health

서버 상태 확인

**Response:**
```json
{
  "status": "healthy",
  "service": "qr-guardian-api"
}
```

---

## 위험도 판정 기준

| 위험도 | 조건 | 예시 |
|--------|------|------|
| RED | Safe Browsing 위협 탐지 또는 DANGER 플래그 | 알려진 피싱 사이트 |
| YELLOW | WARNING 플래그 1개 이상 | 단축 URL, 로그인 페이지 |
| GREEN | 플래그 없음 | 일반적인 안전한 URL |

### 플래그 종류

| 타입 | 심각도 | 설명 |
|------|--------|------|
| shortened_url | WARNING | 단축 URL |
| suspicious_tld | WARNING | 의심스러운 TLD |
| ip_address | WARNING | IP 주소 사용 |
| typosquatting | DANGER | 브랜드 사칭 |
| phishing_pattern | DANGER | 피싱 URL 패턴 |
| login_form | WARNING | 로그인 폼 존재 |
| payment_form | WARNING | 결제 폼 존재 |
| safe_browsing_threat | DANGER | 알려진 악성 URL |
