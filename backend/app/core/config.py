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

    # URL shortener domains (글로벌 + 한국형)
    SHORTENER_DOMAINS: List[str] = [
        # 글로벌
        "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly",
        "is.gd", "buff.ly", "j.mp", "rb.gy", "short.io",
        "cutt.ly", "shorturl.at", "tiny.cc", "bc.vc", "po.st",
        "soo.gd", "s.id", "rotf.lol", "v.gd", "clck.ru",
        # 한국형
        "han.gl", "vo.la", "me2.do", "url.kr", "zrr.kr",
        "kko.to", "gg.gg", "hoy.kr", "buly.kr", "urls.kr",
        "단축.kr", "goto.gs", "fw.sg", "lrl.kr"
    ]

    # Popular brands for typosquatting detection
    POPULAR_BRANDS: List[str] = [
        # 글로벌 대형 브랜드
        "google", "facebook", "amazon", "apple", "microsoft",
        "paypal", "netflix", "instagram", "twitter", "linkedin",
        "youtube", "whatsapp", "telegram", "discord", "spotify",
        "dropbox", "adobe", "zoom", "slack", "github",
        # 한국 브랜드
        "naver", "kakao", "samsung", "toss", "coupang",
        "shinhan", "kookmin", "woori", "hana", "nonghyup",
        "hyundai", "lotte", "daum", "baemin", "yogiyo",
        # 금융 관련
        "visa", "mastercard", "amex", "coinbase", "binance"
    ]

    # Trusted domains (whitelist) - always GREEN
    TRUSTED_DOMAINS: List[str] = [
        # 글로벌 대형 서비스
        "google.com", "google.co.kr", "youtube.com", "gmail.com",
        "facebook.com", "instagram.com", "twitter.com", "x.com",
        "amazon.com", "apple.com", "microsoft.com", "github.com", "gitlab.com",
        "netflix.com", "linkedin.com", "reddit.com", "wikipedia.org",
        "whatsapp.com", "telegram.org", "discord.com", "slack.com",
        "dropbox.com", "zoom.us", "spotify.com", "twitch.tv",
        "paypal.com", "stripe.com", "stackoverflow.com",

        # 한국 포털/서비스
        "naver.com", "kakao.com", "daum.net", "zum.com",
        "coupang.com", "toss.im", "samsung.com", "lg.com",
        "11st.co.kr", "gmarket.co.kr", "auction.co.kr", "ssg.com",
        "baemin.com", "yogiyo.co.kr", "carrot.market",

        # 한국 은행
        "kbstar.com", "shinhan.com", "wooribank.com", "ibk.co.kr",
        "hanabank.com", "nhbank.com", "standardchartered.co.kr",
        "citibank.co.kr", "kakaobank.com", "kbanknow.com",
        "tossbank.com", "dgb.co.kr", "busanbank.co.kr",

        # 한국 증권사
        "kiwoom.com", "samsungpop.com", "miraeasset.com",
        "nhqv.com", "shinhansec.com", "kbsec.com", "truefriend.com",

        # 한국 정부/공공기관
        "go.kr", "or.kr", "ac.kr", "re.kr",
        "gov.kr", "police.go.kr", "nts.go.kr", "mois.go.kr",
        "mohw.go.kr", "moe.go.kr", "koreapost.go.kr",
        "nhis.or.kr", "nps.or.kr", "hometax.go.kr",

        # 한국 통신사/IT
        "skt.com", "kt.com", "lguplus.com", "skbroadband.com",
        "ncloud.com", "gabia.com", "cafe24.com", "toast.com",

        # 기타 신뢰 서비스
        "notion.so", "figma.com", "canva.com", "trello.com",
        "asana.com", "monday.com", "airtable.com", "miro.com"
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
