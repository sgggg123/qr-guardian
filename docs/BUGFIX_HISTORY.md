# 주요 변경 기록

---

## 10. 점수 체계 보정, QR 붙여넣기, 미리보기 개선 (`0153930`)

### 변경 내용

**탐지 정확도**
- `_calculate_flag_risk()` 추가 — 타이포스쿼팅(+3), 피싱 패턴(+3), 의심 TLD(+2), IP 주소(+2) 등 플래그 기반 `url_pattern` risk_score 반영
- risk_level 판정에 risk_score 연동 (≥7.0 → RED, ≥3.0 → YELLOW)
- HTTP + 플래그 없음에도 GREEN이 되던 버그 수정 (`fake-bank-login.com` 등)
- `domain_analyzer.py`의 `expired_cert` 오타 수정

**기능 추가**
- QR 이미지 Ctrl+V 붙여넣기 — jsQR 라이브러리로 클립보드 이미지에서 QR 코드 자동 디코딩 → URL 자동 분석
- 미리보기 15초 타임아웃 + 실패 시 재시도 버튼

**버그 수정**
- `scanHistory.ts` TypeScript 타입 에러 수정

**문서**
- docs/DEPLOYMENT_GUIDE.md (로컬/Railway 실행 + API 키 발급 가이드)
- docs/BEGINNER_GUIDE.md (코드 흐름, 핵심 파일, 수정 가이드)
- README.md 전면 업데이트

### 수정/추가 파일

| 파일 | 변경 |
|------|------|
| `backend/app/routers/scan.py` | `_calculate_flag_risk()` 추가, risk_level 판정 개선 |
| `backend/app/services/domain_analyzer.py` | expired_cert 오타 수정 |
| `frontend/src/pages/Home.tsx` | Ctrl+V 붙여넣기 핸들러 (jsQR) |
| `frontend/src/pages/Result.tsx` | 미리보기 타임아웃 + 재시도 버튼 |
| `frontend/src/services/scanHistory.ts` | TS 타입 에러 수정 |
| `docs/DEPLOYMENT_GUIDE.md` | **(신규)** 배포 가이드 |
| `docs/BEGINNER_GUIDE.md` | **(신규)** 초보자 가이드 |
| `README.md` | 전면 업데이트 |

---

## 9. 도메인 위험도 분석 전면 개선 (`1df0e0e`)

### 변경 내용

**위험도 점수 체계 (trust_score → risk_score)**
- `domain_analyzer.py`: 100점 감점 방식 → 0~10점 가점 방식 (`risk_score`) 전환
- `risk_breakdown` — 요소별 세부 점수 및 사유 목록 추가
- 기존 `trust_score`는 하위 호환용으로 유지

**Safe Browsing mock 제거**
- `safe_browsing.py`의 mock 모드 코드 전면 삭제
- API 키 없거나 호출 실패 시 `(True, [])` 반환 + 경고 로그로 처리

**AI 요약 서비스 추가**
- `services/ai_summarizer.py` 신규 — Anthropic Claude API 기반 한국어 AI 요약 + 행동 수칙 생성
- 환경변수 `CLAUDE_API_KEY` 설정 시 활성화, 미설정/실패 시 템플릿 요약으로 fallback

**신고 기능 연동**
- 신고 시 `risk_score`, `ai_summary`를 신고 데이터에 포함

**프론트엔드**
- 위험도 바: `trust_score/100` → `risk_score/10` 체계로 전환 (높을수록 위험)
- AI 요약 카드 + 행동 수칙 카드 추가

### 수정/추가 파일

| 파일 | 변경 |
|------|------|
| `backend/app/services/domain_analyzer.py` | risk_score + risk_breakdown 도입 |
| `backend/app/services/safe_browsing.py` | mock 코드 전면 제거 |
| `backend/app/services/ai_summarizer.py` | **(신규)** Claude AI 요약 서비스 |
| `backend/app/routers/scan.py` | AI 요약 호출, 스키마 업데이트 |
| `backend/app/routers/report.py` | 신고 데이터에 risk_score/ai_summary 추가 |
| `backend/app/models/schemas.py` | risk_score, risk_breakdown, ai_summary, action_guidelines 필드 |
| `frontend/src/types/index.ts` | 신규 필드 타입 추가 |
| `frontend/src/pages/Result.tsx` | AI 요약/행동 수칙 카드, 위험도 바 개선 |
| `frontend/src/components/ResultCard.tsx` | DomainAnalysisCard risk_score/10 전환 |
| `frontend/src/services/api.ts` | reportUrl에 riskScore, aiSummary 파라미터 추가 |

---

## 8. 미리보기 스크린샷 서비스 교체 (`93712f5`)

### 변경 내용

**버그 수정**
- thum.io가 400 에러를 반환하여 미리보기가 동작하지 않던 문제 수정
- microlink.io API로 교체 (200 OK + image/png 정상 반환 확인)

### 수정 파일

| 파일 | 변경 |
|------|------|
| `frontend/src/services/api.ts` | `getScreenshotUrl()` — thum.io URL → microlink.io URL |

---

## 7. 도움말 페이지, 신고 영속 저장, 요약 UI 개선 (`2299a2d`)

### 변경 내용

**기능 추가**
- 도움말 페이지 신규 (`/help`): 사용 가이드 + 탐지 체험 3종 데모
- 헤더에 `?` 버튼 추가 → `/help` 링크

**신고**
- 신고 저장소: 인메모리 → JSON 파일 영속 저장 (`data/reports.json`)
- 신고 응답에 해당 URL 누적 신고 횟수 포함

**UX**
- 요약 카드: 위험도별 색상 배경 + 아이콘으로 가시성 개선
- 미리보기: 로딩 스켈레톤 + 실패 시 안내 메시지 표시

**인프라**
- slowapi Limiter 인스턴스 통합 (`core/rate_limiter.py`)
- 테스트 캐시 간섭 수정 (autouse fixture)

### 수정/추가 파일

| 파일 | 변경 |
|------|------|
| `frontend/src/pages/Help.tsx` | **(신규)** 도움말 페이지 |
| `frontend/src/components/Header.tsx` | `?` 버튼 추가 |
| `frontend/src/App.tsx` | `/help` 라우트 추가 |
| `backend/app/routers/report.py` | JSON 파일 영속 저장, 누적 신고 횟수 반환 |
| `backend/app/core/rate_limiter.py` | **(신규)** Limiter 인스턴스 분리 |
| `frontend/src/pages/Result.tsx` | 요약 카드 색상/아이콘, 미리보기 스켈레톤 |

---

## 6. P2 전체 개선 (`2e104cd`)

### 변경 내용

**탐지 정확도**
- 타이포스쿼팅: 브랜드 4자 이하일 때 유사도 기준 0.7 → 0.85로 상향하여 오탐 감소
- 한국어 피싱 패턴 25종 추가 (택배 사칭, 정부기관 사칭, 금융 사칭, 경조사 사칭 등)

**성능**
- SSL 분석을 동기 `socket.create_connection` → 비동기 `asyncio.open_connection`으로 변환

**UX**
- 스캔 중 스켈레톤 로딩 UI (신호등 + 요약 + 카드 placeholder 깜빡임)
- 공유 텍스트에 자연어 요약(`summary`) 포함
- Result 페이지에 사이트 스크린샷 미리보기 (Microlink 외부 API)
- Result 페이지에 URL 신고 버튼

**기능 추가**
- 벌크 스캔: `POST /api/bulk-scan` + `/bulk` 페이지 (최대 20개 URL, `asyncio.gather` 병렬 처리)
- URL 신고: `POST /api/report` + `GET /api/reports/stats` (인메모리 저장, 최대 1000건)

**테스트**
- `test_threat_detector.py` — 타이포스쿼팅, 피싱 패턴 등 26건 단위 테스트

**인프라**
- 구조화된 JSON 로깅 시스템 (`app/core/logging.py`)
- 스캔 소요 시간 로그 기록

### 수정/추가 파일

| 파일 | 변경 |
|------|------|
| `backend/app/services/threat_detector.py` | 적응형 유사도 기준, 한국어 피싱 패턴 |
| `backend/app/services/domain_analyzer.py` | 비동기 SSL 분석 |
| `backend/app/core/logging.py` | **(신규)** JSON 구조화 로깅 |
| `backend/app/routers/bulk.py` | **(신규)** 벌크 스캔 API |
| `backend/app/routers/report.py` | **(신규)** URL 신고 API |
| `backend/tests/test_threat_detector.py` | **(신규)** 위협 탐지 테스트 |
| `frontend/src/pages/BulkScan.tsx` | **(신규)** 벌크 스캔 페이지 |
| `frontend/src/pages/Home.tsx` | 스켈레톤 로딩 |
| `frontend/src/pages/Result.tsx` | 스크린샷 미리보기, 신고 버튼 |
| `frontend/src/services/api.ts` | bulkScanUrls, reportUrl, getScreenshotUrl |
| `frontend/src/services/share.ts` | 요약 포함 |
| `frontend/src/App.tsx` | `/bulk` 라우트 추가 |

---

## 5. P0/P1 보안·성능·UX 개선 (`4054f70`)

### 변경 내용

**보안 (P0)**
- CORS `allow_origins=["*"]` 제거 → `config.py`의 `BACKEND_CORS_ORIGINS` 기반으로 변경. 와일드카드 패턴(`*.railway.app`)은 `allow_origin_regex`로 처리
- 프로덕션 환경에서 API 문서(`/api/docs`, `/api/redoc`) 비활성화

**보안 (P1)**
- slowapi 기반 IP당 Rate Limiting 추가 (스캔 30회/분)
- 429 Too Many Requests 핸들러 등록

**탐지 정확도 (P1)**
- `python-whois`로 실제 WHOIS 도메인 등록일 조회. 실패 시 SSL 인증서 발급일로 fallback
- Safe Browsing Mock 모드 표시 (이후 mock 전면 제거 → 실제 API 전용으로 변경)

**성능 (P1)**
- `final_url` 기준 인메모리 TTL 캐시 (10분, 최대 500건). 동일 URL 재스캔 시 캐시 반환

**UX (P1)**
- 히스토리 항목 클릭 → Result 페이지로 이동 (최근 20건은 전체 ScanData 저장)
- 전체 컴포넌트 라이트 모드 완성 (`tailwind.config.js`에 `darkMode: 'class'` 설정)

**테스트·인프라 (P1)**
- `test_scan_api.py` — FastAPI TestClient 기반 통합 테스트 12건
- `.github/workflows/ci.yml` — pytest + tsc --noEmit 자동화

### 수정 파일

| 파일 | 변경 |
|------|------|
| `backend/app/main.py` | CORS 제한, API 문서 비활성화, Rate Limiting, 라우터 등록 |
| `backend/app/routers/scan.py` | 캐시, Rate Limiting, mock_mode 반환, 로깅 |
| `backend/app/services/domain_analyzer.py` | WHOIS 도메인 나이 조회 |
| `backend/app/services/safe_browsing.py` | Safe Browsing 서비스 (mock은 이후 제거) |
| `backend/app/models/schemas.py` | 벌크/신고 스키마 (mock_mode는 이후 제거) |
| `backend/requirements.txt` | slowapi, python-whois 추가 |
| `frontend/tailwind.config.js` | `darkMode: 'class'` |
| `frontend/src/components/*.tsx` | 라이트 모드 스타일 |
| `frontend/src/pages/*.tsx` | 라이트 모드 + 히스토리 상세보기 |
| `frontend/src/services/scanHistory.ts` | ScanData 전체 저장 |
| `frontend/src/types/index.ts` | 타입 정의 (mock_mode는 이후 제거) |
| `.github/workflows/ci.yml` | **(신규)** CI 파이프라인 |
| `backend/tests/test_scan_api.py` | **(신규)** API 통합 테스트 |

---

## 6. P2 전체 개선 (`2e104cd`)

### 변경 내용

**탐지 정확도**
- 타이포스쿼팅: 브랜드 4자 이하일 때 유사도 기준 0.7 → 0.85로 상향하여 오탐 감소
- 한국어 피싱 패턴 25종 추가 (택배 사칭, 정부기관 사칭, 금융 사칭, 경조사 사칭 등)

**성능**
- SSL 분석을 동기 `socket.create_connection` → 비동기 `asyncio.open_connection`으로 변환

**UX**
- 스캔 중 스켈레톤 로딩 UI (신호등 + 요약 + 카드 placeholder 깜빡임)
- 공유 텍스트에 자연어 요약(`summary`) 포함
- Result 페이지에 사이트 스크린샷 미리보기 (Microlink 외부 API)
- Result 페이지에 URL 신고 버튼

**기능 추가**
- 벌크 스캔: `POST /api/bulk-scan` + `/bulk` 페이지 (최대 20개 URL, `asyncio.gather` 병렬 처리)
- URL 신고: `POST /api/report` + `GET /api/reports/stats` (인메모리 저장, 최대 1000건)

**테스트**
- `test_threat_detector.py` — 타이포스쿼팅, 피싱 패턴 등 26건 단위 테스트

**인프라**
- 구조화된 JSON 로깅 시스템 (`app/core/logging.py`)
- 스캔 소요 시간 로그 기록

### 수정/추가 파일

| 파일 | 변경 |
|------|------|
| `backend/app/services/threat_detector.py` | 적응형 유사도 기준, 한국어 피싱 패턴 |
| `backend/app/services/domain_analyzer.py` | 비동기 SSL 분석 |
| `backend/app/core/logging.py` | **(신규)** JSON 구조화 로깅 |
| `backend/app/routers/bulk.py` | **(신규)** 벌크 스캔 API |
| `backend/app/routers/report.py` | **(신규)** URL 신고 API |
| `backend/tests/test_threat_detector.py` | **(신규)** 위협 탐지 테스트 |
| `frontend/src/pages/BulkScan.tsx` | **(신규)** 벌크 스캔 페이지 |
| `frontend/src/pages/Home.tsx` | 스켈레톤 로딩 |
| `frontend/src/pages/Result.tsx` | 스크린샷 미리보기, 신고 버튼 |
| `frontend/src/services/api.ts` | bulkScanUrls, reportUrl, getScreenshotUrl |
| `frontend/src/services/share.ts` | 요약 포함 |
| `frontend/src/App.tsx` | `/bulk` 라우트 추가 |

---

## 4. 자연어 요약 기능 추가 (`9fac138`)

### 배경

스캔 결과가 신호등 + 플래그 목록 + 도메인 분석 카드 등으로 나뉘어져 있어서, 한눈에 "그래서 이게 안전한 건지 위험한 건지"를 파악하기 어려웠음.

### 추가 내용

스캔 결과를 **한국어 2~3문장으로 요약**하는 `summary_generator.py` 모듈 추가.

기존 `_calculate_risk_level()` 및 파이프라인은 **일체 수정하지 않고**, 파이프라인 마지막에 요약 생성 단계만 추가.

### 실제 출력 예시

| 시나리오 | 요약 |
|----------|------|
| google.com (GREEN, trusted) | "Google 공식 사이트입니다. 안심하고 이용하셔도 됩니다." |
| navar.com (RED, typosquatting) | "이 사이트는 위험할 수 있습니다. 'naver'을(를) 사칭하는 것으로 의심됩니다." |
| bit.ly → figma.com (GREEN) | "Figma 공식 사이트입니다. 단축 URL로 실제 목적지가 숨겨져 있습니다." |

### 변경 파일

- `backend/app/services/summary_generator.py` **(신규)**
- `backend/app/models/schemas.py` — `ScanData`에 `summary: str` 필드 추가
- `backend/app/routers/scan.py` — `generate_summary()` 호출 추가
- `backend/tests/test_summary_generator.py` **(신규)** — 11개 테스트
- `frontend/src/types/index.ts` — `summary: string` 추가
- `frontend/src/pages/Result.tsx` — 요약 카드 표시

---

## 3. 리다이렉트 시 원본 URL 타이포스쿼팅 검사 누락 (`3eb0357`)

### 증상

`naverr.com` → `naver.com` 리다이렉트 시 최종 URL만 검사하여 사칭을 놓침.

### 수정

원본 URL과 최종 URL이 다르면 원본에 대해서도 타이포스쿼팅 검사 추가.

### 수정 파일

- `backend/app/routers/scan.py`
- `backend/app/services/threat_detector.py`

---

## 2. 타이포스쿼팅 탐지 버그 — 양방향 char_map (`3eb0357`)

### 증상

정상 도메인이 타이포스쿼팅으로 오탐되거나, 실제 사칭 도메인을 놓치는 문제.

### 수정

- 양방향 매핑 → 단방향 `normalize()` 함수 (가짜→진짜)
- 문자 차이 허용: 1개 → 2개로 확대

### 수정 파일

- `backend/app/services/threat_detector.py`

---

## 1. 신뢰 도메인 오탐지 — toss.im, google.com 등이 YELLOW/RED (`9cb5944`)

### 원인

- `twitter:card` 메타태그가 결제 폼으로 오탐
- 신뢰 도메인에 SSL/도메인 risk factor 플래그 부착
- 신뢰 도메인의 로그인/결제 폼이 WARNING으로 위험도 상승

### 수정

- 결제 폼 패턴을 `<input>` 태그 내부만 탐지하도록 변경
- 신뢰 도메인이면 SSL/도메인 risk factor 스킵
- 신뢰 도메인의 개인정보/결제 플래그를 INFO로 다운그레이드

### 수정 파일

- `backend/app/routers/scan.py`
- `backend/app/services/threat_detector.py`
