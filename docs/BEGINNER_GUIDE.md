# QR Guardian 초심자 가이드

## 핵심 코드 흐름

사용자가 URL을 입력하면 다음 순서로 처리됩니다:

```
[프론트엔드]                           [백엔드]
Home.tsx                               scan.py (오케스트레이터)
  └─ scanUrl() ─── POST /api/scan ──→   ├─ url_analyzer: 단축URL 해제, 리다이렉트 추적
                                         ├─ threat_detector: URL 패턴 분석, 페이지 콘텐츠 분석
                                         ├─ safe_browsing: Google API 위협 조회
                                         ├─ domain_analyzer: SSL, WHOIS, risk_score 산출
                                         ├─ summary_generator: 템플릿 한국어 요약
                                         ├─ ai_summarizer: Claude AI 요약 (선택)
                                         └─ risk_level 판정 (GREEN/YELLOW/RED)
  ←── ScanResponse (JSON) ───────────
Result.tsx
  └─ 결과 표시 (신호등 + 요약 + 상세 카드)
```

## 핵심 파일 5개

| 파일 | 역할 | 핵심 함수 |
|------|------|-----------|
| `backend/app/routers/scan.py` | 전체 분석 파이프라인 조율 | `scan_url()`, `_calculate_risk_level()`, `_calculate_flag_risk()` |
| `backend/app/services/domain_analyzer.py` | 도메인 SSL/나이/위험도 분석 | `analyze_domain()` → `risk_score` + `risk_breakdown` |
| `backend/app/services/threat_detector.py` | URL 구조 위협 탐지 | `analyze_url_structure()`, `analyze_page_content()` |
| `frontend/src/pages/Home.tsx` | 스캔 시작점 (QR + URL 입력 + 붙여넣기) | `analyzeUrl()`, `handlePaste()` |
| `frontend/src/pages/Result.tsx` | 결과 표시 페이지 | AI 요약, 행동 수칙, 위험도 카드 |

## 위험도 판정 로직

### risk_score (0~10점)

`domain_analyzer.py`에서 기본 점수를 산출하고, `scan.py`에서 추가 요인을 더합니다:

```
risk_score = ssl(0~3) + domain_age(0~4) + whois_failure(0~1) + safe_browsing(0~2) + url_pattern(0~3)
```

### risk_level (신호등)

`scan.py`의 `_calculate_risk_level()`에서 결정:

1. 신뢰 도메인(TRUSTED_DOMAINS) + 안전 → **GREEN**
2. Safe Browsing 위협 → **RED**
3. 타이포스쿼팅/피싱 감지 → **RED**
4. risk_score >= 7.0 → **RED**
5. risk_score >= 3.0 → **YELLOW**
6. 경고 플래그 있음 → **YELLOW**
7. 그 외 → **GREEN**

## 코드 수정 시 주의사항

1. **schemas.py 수정 시**: 프론트엔드 `types/index.ts`도 동기화 필요
2. **점수 가중치 변경 시**: `domain_analyzer.py`의 breakdown과 `scan.py`의 `_calculate_flag_risk()` 양쪽 확인
3. **새 플래그 추가 시**: `threat_detector.py`에서 추가 → `scan.py`의 `_calculate_flag_risk()`에 반영 → `summary_generator.py`에 케이스 추가
4. **환경변수 추가 시**: `config.py` + `.env.example` 동시 업데이트

## 테스트 실행

```bash
# 백엔드 테스트
cd backend
source venv/bin/activate
python -m pytest tests/ -v

# 프론트엔드 타입 체크
cd frontend
npx tsc --noEmit

# API 수동 테스트
curl -X POST http://localhost:8000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://navar.com"}'
```

## 주요 설정값 위치

| 설정 | 파일 | 설명 |
|------|------|------|
| 신뢰 도메인 목록 | `config.py` > `TRUSTED_DOMAINS` | 항상 GREEN 처리되는 도메인 |
| 브랜드 목록 | `config.py` > `POPULAR_BRANDS` | 타이포스쿼팅 탐지 대상 |
| 의심 TLD | `config.py` > `SUSPICIOUS_TLDS` | .xyz, .tk 등 |
| 단축URL 도메인 | `config.py` > `SHORTENER_DOMAINS` | bit.ly, han.gl 등 |
| SSL 발급기관 점수 | `domain_analyzer.py` > `TRUSTED_ISSUERS` | DigiCert:100, Let's Encrypt:80 등 |
| 캐시 TTL | `scan.py` > `_CACHE_TTL` | 600초 (10분) |
| Rate Limit | `scan.py` > `@limiter.limit` | 30/minute |
