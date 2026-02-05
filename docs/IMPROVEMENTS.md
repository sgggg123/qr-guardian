# QR Guardian 개선 사안

> 현재 코드를 기반으로 정리한 개선 포인트입니다.
> 우선순위: `P0` 지금 해야 함 / `P1` 하면 좋음 / `P2` 여유 있을 때

---

## 보안

### P0 — CORS `allow_origins=["*"]` 제거

**현재:** `main.py`에서 모든 origin을 허용 중
```python
allow_origins=["*"]  # ← 아무 사이트에서나 API 호출 가능
```

**문제:** 아무 사이트에서 우리 API를 호출할 수 있음. 악용 가능성 있음.

**해결:** `config.py`의 `BACKEND_CORS_ORIGINS`를 실제로 사용하도록 변경
```python
allow_origins=settings.BACKEND_CORS_ORIGINS
```

**파일:** `backend/app/main.py`

---

### P1 — Rate Limiting 추가

**현재:** API에 요청 제한이 없음

**문제:** 누군가 대량 요청으로 서버를 마비시키거나, 무료 Safe Browsing API 할당량을 소진시킬 수 있음

**해결:** `slowapi` 또는 FastAPI middleware로 IP당 분당 요청 제한 (예: 30회/분)

**파일:** `backend/app/main.py`

---

### P0 — 프로덕션에서 API 문서 비활성화

**현재:** `/api/docs`, `/api/redoc`가 항상 노출

**해결:** 환경변수로 분기
```python
docs_url="/api/docs" if settings.ENVIRONMENT == "development" else None
```

**파일:** `backend/app/main.py`

---

## 탐지 정확도

### P1 — 도메인 나이를 WHOIS로 확인

**현재:** SSL 인증서 발급일 기준으로 도메인 나이를 **추정**

**문제:** Let's Encrypt는 90일마다 갱신 → 오래된 도메인도 "30일 미만"으로 잘못 판정될 수 있음

**해결:**
- `python-whois` 라이브러리로 실제 도메인 등록일 조회
- SSL 발급일은 보조 지표로만 사용
- WHOIS 실패 시 현재 방식으로 fallback

**파일:** `backend/app/services/domain_analyzer.py`

---

### P1 — Safe Browsing Mock 모드에 경고 표시

**현재:** API 키 없으면 Mock 모드로 동작하는데, 사용자에게 알리지 않음

**문제:** 실제로는 Safe Browsing 검사가 안 되는데 "알려진 위협 없음"으로 표시 → 거짓 안심

**해결:**
- Mock 모드일 때 응답에 `safe_browsing.mock_mode: true` 추가
- Frontend에서 "Safe Browsing API 미연동 상태" 안내 표시

**파일:** `backend/app/services/safe_browsing.py`, `frontend/src/components/ResultCard.tsx`

---

### P2 — 타이포스쿼팅 오탐 줄이기

**현재:** difflib `SequenceMatcher` 유사도 0.7 이상이면 의심

**문제:** 짧은 브랜드명(예: "kakao")은 관련 없는 단어도 0.7을 넘길 수 있음

**해결:**
- 브랜드 길이가 4자 이하면 유사도 기준을 0.8로 상향
- 또는 edit distance 기반으로 교체 (Levenshtein 1~2 이내만)
- 오탐 사례 수집 후 예외 목록 관리

**파일:** `backend/app/services/threat_detector.py` → `_detect_typosquatting()`

---

### P2 — 한국어 피싱 패턴 강화

**현재:** `phishing_patterns`에 한국어 패턴이 부족

**추가할 패턴 예시:**
- `택배.*조회`, `배송.*확인` (택배 사칭 피싱)
- `국세청.*환급`, `건강보험.*확인` (정부기관 사칭)
- `카드.*결제.*취소` (금융 사칭)

**파일:** `backend/app/services/threat_detector.py` → `phishing_patterns`

---

## 성능

### P1 — 스캔 결과 캐싱

**현재:** 같은 URL을 반복 스캔해도 매번 전체 파이프라인 실행

**문제:** 리다이렉트 추적 + SSL 분석 + Safe Browsing 호출 = 느림 (수 초)

**해결:**
- `final_url` 기준 TTL 캐시 (예: 10분)
- Redis 또는 단순 in-memory dict + TTL
- 같은 URL 재스캔 시 캐시 반환

**파일:** `backend/app/routers/scan.py`

---

### P2 — SSL 분석 타임아웃 개선

**현재:** `socket.create_connection(timeout=5)` — 동기 블로킹

**문제:** SSL 연결이 느린 서버를 만나면 전체 응답이 5초 이상 지연

**해결:** `asyncio`의 `open_connection`으로 비동기 SSL 핸드셰이크 변환

**파일:** `backend/app/services/domain_analyzer.py` → `_get_ssl_info()`

---

## UX / Frontend

### P1 — 히스토리에서 상세 결과 다시 보기

**현재:** 히스토리 페이지에서 과거 스캔 항목을 클릭해도 상세 내용을 볼 수 없음 (URL, 위험도만 표시)

**해결:** 히스토리에 전체 `ScanData`를 저장하고, 클릭 시 Result 페이지로 이동

**주의:** localStorage 용량 한계 → 최근 20건만 전체 저장, 나머지는 요약만

**파일:** `frontend/src/services/scanHistory.ts`, `frontend/src/pages/History.tsx`

---

### P1 — 라이트 모드 미완성

**현재:** `ThemeContext`와 토글은 있지만, 대부분의 컴포넌트가 다크 모드 색상만 사용

**문제:** 라이트 모드 전환해도 `bg-slate-800`, `text-white` 등이 그대로 → 거의 변화 없음

**해결:** TailwindCSS `dark:` prefix를 활용하여 모든 컴포넌트에 라이트 모드 스타일 추가

**파일:** 거의 모든 컴포넌트 (Layout, Home, Result, History, Settings, ResultCard 등)

---

### P2 — 로딩 스켈레톤

**현재:** 스캔 중에 단순 스피너만 표시

**해결:** Result 페이지 레이아웃의 스켈레톤 UI 표시 (카드 형태로 깜빡이는 placeholder)

**파일:** `frontend/src/pages/Result.tsx` 또는 새 `SkeletonResult.tsx`

---

### P2 — 공유 텍스트에 요약 포함

**현재:** `share.ts`의 `generateShareText()`에 `summary` 필드가 반영 안 됨

**해결:**
```typescript
text += `\n${scanData.summary}\n`
```

**파일:** `frontend/src/services/share.ts`

---

## 테스트

### P1 — Backend API 통합 테스트

**현재:** `summary_generator`의 단위 테스트만 존재

**필요한 테스트:**
- `/api/scan` 엔드포인트 통합 테스트 (FastAPI `TestClient`)
- 신뢰 도메인 → GREEN 반환 확인
- 악성 URL → RED 반환 확인
- 잘못된 URL → 적절한 에러 반환 확인

**파일:** `backend/tests/test_scan_api.py` (신규)

---

### P2 — threat_detector 단위 테스트

**현재:** 위협 탐지 로직에 테스트 없음

**필요한 테스트:**
- 타이포스쿼팅 탐지 정확도 (true positive / false positive)
- 피싱 패턴 매칭
- URL 구조 분석 결과

**파일:** `backend/tests/test_threat_detector.py` (신규)

---

## 기능 추가

### P1 — 스크린샷/프리뷰

**현재:** URL의 내용을 텍스트로만 분석

**아이디어:** 사이트 스크린샷을 찍어서 결과 페이지에 미리보기 표시
- 직접 접속하지 않고도 사이트 모습을 확인 가능
- Puppeteer/Playwright 기반 스크린샷 서비스 또는 외부 API (예: urlbox, screenshotapi)

**난이도:** 높음 (별도 서비스 필요)

---

### P2 — 벌크 스캔

**현재:** 한 번에 하나의 URL만 스캔 가능

**아이디어:** 여러 URL을 한꺼번에 입력하여 일괄 검사
- 텍스트 영역에 줄바꿈으로 여러 URL 입력
- 결과를 표 형태로 표시

**파일:** 새 페이지 + 새 API 엔드포인트

---

### P2 — 알림/신고 기능

**현재:** 위험한 URL을 발견해도 신고할 방법이 없음

**아이디어:**
- "이 URL 신고하기" 버튼 → 관리자에게 알림
- 자주 신고된 URL → 자체 블랙리스트에 추가
- 향후 데이터베이스 도입 시 구현

---

## 인프라

### P1 — CI/CD 파이프라인

**현재:** 테스트가 수동 실행만 가능

**해결:** GitHub Actions로 PR시 자동 테스트
```yaml
# .github/workflows/test.yml
- backend: pytest
- frontend: tsc --noEmit
```

---

### P2 — 로깅/모니터링

**현재:** 에러가 발생해도 로그가 남지 않음

**해결:**
- Python `logging` 모듈로 구조화된 로그 출력
- 스캔 요청 수, 에러율, 위험도 분포 등 메트릭 수집
- Sentry 연동 (에러 추적)

---

## 정리

| 우선순위 | 항목 | 분류 |
|----------|------|------|
| **P0** | CORS 제한 | 보안 |
| **P0** | 프로덕션 API 문서 비활성화 | 보안 |
| **P1** | Rate Limiting | 보안 |
| **P1** | WHOIS 기반 도메인 나이 | 탐지 정확도 |
| **P1** | Safe Browsing Mock 경고 | 탐지 정확도 |
| **P1** | 스캔 결과 캐싱 | 성능 |
| **P1** | 히스토리 상세보기 | UX |
| **P1** | 라이트 모드 완성 | UX |
| **P1** | API 통합 테스트 | 테스트 |
| **P1** | CI/CD | 인프라 |
| **P2** | 타이포스쿼팅 오탐 개선 | 탐지 정확도 |
| **P2** | 한국어 피싱 패턴 추가 | 탐지 정확도 |
| **P2** | SSL 비동기 변환 | 성능 |
| **P2** | 로딩 스켈레톤 | UX |
| **P2** | 공유에 요약 포함 | UX |
| **P2** | threat_detector 테스트 | 테스트 |
| **P2** | 스크린샷 프리뷰 | 기능 |
| **P2** | 벌크 스캔 | 기능 |
| **P2** | 신고 기능 | 기능 |
| **P2** | 로깅/모니터링 | 인프라 |
