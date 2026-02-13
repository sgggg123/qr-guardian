import logging
import httpx
from typing import List, Tuple
from app.core.config import settings

logger = logging.getLogger("safe_browsing")


class SafeBrowsingService:
    """
    Google Safe Browsing API integration.
    No mock mode — returns safe (True, []) when API key is missing or on failure.
    """

    def __init__(self):
        self.api_key = settings.GOOGLE_SAFE_BROWSING_API_KEY
        self.api_url = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

    async def check_url(self, url: str) -> Tuple[bool, List[str]]:
        """
        Check URL against Google Safe Browsing API.
        Returns (is_safe, list of threat types).
        """
        if not self.api_key:
            logger.warning("Safe Browsing API key not configured — treating URL as safe")
            return True, []

        try:
            return await self._api_check(url)
        except Exception as e:
            logger.error("Safe Browsing API check failed: %s", e)
            return True, []

    async def _api_check(self, url: str) -> Tuple[bool, List[str]]:
        """Actual API call to Google Safe Browsing."""
        payload = {
            "client": {
                "clientId": "qr-guardian",
                "clientVersion": "1.0.0"
            },
            "threatInfo": {
                "threatTypes": [
                    "MALWARE",
                    "SOCIAL_ENGINEERING",
                    "UNWANTED_SOFTWARE",
                    "POTENTIALLY_HARMFUL_APPLICATION"
                ],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}]
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}?key={self.api_key}",
                json=payload,
                timeout=10.0
            )

            if response.status_code == 200:
                data = response.json()
                if "matches" in data and data["matches"]:
                    threats = [
                        self._translate_threat_type(match.get("threatType", ""))
                        for match in data["matches"]
                    ]
                    return False, threats
                return True, []
            else:
                logger.error("Safe Browsing API returned status %d", response.status_code)
                return True, []

    def _translate_threat_type(self, threat_type: str) -> str:
        """Translate threat type to Korean."""
        translations = {
            "MALWARE": "악성코드",
            "SOCIAL_ENGINEERING": "소셜 엔지니어링/피싱",
            "UNWANTED_SOFTWARE": "원치 않는 소프트웨어",
            "POTENTIALLY_HARMFUL_APPLICATION": "잠재적으로 유해한 애플리케이션"
        }
        return translations.get(threat_type, threat_type)


safe_browsing_service = SafeBrowsingService()
