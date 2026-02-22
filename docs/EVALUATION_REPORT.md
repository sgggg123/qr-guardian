# QR Guardian — 전체 시스템 평가 보고서

> 평가 일시: 2026-02-22
> 평가 범위: 백엔드 (Python/FastAPI) + 프론트엔드 (React/TypeScript) + 문서 + 배포 환경

---

## 1. 평가 요약

| 항목 | 결과 | 비고 |
|------|------|------|
| 프론트엔드 빌드 | ✅ 성공 | chunk size warning 720 kB (비치명적) |
| TypeScript 타입 체크 | ✅ 오류 없음 | `tsc --noEmit` 통과 |
| 백엔드 `/health` | ✅ 정상 | `{"status":"ok"}` |
| `/api/scan` (안전 URL) | ✅ GREEN 판정 | google.com → GREEN |
| `/api/scan` (위험 URL) | ✅ RED 판정 | gooogle.com → RED (타이포스쿼팅 감지) |
| `/api/bulk-scan` | ✅ 정상 | 2개 URL 동시 스캔 |
| `/api/report` | ✅ 정상 | URL 신고 접수 |
| AI 요약 (Gemini) | ✅ 정상 | `gemini-2.5-flash`, 한국어 요약 생성 |
| action_guidelines | ✅ 정상 | 행동 수칙 3개 항목 생성 |
| Google Safe Browsing | ✅ 정상 | API 키 Railway에 설정됨 |
| 문서 최신화 | ✅ 완료 | CLAUDE_API_KEY 참조 5곳 → GEMINI_API_KEY |

---

## 2. 이번 작업에서 변경된 내용

### 2-1. AI 엔진 교체 (핵심 변경)

| 구분 | 변경 전 | 변경 후 |
|------|---------|---------|
| AI 제공사 | Anthropic Claude | Google Gemini |
| SDK 패키지 | `anthropic>=0.39.0` | `google-genai>=1.0.0` |
| 모델 | `claude-3-5-haiku-20241022` | `gemini-2.5-flash` |
| 환경변수 | `CLAUDE_API_KEY` | `GEMINI_API_KEY` |
| API 방식 | Messages API | `client.models.generate_content()` |

**중간 과정**: `google-generativeai` (deprecated) → `google-genai` (신규 SDK)
**모델 변경**: `gemini-1.5-flash` → `gemini-2.0-flash` (Free Tier 소진) → `gemini-2.5-flash` (현재, 정상)

### 2-2. 프론트엔드 UX 개선

**Home.tsx — 로딩 UI 개선**
- 기존: 단순 스피너만 표시
- 변경: 7단계 진행 메시지 + 퍼센트 프로그레스 바 + 단계별 도트 인디케이터 + 스켈레톤 카드

| 단계 | 메시지 | 진행률 |
|------|--------|--------|
| 1 | QR 코드에서 URL 읽는 중... | 8% |
| 2 | URL 구조 분석 중... | 20% |
| 3 | 리다이렉트 경로 추적 중... | 35% |
| 4 | 위협 데이터베이스 조회 중... | 52% |
| 5 | 도메인 보안 검사 중... | 66% |
| 6 | SSL 인증서 검증 중... | 79% |
| 7 | AI 위험도 분석 중... | 91% |

API 응답 시 → 100% + 완료 체크 표시 → 350ms 후 결과 화면 이동

**Result.tsx — 요약 카드 통합**
- 기존: AI 요약 카드 + 템플릿 요약 카드 별도 표시 (중복)
- 변경: 하나의 "분석 요약" 카드 — AI 요약 우선, 실패 시 템플릿 자동 폴백
- AI 요약이 있으면 카드 우측에 "✦ AI" 뱃지 표시

### 2-3. 문서 수정

| 파일 | 변경 내용 |
|------|----------|
| `docs/QUICKSTART.md` | `CLAUDE_API_KEY` 5곳 → `GEMINI_API_KEY`, Claude 관련 설명 → Gemini |
| `docs/CHANGELOG.md` | 2026-02-21 변경 이력 섹션 추가 |
| `docs/CODE_AUDIT.md` | 전체 코드 감사 보고서 신규 작성 |
| `docs/SETUP_AND_TROUBLESHOOTING.md` | API 키 설정 가이드 + 트러블슈팅 신규 작성 |

---

## 3. 백엔드 코드 상태

### 실제 동작 중인 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| `app/main.py` | FastAPI 앱 진입점, CORS, rate limit | ✅ 정상 |
| `app/routers/scan.py` | 스캔 오케스트레이터, 위험도 판정 | ✅ 정상 |
| `app/services/url_analyzer.py` | 단축URL 해제, 리다이렉트 추적 | ✅ 정상 |
| `app/services/threat_detector.py` | URL 패턴 + 콘텐츠 위협 감지 | ✅ 정상 |
| `app/services/safe_browsing.py` | Google Safe Browsing API 조회 | ✅ 정상 |
| `app/services/domain_analyzer.py` | SSL, WHOIS, risk_score 산출 | ✅ 정상 |
| `app/services/summary_generator.py` | 템플릿 기반 한국어 요약 | ✅ 정상 |
| `app/services/ai_summarizer.py` | Gemini AI 요약 (선택) | ✅ 정상 (gemini-2.5-flash) |
| `app/core/config.py` | 환경변수, 도메인 설정 | ✅ 정상 |
| `app/schemas.py` | Pydantic 요청/응답 스키마 | ✅ 정상 |
| `tests/` | pytest 테스트 (49건) | ✅ 정상 |

### risk_score 계산 구조

```
risk_score = ssl(0~3) + domain_age(0~4) + whois_failure(0~1)
           + safe_browsing(0~2) + url_pattern(0~3)

GREEN  조건 (우선):  TRUSTED_DOMAINS + Safe Browsing 안전
RED    조건:         Safe Browsing 위협 | 타이포스쿼팅/피싱 플래그 | risk_score ≥ 7.0
YELLOW 조건:         risk_score ≥ 3.0 | WARNING 플래그 있음
GREEN  조건 (기본):  그 외 모두
```

---

## 4. 프론트엔드 코드 상태

### 동작 중인 페이지

| 경로 | 파일 | 상태 |
|------|------|------|
| `/` | `Home.tsx` | ✅ 정상 (개선된 로딩 UI) |
| `/result` | `Result.tsx` | ✅ 정상 (통합 요약 카드) |
| `/history` | `History.tsx` | ✅ 정상 |
| `/settings` | `Settings.tsx` | ✅ 정상 |
| `/generate` | `Generate.tsx` | ✅ 정상 |
| `/bulk` | `BulkScan.tsx` | ✅ 정상 |
| `/help` | `Help.tsx` | ✅ 정상 |

### 빌드 결과

```
dist/index.html                    0.46 kB
dist/assets/index-[hash].css      21.09 kB
dist/assets/index-[hash].js      720.09 kB  ← chunk size 경고 (비치명적)
```

> chunk 720 kB 경고: jsQR 라이브러리 포함으로 인한 크기. 기능상 문제 없으며, 필요 시 dynamic import로 최적화 가능.

---

## 5. 배포 환경

| 서비스 | 플랫폼 | URL |
|--------|--------|-----|
| 백엔드 API | Railway | `https://qr-guardianbackend-production.up.railway.app` |
| 프론트엔드 | Railway | Railway 자동 배포 |
| 배포 방법 | `git push origin main` | Railway CI/CD 자동 트리거 |

### Railway 환경변수 설정 목록

| 변수명 | 필수 | 현재 상태 |
|--------|------|----------|
| `ENVIRONMENT` | 권장 | `production` 설정 |
| `GOOGLE_SAFE_BROWSING_API_KEY` | 권장 | 설정됨 ✅ |
| `GEMINI_API_KEY` | 선택 | 설정됨 ✅ |
| `BACKEND_CORS_ORIGINS` | 필요 시 | 설정됨 ✅ |

---

## 6. Rate Limiting

| 엔드포인트 | 제한 | 방식 |
|------------|------|------|
| `POST /api/scan` | 30회/분 (IP당) | slowapi |
| `POST /api/bulk-scan` | 5회/분 (IP당) | slowapi |
| `POST /api/report` | 10회/분 (IP당) | slowapi |

---

## 7. 현재 알려진 제한사항

| 항목 | 내용 | 영향 |
|------|------|------|
| chunk 크기 경고 | 720 kB > 500 kB | 초기 로드 약간 느림, 기능 정상 |
| Gemini Free Tier 한도 | 분당 15회, 일 1,500회 | 한도 초과 시 AI 요약만 null, 나머지 정상 |
| WHOIS 일부 TLD 미지원 | .io, .ai 등 일부 | whois_failure +1점 처리로 자동 보정 |
| Microlink 미리보기 한도 | 일일 한도 있음 | 초과 시 미리보기 실패, 재시도 가능 |
| 스캔 결과 비영구 저장 | localStorage 기반 | 브라우저 초기화 시 히스토리 삭제 |

---

## 8. 평가 결론

QR Guardian의 모든 핵심 기능이 정상 동작 중입니다.

- **AI 요약**: Gemini 2.5 Flash로 전환 완료, 한국어 요약 + 행동 수칙 생성 확인
- **위험도 판정**: GREEN/YELLOW/RED 로직 정확하게 작동 (타이포스쿼팅, Safe Browsing 포함)
- **UI/UX**: 로딩 프로그레스 바, 통합 요약 카드 개선 완료
- **문서**: 모든 MD 파일에서 CLAUDE_API_KEY 참조 제거, GEMINI_API_KEY로 통일
- **배포**: Railway에 자동 배포 파이프라인 정상 작동 중
