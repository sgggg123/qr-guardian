# QR Guardian - QR 코드 보안 스캐너

패턴 기반 위협 탐지와 실시간 보안 분석을 제공하는 모바일 우선 PWA QR 코드 스캐너입니다.

## 주요 기능

- **QR 코드 스캔**: 카메라 실시간 스캔 + 이미지 업로드
- **URL 직접 입력**: QR 없이도 URL 검사 가능
- **위협 탐지**: 피싱, 타이포스쿼팅, 악성 URL 패턴 탐지
- **URL 분석**: 단축 URL 해제, 리다이렉트 체인 추적
- **SSL 인증서 분석**: 발급기관 신뢰도, 만료 상태, 도메인 나이
- **신뢰 점수**: 0~100점 종합 평가
- **자연어 요약**: 분석 결과를 한국어 2~3문장으로 요약
- **신호등 UI**: GREEN / YELLOW / RED 3단계 위험도
- **QR 코드 생성**: URL → QR 코드 이미지 생성 및 다운로드
- **스캔 기록**: 히스토리 + 통계
- **알림**: 위험도별 효과음 + 진동
- **PWA**: 홈 화면 추가, 오프라인 지원

## 기술 스택

| Frontend | Backend | 배포 |
|----------|---------|------|
| React 18 + TypeScript | FastAPI (Python 3.11+) | Railway |
| Vite + TailwindCSS | Pydantic v2 + httpx | Docker |
| html5-qrcode, qrcode.react | uvicorn + pytest | GitHub |

## 빠른 시작

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (새 터미널)
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API 문서: http://localhost:8000/api/docs

## 프로젝트 구조

```
qr/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI 앱 진입점
│       ├── core/config.py       # 설정 (화이트리스트, 브랜드 등)
│       ├── routers/scan.py      # POST /api/scan (파이프라인 오케스트레이터)
│       ├── services/
│       │   ├── url_analyzer.py      # 단축URL, 리다이렉트 추적
│       │   ├── threat_detector.py   # 위협 탐지 (타이포스쿼팅, 피싱 등)
│       │   ├── safe_browsing.py     # Google Safe Browsing API
│       │   ├── domain_analyzer.py   # SSL/도메인 분석
│       │   └── summary_generator.py # 자연어 요약 생성
│       └── models/schemas.py    # Pydantic 모델
├── frontend/
│   └── src/
│       ├── components/          # Layout, QRScanner, TrafficLight, ResultCard
│       ├── pages/               # Home, Result, History, Settings, Generate
│       ├── services/            # api, scanHistory, notifications, share
│       ├── contexts/            # ThemeContext
│       └── types/               # TypeScript 타입 정의
└── docs/
    └── SYSTEM_ARCHITECTURE.md   # 시스템 전체 설명서
```

## 상세 문서

시스템 아키텍처, 데이터 흐름, 위험도 판정 로직, 자연어 요약 시스템, 협업 가이드 등 상세 내용은 아래 문서를 참조하세요:

**[docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)**

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `GOOGLE_SAFE_BROWSING_API_KEY` | Safe Browsing API 키 | (없으면 Mock 모드) |
| `ENVIRONMENT` | 실행 환경 | `development` |
| `VITE_API_URL` | Backend URL (Frontend) | 프로덕션 Railway URL |

## 라이선스

MIT License
