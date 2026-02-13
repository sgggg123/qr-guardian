# QR Guardian - 도메인 위험도 분석 서비스 전면 개선

## 변경 요약

### 1. 위험도 점수 체계 변경
- **기존**: `trust_score` 100점 만점 감점 방식
- **변경**: `risk_score` 0~10점 가점 방식 (높을수록 위험)
- `risk_breakdown`으로 각 요인별 점수와 사유를 세부 표시

| 요인 | 최대 점수 | 조건 |
|------|----------|------|
| domain_age | 4.0 | <30일: 4, <90일: 2, <1년: 1, 그 이상: 0 |
| ssl | 3.0 | HTTP: 3, 만료/저신뢰: 2, 곧 만료: 1, 정상: 0 |
| safe_browsing | 2.0 | 위협 감지: 2, 없음: 0 |
| whois_failure | 1.0 | 조회 실패: 1, 성공: 0 |

### 2. Safe Browsing mock 제거
- `mock_dangerous_urls`, `_mock_check()`, `is_mock_mode` 전부 삭제
- API 키 미설정 또는 API 실패 시: `(True, [])` 반환 (안전 처리)
- 프론트엔드 `mock_mode` 필드 및 관련 UI 제거

### 3. AI 요약 서비스 (신규)
- `backend/app/services/ai_summarizer.py` 추가
- Claude API (claude-sonnet-4-20250514)를 사용한 한국어 요약 생성
- 반환: `ai_summary` (2~3문장 요약) + `action_guidelines` (행동 수칙 리스트)
- API 키 미설정/실패 시 `null` 반환 (기존 template 요약은 유지)

### 4. 신고 기능 개선
- `ReportRequest`에 `risk_score`, `ai_summary` 필드 추가
- 신고 저장 시 분석 데이터 함께 기록
- `/api/reports/stats`에 `sort_by=risk_score` 정렬 옵션 추가

### 5. 프론트엔드 업데이트
- **DomainAnalysisCard**: trust_score/100 → risk_score/10 (위험할수록 빨간색)
- **risk_breakdown** 항목별 시각화 (색상 점, 점수 표시)
- **AI 요약 카드**: 분석 요약 표시
- **행동 수칙 카드**: 번호 매긴 리스트
- **공유 텍스트**: 위험도 점수/10 형식
- **신고 시** risk_score, ai_summary 함께 전송

## 새 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `CLAUDE_API_KEY` | 선택 | Claude API 키. 미설정 시 AI 요약 비활성 |

## 하위호환성

- `trust_score`(100점)와 `risk_factors`는 유지 (레거시 호환)
- `SafeBrowsingResult.mock_mode` 필드 제거 (프론트 동기화 완료)
- AI 요약 필드는 Optional — 없으면 기존 template 요약만 표시

## 파일 변경 목록

### 수정
- `backend/app/core/config.py`
- `backend/app/models/schemas.py`
- `backend/app/services/domain_analyzer.py`
- `backend/app/services/safe_browsing.py`
- `backend/app/routers/scan.py`
- `backend/app/routers/report.py`
- `backend/requirements.txt`
- `frontend/src/types/index.ts`
- `frontend/src/components/ResultCard.tsx`
- `frontend/src/pages/Result.tsx`
- `frontend/src/services/share.ts`
- `frontend/src/services/api.ts`
- `.env.example`

### 신규
- `backend/app/services/ai_summarizer.py`
- `CHANGELOG_IMPROVEMENT.md`
