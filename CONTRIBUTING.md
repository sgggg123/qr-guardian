# QR Guardian 협업 가이드

## 저장소 구조

| 브랜치 | 용도 | 배포 |
|--------|------|------|
| `main` | 안정 버전 (배포용) | Railway 자동 배포 |
| `dev` | 개발/협업용 | 배포 안 됨 |

---

## 처음 시작하기

### 1. 저장소 복제
```bash
git clone https://github.com/sgggg123/qr-guardian.git
cd qr-guardian
```

### 2. dev 브랜치로 전환
```bash
git checkout dev
```

### 3. 로컬 실행 (테스트용)

**필수 설치:**
- Node.js 18+
- Python 3.11+

**Backend 실행:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend 실행 (새 터미널):**
```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8000

---

## 작업 흐름

### 1. 최신 코드 받기
```bash
git checkout dev
git pull origin dev
```

### 2. 코드 수정
원하는 파일 수정

### 3. 변경사항 커밋
```bash
git add .
git commit -m "변경 내용 설명"
```

### 4. 푸시
```bash
git push origin dev
```

---

## 배포하기 (main에 병합)

⚠️ **주의:** main에 병합하면 자동으로 배포됩니다!

### 방법 1: GitHub에서 Pull Request (권장)
1. GitHub에서 `dev` → `main` Pull Request 생성
2. 검토 후 Merge

### 방법 2: 직접 병합
```bash
git checkout main
git merge dev
git push origin main
```

---

## 프로젝트 구조

```
qr-guardian/
├── frontend/          # React 프론트엔드
│   ├── src/
│   │   ├── components/  # UI 컴포넌트
│   │   ├── pages/       # 페이지
│   │   ├── hooks/       # 커스텀 훅
│   │   └── services/    # API 호출
│   └── package.json
├── backend/           # FastAPI 백엔드
│   ├── app/
│   │   ├── routers/     # API 엔드포인트
│   │   ├── services/    # 비즈니스 로직
│   │   └── models/      # 데이터 모델
│   └── requirements.txt
└── docker-compose.yml
```

---

## 주요 파일 설명

| 파일 | 설명 |
|------|------|
| `frontend/src/components/QRScanner.tsx` | QR 스캔 기능 |
| `frontend/src/components/TrafficLight.tsx` | 신호등 UI |
| `frontend/src/pages/Home.tsx` | 메인 페이지 |
| `frontend/src/pages/Result.tsx` | 결과 페이지 |
| `backend/app/routers/scan.py` | /api/scan 엔드포인트 |
| `backend/app/services/threat_detector.py` | 위협 탐지 로직 |
| `backend/app/services/url_analyzer.py` | URL 분석 |

---

## 문의

문제가 있으면 GitHub Issues에 등록해주세요.
