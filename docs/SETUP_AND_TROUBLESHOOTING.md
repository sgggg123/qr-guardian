# QR Guardian — 설정 가이드 & 트러블슈팅

> 마지막 업데이트: 2026-02-21

---

## 1. 현재 시스템 동작 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 백엔드 서버 | ✅ 정상 | Railway 배포 중 |
| 프론트엔드 | ✅ 정상 | Railway 배포 중 |
| URL 스캔 (`/api/scan`) | ✅ 정상 | |
| 대량 스캔 (`/api/bulk-scan`) | ✅ 정상 | |
| URL 신고 (`/api/report`) | ✅ 정상 | |
| 타이포스쿼팅 탐지 | ✅ 정상 | |
| Google Safe Browsing | ✅ 정상 | API 키 설정됨 |
| Gemini AI 요약 (코드) | ✅ 정상 | SDK: google-genai, 모델: gemini-2.0-flash |
| Gemini AI 요약 (실행) | ⚠️ Free Tier 할당량 소진 | 익일 초기화 또는 유료 플랜 필요 |
| QR 카메라 스캔 | ✅ 정상 | |
| QR 이미지 붙여넣기 | ✅ 정상 | Ctrl+V |
| QR 코드 생성 | ✅ 정상 | |
| 스캔 히스토리 | ✅ 정상 | localStorage |
| 다크모드 / 알림음 / 진동 | ✅ 정상 | |

---

## 2. 필수 API 키 목록

### 2-1. Google Safe Browsing API Key
- **역할**: URL이 악성 사이트 DB에 등록됐는지 검사
- **없으면**: Safe Browsing 검사 스킵 (URL을 항상 안전으로 처리)
- **발급처**: [Google Cloud Console](https://console.cloud.google.com/) → API & Services → 사용 설정: "Safe Browsing API"
- **설정 위치**:
  - 로컬: `backend/.env` → `GOOGLE_SAFE_BROWSING_API_KEY=발급받은키`
  - Railway: Variables → `GOOGLE_SAFE_BROWSING_API_KEY=발급받은키`

### 2-2. Google Gemini API Key
- **역할**: 스캔 결과를 AI가 한국어로 요약 + 행동 수칙 생성
- **없으면**: AI 요약 없이 템플릿 기반 요약만 표시 (나머지 기능 정상)
- **발급처**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **현재 사용 SDK**: `google-genai` (구 `google-generativeai`는 deprecated)
- **현재 모델**: `gemini-2.0-flash`
- **설정 위치**:
  - 로컬: `backend/.env` → `GEMINI_API_KEY=발급받은키`
  - Railway: Variables → `GEMINI_API_KEY=발급받은키`

> **주의**: Google AI Studio Free Tier는 일일/분당 요청 한도가 있습니다.
> 한도 소진 시 AI 요약만 비활성되며 나머지 스캔 기능은 정상 작동합니다.

---

## 3. 환경변수 전체 목록

### `backend/.env` (로컬 개발용)

```env
# 실행 환경 (development | production)
ENVIRONMENT=development

# Google Safe Browsing API (필수 권장)
GOOGLE_SAFE_BROWSING_API_KEY=여기에_키_입력

# Google Gemini API (선택 — 없으면 AI 요약 비활성)
GEMINI_API_KEY=여기에_키_입력

# CORS 허용 도메인 (프론트엔드 주소)
BACKEND_CORS_ORIGINS=["http://localhost:5173","http://localhost:80"]
```

### Railway 대시보드 (프로덕션용)

Railway → 백엔드 서비스 → Variables 탭에서 아래 항목 설정:

| 변수명 | 값 | 필수 여부 |
|--------|-----|----------|
| `ENVIRONMENT` | `production` | 권장 |
| `GOOGLE_SAFE_BROWSING_API_KEY` | 발급받은 키 | 권장 |
| `GEMINI_API_KEY` | 발급받은 키 | 선택 |
| `BACKEND_CORS_ORIGINS` | 프론트엔드 URL 배열 | 필요 시 |

> Railway는 `.env` 파일을 읽지 않습니다. 반드시 Railway 대시보드 Variables에 직접 입력해야 합니다.

---

## 4. 로컬 실행 방법

### 백엔드

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 프론트엔드

```bash
cd frontend
npm ci
npm run dev
```

프론트엔드는 `http://localhost:5173`에서 실행되며,
백엔드를 `http://localhost:8000`으로 자동 연결합니다.

---

## 5. 트러블슈팅

### ❌ "Failed to fetch" — 프론트엔드에서 백엔드 연결 실패

**원인 및 해결**:

| 원인 | 확인 방법 | 해결 |
|------|----------|------|
| 백엔드 서버 다운 | `curl https://백엔드URL/health` | Railway 배포 로그 확인, 재배포 |
| CORS 오류 | 브라우저 개발자도구 → Network 탭 | `BACKEND_CORS_ORIGINS`에 프론트엔드 URL 추가 |
| 잘못된 API URL | 프론트엔드 `VITE_API_URL` 환경변수 | Railway 프론트엔드 Variables에서 `VITE_API_URL` 확인 |
| Railway 배포 실패 | Railway → Deployments 탭 | 빌드 로그에서 오류 확인 |
| `requirements.txt` 오류 | Railway 빌드 로그 | 패키지 설치 에러 수정 후 재push |

---

### ❌ AI 요약 / 행동 수칙이 표시 안 됨 (`ai_summary: null`)

**원인 및 해결**:

| 원인 | 확인 방법 | 해결 |
|------|----------|------|
| `GEMINI_API_KEY` 미설정 | Railway Variables 확인 | Railway에 `GEMINI_API_KEY` 추가 후 재배포 |
| Free Tier 일일 할당량 소진 | Railway 로그에 `429 RESOURCE_EXHAUSTED` | 익일 자정 이후 자동 초기화, 또는 유료 플랜 활성화 |
| Free Tier 분당 한도 초과 | 같은 429 오류, 잠시 후 재시도 | 1분 대기 후 자동 복구 |
| API 키 무효 | Railway 로그에 `401` 또는 `403` | [AI Studio](https://aistudio.google.com/app/apikey)에서 새 키 발급 |
| 잘못된 패키지 설치 | Railway 로그에 `ImportError` | `requirements.txt`에 `google-genai>=1.0.0` 확인 |

> AI 요약이 없어도 나머지 위험도 분석, 플래그, 요약 텍스트는 정상 표시됩니다.

---

### ❌ Google Safe Browsing이 작동 안 함

**원인 및 해결**:

| 원인 | 확인 방법 | 해결 |
|------|----------|------|
| `GOOGLE_SAFE_BROWSING_API_KEY` 미설정 | Railway Variables 확인 | Railway에 키 추가 |
| API 키 만료 / 비활성 | [Google Cloud Console](https://console.cloud.google.com/) 확인 | 키 재발급 또는 API 활성화 |
| Google Cloud 프로젝트 결제 미설정 | Cloud Console → 결제 | 결제 계정 연결 |

> Safe Browsing 미설정 시 URL을 항상 '안전'으로 처리합니다 (탐지 누락 가능).

---

### ❌ Railway 배포 후 변경사항이 반영 안 됨

```bash
# 로컬에서 변경 후 push하면 Railway 자동 배포 트리거
git add .
git commit -m "수정 내용"
git push origin main
```

- Railway → Deployments 탭에서 빌드 진행 상태 확인
- 환경변수 변경 후 자동 재시작이 안 되면 Railway → 서비스 → **Restart** 버튼 클릭

---

### ❌ 로컬에서 `uvicorn` 실행 시 `GEMINI_API_KEY not configured` 로그

`backend/.env` 파일에 키가 있는지 확인:

```bash
cat backend/.env | grep GEMINI
# GEMINI_API_KEY=AIzaSy... 가 출력되어야 정상
```

없으면 `backend/.env`에 직접 추가:
```env
GEMINI_API_KEY=발급받은키
```

---

### ❌ `ModuleNotFoundError: No module named 'google'`

`google-generativeai` (구버전, deprecated) 대신 `google-genai` (신버전)를 설치해야 합니다:

```bash
pip install google-genai>=1.0.0
# 또는
pip install -r backend/requirements.txt
```

---

### ❌ QR 카메라가 작동 안 함

| 원인 | 해결 |
|------|------|
| 브라우저 카메라 권한 거부 | 브라우저 주소창 옆 🔒 → 카메라 허용 |
| HTTP 환경 (카메라 API는 HTTPS 필요) | `https://` 주소로 접속 |
| 카메라 없는 기기 | 파일 업로드 또는 URL 직접 입력 사용 |

---

## 6. API 키 발급 빠른 가이드

### Google Safe Browsing API Key
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **API 및 서비스** → **라이브러리** → "Safe Browsing API" 검색 → **사용 설정**
4. **API 및 서비스** → **사용자 인증 정보** → **API 키 만들기**
5. 발급된 키를 `GOOGLE_SAFE_BROWSING_API_KEY`에 입력

### Google Gemini API Key
1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. **Create API key** 클릭
3. 프로젝트 선택 후 키 생성
4. 발급된 키를 `GEMINI_API_KEY`에 입력
5. Free Tier 한도: 분당 15회, 일 1,500회 (gemini-2.0-flash 기준)
6. 한도 초과 시: [AI Studio → Billing](https://aistudio.google.com/) 에서 유료 플랜 활성화

---

## 7. 현재 배포 URL

| 서비스 | URL |
|--------|-----|
| 백엔드 API | `https://qr-guardianbackend-production.up.railway.app` |
| 백엔드 헬스체크 | `https://qr-guardianbackend-production.up.railway.app/health` |

---

## 8. 빠른 상태 확인 명령어

```bash
# 백엔드 서버 살아있는지 확인
curl https://qr-guardianbackend-production.up.railway.app/health

# 실제 스캔 동작 + AI 요약 확인
curl -s -X POST https://qr-guardianbackend-production.up.railway.app/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://gooogle.com"}' | python3 -m json.tool | grep -E "risk_level|ai_summary|action"
```

**정상 응답 예시**:
```json
"risk_level": "RED",
"ai_summary": "이 사이트는 ...",
"action_guidelines": ["...", "..."]
```

**AI 요약 없는 응답 예시** (키 미설정 또는 할당량 소진):
```json
"risk_level": "RED",
"ai_summary": null,
"action_guidelines": null
```
