"""Unit tests for ThreatDetector service."""
import pytest
from app.services.threat_detector import ThreatDetector


@pytest.fixture
def detector():
    return ThreatDetector()


# --- Typosquatting detection ---

class TestTyposquatting:
    def test_exact_brand_not_flagged(self, detector):
        """google.com should not be flagged as typosquatting."""
        assert detector._detect_typosquatting("google.com") is None

    def test_zero_substitution(self, detector):
        """g00gle should be flagged (0→o)."""
        result = detector._detect_typosquatting("g00gle.com")
        assert result == "google"

    def test_single_char_difference(self, detector):
        """gooogle (extra o) should be flagged."""
        result = detector._detect_typosquatting("gooogle.com")
        assert result == "google"

    def test_rn_to_m_substitution(self, detector):
        """rnicrosoft should be flagged (rn→m)."""
        result = detector._detect_typosquatting("rnicrosoft.com")
        assert result == "microsoft"

    def test_naver_typo(self, detector):
        """naverr (extra r) should be flagged."""
        result = detector._detect_typosquatting("naverr.com")
        assert result == "naver"

    def test_navar_typo(self, detector):
        """navar (a instead of e) should be flagged."""
        result = detector._detect_typosquatting("navar.com")
        assert result == "naver"

    def test_completely_different_not_flagged(self, detector):
        """A totally unrelated domain should not be flagged."""
        assert detector._detect_typosquatting("randomwebsite123.com") is None

    def test_short_brand_high_threshold(self, detector):
        """Short brand names (<=4) should use stricter threshold (0.85).
        'toss' is 4 chars — a word with low similarity should not be flagged."""
        # 'mega' vs 'toss' → similarity 0.0, no char substitution match
        assert detector._detect_typosquatting("mega.com") is None

    def test_kakao_variant(self, detector):
        """kak4o should be flagged (4→a)."""
        result = detector._detect_typosquatting("kak4o.com")
        assert result == "kakao"


class TestTyposquatVariant:
    def test_normalize_zeros(self, detector):
        assert detector._is_typosquat_variant("g00gle", "google") is True

    def test_normalize_dollar_sign(self, detector):
        assert detector._is_typosquat_variant("payp4l", "paypal") is True

    def test_added_character(self, detector):
        assert detector._is_typosquat_variant("googlee", "google") is True

    def test_removed_character(self, detector):
        assert detector._is_typosquat_variant("gogle", "google") is True

    def test_vv_to_w(self, detector):
        assert detector._is_typosquat_variant("tvvitter", "twitter") is True

    def test_exact_match_after_normalize(self, detector):
        assert detector._is_typosquat_variant("amaz0n", "amazon") is True


# --- URL structure analysis ---

class TestUrlStructure:
    def test_trusted_domain_returns_empty(self, detector):
        domain_info = {"domain": "google.com", "tld": ".com", "is_ip": False,
                       "uses_suspicious_port": False, "path": "/"}
        flags = detector.analyze_url_structure("https://google.com", domain_info)
        assert flags == []

    def test_suspicious_tld_flagged(self, detector):
        domain_info = {"domain": "phishing.xyz", "tld": ".xyz", "is_ip": False,
                       "uses_suspicious_port": False, "path": "/"}
        flags = detector.analyze_url_structure("https://phishing.xyz", domain_info)
        types = [f.type for f in flags]
        assert "suspicious_tld" in types

    def test_ip_address_flagged(self, detector):
        domain_info = {"domain": "192.168.1.1", "tld": "", "is_ip": True,
                       "uses_suspicious_port": False, "path": "/"}
        flags = detector.analyze_url_structure("http://192.168.1.1", domain_info)
        types = [f.type for f in flags]
        assert "ip_address" in types

    def test_long_subdomain_flagged(self, detector):
        domain_info = {"domain": "login.secure.account.phishing.com", "tld": ".com",
                       "is_ip": False, "uses_suspicious_port": False, "path": "/"}
        flags = detector.analyze_url_structure("https://login.secure.account.phishing.com", domain_info)
        types = [f.type for f in flags]
        assert "long_subdomain" in types


# --- Phishing patterns ---

class TestPhishingPatterns:
    def test_english_phishing_pattern(self, detector):
        domain_info = {"domain": "evil.com", "tld": ".com", "is_ip": False,
                       "uses_suspicious_port": False, "path": "/secure-login-verify"}
        flags = detector.analyze_url_structure("https://evil.com/secure-login-verify", domain_info)
        types = [f.type for f in flags]
        assert "phishing_pattern" in types

    def test_korean_delivery_phishing(self, detector):
        domain_info = {"domain": "evil.com", "tld": ".com", "is_ip": False,
                       "uses_suspicious_port": False, "path": "/택배-조회"}
        flags = detector.analyze_url_structure("https://evil.com/택배-조회", domain_info)
        types = [f.type for f in flags]
        assert "phishing_pattern" in types

    def test_korean_tax_refund_phishing(self, detector):
        domain_info = {"domain": "evil.com", "tld": ".com", "is_ip": False,
                       "uses_suspicious_port": False, "path": "/국세청-환급"}
        flags = detector.analyze_url_structure("https://evil.com/국세청-환급", domain_info)
        types = [f.type for f in flags]
        assert "phishing_pattern" in types

    def test_korean_payment_cancel_phishing(self, detector):
        domain_info = {"domain": "evil.com", "tld": ".com", "is_ip": False,
                       "uses_suspicious_port": False, "path": "/카드-결제-취소"}
        flags = detector.analyze_url_structure("https://evil.com/카드-결제-취소", domain_info)
        types = [f.type for f in flags]
        assert "phishing_pattern" in types


# --- Info requirement ---

class TestInfoRequirement:
    def test_no_flags_returns_low(self, detector):
        result = detector.determine_info_requirement([], [])
        assert result.level.value == "LOW"

    def test_info_only_flags_returns_low(self, detector):
        from app.models.schemas import Flag, Severity
        flags = [Flag(type="login_form", severity=Severity.INFO, message="test")]
        result = detector.determine_info_requirement(flags, ["password"])
        assert result.level.value == "LOW"

    def test_warning_payment_returns_high(self, detector):
        from app.models.schemas import Flag, Severity
        flags = [Flag(type="payment_form", severity=Severity.WARNING, message="test")]
        result = detector.determine_info_requirement(flags, ["card"])
        assert result.level.value == "HIGH"
