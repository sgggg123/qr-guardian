# QR Guardian 빠른 참조

## 실행

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (새 터미널)
cd frontend && npm run dev
```

| 주소 | 용도 |
|------|------|
| http://localhost:5173 | 앱 화면 |
| http://localhost:8000/api/docs | API 문서 (개발 환경만) |
| http://localhost:8000/health | 서버 상태 |

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

# 벌크 스캔 (여러 URL 일괄)
curl -s -X POST http://localhost:8000/api/bulk-scan \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://google.com","https://navar.com"]}' | python3 -m json.tool

# URL 신고
curl -s -X POST http://localhost:8000/api/report \
  -H "Content-Type: application/json" \
  -d '{"url":"https://suspicious-site.com","reason":"피싱 의심"}' | python3 -m json.tool
```

---

## 페이지 구조

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | Home | QR 스캔 + URL 입력 |
| `/result` | Result | 분석 결과 (신호등, 요약, 스크린샷, 신고) |
| `/history` | History | 스캔 기록 + 통계 (클릭 시 상세 재열람) |
| `/settings` | Settings | 테마, 효과음, 진동 |
| `/generate` | Generate | QR 코드 생성 |
| `/bulk` | BulkScan | 벌크 URL 검사 (최대 20개) |

---

## 자주 수정하는 파일

| 하고 싶은 것 | 파일 |
|-------------|------|
| 화이트리스트 도메인 추가 | `backend/app/core/config.py` → `TRUSTED_DOMAINS` |
| 타이포스쿼팅 브랜드 추가 | `backend/app/core/config.py` → `POPULAR_BRANDS` |
| 단축URL 서비스 추가 | `backend/app/core/config.py` → `SHORTENER_DOMAINS` |
| 위협 탐지 규칙 수정 | `backend/app/services/threat_detector.py` |
| 요약 메시지 수정 | `backend/app/services/summary_generator.py` |
| 결과 화면 UI | `frontend/src/pages/Result.tsx` |
| API 응답 필드 추가 | `schemas.py` + `types/index.ts` **둘 다 수정** |

---

## 스캔 파이프라인 순서

```
URL 입력 → 캐시 확인 → 단축URL 확인 → 리다이렉트 추적 → URL 구조 분석
→ 콘텐츠 분석 → Safe Browsing → 도메인/SSL 분석 (WHOIS + 비동기 SSL)
→ 위험도 계산 → 플래그 중복제거 → 요약 생성 → 캐시 저장 → 응답
```

---

## 위험도 한눈에

| 색 | 조건 |
|----|------|
| RED | DANGER 플래그 있음, Safe Browsing 위협, 신뢰점수 30 미만 |
| YELLOW | WARNING 다수, 신뢰점수 60 미만, 유의미한 WARNING |
| GREEN | 위 해당 없음 (화이트리스트 도메인은 무조건 GREEN) |

---

## Rate Limiting

| 엔드포인트 | 제한 |
|------------|------|
| `POST /api/scan` | 30회/분 (IP당) |
| `POST /api/bulk-scan` | 5회/분 (IP당) |
| `POST /api/report` | 10회/분 (IP당) |

---

## 배포

```bash
git push origin main    # → Railway 자동 배포
```

---

## 문제 해결

```bash
# npm 꼬였을 때
rm -rf frontend/node_modules && cd frontend && npm install

# venv 꼬였을 때
rm -rf backend/venv
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# 포트 점유 확인
lsof -i :8000       # Mac/Linux
netstat -ano | findstr :8000   # Windows
```
