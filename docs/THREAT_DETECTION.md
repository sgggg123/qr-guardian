# QR Guardian — 위협 탐지 시스템 개발자 문서

> 최종 수정: 2026-03-19

---

## 목차

1. [탐지 파이프라인 개요](#1-탐지-파이프라인-개요)
2. [탐지 소스별 설명](#2-탐지-소스별-설명)
3. [위험 점수 체계](#3-위험-점수-체계)
4. [플래그 타입 전체 목록](#4-플래그-타입-전체-목록)
5. [위험 등급 판정 로직](#5-위험-등급-판정-로직)
6. [탐지 한계 및 주의사항](#6-탐지-한계-및-주의사항)
7. [변경 이력](#7-변경-이력)

---

## 1. 탐지 파이프라인 개요

URL 하나가 입력되면 아래 순서로 분석이 진행됩니다.

```
입력 URL
  │
  ├─ 1. 리다이렉트 추적 (최대 10홉)
  │       └─ 최종 목적지 URL 확정
  │
  ├─ 2. URL 구조 분석 (threat_detector.py)
  │       ├─ 악성 파일 확장자 탐지
  │       ├─ 이중 TLD 패턴 탐지
  │       ├─ IP 주소 직접 사용 탐지
  │       ├─ 비표준 포트 탐지
  │       ├─ 긴 서브도메인 탐지
  │       ├─ 타이포스쿼팅 탐지
  │       ├─ 피싱/악성코드 URL 패턴 탐지
  │       └─ 페이지 콘텐츠 분석 (로그인폼, 개인정보 수집)
  │
  ├─ 3. 외부 DB 병렬 조회
  │       ├─ Google Safe Browsing API (피싱, 악성코드)
  │       └─ URLhaus API (악성코드 배포 URL)
  │
  ├─ 4. 도메인 분석 (domain_analyzer.py)
  │       ├─ SSL 인증서 검증
  │       └─ WHOIS 도메인 연령 조회
  │
  └─ 5. 위험 점수 합산 → 등급 판정 (GREEN / YELLOW / RED)
```

---

## 2. 탐지 소스별 설명

### 2-1. Google Safe Browsing

| 항목 | 내용 |
|------|------|
| 파일 | `backend/app/services/safe_browsing.py` |
| API | `https://safebrowsing.googleapis.com/v4/threatMatches:find` |
| 환경변수 | `GOOGLE_SAFE_BROWSING_API_KEY` |
| 탐지 대상 | 피싱, 악성코드, 소셜엔지니어링, 유해 앱 |
| 미설정 시 | 항상 안전으로 처리 (스킵) |
| 히트 시 점수 | +2.0점, DANGER 플래그 |

### 2-2. URLhaus (abuse.ch)

| 항목 | 내용 |
|------|------|
| 파일 | `backend/app/services/urlhaus.py` |
| API | `https://urlhaus-api.abuse.ch/v1/url/` |
| 환경변수 | 불필요 (무료, 키 없음) |
| 탐지 대상 | 악성코드 배포 URL (Mirai, Mozi, GuLoader, RemcosRAT, ACRStealer 등) |
| 요청 방식 | POST, form-data (JSON 아님) |
| 타임아웃 | 5초 (초과 시 무시하고 통과) |
| 히트 시 점수 | +2.0점, DANGER 플래그 |
| 실행 방식 | Safe Browsing과 `asyncio.gather`로 병렬 실행 |

**URLhaus 응답 형식:**
```json
{
  "query_status": "is_malware",
  "threat": "malware",
  "tags": ["ACRStealer", "ClearFake"]
}
```
```json
{
  "query_status": "no_results"
}
```

### 2-3. URL 구조 분석

| 항목 | 내용 |
|------|------|
| 파일 | `backend/app/services/threat_detector.py` |
| 탐지 방식 | 정규식 패턴, 도메인 구조 분석, 문자열 비교 |

**악성 파일 확장자 목록:**
`.exe` `.bat` `.sh` `.ps1` `.elf` `.msi` `.vbs` `.dll` `.hta` `.scr`

**피싱/악성코드 URL 패턴 (주요):**
| 패턴 | 대상 악성코드/공격 |
|------|------------------|
| `verification\.google` | ClearFake (구글 사칭) |
| `update.*browser` / `browser.*update` | 가짜 브라우저 업데이트 유도 |
| `secure.*login` / `account.*verify` | 피싱 로그인 페이지 |
| `택배.*조회` / `배송.*확인` | 택배 사칭 스미싱 |
| `국세청.*환급` / `정부.*지원금` | 정부기관 사칭 |
| `청첩장.*확인` / `부고.*안내` | 모바일 초대장 악성코드 |

**이중 TLD 패턴 (악성코드 악용 도메인):**
`.in.net` `.in.ua` `.co.cc` `.com.co`

**타이포스쿼팅 탐지:**
- Levenshtein 유사도 기반 (`SequenceMatcher`)
- 브랜드 길이 ≤4자: 임계값 0.85, 그 외: 0.70
- 문자 치환 정규화 (`0→o`, `1→l`, `rn→m` 등)

### 2-4. 도메인 분석

| 항목 | 내용 |
|------|------|
| 파일 | `backend/app/services/domain_analyzer.py` |

| 분석 항목 | 점수 기준 |
|-----------|-----------|
| HTTP (SSL 없음) | +3.0점 |
| SSL 만료 또는 저신뢰 발급기관 | +2.0점 |
| SSL 만료 임박 (30일 이내) | +1.0점 |
| 도메인 등록 30일 미만 | +4.0점 |
| 도메인 등록 90일 미만 | +2.0점 |
| 도메인 등록 1년 미만 | +1.0점 |
| WHOIS 조회 실패 | +1.0점 |

---

## 3. 위험 점수 체계

### 3-1. 점수 구성

최종 `risk_score`는 아래 항목의 합산입니다. (최대 10.0점 캡)

```
risk_score = SSL점수 + 도메인연령점수 + WHOIS실패점수
           + SafeBrowsing점수 + URLhaus점수
           + URL패턴점수 (flag_score)
```

### 3-2. URL 패턴 점수 (`flag_score`) 산정 방식

| 플래그 | 점수 | 방식 |
|--------|------|------|
| `typosquatting` | 3.0 | max |
| `phishing_pattern` | 3.0 | max |
| `malware_extension` | 3.0 | max |
| `suspicious_tld` | 2.0 | max |
| `ip_address` | 2.0 | max |
| `suspicious_port` | +1.5 | additive |
| `long_subdomain` | +1.0 | additive |
| `login_path` | 1.0 | max (score < 2.0일 때만) |
| `cross_domain_redirect` | 1.0 | max (score < 2.0일 때만) |

> **max**: 현재 점수보다 높을 때만 적용
> **additive**: 현재 점수에 무조건 더함 (복합 위험 반영)

### 3-3. 점수별 등급 기준

| 점수 | 등급 |
|------|------|
| 0.0 ~ 2.9 | 🟢 GREEN (안전) |
| 3.0 ~ 6.9 | 🟡 YELLOW (주의) |
| 7.0 ~ 10.0 | 🔴 RED (위험) |

---

## 4. 플래그 타입 전체 목록

| 플래그 타입 | 심각도 | 설명 |
|-------------|--------|------|
| `urlhaus_threat` | DANGER | URLhaus DB에 등록된 악성 URL |
| `safe_browsing_threat` | DANGER | Google Safe Browsing 위협 감지 |
| `malware_extension` | DANGER | 악성코드 파일 확장자 (.exe, .sh 등) |
| `typosquatting` | DANGER | 브랜드 사칭 유사 도메인 |
| `phishing_pattern` | DANGER | 피싱/악성코드 URL 패턴 |
| `expired_cert` | DANGER | SSL 인증서 만료 |
| `suspicious_tld` | WARNING | 의심스러운 TLD 또는 이중 TLD 패턴 |
| `ip_address` | WARNING | IP 주소 직접 사용 |
| `suspicious_port` | WARNING | 비표준 포트 사용 (80, 443 제외) |
| `long_subdomain` | WARNING | 4단계 이상 서브도메인 |
| `shortened_url` | WARNING | 단축 URL 사용 |
| `multiple_redirects` | WARNING | 3회 초과 리다이렉트 |
| `cross_domain_redirect` | WARNING | 다중 도메인 경유 리다이렉트 |
| `new_domain` | WARNING | 30일 미만 신생 도메인 |
| `low_trust_issuer` | WARNING | 저신뢰 SSL 인증서 발급기관 |
| `login_form` | INFO | 로그인 폼 감지 |
| `login_path` | INFO | 로그인/인증 관련 경로 |
| `personal_info_request` | INFO/WARNING | 개인정보 입력 필드 |
| `payment_form` | INFO/WARNING | 결제 정보 입력 필드 |

---

## 5. 위험 등급 판정 로직

`backend/app/routers/scan.py` → `_calculate_risk_level()`

```
1. 신뢰 도메인 + Safe Browsing 안전 → 즉시 GREEN

2. Safe Browsing 위협 감지 → 즉시 RED

3. DANGER 플래그 존재 → RED
   (urlhaus_threat, malware_extension, typosquatting,
    phishing_pattern, safe_browsing_threat, expired_cert)

4. risk_score ≥ 7.0 → RED

5. risk_score ≥ 4.0 AND (WARNING 플래그 ≥ 1개 OR 안전하지 않음) → RED

6. trust_score < 30 → RED

7. risk_score ≥ 3.0 → YELLOW

8. WARNING 플래그 ≥ 3개 OR trust_score < 60 → YELLOW

9. 중요 WARNING 플래그 1개 이상 → YELLOW
   (suspicious_tld, multiple_redirects, ip_address, suspicious_port,
    long_subdomain, payment_form, personal_info_request, new_domain,
    low_trust_issuer)

10. 그 외 → GREEN
```

---

## 6. 탐지 한계 및 주의사항

| 한계 | 설명 |
|------|------|
| URLhaus 미등록 신규 URL | 방금 생성된 악성 URL은 DB에 없을 수 있음 |
| Let's Encrypt 인증서 | 악성 사이트도 무료 인증서 사용 가능 → HTTPS라고 안전하지 않음 |
| 정상 사이트 유사 도메인 | 짧은 브랜드명(≤4자)의 타이포스쿼팅은 임계값 높여 오탐 방지 |
| URLhaus 타임아웃 | 5초 초과 시 무시 → 해당 URL은 나머지 로직으로만 판단 |
| WHOIS 한계 | 일부 TLD는 WHOIS 정보 비공개 → 조회 실패 시 +1.0점 패널티 적용 |
| 캐시 | 동일 URL은 10분간 캐시 → 그 사이 URLhaus DB 업데이트 반영 안 됨 |

---

## 7. 변경 이력

### 2026-03-19
**탐지 강화 업데이트**
- URLhaus (abuse.ch) 실시간 악성 URL DB 연동
- 악성코드 파일 확장자 탐지 추가 (`.exe`, `.sh`, `.ps1` 등 10종)
- ClearFake 공격 패턴 추가 (`verification.google` 등)
- 이중 TLD 패턴 탐지 추가 (`.in.net`, `.in.ua` 등)
- `suspicious_port` 플래그 위험 점수 미반영 버그 수정 (+1.5점)
- `long_subdomain` 플래그 위험 점수 미반영 버그 수정 (+1.0점)
- `domain_analyzer` WHOIS에 포트 번호 포함 전달 버그 수정

### 2026-01-27 ~ 2026-02-23
- 최초 구현 (Google Safe Browsing, 타이포스쿼팅, 피싱 패턴, 도메인 분석)
