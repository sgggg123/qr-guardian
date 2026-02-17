# QR Guardian - QR 코드 보안 스캐너

패턴 기반 위협 탐지와 실시간 보안 분석을 제공하는 모바일 우선 PWA QR 코드 스캐너입니다.

## 주요 기능

- **QR 코드 스캔**: 카메라 실시간 스캔 + 이미지 업로드 + Ctrl+V 붙여넣기
- **URL 직접 입력**: QR 없이도 URL 검사 가능
- **위협 탐지**: 피싱, 타이포스쿼팅, 악성 URL 패턴 탐지
- **URL 분석**: 단축 URL 해제, 리다이렉트 체인 추적
- **SSL 인증서 분석**: 발급기관 신뢰도, 만료 상태, 도메인 나이
- **위험도 점수**: 0~10점 위험도 체계 + 세부 항목별 점수
- **AI 요약**: Claude API 기반 한국어 분석 요약 + 행동 수칙
- **자연어 요약**: 템플릿 기반 한국어 2~3문장 요약 (AI 미사용시 fallback)
- **신호등 UI**: GREEN / YELLOW / RED 3단계 위험도
- **벌크 스캔**: 최대 20개 URL 동시 검사
- **QR 코드 생성**: URL -> QR 코드 이미지 생성 및 다운로드
- **스캔 기록**: 히스토리 + 통계
- **URL 신고**: 위험 URL 신고 + 분석 결과 자동 연동
- **사이트 미리보기**: 접속 없이 스크린샷 확인 (재시도 + 타임아웃 지원)
- **알림**: 위험도별 효과음 + 진동
- **PWA**: 홈 화면 추가, 오프라인 지원

## 기술 스택

| Frontend | Backend | 배포 |
|----------|---------|------|
| React 18 + TypeScript | FastAPI (Python 3.11+) | Railway |
| Vite + TailwindCSS | Pydantic v2 + httpx | Docker |
| html5-qrcode, jsQR, qrcode.react | anthropic SDK, python-whois | GitHub |

## 빠른 시작

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env  # 환경변수 설정
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
│       ├── main.py                    # FastAPI 앱 진입점
│       ├── core/
│       │   ├── config.py              # 설정 (API 키, 화이트리스트, 브랜드 등)
│       │   ├── logging.py             # 구조화 JSON 로깅
│       │   └── rate_limiter.py        # IP 기반 Rate Limiting
│       ├── routers/
│       │   ├── scan.py                # POST /api/scan (메인 파이프라인)
│       │   ├── bulk.py                # POST /api/bulk-scan
│       │   └── report.py             # POST /api/report, GET /api/reports/stats
│       ├── services/
│       │   ├── url_analyzer.py        # 단축URL, 리다이렉트 추적
│       │   ├── threat_detector.py     # 위협 탐지 (타이포스쿼팅, 피싱 등)
│       │   ├── safe_browsing.py       # Google Safe Browsing API (실제 API 전용)
│       │   ├── domain_analyzer.py     # SSL/도메인/WHOIS 분석 + risk_score
│       │   ├── summary_generator.py   # 템플릿 기반 자연어 요약
│       │   └── ai_summarizer.py       # Claude API 기반 AI 요약
│       └── models/schemas.py          # Pydantic 모델
├── frontend/
│   └── src/
│       ├── components/                # Layout, QRScanner, TrafficLight, ResultCard
│       ├── pages/                     # Home, Result, History, Settings, Generate, BulkScan, Help
│       ├── services/                  # api, scanHistory, notifications, share
│       ├── contexts/                  # ThemeContext
│       └── types/                     # TypeScript 타입 정의
├── docs/                              # 상세 문서
├── .env.example                       # 환경변수 템플릿
└── CHANGELOG_IMPROVEMENT.md           # 변경 이력
```

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `GOOGLE_SAFE_BROWSING_API_KEY` | 선택 | Google Safe Browsing API 키. 미설정시 위협 검사 스킵 |
| `CLAUDE_API_KEY` | 선택 | Anthropic Claude API 키. 미설정시 AI 요약 비활성 |
| `ENVIRONMENT` | 선택 | `development` 또는 `production` (기본: development) |
| `VITE_API_URL` | 선택 | Backend URL (Frontend용). 미설정시 Railway 프로덕션 URL |

## 위험도 점수 체계

0~10점 가점 방식 (높을수록 위험):

| 요인 | 최대 | 기준 |
|------|------|------|
| domain_age | 4.0 | <30일:4, <90일:2, <1년:1, 그 이상:0 |
| ssl | 3.0 | HTTP:3, 만료/저신뢰:2, 곧 만료:1, 정상:0 |
| safe_browsing | 2.0 | 위협 감지:2, 없음:0 |
| url_pattern | 3.0 | 타이포스쿼팅/피싱:3, 의심TLD/IP:2, 로그인경로:1 |
| whois_failure | 1.0 | 조회 실패:1, 성공:0 |

위험 레벨 판정: 0~2.9 GREEN, 3~6.9 YELLOW, 7+ RED (flags 포함 종합 판단)

## 상세 문서

- [시스템 아키텍처](docs/SYSTEM_ARCHITECTURE.md)
- [코드 워크스루](docs/CODE_WALKTHROUGH.md)
- [기능별 코드 맵](docs/FEATURE_CODE_MAP.md)
- [변경 이력](CHANGELOG_IMPROVEMENT.md)
- [실행/배포 가이드](docs/DEPLOYMENT_GUIDE.md)

## 라이선스

MIT License
