import httpx
from typing import List, Tuple
from app.core.config import settings


class SafeBrowsingService:
    """
    Google Safe Browsing API integration.
    Falls back to mock data when API key is not configured.
    """

    @property
    def is_mock_mode(self) -> bool:
        """True when Safe Browsing API key is not configured."""
        return not bool(self.api_key)

    def __init__(self):
        self.api_key = settings.GOOGLE_SAFE_BROWSING_API_KEY
        self.api_url = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

        # Mock dangerous URLs for testing (when API key is not set)
        self.mock_dangerous_urls = [
            "malware.testing.google.test",
            "phishing.testing.google.test",
            "example-phishing.com",
            "fake-bank-login.com",
            "steal-your-data.xyz",
        ]

    async def check_url(self, url: str) -> Tuple[bool, List[str]]:
        """
        Check URL against Google Safe Browsing API.
        Returns (is_safe, list of threat types).
        """
        # If no API key, use mock check
        if not self.api_key:
            return self._mock_check(url)

        try:
            return await self._api_check(url)
        except Exception:
            # Fall back to mock on API error
            return self._mock_check(url)

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
                # API error, fall back to mock
                return self._mock_check(url)

    def _mock_check(self, url: str) -> Tuple[bool, List[str]]:
        """Mock check for development/testing."""
        url_lower = url.lower()

        for dangerous in self.mock_dangerous_urls:
            if dangerous in url_lower:
                return False, ["악성코드 또는 피싱 위협 감지됨"]

        # Additional heuristic checks for mock
        if "phishing" in url_lower or "malware" in url_lower:
            return False, ["의심스러운 URL 패턴 감지됨"]

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
