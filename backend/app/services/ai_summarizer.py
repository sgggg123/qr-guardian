"""AI-powered summary generator using Google Gemini API."""
import logging
from app.core.config import settings

logger = logging.getLogger("ai_summarizer")


async def generate_ai_summary(
    risk_score: float,
    risk_breakdown: list[dict],
    risk_factors: list[dict],
    url: str,
    domain: str,
) -> dict:
    """
    Generate an AI-powered Korean summary and action guidelines using Gemini API.

    Returns:
        {"ai_summary": str, "action_guidelines": list[str]}

    Falls back to None values if API key is missing or call fails.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        logger.warning("GEMINI_API_KEY not configured — skipping AI summary")
        return {"ai_summary": None, "action_guidelines": None}

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        # Build context for the prompt
        breakdown_text = "\n".join(
            f"- {item['factor']}: {item['score']}점 — {item['reason']}"
            for item in risk_breakdown
        )
        factors_text = "\n".join(
            f"- [{item.get('severity', 'info')}] {item.get('message', '')}"
            for item in risk_factors
        ) if risk_factors else "없음"

        prompt = f"""당신은 URL 보안 분석 전문가입니다. 아래 분석 결과를 바탕으로 일반 사용자가 이해할 수 있는 한국어 요약과 행동 수칙을 생성하세요.

## 분석 대상
- URL: {url}
- 도메인: {domain}
- 위험도 점수: {risk_score}/10.0 (높을수록 위험)

## 위험도 세부 항목
{breakdown_text}

## 탐지된 위험 요소
{factors_text}

## 요청 형식
1. **요약**: 2~3문장으로 이 URL의 안전성을 설명하세요. 전문 용어를 피하고 일반인이 이해할 수 있게 작성하세요.
2. **행동 수칙**: 사용자가 취해야 할 구체적인 행동을 번호 매긴 리스트로 2~4개 작성하세요.

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{{"ai_summary": "요약 텍스트", "action_guidelines": ["수칙1", "수칙2", "수칙3"]}}"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        response_text = response.text.strip()

        import json
        # Strip markdown code blocks if Gemini wraps response in ```json ... ```
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]).strip()

        result = json.loads(response_text)
        ai_summary = result.get("ai_summary")
        action_guidelines = result.get("action_guidelines")

        if isinstance(ai_summary, str) and isinstance(action_guidelines, list):
            return {
                "ai_summary": ai_summary,
                "action_guidelines": action_guidelines,
            }

        logger.warning("AI response format unexpected: %s", response_text[:200])
        return {"ai_summary": None, "action_guidelines": None}

    except ImportError:
        logger.warning("google-genai package not installed — skipping AI summary")
        return {"ai_summary": None, "action_guidelines": None}
    except Exception as e:
        logger.error("AI summary generation failed: %s", e)
        return {"ai_summary": None, "action_guidelines": None}
