from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    GOOGLE_SAFE_BROWSING_API_KEY: str = ""
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:80",
        "http://localhost",
        "https://*.railway.app",
        "https://*.up.railway.app",
    ]

    # URL analysis settings
    MAX_REDIRECTS: int = 10
    REQUEST_TIMEOUT: float = 10.0

    # Known suspicious TLDs
    SUSPICIOUS_TLDS: List[str] = [
        ".xyz", ".top", ".work", ".click", ".link", ".info",
        ".online", ".site", ".website", ".space", ".pw", ".tk",
        ".ml", ".ga", ".cf", ".gq"
    ]

    # URL shortener domains
    SHORTENER_DOMAINS: List[str] = [
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
        "is.gd", "buff.ly", "j.mp", "rb.gy", "short.io",
        "cutt.ly", "han.gl", "vo.la", "me2.do", "url.kr"
    ]

    # Popular brands for typosquatting detection
    POPULAR_BRANDS: List[str] = [
        "google", "facebook", "amazon", "apple", "microsoft",
        "paypal", "netflix", "instagram", "twitter", "linkedin",
        "naver", "kakao", "samsung", "toss", "coupang"
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
