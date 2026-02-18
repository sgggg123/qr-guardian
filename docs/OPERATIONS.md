# QR Guardian 운영 가이드

> 로컬 개발 환경 실행 / Railway 프로덕션 배포 / API 키 설정 / 데이터 관리

---

## 환경 비교

| 항목 | 로컬 (개발) | Railway (프로덕션) |
|------|------------|------------------|
| API 키 설정 | `backend/.env` 파일 | Railway 대시보드 Variables |
| API 문서 접근 | `/api/docs` 가능 | **비활성화** |
| 로그 레벨 | DEBUG (상세) | INFO (간결) |
| 신고 데이터 | `backend/data/reports.json` 영속 | 재배포 시 초기화 ⚠️ |
| 기능 자체 | API 키 설정 여부에 따라 결정 | 동일 |

> **로컬과 Railway 기능은 완전히 동일**합니다. API 키가 양쪽에 모두 설정되어 있으면 동작도 100% 같습니다.

---

## 1. 로컬 실행

### 사전 요구사항
- Python 3.11+
- Node.js 18+ / npm 9+

### 백엔드

```bash
cd backend

# 최초 1회: 가상환경 + 의존성 설치
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

### 프론트엔드

```bash
cd frontend
npm install                     # 최초 1회
npm run dev
```

| 주소 | 내용 |
|------|------|
| http://localhost:5173 | 앱 화면 |
| http://localhost:8000/api/docs | API 문서 (로컬만) |
| http://localhost:8000/health | 서버 상태 확인 |

### 프론트엔드 → 로컬 백엔드 연결

`frontend/.env.local` 파일 생성:

```
VITE_API_URL=http://localhost:8000
```

---

## 2. API 키 설정

### 로컬: `backend/.env`

```
GOOGLE_SAFE_BROWSING_API_KEY=AIzaSy...키입력...
CLAUDE_API_KEY=sk-ant-...키입력...
```

파일 위치: `qr/backend/.env` (이 파일은 git에 올라가지 않음 — `.gitignore` 보호)

서버 재시작하면 즉시 적용.

### Railway: 대시보드 Variables

Railway 대시보드 → 백엔드 서비스 → **Variables** 탭:

| Variable 이름 | 값 |
|--------------|---|
| `GOOGLE_SAFE_BROWSING_API_KEY` | API 키 붙여넣기 |
| `CLAUDE_API_KEY` | API 키 붙여넣기 |
| `ENVIRONMENT` | `production` |

Variables 저장 시 Railway가 **자동 재배포**합니다. `.env` 파일은 Railway에 업로드하는 게 아님.

### 키별 동작

| 키 | 설정됨 | 미설정 |
|----|-------|-------|
| `GOOGLE_SAFE_BROWSING_API_KEY` | Google 위협 DB 실시간 조회 | 검사 스킵 (항상 안전 처리) |
| `CLAUDE_API_KEY` | AI 한국어 요약 + 행동 수칙 생성 | 템플릿 요약만 표시 |

### API 키 발급

**Google Safe Browsing**
1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 선택
2. "API 및 서비스" → "라이브러리" → Safe Browsing API 검색 → 사용 설정
3. "사용자 인증 정보" → "API 키" 생성

**Claude (Anthropic)**
1. [console.anthropic.com](https://console.anthropic.com/) 접속
2. "API Keys" → "Create Key"

---

## 3. Railway 배포

### 자동 배포 흐름

```
git push origin main
    → GitHub webhook 트리거
    → Railway가 Docker 빌드
    → 백엔드 + 프론트엔드 각각 배포
    → 보통 1~2분 소요
```

### 배포 확인

```bash
# 헬스체크
curl https://your-backend.up.railway.app/health

# 스캔 테스트
curl -X POST https://your-backend.up.railway.app/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://google.com"}'
```

### 배포 후 코드 변경사항

코드 변경 → commit → push만 하면 Railway가 자동 감지하여 재배포.
Variables(API 키)는 재배포해도 유지됨.

---

## 4. 데이터 관리

### 신고 데이터 (reports.json)

| 환경 | 위치 | 주의사항 |
|------|------|---------|
| 로컬 | `backend/data/reports.json` | 영속 저장됨 ✅ |
| Railway | `/app/data/reports.json` (컨테이너 내부) | **재배포 시 초기화** ⚠️ |

Railway에서 신고 데이터를 영속화하려면 외부 DB(PostgreSQL 등) 연동이 필요합니다. 현재는 운영 중 데이터가 쌓이다가 재배포 시 초기화됩니다.

### 신고 통계 조회

```bash
# 신고 많은 순
GET /api/reports/stats

# 위험도 높은 순
GET /api/reports/stats?sort_by=risk_score
```

### 캐시

스캔 결과는 인메모리 TTL 캐시(10분, 최대 500건)에 저장됩니다. 서버 재시작 시 초기화됩니다.

---

## 5. 로그 확인

### 로컬

uvicorn 터미널에 JSON 구조화 로그가 출력됩니다:

```json
{"timestamp": "2026-02-18T...", "level": "INFO", "logger": "qr_guardian.scan",
 "message": "Scan complete", "url": "https://example.com", "risk_level": "GREEN", "duration_ms": 312}
```

### Railway

Railway 대시보드 → 백엔드 서비스 → **Logs** 탭에서 실시간 확인 가능.

---

## 6. 환경변수 전체 목록

| 변수 | 기본값 | 설명 |
|------|-------|------|
| `ENVIRONMENT` | `development` | `production` 설정 시 API 문서 비활성화 + INFO 로그 |
| `GOOGLE_SAFE_BROWSING_API_KEY` | `""` | Google 위협 DB 키 (없으면 스킵) |
| `CLAUDE_API_KEY` | `""` | Anthropic Claude AI 키 (없으면 AI 요약 비활성) |
| `BACKEND_CORS_ORIGINS` | localhost 목록 | 프론트엔드 허용 도메인 (JSON 배열) |

---

## 7. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| AI 요약 없음 | `CLAUDE_API_KEY` 미설정 | `backend/.env` 또는 Railway Variables에 키 추가 |
| Safe Browsing 항상 안전 | `GOOGLE_SAFE_BROWSING_API_KEY` 미설정 | 키 추가 |
| CORS 오류 | 프론트 도메인이 허용 목록에 없음 | `BACKEND_CORS_ORIGINS`에 도메인 추가 |
| 미리보기 실패 | Microlink API 일일 50회 한도 초과 | 다음 날 자동 리셋 / 재시도 버튼 |
| 신고 데이터 없어짐 | Railway 재배포 | 예상된 동작. 영속화 필요 시 DB 연동 |
| WHOIS 조회 실패 | 일부 TLD 미지원 | 정상 동작 (whois_failure +1점 처리) |
| `npm install` 오류 | node_modules 꼬임 | `rm -rf frontend/node_modules && npm install` |
| `pip install` 오류 | venv 꼬임 | `rm -rf backend/venv && python -m venv venv && pip install -r requirements.txt` |
| 포트 8000 점유 | 기존 프로세스 | `lsof -i :8000 \| grep LISTEN` → PID kill |
