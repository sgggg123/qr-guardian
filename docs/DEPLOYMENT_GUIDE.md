# 실행 및 배포 가이드

## 1. 로컬 개발 환경

### 사전 요구사항
- Python 3.11+
- Node.js 18+
- npm 9+

### 백엔드 실행

```bash
cd backend

# 가상환경 생성 (최초 1회)
python -m venv venv

# 가상환경 활성화
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정 (프로젝트 루트에)
cp ../.env.example ../.env
# .env 파일에서 API 키 입력 (선택사항)

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- 문서: http://localhost:8000/api/docs (development 모드만)

### 프론트엔드 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

- 앱: http://localhost:5173

### 로컬에서 백엔드 연결 확인

프론트엔드가 로컬 백엔드에 연결하려면 `frontend/.env.local`을 생성:

```
VITE_API_URL=http://localhost:8000
```

---

## 2. Railway 배포

### 초기 배포 (이미 설정된 경우 스킵)

프로젝트는 main 브랜치 push 시 Railway에 자동 배포됩니다.

### 환경변수 설정

Railway 대시보드 > 프로젝트 > 백엔드 서비스 > **Variables** 탭:

| Variable | 값 | 설명 |
|----------|---|------|
| `ENVIRONMENT` | `production` | 프로덕션 모드 (API 문서 비활성화) |
| `GOOGLE_SAFE_BROWSING_API_KEY` | API 키 | [Google Cloud Console](https://console.cloud.google.com/) > Safe Browsing API 활성화 후 발급 |
| `CLAUDE_API_KEY` | API 키 | [console.anthropic.com](https://console.anthropic.com/) > API Keys에서 발급 |
| `BACKEND_CORS_ORIGINS` | JSON 배열 | 허용 도메인 (Railway가 자동 설정) |

**값을 입력하면 Railway가 자동 재배포합니다.** 키 없이도 서비스는 정상 동작하며, 해당 기능만 비활성됩니다.

### 배포 확인

```bash
# 헬스체크
curl https://your-backend.up.railway.app/health

# 스캔 테스트
curl -X POST https://your-backend.up.railway.app/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://google.com"}'
```

### 업데이트 배포

```bash
git add -A
git commit -m "feat: 변경 설명"
git push origin main
# Railway 자동 배포 시작 (보통 1~2분 소요)
```

---

## 3. API 키 발급 가이드

### Google Safe Browsing API

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. "API 및 서비스" > "라이브러리"에서 **Safe Browsing API** 검색 > 사용 설정
4. "API 및 서비스" > "사용자 인증 정보" > "사용자 인증 정보 만들기" > **API 키**
5. 발급된 키를 `GOOGLE_SAFE_BROWSING_API_KEY`에 설정

### Claude API (Anthropic)

1. [console.anthropic.com](https://console.anthropic.com/) 접속
2. 계정 생성/로그인
3. "API Keys" > "Create Key"
4. 발급된 키를 `CLAUDE_API_KEY`에 설정

---

## 4. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| AI 요약이 null | `CLAUDE_API_KEY` 미설정 | 환경변수에 키 추가 |
| Safe Browsing 항상 safe | `GOOGLE_SAFE_BROWSING_API_KEY` 미설정 | 환경변수에 키 추가 |
| CORS 오류 | 프론트엔드 도메인이 허용 목록에 없음 | `BACKEND_CORS_ORIGINS`에 도메인 추가 |
| 미리보기 실패 | Microlink API 일일 한도(50회) 초과 | 다음 날 자동 리셋. 재시도 버튼 클릭 |
| WHOIS 조회 실패 | 일부 TLD는 WHOIS 미지원 | 정상 동작. whois_failure +1점 처리 |
| 타입스크립트 에러 | `npm install` 미실행 | `cd frontend && npm install` |
