# QR Guardian 변경 이력

> 최종 업데이트: 2026-02-23

---

## 2026-02-23 변경 이력

### 버그 수정

| 항목 | 내용 | 커밋 |
|------|------|------|
| PWA 아이콘 수정 | `icon-192x192.png`, `icon-512x512.png`가 ASCII 텍스트 파일로 저장되어 브라우저가 이미지로 인식 못 함 → Python Pillow로 정상 PNG 바이너리 재생성 | `71d5be1` |
| Railway 백엔드 크래시 수정 | Railway Variables에 설정된 `BACKEND_CORS_ORIGINS` 값이 잘못된 JSON 형식(닫는 `]` 누락)으로 pydantic 파싱 오류 발생 → 해당 환경변수 삭제 (코드 기본값 사용) | - |

> **교훈**: Railway Variables에 `BACKEND_CORS_ORIGINS` 같은 JSON 배열 타입 환경변수를 설정할 때는 반드시 유효한 JSON 형식으로 입력해야 합니다. 가능하면 코드 기본값을 활용하고 환경변수는 설정하지 않는 것이 안전합니다.

---

## 2026-02-21 변경 이력

### AI 엔진 전환 (Claude → Google Gemini)

| 항목 | 변경 전 | 변경 후 | 커밋 |
|------|---------|---------|------|
| AI SDK | `anthropic` | `google-genai` | `235d8c2` |
| AI 모델 | `claude-haiku-4-5` | `gemini-2.5-flash` | `726a337` |
| 환경변수 | `CLAUDE_API_KEY` | `GEMINI_API_KEY` | `235d8c2` |
| 구버전 SDK 교체 | `google-generativeai` (deprecated) | `google-genai>=1.0.0` | `b4eae20` |

> **배경**: `google-generativeai` 패키지 공식 지원 종료 + `gemini-2.0-flash` Free Tier 소진 이슈로 `gemini-2.5-flash`로 교체

### UX 개선

| 항목 | 내용 | 커밋 |
|------|------|------|
| 스캔 로딩 UI | 스피너 단일 텍스트 → 7단계 진행 메시지 + 퍼센트 프로그레스 바 + 단계 인디케이터 | `5794d31` |
| 요약 카드 통합 | 템플릿/AI 카드 2개 분리 → 1개 통합 (AI 우선 표시, 실패 시 템플릿 자동 폴백) | `5794d31` |

### 문서화

| 파일 | 내용 | 커밋 |
|------|------|------|
| `docs/CODE_AUDIT.md` | 전체 코드 감사 보고서 최초 작성 | `1dc5380` |
| `docs/SETUP_AND_TROUBLESHOOTING.md` | 설정 가이드 + 트러블슈팅 최초 작성 | `116efc0` |
| `docs/QUICKSTART.md` | CLAUDE_API_KEY → GEMINI_API_KEY 전체 교체 | `287cdd4` |

---

## 개선 이력 요약

### 보안

| 우선순위 | 항목 | 커밋 |
|----------|------|------|
| **P0** | CORS `allow_origins=["*"]` → config 기반 origin + regex 제한 | `4054f70` |
| **P0** | 프로덕션 API 문서(`/api/docs`, `/api/redoc`) 비활성화 | `4054f70` |
| **P0** | Safe Browsing mock 제거 → 실제 API 전용 (미설정 시 0점 처리) | `1df0e0e` |
| **P1** | slowapi 기반 Rate Limiting (스캔 30/분, 벌크 5/분, 신고 10/분) | `4054f70` |

### 탐지 정확도

| 우선순위 | 항목 | 커밋 |
|----------|------|------|
| **P0** | 위험도 점수 체계 변경 (trust_score → risk_score 0~10점 가점) + risk_breakdown | `1df0e0e` |
| **P1** | python-whois로 실제 도메인 등록일 조회 (SSL fallback 유지) | `4054f70` |
| **P1** | URL 패턴 위험도 반영 — `_calculate_flag_risk()` (타이포스쿼팅/피싱/의심TLD 등) | `0153930` |
| **P2** | 타이포스쿼팅 오탐 개선 — 브랜드 4자 이하 시 유사도 기준 0.85로 상향 | `2e104cd` |
| **P2** | 한국어 피싱 패턴 25종 추가 (택배·정부기관·금융·경조사 사칭) | `2e104cd` |
| **P2** | 신고 데이터에 분석 결과 연동 (risk_score, ai_summary 포함) | `1df0e0e` |

### 성능

| 우선순위 | 항목 | 커밋 |
|----------|------|------|
| **P1** | 스캔 결과 인메모리 TTL 캐시 (10분, 최대 500건) | `4054f70` |
| **P2** | SSL 분석 `asyncio.open_connection` 비동기 변환 | `2e104cd` |

### 기능 추가

| 우선순위 | 항목 | 커밋 |
|----------|------|------|
| **P1** | Claude AI 요약 서비스 (`ai_summarizer.py`, CLAUDE_API_KEY) | `1df0e0e` |
| **P1** | QR 이미지 Ctrl+V 붙여넣기 (jsQR 클립보드 디코딩) | `0153930` |
| **P2** | 벌크 스캔 — 최대 20개 URL 일괄 검사 (`/api/bulk-scan` + `/bulk` 페이지) | `2e104cd` |
| **P2** | URL 신고 기능 + 인메모리 저장 + 관리 통계 API (`/api/report`) | `2e104cd` |
| **P2** | 신고 영속 저장 — JSON 파일 (`data/reports.json`) + 누적 신고 횟수 반환 | `2299a2d` |
| **P2** | 도움말 페이지 (`/help`) — 사용 가이드 + 탐지 체험 3종 데모 | `2299a2d` |

### UX / Frontend

| 우선순위 | 항목 | 커밋 |
|----------|------|------|
| **P1** | 히스토리 클릭 → 상세 결과 재열람 (최근 20건 ScanData 저장) | `4054f70` |
| **P1** | 라이트 모드 전체 완성 (`darkMode: 'class'` + 모든 컴포넌트) | `4054f70` |
| **P1** | AI 요약 카드 + 행동 수칙 카드 (Result 페이지) | `1df0e0e` |
| **P2** | 스캔 중 스켈레톤 로딩 UI (신호등 + 카드 placeholder) | `2e104cd` |
| **P2** | 공유 텍스트에 자연어 요약 포함 | `2e104cd` |
| **P2** | 사이트 스크린샷 미리보기 (Microlink API, 재시도+타임아웃 지원) | `2e104cd` → `93712f5` |
| **P2** | 요약 카드 위험도별 색상 배경 + 아이콘 개선 | `2299a2d` |

### 테스트 / 인프라

| 우선순위 | 항목 | 커밋 |
|----------|------|------|
| **P1** | Backend API 통합 테스트 12개 (`test_scan_api.py`) | `4054f70` |
| **P1** | GitHub Actions CI/CD (`pytest` + `tsc --noEmit`) | `4054f70` |
| **P2** | threat_detector 단위 테스트 26개 (`test_threat_detector.py`) | `2e104cd` |
| **P2** | 구조화된 JSON 로깅 (`app/core/logging.py`) | `2e104cd` |
| **P2** | slowapi Limiter 인스턴스 통합 (`core/rate_limiter.py`) | `2299a2d` |

---

## 향후 고려 사항

| 영역 | 아이디어 |
|------|----------|
| 데이터 | 신고·벌크 스캔 결과를 DB(PostgreSQL 등)로 영속화 |
| 탐지 | AI 요약 프롬프트 고도화 (더 구체적인 행동 수칙) |
| 탐지 | 오탐 사례 수집 → 타이포스쿼팅 예외 목록 자동 관리 |
| 캐시 | Redis 기반 분산 캐시로 전환 (다중 인스턴스 대응) |
| 모니터링 | Sentry 연동 (에러 추적) + Prometheus 메트릭 |
| 기능 | 자주 신고된 URL → 자체 블랙리스트 자동 등록 |
| 보안 | API 키 기반 인증 (관리 API용) |

---

## 커밋별 상세 이력

### 10. 점수 체계 보정, QR 붙여넣기, 미리보기 개선 (`0153930`)

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

| 파일 | 변경 |
|------|------|
| `backend/app/routers/scan.py` | `_calculate_flag_risk()` 추가, risk_level 판정 개선 |
| `backend/app/services/domain_analyzer.py` | expired_cert 오타 수정 |
| `frontend/src/pages/Home.tsx` | Ctrl+V 붙여넣기 핸들러 (jsQR) |
| `frontend/src/pages/Result.tsx` | 미리보기 타임아웃 + 재시도 버튼 |
| `frontend/src/services/scanHistory.ts` | TS 타입 에러 수정 |

---

### 9. 도메인 위험도 분석 전면 개선 (`1df0e0e`)

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

| 파일 | 변경 |
|------|------|
| `backend/app/services/domain_analyzer.py` | risk_score + risk_breakdown 도입 |
| `backend/app/services/safe_browsing.py` | mock 코드 전면 제거 |
| `backend/app/services/ai_summarizer.py` | **(신규)** Claude AI 요약 서비스 |
| `backend/app/routers/scan.py` | AI 요약 호출, 스키마 업데이트 |
| `backend/app/routers/report.py` | 신고 데이터에 risk_score/ai_summary 추가 |
| `backend/app/models/schemas.py` | risk_score, risk_breakdown, ai_summary, action_guidelines 필드 |
| `frontend/src/pages/Result.tsx` | AI 요약/행동 수칙 카드, 위험도 바 개선 |

---

### 8. 미리보기 스크린샷 서비스 교체 (`93712f5`)

- thum.io가 400 에러를 반환하여 미리보기가 동작하지 않던 문제 수정
- microlink.io API로 교체 (200 OK + image/png 정상 반환 확인)

| 파일 | 변경 |
|------|------|
| `frontend/src/services/api.ts` | `getScreenshotUrl()` — thum.io → microlink.io URL |

---

### 7. 도움말 페이지, 신고 영속 저장, 요약 UI 개선 (`2299a2d`)

**기능 추가**
- 도움말 페이지 신규 (`/help`): 사용 가이드 + 탐지 체험 3종 데모
- 헤더에 `?` 버튼 추가 → `/help` 링크
- 신고 저장소: 인메모리 → JSON 파일 영속 저장 (`data/reports.json`)
- 신고 응답에 해당 URL 누적 신고 횟수 포함

**UX**
- 요약 카드: 위험도별 색상 배경 + 아이콘으로 가시성 개선
- 미리보기: 로딩 스켈레톤 + 실패 시 안내 메시지 표시

| 파일 | 변경 |
|------|------|
| `frontend/src/pages/Help.tsx` | **(신규)** 도움말 페이지 |
| `frontend/src/components/Header.tsx` | `?` 버튼 추가 |
| `frontend/src/App.tsx` | `/help` 라우트 추가 |
| `backend/app/routers/report.py` | JSON 파일 영속 저장, 누적 신고 횟수 반환 |
| `backend/app/core/rate_limiter.py` | **(신규)** Limiter 인스턴스 분리 |

---

### 6. P2 전체 개선 (`2e104cd`)

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
- URL 신고: `POST /api/report` + `GET /api/reports/stats`

| 파일 | 변경 |
|------|------|
| `backend/app/services/threat_detector.py` | 적응형 유사도 기준, 한국어 피싱 패턴 |
| `backend/app/services/domain_analyzer.py` | 비동기 SSL 분석 |
| `backend/app/core/logging.py` | **(신규)** JSON 구조화 로깅 |
| `backend/app/routers/bulk.py` | **(신규)** 벌크 스캔 API |
| `backend/app/routers/report.py` | **(신규)** URL 신고 API |
| `backend/tests/test_threat_detector.py` | **(신규)** 위협 탐지 테스트 26건 |
| `frontend/src/pages/BulkScan.tsx` | **(신규)** 벌크 스캔 페이지 |

---

### 5. P0/P1 보안·성능·UX 개선 (`4054f70`)

**보안 (P0)**
- CORS `allow_origins=["*"]` 제거 → `config.py`의 `BACKEND_CORS_ORIGINS` 기반으로 변경
- 프로덕션 환경에서 API 문서(`/api/docs`, `/api/redoc`) 비활성화

**보안/성능 (P1)**
- slowapi 기반 IP당 Rate Limiting 추가 (스캔 30회/분)
- `python-whois`로 실제 WHOIS 도메인 등록일 조회
- `final_url` 기준 인메모리 TTL 캐시 (10분, 최대 500건)

**UX (P1)**
- 히스토리 항목 클릭 → Result 페이지로 이동 (최근 20건은 전체 ScanData 저장)
- 전체 컴포넌트 라이트 모드 완성 (`tailwind.config.js`에 `darkMode: 'class'`)

| 파일 | 변경 |
|------|------|
| `backend/app/main.py` | CORS 제한, API 문서 비활성화, Rate Limiting |
| `backend/requirements.txt` | slowapi, python-whois 추가 |
| `frontend/tailwind.config.js` | `darkMode: 'class'` |
| `.github/workflows/ci.yml` | **(신규)** CI 파이프라인 |
| `backend/tests/test_scan_api.py` | **(신규)** API 통합 테스트 12건 |

---

### 4. 자연어 요약 기능 추가 (`9fac138`)

스캔 결과를 **한국어 2~3문장으로 요약**하는 `summary_generator.py` 모듈 추가.

| 시나리오 | 요약 예시 |
|----------|-----------|
| google.com (GREEN) | "Google 공식 사이트입니다. 안심하고 이용하셔도 됩니다." |
| navar.com (RED) | "이 사이트는 위험할 수 있습니다. 'naver'을(를) 사칭하는 것으로 의심됩니다." |

| 파일 | 변경 |
|------|------|
| `backend/app/services/summary_generator.py` | **(신규)** 자연어 요약 |
| `backend/tests/test_summary_generator.py` | **(신규)** 11개 테스트 |
| `backend/app/models/schemas.py` | `summary: str` 필드 추가 |

---

### 1~3. 초기 버그 수정

| # | 커밋 | 증상 | 수정 |
|---|------|------|------|
| 3 | `3eb0357` | 리다이렉트 시 원본 URL 타이포스쿼팅 누락 | 원본 URL도 검사하도록 추가 |
| 2 | `3eb0357` | 타이포스쿼팅 양방향 char_map 오탐 | 단방향 `normalize()` 함수로 교체, 허용 오차 2개로 확대 |
| 1 | `9cb5944` | toss.im, google.com이 YELLOW/RED 오탐 | twitter:card 오탐 수정, 신뢰 도메인 플래그 INFO로 다운그레이드 |
