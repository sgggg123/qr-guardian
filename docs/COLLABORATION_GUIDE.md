# QR Guardian 협업 및 실행 가이드

## 목차
1. [사전 준비](#사전-준비)
2. [프로젝트 설정](#프로젝트-설정)
3. [로컬 실행 방법](#로컬-실행-방법)
4. [협업 워크플로우](#협업-워크플로우)
5. [코드 수정 가이드](#코드-수정-가이드)
6. [배포 방법](#배포-방법)
7. [문제 해결](#문제-해결)

---

## 사전 준비

### 필수 설치 프로그램

| 프로그램 | 최소 버전 | 다운로드 |
|----------|----------|----------|
| Node.js | 18.0 이상 | https://nodejs.org |
| Python | 3.11 이상 | https://python.org |
| Git | 2.0 이상 | https://git-scm.com |

### 설치 확인

터미널에서 아래 명령어로 확인:

```bash
node --version    # v18.0.0 이상
npm --version     # 9.0.0 이상
python --version  # 3.11 이상
git --version     # 2.0 이상
```

### 권장 도구

- **VS Code**: 코드 에디터
  - 확장: ESLint, Prettier, Python, Tailwind CSS IntelliSense
- **Postman** 또는 **Thunder Client**: API 테스트

---

## 프로젝트 설정

### 1단계: 저장소 복제

```bash
# 프로젝트 다운로드
git clone https://github.com/sgggg123/qr-guardian.git

# 프로젝트 폴더로 이동
cd qr-guardian

# 협업용 브랜치로 전환
git checkout dev
```

### 2단계: Backend 설정

```bash
# backend 폴더로 이동
cd backend

# 가상환경 생성 (최초 1회)
python -m venv venv

# 가상환경 활성화
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 프로젝트 루트로 돌아가기
cd ..
```

### 3단계: Frontend 설정

```bash
# frontend 폴더로 이동
cd frontend

# 의존성 설치
npm install

# 프로젝트 루트로 돌아가기
cd ..
```

---

## 로컬 실행 방법

### 방법 1: 개별 실행 (개발용, 권장)

**터미널 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
→ http://localhost:8000 에서 실행
→ API 문서: http://localhost:8000/api/docs

**터미널 2 - Frontend:**
```bash
cd frontend
npm run dev
```
→ http://localhost:5173 에서 실행

### 방법 2: Docker Compose (전체 스택)

```bash
# 개발 모드 실행
docker-compose -f docker-compose.dev.yml up

# 종료
docker-compose -f docker-compose.dev.yml down
```

### 실행 확인

1. 브라우저에서 http://localhost:5173 접속
2. "카메라 시작" 또는 URL 직접 입력
3. 분석 결과 확인

### 테스트용 URL

| URL | 예상 결과 |
|-----|----------|
| https://google.com | GREEN (안전) |
| https://bit.ly/test | YELLOW (단축 URL) |
| https://192.168.1.1 | YELLOW (IP 주소) |
| https://g00gle.com | RED (타이포스쿼팅) |

---

## 협업 워크플로우

### 브랜치 구조

```
main   ← 배포용 (Railway 자동 배포)
  │
  └── dev   ← 협업/개발용 (여기서 작업)
```

### 기본 작업 흐름

```
1. 최신 코드 받기
       │
       ▼
2. dev 브랜치에서 작업
       │
       ▼
3. 변경사항 커밋
       │
       ▼
4. dev에 푸시
       │
       ▼
5. (검토 후) main에 병합 → 자동 배포
```

### 상세 명령어

#### 작업 시작 전 (매번)

```bash
# dev 브랜치 확인
git checkout dev

# 최신 코드 받기
git pull origin dev
```

#### 작업 완료 후

```bash
# 변경된 파일 확인
git status

# 모든 변경사항 스테이징
git add .

# 커밋 (메시지는 구체적으로)
git commit -m "feat: QR 스캔 속도 개선"

# 푸시
git push origin dev
```

### 커밋 메시지 규칙

```
<타입>: <설명>

타입:
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 수정
- style: 코드 포맷팅
- refactor: 코드 리팩토링
- test: 테스트 추가

예시:
feat: 다크모드 추가
fix: QR 스캔 시 카메라 멈춤 현상 수정
docs: README 업데이트
```

---

## 코드 수정 가이드

### Frontend 수정

#### UI 변경 (색상, 레이아웃)
```
파일: frontend/src/index.css
      frontend/tailwind.config.js
```

#### QR 스캐너 수정
```
파일: frontend/src/components/QRScanner.tsx
      frontend/src/hooks/useScanner.ts
```

#### 결과 화면 수정
```
파일: frontend/src/pages/Result.tsx
      frontend/src/components/ResultCard.tsx
      frontend/src/components/TrafficLight.tsx
```

#### API 연동 수정
```
파일: frontend/src/services/api.ts
```

### Backend 수정

#### 위협 탐지 로직 추가/수정
```
파일: backend/app/services/threat_detector.py

예: 새로운 위협 패턴 추가
1. analyze_url_structure() 함수에 새 검사 추가
2. Flag 객체 생성하여 반환
```

#### URL 분석 로직 수정
```
파일: backend/app/services/url_analyzer.py
```

#### API 응답 형식 수정
```
파일: backend/app/models/schemas.py
      backend/app/routers/scan.py
```

#### 설정값 변경 (TLD 목록 등)
```
파일: backend/app/core/config.py
```

### 수정 예시: 새로운 위협 탐지 추가

**목표:** ".scam" TLD를 위험으로 탐지

**1. config.py 수정:**
```python
SUSPICIOUS_TLDS: List[str] = [
    ".xyz", ".top", ".scam",  # .scam 추가
    ...
]
```

**2. threat_detector.py 확인:**
```python
# 이미 SUSPICIOUS_TLDS를 체크하므로 자동 적용됨
if domain_info["tld"] in self.suspicious_tlds:
    flags.append(Flag(...))
```

**3. 테스트:**
```bash
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.scam"}'
```

---

## 배포 방법

### 자동 배포 (권장)

main 브랜치에 병합하면 Railway가 자동 배포합니다.

```bash
# dev에서 작업 완료 후
git checkout main
git pull origin main
git merge dev
git push origin main
# → Railway 자동 배포 시작
```

### GitHub에서 Pull Request (더 안전)

1. GitHub 접속: https://github.com/sgggg123/qr-guardian
2. "Pull requests" 탭 클릭
3. "New pull request" 클릭
4. base: main ← compare: dev 선택
5. "Create pull request" 클릭
6. 검토 후 "Merge pull request" 클릭

### 배포 확인

1. Railway 대시보드 접속
2. 각 서비스의 Deployments 탭 확인
3. "Success" 상태 확인
4. 공개 URL로 접속하여 테스트

---

## 문제 해결

### 자주 발생하는 문제

#### 1. npm install 오류

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

#### 2. Python 가상환경 문제

```bash
# 가상환경 재생성
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 3. 포트 충돌

```bash
# 사용 중인 포트 확인 (Mac/Linux)
lsof -i :8000
lsof -i :5173

# 프로세스 종료
kill -9 <PID>
```

```powershell
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

#### 4. Git 충돌

```bash
# 현재 변경사항 임시 저장
git stash

# 최신 코드 받기
git pull origin dev

# 저장한 변경사항 복원
git stash pop

# 충돌 파일 수동 수정 후
git add .
git commit -m "merge: 충돌 해결"
```

#### 5. CORS 오류 (브라우저 콘솔)

Backend가 실행 중인지 확인:
```bash
curl http://localhost:8000/health
```

#### 6. 카메라 접근 불가

- HTTPS가 필요합니다 (localhost는 예외)
- 브라우저 설정에서 카메라 권한 확인
- 다른 앱이 카메라 사용 중인지 확인

### 도움 요청

1. GitHub Issues 등록: https://github.com/sgggg123/qr-guardian/issues
2. 오류 메시지 전체 복사
3. 실행 환경 (OS, 브라우저, Node/Python 버전) 포함

---

## 부록: 유용한 명령어

### Git

```bash
# 현재 브랜치 확인
git branch

# 변경사항 확인
git status
git diff

# 커밋 히스토리
git log --oneline

# 마지막 커밋 취소 (푸시 전)
git reset --soft HEAD~1

# 변경사항 임시 저장
git stash
git stash pop
```

### npm

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

### Python

```bash
# 가상환경 활성화
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows

# 가상환경 비활성화
deactivate

# 패키지 설치
pip install <패키지명>

# requirements.txt 업데이트
pip freeze > requirements.txt
```

### API 테스트

```bash
# URL 분석 요청
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}'

# 헬스체크
curl http://localhost:8000/health
```
