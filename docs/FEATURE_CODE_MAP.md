# QR Guardian 기능-코드 매핑

> 각 기능이 **어떤 파일의 몇 번째 줄**에 구현되어 있는지 정확하게 매핑한 문서입니다.
> 최종 업데이트: 2026-02-13

---

## 목차

1. [URL 스캔 파이프라인](#1-url-스캔-파이프라인)
2. [단축 URL 감지 및 리다이렉트 추적](#2-단축-url-감지-및-리다이렉트-추적)
3. [타이포스쿼팅 탐지](#3-타이포스쿼팅-탐지)
4. [피싱 패턴 탐지](#4-피싱-패턴-탐지)
5. [페이지 콘텐츠 분석](#5-페이지-콘텐츠-분석)
6. [Google Safe Browsing 연동](#6-google-safe-browsing-연동)
7. [SSL 인증서 분석](#7-ssl-인증서-분석)
8. [WHOIS 도메인 나이 조회](#8-whois-도메인-나이-조회)
9. [위험도 점수 계산 (risk_score)](#9-위험도-점수-계산)
10. [위험도 판정 (GREEN/YELLOW/RED)](#10-위험도-판정)
11. [자연어 요약 생성](#11-자연어-요약-생성)
12. [AI 요약 (Claude)](#12-ai-요약)
13. [인메모리 캐시](#13-인메모리-캐시)
14. [Rate Limiting](#14-rate-limiting)
15. [CORS 보안](#15-cors-보안)
16. [벌크 스캔](#16-벌크-스캔)
17. [URL 신고](#17-url-신고)
18. [QR 코드 스캔 (카메라/이미지)](#18-qr-코드-스캔)
19. [QR 이미지 붙여넣기 (Ctrl+V)](#19-qr-이미지-붙여넣기)
20. [QR 코드 생성](#20-qr-코드-생성)
21. [스캔 기록 (히스토리)](#21-스캔-기록)
22. [신호등 UI](#22-신호등-ui)
23. [결과 카드 컴포넌트](#23-결과-카드-컴포넌트)
24. [효과음 및 진동](#24-효과음-및-진동)
25. [결과 공유](#25-결과-공유)
26. [다크/라이트 테마](#26-다크라이트-테마)
27. [스켈레톤 로딩 UI](#27-스켈레톤-로딩-ui)
28. [사이트 스크린샷 미리보기](#28-사이트-스크린샷-미리보기)
29. [구조화된 로깅](#29-구조화된-로깅)
30. [데이터 모델 (스키마)](#30-데이터-모델)
31. [설정 및 화이트리스트](#31-설정-및-화이트리스트)
32. [테스트](#32-테스트)
33. [CI/CD](#33-cicd)

---

## 1. URL 스캔 파이프라인

전체 분석 흐름을 조율하는 오케스트레이터.

| 단계 | 코드 위치 | 설명 |
|------|-----------|------|
| API 엔드포인트 | `backend/app/routers/scan.py:49-55` | `POST /api/scan` 라우터 정의 + Rate Limit 데코레이터 |
| URL 검증 | `backend/app/routers/scan.py:62-69` | 빈 URL 체크, `https://` 자동 추가 |
| 캐시 확인 | `backend/app/routers/scan.py:71-75` | `_get_cached(url)` 호출 |
| 단축 URL 감지 | `backend/app/routers/scan.py:82-89` | `url_analyzer.is_shortened_url()` |
| 리다이렉트 추적 | `backend/app/routers/scan.py:92` | `url_analyzer.resolve_redirects_with_chain()` |
| 리다이렉트 횟수 체크 | `backend/app/routers/scan.py:94-108` | 3회 초과 / 크로스 도메인 플래그 |
| URL 구조 분석 | `backend/app/routers/scan.py:111-124` | 최종 URL + 원본 URL 양쪽 검사 |
| 콘텐츠 분석 | `backend/app/routers/scan.py:127-128` | `threat_detector.analyze_page_content()` |
| Safe Browsing | `backend/app/routers/scan.py:131-139` | `safe_browsing_service.check_url()` |
| 도메인 분석 | `backend/app/routers/scan.py:142-153` | `domain_analyzer.analyze_domain()` |
| 요구 정보 수준 | `backend/app/routers/scan.py:156` | `threat_detector.determine_info_requirement()` |
| 위험도 계산 | `backend/app/routers/scan.py:159` | `_calculate_risk_level()` |
| 플래그 중복 제거 | `backend/app/routers/scan.py:162` | `_deduplicate_flags()` |
| 요약 생성 | `backend/app/routers/scan.py:165-173` | `generate_summary()` |
| 응답 조립 | `backend/app/routers/scan.py:176-223` | `ScanResponse` Pydantic 모델 생성 |
| 캐시 저장 | `backend/app/routers/scan.py:226` | `_set_cache(url, response)` |
| 로그 기록 | `backend/app/routers/scan.py:228-232` | 소요 시간 포함 JSON 로그 |

**프론트엔드 호출 측:**

| 단계 | 코드 위치 | 설명 |
|------|-----------|------|
| API 호출 함수 | `frontend/src/services/api.ts` → `scanUrl()` | `POST /api/scan` fetch |
| 스캔 트리거 | `frontend/src/pages/Home.tsx` → `analyzeUrl()` | 사용자 입력 → API 호출 → 결과 전달 |
| 결과 표시 | `frontend/src/pages/Result.tsx` | `useLocation().state.scanData`로 데이터 수신 |

---

## 2. 단축 URL 감지 및 리다이렉트 추적

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 단축 URL 판별 | `backend/app/services/url_analyzer.py:28-35` | `is_shortened_url()` — 도메인이 `SHORTENER_DOMAINS`에 있는지 비교 |
| 단축 URL 목록 | `backend/app/core/config.py:28-38` | `SHORTENER_DOMAINS` — 글로벌 20개 + 한국형 14개 = 34개 |
| 리다이렉트 추적 | `backend/app/services/url_analyzer.py:42-100` | `resolve_redirects_with_chain()` — HEAD 요청으로 최대 10회 추적 |
| 상대경로 → 절대경로 | `backend/app/services/url_analyzer.py:72-74` | Location 헤더가 `/path`이면 scheme + netloc 추가 |
| 도메인 정보 파싱 | `backend/app/services/url_analyzer.py:102-130` | `extract_domain_info()` — domain, tld, is_ip, port, path 등 |
| IP 주소 판별 | `backend/app/services/url_analyzer.py:132-144` | `_is_ip_address()` — 4옥텟 0~255 체크 |

---

## 3. 타이포스쿼팅 탐지

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 탐지 진입점 | `backend/app/services/threat_detector.py:149-156` | `analyze_url_structure()` 내부에서 `_detect_typosquatting()` 호출 |
| 유사도 비교 | `backend/app/services/threat_detector.py:182-202` | `_detect_typosquatting()` — `SequenceMatcher` 유사도 + 적응형 threshold |
| 적응형 threshold | `backend/app/services/threat_detector.py:193` | 브랜드 4자 이하 → 0.85, 5자 이상 → 0.7 |
| 문자 치환 검사 | `backend/app/services/threat_detector.py:204-261` | `_is_typosquat_variant()` — normalize 후 문자 차이 비교 |
| char_map (가짜→진짜) | `backend/app/services/threat_detector.py:208-228` | `0→o`, `1→l`, `rn→m`, `vv→w`, `4→a`, `$→s` 등 18개 매핑 |
| normalize 함수 | `backend/app/services/threat_detector.py:231-239` | 멀티 문자(`rn`, `vv`) 먼저 처리 후 단일 문자 치환 |
| 문자 차이 허용 | `backend/app/services/threat_detector.py:250-253` | 동일 길이 시 2글자까지 차이 허용 |
| 글자 추가/삭제 허용 | `backend/app/services/threat_detector.py:255-259` | 1글자 길이 차이 시 삽입/삭제 위치 탐색 |
| 브랜드 목록 | `backend/app/core/config.py:41-53` | `POPULAR_BRANDS` — 글로벌 20개 + 한국 15개 + 금융 5개 = 40개 |

---

## 4. 피싱 패턴 탐지

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 패턴 매칭 | `backend/app/services/threat_detector.py:170-178` | URL 전체를 정규식으로 검사, 첫 매칭에서 break |
| 영문 패턴 (21개) | `backend/app/services/threat_detector.py:33-55` | `secure.*login`, `account.*verify`, `bank.*verification` 등 |
| 한글 기본 (9개) | `backend/app/services/threat_detector.py:57-65` | `본인.*인증`, `계정.*확인`, `카드.*중지` 등 |
| 택배 사칭 (6개) | `backend/app/services/threat_detector.py:67-72` | `택배.*조회`, `배송.*확인`, `미수령.*택배` 등 |
| 정부기관 사칭 (8개) | `backend/app/services/threat_detector.py:74-81` | `국세청.*환급`, `건강보험.*확인`, `교통.*범칙금` 등 |
| 금융 사칭 (7개) | `backend/app/services/threat_detector.py:83-89` | `카드.*결제.*취소`, `해외.*결제.*승인`, `대출.*승인` 등 |
| 경조사 사칭 (4개) | `backend/app/services/threat_detector.py:91-94` | `청첩장.*확인`, `돌잔치.*초대`, `부고.*안내`, `모바일.*초대장` |
| 인증 키워드 (URL 경로) | `backend/app/services/threat_detector.py:158-167` | `auth_keywords` 기반 `login_path` 플래그 (INFO) |

---

## 5. 페이지 콘텐츠 분석

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 진입점 | `backend/app/services/threat_detector.py:263-312` | `analyze_page_content()` — httpx GET으로 HTML 가져와서 분석 |
| 로그인 폼 감지 | `backend/app/services/threat_detector.py:314-325` | `_has_login_form()` — `type="password"` 등 7개 패턴 |
| 개인정보 필드 감지 | `backend/app/services/threat_detector.py:327-342` | `_detect_personal_info_fields()` — 주민번호, 휴대폰, 주소, 생년월일 |
| 결제 폼 감지 | `backend/app/services/threat_detector.py:344-362` | `_has_payment_form()` — `<input>` 태그 내 card/카드/cvv 패턴 (12개) |
| 신뢰 도메인 다운그레이드 | `backend/app/services/threat_detector.py:295,304` | 신뢰 도메인이면 `Severity.INFO`로 변경 (위험도에 영향 없음) |
| 요구 정보 수준 판정 | `backend/app/services/threat_detector.py:364-391` | `determine_info_requirement()` — LOW/MEDIUM/HIGH |

---

## 6. Google Safe Browsing 연동

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 서비스 클래스 | `backend/app/services/safe_browsing.py` | `SafeBrowsingService` |
| URL 검사 | `backend/app/services/safe_browsing.py` → `check_url()` | 실제 Google API v4 호출. API 키 없거나 호출 실패 시 `(True, [])` 반환 + warning 로그 |
| API 호출 | `backend/app/services/safe_browsing.py` → `_api_check()` | Google Safe Browsing API v4 POST 요청 |
| 위협 유형 번역 | `backend/app/services/safe_browsing.py` → `_translate_threat_type()` | 영문→한글 변환 |

---

## 7. SSL 인증서 분석

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 비동기 SSL 추출 | `backend/app/services/domain_analyzer.py:106-163` | `_get_ssl_info()` — `asyncio.open_connection()` + `getpeercert()` |
| 발급기관 신뢰도 맵 | `backend/app/services/domain_analyzer.py:18-28` | `TRUSTED_ISSUERS` — DigiCert(100) ~ Let's Encrypt(60) |
| 신뢰 등급 결정 | `backend/app/services/domain_analyzer.py:142-151` | score >= 90 → high, >= 70 → medium, 나머지 → low |
| SSL 위험도 가산 | `backend/app/services/domain_analyzer.py` | HTTP:+3.0, 만료/저신뢰:+2.0, 곧만료:+1.0, 정상:0 |
| 만료 여부 판정 | `backend/app/services/domain_analyzer.py:158` | `valid_until < datetime.now()` |
| 곧 만료 판정 | `backend/app/services/domain_analyzer.py:195-201` | `days_until_expiry < 30` → `expiring_soon` 플래그 |

---

## 8. WHOIS 도메인 나이 조회

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| WHOIS 조회 | `backend/app/services/domain_analyzer.py:89-104` | `_get_whois_age()` — `whois.whois(domain).creation_date` |
| list 처리 | `backend/app/services/domain_analyzer.py:98-99` | 일부 WHOIS가 list[datetime] 반환 시 첫 번째 사용 |
| SSL fallback | `backend/app/services/domain_analyzer.py:61-66` | WHOIS 실패 시 SSL `valid_from`으로 대체 |
| 나이 기반 가산 | `backend/app/services/domain_analyzer.py` | 30일 미만:+4.0, 90일 미만:+2.0, 1년 미만:+1.0 |
| 출처 표기 | `backend/app/services/domain_analyzer.py:72` | "WHOIS 기준" 또는 "인증서 기준" 메시지에 포함 |

---

## 9. 위험도 점수 계산

0~10 가산 방식의 `risk_score` 시스템. 높을수록 위험. (레거시 `trust_score`도 하위 호환용으로 병존)

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| risk_score 계산 | `backend/app/services/domain_analyzer.py` | 0~10 가산 방식. 각 요소별 점수를 합산 |
| ssl 요소 | `backend/app/services/domain_analyzer.py` | 0~3점 — 만료(3), 알 수 없는 발급기관(2), 무료 인증서(1.5), 곧 만료(1) |
| domain_age 요소 | `backend/app/services/domain_analyzer.py` | 0~4점 — 30일 미만(4), 90일 미만(2) |
| safe_browsing 요소 | `backend/app/services/domain_analyzer.py` | 0~2점 — Safe Browsing 위협 탐지 시 가산 |
| url_pattern 요소 | `backend/app/services/domain_analyzer.py` | 0~3점 — 의심스러운 URL 패턴 탐지 시 가산 |
| whois_failure 요소 | `backend/app/services/domain_analyzer.py` | 0~1점 — WHOIS 조회 실패 시 가산 |
| risk_breakdown | `backend/app/services/domain_analyzer.py` | `list[{factor, score, reason}]` — 각 요소별 상세 내역 |
| 프론트 위험도 바 | `frontend/src/components/ResultCard.tsx` → `DomainAnalysisCard` | 0~10 위험도 바 (높을수록 위험) + risk_breakdown 항목별 표시 |

---

## 10. 위험도 판정

`risk_score` 기반 판정으로 변경. `_calculate_flag_risk()` 함수 추가.

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 판정 함수 | `backend/app/routers/scan.py` → `_calculate_risk_level()` | risk_score 기반 판정 |
| 신뢰 도메인 + safe → GREEN | `backend/app/routers/scan.py` | `is_safe and _is_trusted_domain(final_url)` |
| Safe Browsing 위협 → RED | `backend/app/routers/scan.py` | `not is_safe` |
| 타이포스쿼팅/피싱 → RED | `backend/app/routers/scan.py` | `typosquatting` 또는 `phishing_pattern` 플래그 |
| risk_score >= 7.0 → RED | `backend/app/routers/scan.py` | 높은 위험도 점수 |
| risk_score >= 3.0 → YELLOW | `backend/app/routers/scan.py` | 중간 위험도 점수 |
| Warning 플래그 → YELLOW | `backend/app/routers/scan.py` | warning 수준 플래그 존재 시 |
| 나머지 → GREEN | `backend/app/routers/scan.py` | |
| 플래그 위험도 계산 | `backend/app/routers/scan.py` → `_calculate_flag_risk()` | 플래그 기반 추가 위험도 계산 |
| 신뢰 도메인 체크 | `backend/app/routers/scan.py` → `_is_trusted_domain()` | 서브도메인 포함 매칭 |
| 플래그 중복 제거 | `backend/app/routers/scan.py` → `_deduplicate_flags()` | type 기준 첫 번째만 유지 |

---

## 11. 자연어 요약 생성

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 진입점 | `backend/app/services/summary_generator.py:6-27` | `generate_summary()` — verdict + details + guide 합침 |
| 1단계: 판정문 | `backend/app/services/summary_generator.py:30-40` | `_build_verdict()` — GREEN/YELLOW/RED별 문장 |
| 도메인 이름 표시 | `backend/app/services/summary_generator.py:133-137` | `_friendly_domain()` — `google.com` → `Google` |
| 2단계: 위협 상세 | `backend/app/services/summary_generator.py:43-101` | `_build_details()` — 플래그 조합별 문장 |
| 브랜드 추출 | `backend/app/services/summary_generator.py:122-130` | `_extract_brand()` — 플래그 message에서 `'brand'` 파싱 |
| 조합 패턴 | `backend/app/services/summary_generator.py:68-81` | shortened+cross_domain / new_domain+low_trust_issuer |
| 3단계: 행동 가이드 | `backend/app/services/summary_generator.py:104-119` | `_build_guide()` — RED 시 "절대 로그인하지 마세요" 등 |

---

## 12. AI 요약 (Claude)

템플릿 요약 이후 Claude API를 통해 자연어 AI 요약을 생성하는 서비스.

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 서비스 모듈 | `backend/app/services/ai_summarizer.py` | anthropic SDK 사용 |
| 모델 | `ai_summarizer.py` | `claude-sonnet-4-5-20250929` |
| 요약 생성 | `ai_summarizer.py` → `generate_ai_summary()` | `{ai_summary: str, action_guidelines: list[str]}` 반환 |
| Fallback | `ai_summarizer.py` | API 키 미설정 또는 호출 실패 시 템플릿 기반 요약으로 대체 |
| 호출 시점 | `backend/app/routers/scan.py` | 템플릿 요약(`generate_summary()`) 이후에 호출 |

---

## 13. 인메모리 캐시

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 캐시 저장소 | `backend/app/routers/scan.py:24` | `_scan_cache: dict[str, tuple[float, ScanResponse]]` |
| TTL 설정 | `backend/app/routers/scan.py:25` | `_CACHE_TTL = 600` (10분) |
| 캐시 조회 | `backend/app/routers/scan.py:30-36` | `_get_cached()` — 만료 확인 후 반환 |
| 캐시 저장 | `backend/app/routers/scan.py:39-46` | `_set_cache()` — 500건 초과 시 만료 항목 정리 |
| 테스트 캐시 초기화 | `backend/tests/test_scan_api.py:12-15` | `clear_scan_cache` autouse fixture |

---

## 14. Rate Limiting

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 글로벌 리미터 | `backend/app/main.py:19` | `Limiter(key_func=get_remote_address)` |
| 앱 상태 등록 | `backend/app/main.py:29` | `app.state.limiter = limiter` |
| 429 핸들러 | `backend/app/main.py:32-42` | `rate_limit_handler()` — 한글 에러 메시지 반환 |
| 스캔 30회/분 | `backend/app/routers/scan.py:54` | `@limiter.limit("30/minute")` |
| 벌크 5회/분 | `backend/app/routers/bulk.py:22` | `@limiter.limit("5/minute")` |
| 신고 10회/분 | `backend/app/routers/report.py:20` | `@limiter.limit("10/minute")` |

---

## 15. CORS 보안

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 허용 origin 목록 | `backend/app/core/config.py:8-14` | `BACKEND_CORS_ORIGINS` — localhost + *.railway.app |
| 정확한 origin 분리 | `backend/app/main.py:49` | 와일드카드(`*`) 없는 것만 `allow_origins`에 |
| 와일드카드 → 정규식 | `backend/app/main.py:50-55` | `*.railway.app` → `.*\.railway\.app` regex로 변환 |
| 미들웨어 등록 | `backend/app/main.py:57-64` | `CORSMiddleware` — `allow_origin_regex` 사용 |

---

## 16. 벌크 스캔

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| API 엔드포인트 | `backend/app/routers/bulk.py:21-23` | `POST /api/bulk-scan` — 5회/분 제한 |
| URL 제한 | `backend/app/routers/bulk.py:18,25` | `MAX_BULK_URLS = 20`, `urls[:20]`으로 잘림 |
| 병렬 실행 | `backend/app/routers/bulk.py:39` | `asyncio.gather(*[_scan_one(u) for u in urls])` |
| 개별 에러 격리 | `backend/app/routers/bulk.py:36-37` | 하나가 실패해도 나머지는 정상 반환 |
| 단일 스캔 재사용 | `backend/app/routers/bulk.py:10,30` | `scan_url as single_scan` import 후 직접 호출 |
| 프론트 페이지 | `frontend/src/pages/BulkScan.tsx` | textarea 입력 → 줄바꿈 분리 → API 호출 |
| API 함수 | `frontend/src/services/api.ts` → `bulkScanUrls()` | `POST /api/bulk-scan` fetch |
| 라우트 등록 | `frontend/src/App.tsx` | `<Route path="/bulk" element={<BulkScan />} />` |

---

## 17. URL 신고

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 신고 접수 | `backend/app/routers/report.py:19-43` | `POST /api/report` — URL + 사유 + IP 저장 |
| 인메모리 저장 | `backend/app/routers/report.py:15-16` | `_reports: list[dict]`, `MAX_REPORTS = 1000` (FIFO) |
| 통계 API | `backend/app/routers/report.py:46-55` | `GET /api/reports/stats` — Counter로 top 10 집계 |
| 프론트 신고 버튼 | `frontend/src/pages/Result.tsx` | "URL 신고" 버튼 → `reportUrl()` 호출 |
| API 함수 | `frontend/src/services/api.ts` → `reportUrl()` | `POST /api/report` fetch |

---

## 18. QR 코드 스캔

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 스캐너 컴포넌트 | `frontend/src/components/QRScanner.tsx` | `Html5Qrcode` 라이브러리 사용 |
| 카메라 시작 | `QRScanner.tsx` → `startCamera()` | `Html5Qrcode.start(facingMode: 'environment')` |
| 이미지 스캔 | `QRScanner.tsx` → `handleFileSelect()` | `Html5Qrcode.scanFile()` |
| QR 인식 콜백 | `QRScanner.tsx` → `onScan(decodedText)` | 부모(Home.tsx)로 URL 전달 |
| 카메라 정리 | `QRScanner.tsx` → `useEffect` cleanup | 언마운트 시 카메라 스트림 해제 |
| 스캔 설정 | `QRScanner.tsx` | `fps: 10`, `qrbox: { width: 250, height: 250 }` |

---

## 19. QR 이미지 붙여넣기 (Ctrl+V)

클립보드에 복사된 QR 코드 이미지를 붙여넣기로 스캔하는 기능.

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 붙여넣기 핸들러 | `frontend/src/pages/Home.tsx` | Ctrl+V `paste` 이벤트 리스너 |
| QR 디코딩 | `Home.tsx` | `jsQR` 라이브러리로 클립보드 이미지에서 QR 코드 디코딩 |
| 자동 분석 | `Home.tsx` | QR 코드 인식 시 URL 자동 추출 후 `analyzeUrl()` 호출 |

---

## 20. QR 코드 생성

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 생성 페이지 | `frontend/src/pages/Generate.tsx` | URL 입력 → QR 코드 렌더링 |
| QR 렌더링 | `Generate.tsx` | `<QRCodeSVG value={url} size={200} level="H" />` (qrcode.react) |
| PNG 다운로드 | `Generate.tsx` → 다운로드 함수 | SVG → Image → Canvas(512x512) → `toDataURL('image/png')` → `<a download>` |
| 클립보드 복사 | `Generate.tsx` | Canvas → `toBlob()` → `navigator.clipboard.write(ClipboardItem)` |

---

## 21. 스캔 기록

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 히스토리 서비스 | `frontend/src/services/scanHistory.ts` | localStorage 키: `qr-guardian-history` |
| 기록 추가 | `scanHistory.ts` → `addScanToHistory()` | 최대 50건 FIFO, 최근 20건은 `scanData` 전체 포함 |
| 용량 관리 | `scanHistory.ts` | 21번째부터 `scanData` 제거, localStorage 꽉 차면 20건으로 축소 |
| 기록 조회 | `scanHistory.ts` → `getScanHistory()` | |
| 기록 삭제 | `scanHistory.ts` → `deleteScanItem()`, `clearScanHistory()` | |
| 통계 계산 | `scanHistory.ts` → `getScanStats()` | 전체/오늘/이번 주 + 안전/주의/위험 비율 |
| 히스토리 페이지 | `frontend/src/pages/History.tsx` | 통계 바 + 리스트 + 상세 재열람 |
| 상세 재열람 | `History.tsx` | `scanData` 있는 항목 클릭 → Result 페이지로 navigate |
| 기록 저장 시점 | `frontend/src/pages/Home.tsx` → `analyzeUrl()` | 스캔 성공 후 `addScanToHistory(response.data)` |

---

## 22. 신호등 UI

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 신호등 컴포넌트 | `frontend/src/components/TrafficLight.tsx` | 3개 원 (RED/YELLOW/GREEN) 세로 배치 |
| 활성 색상 | `TrafficLight.tsx` | `bg-risk-red`, `bg-risk-yellow`, `bg-risk-green` |
| 글로우 효과 | `TrafficLight.tsx` | `shadow-lg` + `animate-pulse-slow` (3초 주기) |
| 텍스트 라벨 | `TrafficLight.tsx` | "안전"/"주의"/"위험" + 설명문 |
| 커스텀 색상 정의 | `frontend/tailwind.config.js` | `risk: { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }` |
| 커스텀 애니메이션 | `frontend/tailwind.config.js` | `pulse-slow: 3s ease-in-out infinite` |

---

## 23. 결과 카드 컴포넌트

| 컴포넌트 | 코드 위치 | 표시 내용 |
|----------|-----------|-----------|
| `UrlInfo` | `frontend/src/components/ResultCard.tsx` | 원본 URL / 최종 URL (다르면 둘 다 표시) |
| `FlagsList` | `ResultCard.tsx` | 탐지된 위험 요소 (severity별 색상 카드) |
| `InfoRequirementCard` | `ResultCard.tsx` | 요구 정보 수준 (LOW/MEDIUM/HIGH 뱃지) |
| `SafeBrowsingCard` | `ResultCard.tsx` | Safe Browsing 검사 결과 |
| `DomainAnalysisCard` | `ResultCard.tsx` | 위험도 점수 바 (0~10, 높을수록 위험) + risk_breakdown 항목별 표시 + SSL 정보 + 도메인 나이 |
| `RedirectChainCard` | `ResultCard.tsx` | 리다이렉트 경로 시각화 (번호 + 도메인 + 상태코드) |

---

## 24. 효과음 및 진동

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 알림 서비스 | `frontend/src/services/notifications.ts` | |
| 효과음 재생 | `notifications.ts` → `playSound()` | Web Audio API `OscillatorNode` |
| GREEN 소리 | `notifications.ts` | 800Hz + 1000Hz (sine 파형, 차임음) |
| YELLOW 소리 | `notifications.ts` | 600Hz + 400Hz (square 파형, 경고음) |
| RED 소리 | `notifications.ts` | 300Hz + 200Hz + 300Hz (square 파형, 경보음) |
| 진동 패턴 | `notifications.ts` → `vibrate()` | GREEN: `[100]`, YELLOW: `[100,50,100]`, RED: `[200,100,200,100,200]` |
| 설정 저장 | `notifications.ts` | localStorage 키: `qr-guardian-notifications` |
| 설정 UI | `frontend/src/pages/Settings.tsx` | 효과음/진동 토글 + 테스트 버튼 |
| 자동 재생 | `frontend/src/pages/Home.tsx` → `analyzeUrl()` | 스캔 완료 시 `notifyRiskLevel()` 호출 |

---

## 25. 결과 공유

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 공유 서비스 | `frontend/src/services/share.ts` | |
| 공유 텍스트 생성 | `share.ts` → `generateShareText()` | 위험도 이모지 + URL + risk_score + 위험 요소 + 요약 |
| 네이티브 공유 | `share.ts` | `navigator.share()` — 모바일 공유 시트 |
| 클립보드 복사 | `share.ts` | `navigator.clipboard.writeText()` — 데스크톱 fallback |
| 구형 브라우저 | `share.ts` | `document.execCommand('copy')` — 최종 fallback |
| 공유 버튼 | `frontend/src/pages/Result.tsx` | "결과 공유" 버튼 → `shareResult()` 호출 |

---

## 26. 다크/라이트 테마

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 테마 Context | `frontend/src/contexts/ThemeContext.tsx` | `createContext()` + `ThemeProvider` |
| 테마 적용 | `ThemeContext.tsx` | `document.documentElement.classList.add(theme)` |
| 초기화 순서 | `ThemeContext.tsx` | localStorage → 시스템 설정(`prefers-color-scheme`) → 기본값 dark |
| 저장 | `ThemeContext.tsx` | localStorage 키: `qr-guardian-theme` |
| 토글 | `ThemeContext.tsx` → `toggleTheme()` | dark ↔ light 전환 |
| TailwindCSS 연동 | `frontend/tailwind.config.js` | `darkMode: 'class'` |
| 사용 패턴 | 모든 컴포넌트 | `bg-gray-50 dark:bg-slate-900` 등 `dark:` prefix |
| 설정 UI | `frontend/src/pages/Settings.tsx` | 다크/라이트 토글 스위치 |
| Provider 위치 | `frontend/src/App.tsx` | `<ThemeProvider>` 가 최상위 래퍼 |

---

## 27. 스켈레톤 로딩 UI

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 로딩 상태 | `frontend/src/pages/Home.tsx` | `isLoading` state → 스캔 중일 때 true |
| 스켈레톤 UI | `Home.tsx` | 반투명 오버레이 + 신호등 placeholder + 카드 placeholder |
| 깜빡임 효과 | `Home.tsx` | TailwindCSS `animate-pulse` 클래스 |

---

## 28. 사이트 스크린샷 미리보기

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| URL 생성 함수 | `frontend/src/services/api.ts` → `getScreenshotUrl()` | Microlink API URL 조합 |
| URL 형식 | `api.ts` | `https://api.microlink.io/?url={encoded_url}&screenshot=true&meta=false&embed=screenshot.url` |
| 표시 위치 | `frontend/src/pages/Result.tsx` | `<img src={getScreenshotUrl(scanData.final_url)} />` |
| 재시도 | `Result.tsx` | 로딩 실패 시 재시도 버튼 제공 |
| 타임아웃 | `Result.tsx` | 15초 타임아웃 |

---

## 29. 구조화된 로깅

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| JSON Formatter | `backend/app/core/logging.py:8-24` | `JSONFormatter` — timestamp, level, logger, message + extra 필드 |
| 로깅 초기화 | `backend/app/core/logging.py:27-40` | `setup_logging()` — 네임스페이스 `qr_guardian`, 노이즈 억제 |
| 로거 생성 | `backend/app/core/logging.py:43-45` | `get_logger(name)` → `qr_guardian.{name}` |
| 스캔 로그 | `backend/app/routers/scan.py:228-232` | URL + risk_level + duration_ms |
| 벌크 로그 | `backend/app/routers/bulk.py:41` | url_count |
| 신고 로그 | `backend/app/routers/report.py:38` | URL |
| Rate Limit 로그 | `backend/app/main.py:34` | client_ip |

---

## 30. 데이터 모델

### Backend (Pydantic)

| 모델 | 코드 위치 | 용도 |
|------|-----------|------|
| `RiskLevel` | `backend/app/models/schemas.py:6-9` | GREEN/YELLOW/RED enum |
| `Severity` | `schemas.py:12-15` | info/warning/danger enum |
| `InfoRequirementLevel` | `schemas.py:18-21` | LOW/MEDIUM/HIGH enum |
| `ScanRequest` | `schemas.py:24-25` | 요청 바디 `{ url }` |
| `Flag` | `schemas.py:28-31` | 탐지된 위험 요소 `{ type, severity, message }` |
| `InfoRequirement` | `schemas.py:34-36` | 요구 정보 수준 `{ level, evidence }` |
| `RiskBreakdownItem` | `schemas.py` | 위험도 세부 항목 `{ factor, score, reason }` |
| `SafeBrowsingResult` | `schemas.py` | Safe Browsing 결과 `{ is_safe, threats }` |
| `SSLInfo` | `schemas.py:45-52` | SSL 인증서 정보 |
| `DomainAnalysis` | `schemas.py:55-61` | 도메인 분석 결과 |
| `RedirectHop` | `schemas.py:64-68` | 리다이렉트 한 단계 |
| `ScanData` | `schemas.py:71-80` | 스캔 결과 전체 데이터 |
| `ScanResponse` | `schemas.py:83-85` | API 응답 래퍼 `{ status, data }` |
| `ErrorResponse` | `schemas.py:88-91` | 에러 응답 |
| `BulkScanRequest` | `schemas.py:96-97` | 벌크 요청 `{ urls }` |
| `BulkScanItem` | `schemas.py:100-104` | 벌크 결과 한 건 |
| `BulkScanResponse` | `schemas.py:107-109` | 벌크 응답 |
| `ReportRequest` | `schemas.py:114-116` | 신고 요청 `{ url, reason }` |
| `ReportResponse` | `schemas.py:119-121` | 신고 응답 |

### Frontend (TypeScript)

| 타입 | 코드 위치 | 대응 Backend 모델 |
|------|-----------|-------------------|
| `ScanData` | `frontend/src/types/index.ts` | `schemas.py:ScanData` |
| `Flag` | `types/index.ts` | `schemas.py:Flag` |
| `RiskLevel` | `types/index.ts` | `schemas.py:RiskLevel` |
| `DomainAnalysis` | `types/index.ts` | `schemas.py:DomainAnalysis` |
| `SSLInfo` | `types/index.ts` | `schemas.py:SSLInfo` |
| `RedirectHop` | `types/index.ts` | `schemas.py:RedirectHop` |

---

## 31. 설정 및 화이트리스트

| 설정 | 코드 위치 | 내용 |
|------|-----------|------|
| Settings 클래스 | `backend/app/core/config.py:5-102` | pydantic_settings 기반 |
| 환경 판별 | `config.py:6` | `ENVIRONMENT: str = "development"` |
| Safe Browsing 키 | `config.py:7` | `GOOGLE_SAFE_BROWSING_API_KEY: str = ""` |
| Claude API 키 | `config.py` | `CLAUDE_API_KEY: str = ""` |
| CORS origins | `config.py:8-14` | localhost + railway.app |
| 리다이렉트 제한 | `config.py:17` | `MAX_REDIRECTS: int = 10` |
| 요청 타임아웃 | `config.py:18` | `REQUEST_TIMEOUT: float = 10.0` |
| 의심 TLD (16개) | `config.py:21-25` | `.xyz`, `.tk`, `.ml` 등 |
| 단축 URL (34개) | `config.py:28-38` | bit.ly, han.gl 등 |
| 브랜드 (40개) | `config.py:41-53` | google, naver, kakao 등 |
| 신뢰 도메인 (~90개) | `config.py:56-95` | 글로벌 서비스 + 한국 포털/은행/정부/통신사 |
| .env 파일 로드 | `config.py:97-99` | `class Config: env_file = ".env"` |

---

## 32. 테스트

| 테스트 파일 | 건수 | 코드 위치 | 검증 대상 |
|------------|------|-----------|-----------|
| `test_scan_api.py` | 12건 | `backend/tests/test_scan_api.py` | FastAPI TestClient 기반 API 통합 테스트 |
| `test_summary_generator.py` | 11건 | `backend/tests/test_summary_generator.py` | 시나리오별 요약 키워드 검증 |
| `test_threat_detector.py` | 26건 | `backend/tests/test_threat_detector.py` | 타이포스쿼팅/피싱/URL구조/요구정보 단위 테스트 |
| **합계** | **49건** | | |

### test_scan_api.py 상세 (12건)

| 테스트 | 검증 내용 |
|--------|-----------|
| `test_scan_valid_url_returns_success` | 정상 URL → 200 + success |
| `test_scan_response_structure` | 응답에 필수 필드 전부 존재 |
| `test_scan_trusted_domain_is_green` | google.com → GREEN |
| `test_scan_empty_url_returns_400` | 빈 URL → 400 |
| `test_scan_url_without_scheme_adds_https` | scheme 없는 URL에 https:// 자동 추가 |
| `test_scan_safe_browsing_result` | Safe Browsing 결과 포함 |
| `test_scan_summary_is_not_empty` | 요약이 빈 문자열 아닌지 |
| `test_scan_domain_analysis_present` | 도메인 분석 결과 포함 |
| `test_scan_mock_malware_url` | 악성 URL 스캔 시 서버 정상 |
| `test_scan_suspicious_phishing_pattern` | 피싱 URL 스캔 시 서버 정상 |
| `test_health_check` | /health → healthy |
| `test_root_endpoint` | / → QR Guardian API |

### test_threat_detector.py 상세 (26건)

| 그룹 | 건수 | 검증 내용 |
|------|------|-----------|
| `TestTyposquatting` | 9건 | 유사도 탐지, 문자 치환, 오탐 방지, 적응형 threshold |
| `TestTyposquatVariant` | 6건 | normalize(0→o, $→s, rn→m, vv→w), 글자 추가/삭제 |
| `TestUrlStructure` | 4건 | 신뢰 도메인, 의심 TLD, IP 주소, 긴 서브도메인 |
| `TestPhishingPatterns` | 4건 | 영문 피싱, 한국어 택배/세금/결제 피싱 |
| `TestInfoRequirement` | 3건 | LOW/HIGH 판정 |

---

## 33. CI/CD

| 기능 | 코드 위치 | 핵심 로직 |
|------|-----------|-----------|
| 워크플로우 파일 | `.github/workflows/ci.yml` | main/dev 브랜치 push/PR 트리거 |
| Backend Job | `ci.yml` → backend | Python 3.11 + pip install + pytest |
| Frontend Job | `ci.yml` → frontend | Node.js 20 + npm ci + tsc --noEmit + build |
| Docker Job | `ci.yml` → docker | backend/frontend 완료 후 Docker 빌드 테스트 |
| 프로덕션 배포 | 수동 | `git push origin main` → Railway 자동 감지 → Docker 빌드 → 배포 |

---

## 부록: API 엔드포인트 전체 목록

| 메서드 | 경로 | Rate Limit | 코드 위치 | 설명 |
|--------|------|------------|-----------|------|
| `POST` | `/api/scan` | 30/분 | `scan.py:49-55` | URL 보안 스캔 |
| `POST` | `/api/bulk-scan` | 5/분 | `bulk.py:21-23` | 벌크 URL 스캔 (최대 20개) |
| `POST` | `/api/report` | 10/분 | `report.py:19-21` | URL 신고 |
| `GET` | `/api/reports/stats` | 없음 | `report.py:46-47` | 신고 통계 |
| `GET` | `/health` | 없음 | `main.py:72-75` | 헬스체크 |
| `GET` | `/` | 없음 | `main.py:78-85` | API 정보 |
| `GET` | `/api/docs` | 없음 | `main.py:25` | OpenAPI 문서 (개발 환경만) |
| `GET` | `/api/redoc` | 없음 | `main.py:26` | ReDoc 문서 (개발 환경만) |

---

## 부록: 프론트엔드 라우트 전체 목록

| 경로 | 컴포넌트 | 코드 위치 | 설명 |
|------|----------|-----------|------|
| `/` | `Home.tsx` | `frontend/src/pages/Home.tsx` | QR 스캔 + URL 입력 |
| `/result` | `Result.tsx` | `frontend/src/pages/Result.tsx` | 분석 결과 표시 |
| `/history` | `History.tsx` | `frontend/src/pages/History.tsx` | 스캔 기록 + 통계 |
| `/settings` | `Settings.tsx` | `frontend/src/pages/Settings.tsx` | 테마/알림 설정 |
| `/generate` | `Generate.tsx` | `frontend/src/pages/Generate.tsx` | QR 코드 생성 |
| `/bulk` | `BulkScan.tsx` | `frontend/src/pages/BulkScan.tsx` | 벌크 URL 검사 |
