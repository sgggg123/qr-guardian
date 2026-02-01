# QR Guardian 실행 가이드

## 빠른 시작

### 1. 업데이트 및 빌드 (권장)
```bash
./update.sh
```
이 스크립트가 자동으로:
- Frontend 의존성 업데이트
- Backend 의존성 업데이트
- Frontend 빌드

### 2. 실행

**방법 A: 개별 실행 (개발용)**
```bash
# 터미널 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 터미널 2 - Frontend
cd frontend
npm run dev
```
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

**방법 B: Docker (전체 스택)**
```bash
docker-compose -f docker-compose.dev.yml up
```

---

## 협업 워크플로우

### 브랜치 구조
```
main   ← 배포용 (Railway 자동 배포)
  └── dev   ← 개발용
```

### 작업 흐름
```bash
# 1. 최신 코드 받기
git checkout dev
git pull origin dev

# 2. 작업 후 커밋
git add .
git commit -m "feat: 새 기능 추가"
git push origin dev

# 3. 배포 (main에 병합)
git checkout main
git merge dev
git push origin main
```

### 커밋 메시지
- `feat:` 새 기능
- `fix:` 버그 수정
- `docs:` 문서 수정

---

## 주요 파일 위치

| 수정 대상 | 파일 경로 |
|----------|----------|
| UI/스타일 | `frontend/src/index.css` |
| QR 스캐너 | `frontend/src/components/QRScanner.tsx` |
| 결과 화면 | `frontend/src/pages/Result.tsx` |
| 위협 탐지 | `backend/app/services/threat_detector.py` |
| 설정값 | `backend/app/core/config.py` |

---

## 문제 해결

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
