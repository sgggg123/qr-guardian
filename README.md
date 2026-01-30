# QR Guardian - QR 코드 보안 스캐너

AI 기반 위협 탐지와 실시간 보안 분석을 제공하는 PWA QR 코드 스캐너입니다.

## 주요 기능

- **QR 코드 스캔**: 카메라를 통한 실시간 QR 코드 스캔 및 이미지 업로드
- **AI 기반 위협 탐지**: 패턴 기반 피싱 탐지, 타이포스쿼팅 탐지
- **URL 분석**: 단축 URL 해제, 리다이렉트 추적, 최종 목적지 확인
- **SSL 인증서 분석**: 인증서 발급기관 신뢰도, 만료일, 도메인 나이 분석
- **리다이렉트 체인 시각화**: 전체 리다이렉트 경로를 단계별로 표시
- **신뢰 점수 시스템**: 0-100점 기반의 종합 위험도 평가
- **보안 데이터베이스 검사**: Google Safe Browsing API 연동 (선택)
- **대형 사이트 화이트리스트**: google.com, naver.com 등 신뢰할 수 있는 도메인 자동 인식
- **PWA 지원**: 오프라인 모드, 홈 화면 추가

## 기술 스택

### Frontend
- React 18 + TypeScript
- Vite (빌드 도구)
- TailwindCSS (스타일링)
- html5-qrcode (QR 스캔)
- Workbox (PWA/Service Worker)

### Backend
- FastAPI (Python 3.11+)
- Pydantic v2 (데이터 검증)
- httpx (비동기 HTTP)

### Infrastructure
- Docker + Docker Compose
- Nginx (리버스 프록시)

## 빠른 시작

### 개발 환경

```bash
# 전체 스택 실행 (Docker)
docker-compose -f docker-compose.dev.yml up

# 또는 개별 실행
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install
npm run dev
```

개발 서버:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/api/docs

### 프로덕션 배포

```bash
# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 실행
docker-compose up -d
```

프로덕션 서버: http://localhost

## 프로젝트 구조

```
qr/
├── frontend/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/       # UI 컴포넌트
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── services/         # API 서비스
│   │   ├── hooks/            # 커스텀 훅
│   │   └── types/            # TypeScript 타입
│   └── public/               # 정적 파일
├── backend/                  # FastAPI 백엔드
│   └── app/
│       ├── routers/          # API 라우터
│       ├── services/         # 비즈니스 로직
│       ├── models/           # Pydantic 모델
│       └── core/             # 설정
├── nginx/                    # Nginx 설정
├── docker-compose.yml        # 프로덕션 Docker 설정
└── docker-compose.dev.yml    # 개발 Docker 설정
```

## API 엔드포인트

### POST /api/scan

QR 코드에서 추출한 URL을 분석합니다.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "original_url": "https://bit.ly/xxx",
    "final_url": "https://example.com/login",
    "risk_level": "YELLOW",
    "flags": [
      {
        "type": "shortened_url",
        "severity": "warning",
        "message": "단축 URL이 감지되었습니다"
      }
    ],
    "info_requirement": {
      "level": "MEDIUM",
      "evidence": ["이메일 입력 필드", "비밀번호 입력 필드"]
    },
    "safe_browsing": {
      "is_safe": true,
      "threats": []
    },
    "domain_analysis": {
      "domain": "example.com",
      "ssl_info": {
        "issuer": "Let's Encrypt",
        "trust_level": "low",
        "is_expired": false,
        "days_until_expiry": 45
      },
      "domain_age_days": 120,
      "trust_score": 75,
      "risk_factors": []
    },
    "redirect_chain": [
      {"url": "https://bit.ly/xxx", "status_code": 0, "domain": "bit.ly"},
      {"url": "https://example.com/login", "status_code": 301, "domain": "example.com"}
    ]
  }
}
```

### GET /health

서버 상태 확인

## 위험 수준

| 수준 | 설명 |
|------|------|
| GREEN | 안전 - 위험 요소 없음 |
| YELLOW | 주의 - 의심스러운 요소 감지 |
| RED | 위험 - 보안 위협 감지 |

## 탐지 기능

### URL 구조 분석
- 의심스러운 TLD 감지 (.xyz, .tk 등)
- IP 주소 사용 탐지
- 비표준 포트 사용 탐지
- 긴 서브도메인 탐지

### 타이포스쿼팅 탐지
- 유명 브랜드 유사 도메인 탐지
- 문자 치환 패턴 탐지 (0/o, 1/l 등)

### 콘텐츠 분석
- 로그인 폼 탐지
- 개인정보 입력 필드 탐지
- 결제 정보 요청 탐지

### SSL 인증서 분석 (차별화 기능)
- **발급기관 신뢰도 평가**: DigiCert, GlobalSign 등 유료 인증서 vs Let's Encrypt 무료 인증서
- **만료 상태 검사**: 만료된 인증서, 곧 만료될 인증서 경고
- **도메인 나이 추정**: 인증서 발급일 기준 도메인 신규성 평가

### 리다이렉트 체인 분석 (차별화 기능)
- **전체 경로 추적**: 시작점부터 최종 목적지까지 모든 단계 기록
- **도메인 변경 탐지**: 여러 도메인을 거치는 의심스러운 리다이렉트 감지
- **HTTP 상태 코드 표시**: 각 단계의 응답 상태 확인

### 신뢰 점수 시스템 (차별화 기능)
- 0-100점 기반 종합 평가
- SSL, 도메인 나이, 콘텐츠 등 다중 요소 반영
- 점수대별 색상 시각화 (녹색/노랑/빨강)

### 외부 API 연동
- Google Safe Browsing API (API 키 필요)
- Mock 모드 지원 (API 키 없이 개발)

### 화이트리스트 시스템
- 신뢰할 수 있는 대형 사이트 자동 인식
- google.com, naver.com, kakao.com, youtube.com 등 포함
- 서브도메인도 자동 인식 (예: mail.google.com)

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| ENVIRONMENT | 실행 환경 | development |
| GOOGLE_SAFE_BROWSING_API_KEY | Safe Browsing API 키 | (없음) |
| BACKEND_CORS_ORIGINS | CORS 허용 출처 | ["http://localhost:5173"] |

## 테스트

### QR 코드 스캔 테스트
1. 모바일 브라우저에서 앱 접속
2. 카메라 권한 허용
3. QR 코드 스캔

### URL 분석 테스트
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

## PWA 설치

1. 모바일 브라우저에서 앱 접속
2. 브라우저 메뉴에서 "홈 화면에 추가" 선택
3. 앱처럼 사용

## 라이선스

MIT License
