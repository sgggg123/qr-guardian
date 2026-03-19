"""URLhaus malware URL database integration (abuse.ch).
No API key required. https://urlhaus-api.abuse.ch/
"""
import httpx
from typing import Tuple, List
from app.core.logging import get_logger

logger = get_logger("urlhaus")

URLHAUS_API = "https://urlhaus-api.abuse.ch/v1/url/"


class URLhausService:
    async def check_url(self, url: str) -> Tuple[bool, List[str]]:
        """
        Check URL against URLhaus malware database.
        Returns (is_malware, tags).
        Fails silently — returns (False, []) on any error.
        """
        try:
            async with httpx.AsyncClient() as client:
                # URLhaus API uses form data, not JSON
                response = await client.post(
                    URLHAUS_API,
                    data={"url": url},
                    timeout=5.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("query_status") == "is_malware":
                        tags = data.get("tags") or []
                        logger.warning(
                            "URLhaus malware hit",
                            extra={"url": url, "tags": tags}
                        )
                        return True, tags
        except Exception as e:
            logger.debug("URLhaus check failed (non-critical): %s", e)
        return False, []


urlhaus_service = URLhausService()
