# QR Guardian 빠른 참조

---

## 사전 요구사항

- Python 3.11+
- Node.js 18+ / npm 9+

---

## 로컬 실행

```bash
# 백엔드
cd backend
python -m venv venv                         # 최초 1회
source venv/bin/activate                    # Windows: venv\Scripts\activate
pip install -r requirements.txt             # 최초 1회
uvicorn app.main:app --reload --port 8000

# 프론트엔드 (새 터미널)
cd frontend && npm install                  # 최초 1회
npm run dev
```

| 주소 | 용도 |
|------|------|
| http://localhost:5173 | 앱 화면 |
| http://localhost:8000/api/docs | API 문서 (개발 환경만) |
| http://localhost:8000/health | 서버 상태 |

**프론트엔드가 로컬 백엔드에 연결하려면** `frontend/.env.local` 생성:
```
VITE_API_URL=http://localhost:8000
```

---

## 환경변수 (.env)

프로젝트 루트에 `.env` 생성 (`.env.example` 복사):

| 변수 | 필수 | 설명 |
|------|------|------|
| `GOOGLE_SAFE_BROWSING_API_KEY` | 선택 | 미설정 시 Safe Browsing 스킵 |
| `GEMINI_API_KEY` | 선택 | 미설정 시 AI 요약 비활성 |
| `ENVIRONMENT` | - | `development` / `production` |

> 두 키가 로컬에도 설정되면 Railway와 **100% 동일하게 동작**합니다.

---

## 테스트

```bash
cd backend && source venv/bin/activate
python -m pytest tests/ -v          # 전체 테스트 (49건)
python -m pytest tests/ -v -k yellow  # 키워드 필터
```

```bash
cd frontend && npx tsc --noEmit     # 타입 체크
```

CI: GitHub Actions에서 PR/push 시 자동 실행 (`.github/workflows/ci.yml`)

---

## API 빠른 테스트

```bash
# 안전한 URL
curl -s -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://google.com"}' | python3 -m json.tool

# 위험한 URL (타이포스쿼팅)
curl -s -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://navar.com"}' | python3 -m json.tool

  -H "Content-Type: application/json" \
  -d '{"urls":["https://google.com","https://navar.com"]}' | python3 -m json.tool

# URL 신고
curl -s -X POST http://localhost:8000/api/report \
  -H "Content-Type: application/json" \
  -d '{"url":"https://suspicious-site.com","reason":"피싱 의심"}' | python3 -m json.tool
```

---

## 코드 흐름 (핵심 구조)

```
[프론트엔드]                           [백엔드]
Home.tsx                               scan.py (오케스트레이터)
  └─ scanUrl() ─── POST /api/scan ──→   ├─ url_analyzer: 단축URL 해제, 리다이렉트 추적
  handlePaste()  (Ctrl+V QR 붙여넣기)   ├─ threat_detector: URL 패턴, 페이지 콘텐츠 분석
                                         ├─ safe_browsing: Google API 위협 조회
                                         ├─ domain_analyzer: SSL, WHOIS, risk_score 산출
                                         ├─ _calculate_flag_risk(): 플래그 기반 위험도 추가
                                         ├─ _calculate_risk_level(): GREEN/YELLOW/RED 판정
                                         ├─ summary_generator: 템플릿 한국어 요약
                                         └─ ai_summarizer: Gemini AI 요약 (선택)
  ←── ScanResponse (JSON) ──────────
Result.tsx
  └─ 신호등 + AI 요약 + 행동 수칙 + 상세 카드
```

**핵심: `scan.py`가 오케스트레이터**입니다. 5개 서비스를 순서대로 호출하고, 결과를 모아서 위험도를 판정합니다.

---

## 핵심 파일

| 하고 싶은 것 | 파일 |
|-------------|------|
| 전체 분석 파이프라인 | `backend/app/routers/scan.py` |
| 위험도 판정 로직 수정 | `backend/app/routers/scan.py` → `_calculate_risk_level()`, `_calculate_flag_risk()` |
| risk_score 가중치 변경 | `backend/app/services/domain_analyzer.py` + `scan.py`의 `_calculate_flag_risk()` |
| 위협 탐지 규칙 수정 | `backend/app/services/threat_detector.py` |
| 화이트리스트 도메인 추가 | `backend/app/core/config.py` → `TRUSTED_DOMAINS` |
| 타이포스쿼팅 브랜드 추가 | `backend/app/core/config.py` → `POPULAR_BRANDS` |
| 단축URL 서비스 추가 | `backend/app/core/config.py` → `SHORTENER_DOMAINS` |
| 요약 메시지 수정 | `backend/app/services/summary_generator.py` |
| AI 요약 프롬프트 수정 | `backend/app/services/ai_summarizer.py` |
| 결과 화면 UI | `frontend/src/pages/Result.tsx` |
| API 응답 필드 추가 | `schemas.py` + `types/index.ts` **둘 다 수정** |
| QR 스캔 / 붙여넣기 | `frontend/src/pages/Home.tsx` |

---

## 페이지 구조

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Home | QR 스캔 + URL 입력 + Ctrl+V 붙여넣기 |
| `/result` | Result | 분석 결과 (신호등, AI 요약, 행동 수칙, 스크린샷, 신고) |
| `/history` | History | 스캔 기록 + 통계 (클릭 시 상세 재열람) |
| `/settings` | Settings | 테마, 효과음, 진동 |
| `/generate` | Generate | QR 코드 생성 |
| `/help` | Help | 사용 가이드 + 탐지 체험 3종 데모 |

---

## 위험도 판정

```
risk_score = ssl(0~3) + domain_age(0~4) + whois_failure(0~1)
           + safe_browsing(0~2) + url_pattern(0~3)
```

| 색 | 조건 (우선순위 순) |
|----|------------------|
| GREEN | 신뢰 도메인(TRUSTED_DOMAINS) + Safe Browsing 안전 → 즉시 GREEN |
| RED | Safe Browsing 위협 탐지 |
| RED | 타이포스쿼팅 / 피싱 패턴 플래그 |
| RED | risk_score ≥ 7.0 |
| YELLOW | risk_score ≥ 3.0 |
| YELLOW | WARNING 수준 플래그 있음 |
| GREEN | 그 외 |

---

## 코드 수정 시 주의사항

1. **schemas.py 수정 시**: 프론트엔드 `types/index.ts`도 동기화 필요
2. **점수 가중치 변경 시**: `domain_analyzer.py`의 breakdown과 `scan.py`의 `_calculate_flag_risk()` 양쪽 확인
3. **새 플래그 추가 시**: `threat_detector.py` → `_calculate_flag_risk()` → `summary_generator.py` 순서로 반영
4. **환경변수 추가 시**: `config.py` + `.env.example` 동시 업데이트

---

## Rate Limiting

| 엔드포인트 | 제한 |
|------------|------|
| `POST /api/scan` | 30회/분 (IP당) |
| `POST /api/report` | 10회/분 (IP당) |

---

## Railway 배포

```bash
git push origin main    # → Railway 자동 배포 (1~2분 소요)
```

Railway 대시보드 > 백엔드 서비스 > **Variables** 탭에서 환경변수 설정:

| Variable | 설명 |
|----------|------|
| `ENVIRONMENT` | `production` (API 문서 비활성화) |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Safe Browsing API 키 |
| `GEMINI_API_KEY` | Google Gemini API 키 |

---

## API 키 발급

**Google Safe Browsing API**
1. [Google Cloud Console](https://console.cloud.google.com/) → "API 및 서비스" → "라이브러리"에서 Safe Browsing API 검색 → 사용 설정
2. "사용자 인증 정보" → "API 키" 발급

**Google Gemini API**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) → "Create API key"

---

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| AI 요약 없음 | `GEMINI_API_KEY` 미설정 또는 Free Tier 한도 소진 | `.env`에 키 추가 / 모델 교체 참고 |
| Safe Browsing 항상 안전 | `GOOGLE_SAFE_BROWSING_API_KEY` 미설정 | `.env`에 키 추가 |
| CORS 오류 | 프론트 도메인 허용 목록 없음 | `BACKEND_CORS_ORIGINS`에 도메인 추가 |
| 미리보기 실패 | Microlink 일일 한도 초과 | 다음 날 리셋 or 재시도 버튼 |
| WHOIS 조회 실패 | 일부 TLD 미지원 | 정상 동작 (whois_failure +1점 처리) |
| npm 꼬임 | - | `rm -rf frontend/node_modules && npm install` |
| venv 꼬임 | - | `rm -rf backend/venv && python -m venv venv && pip install -r requirements.txt` |
| 포트 점유 | - | `lsof -i :8000` (Mac/Linux) / `netstat -ano \| findstr :8000` (Windows) |
