"""Regression tests for the summary generator."""

import pytest
from app.models.schemas import Flag, Severity
from app.services.summary_generator import generate_summary


def _flag(type: str, severity: Severity = Severity.WARNING, message: str = "") -> Flag:
    return Flag(type=type, severity=severity, message=message)


# ── GREEN scenarios ──────────────────────────────────────────────


def test_green_trusted_domain():
    result = generate_summary(
        risk_level="GREEN",
        flags=[],
        final_url="https://google.com",
        is_trusted=True,
        trust_score=100,
        domain_name="google.com",
        is_safe=True,
    )
    assert "Google" in result
    assert "공식 사이트" in result
    assert "안심" in result


def test_green_untrusted_domain():
    result = generate_summary(
        risk_level="GREEN",
        flags=[],
        final_url="https://example.com",
        is_trusted=False,
        trust_score=80,
        domain_name="example.com",
        is_safe=True,
    )
    assert "위험 요소가 발견되지 않았습니다" in result
    assert "정상적으로 이용 가능합니다" in result


# ── YELLOW scenarios ─────────────────────────────────────────────


def test_yellow_shortened_url_new_domain():
    result = generate_summary(
        risk_level="YELLOW",
        flags=[
            _flag("shortened_url", Severity.WARNING, "단축 URL"),
            _flag("new_domain", Severity.WARNING, "최근 등록"),
        ],
        final_url="https://newsite.xyz",
        is_trusted=False,
        trust_score=50,
        domain_name="newsite.xyz",
        is_safe=True,
    )
    assert "주의가 필요한" in result
    assert "단축 URL" in result
    assert "최근 만들어진" in result
    assert "개인정보 입력 시 주의" in result


def test_yellow_shortened_url_cross_domain():
    result = generate_summary(
        risk_level="YELLOW",
        flags=[
            _flag("shortened_url", Severity.WARNING),
            _flag("cross_domain_redirect", Severity.WARNING),
        ],
        final_url="https://dest.example.com",
        is_trusted=False,
        trust_score=60,
        domain_name="dest.example.com",
        is_safe=True,
    )
    assert "단축 URL 뒤에 여러 사이트를 거쳐" in result


# ── RED scenarios ────────────────────────────────────────────────


def test_red_typosquatting():
    result = generate_summary(
        risk_level="RED",
        flags=[
            _flag(
                "typosquatting",
                Severity.DANGER,
                "'naver' 브랜드를 사칭하는 것으로 의심됩니다",
            ),
        ],
        final_url="https://naver-login.xyz",
        is_trusted=False,
        trust_score=20,
        domain_name="naver-login.xyz",
        is_safe=True,
    )
    assert "위험" in result
    assert "'naver'을(를) 사칭" in result
    assert "절대 로그인" in result


def test_red_safe_browsing_threat():
    result = generate_summary(
        risk_level="RED",
        flags=[
            _flag("safe_browsing_threat", Severity.DANGER, "MALWARE"),
        ],
        final_url="https://malware.example.com",
        is_trusted=False,
        trust_score=10,
        domain_name="malware.example.com",
        is_safe=False,
    )
    assert "위험" in result
    assert "보안 데이터베이스" in result
    assert "접속하지 않는 것을 권장" in result


def test_red_phishing_pattern():
    result = generate_summary(
        risk_level="RED",
        flags=[
            _flag("phishing_pattern", Severity.DANGER, "피싱 패턴"),
        ],
        final_url="https://phishing.example.com/login",
        is_trusted=False,
        trust_score=15,
        domain_name="phishing.example.com",
        is_safe=True,
    )
    assert "피싱 공격" in result
    assert "절대 로그인" in result


def test_red_expired_cert():
    result = generate_summary(
        risk_level="RED",
        flags=[
            _flag("expired_cert", Severity.DANGER, "SSL 인증서 만료"),
        ],
        final_url="https://expired.example.com",
        is_trusted=False,
        trust_score=30,
        domain_name="expired.example.com",
        is_safe=True,
    )
    assert "SSL 인증서가 만료" in result


# ── Combination scenarios ────────────────────────────────────────


def test_new_domain_and_low_trust_issuer():
    result = generate_summary(
        risk_level="YELLOW",
        flags=[
            _flag("new_domain", Severity.WARNING),
            _flag("low_trust_issuer", Severity.WARNING),
        ],
        final_url="https://brand-new.site",
        is_trusted=False,
        trust_score=45,
        domain_name="brand-new.site",
        is_safe=True,
    )
    assert "최근 만들어진 사이트이며 무료 인증서" in result


def test_summary_not_empty():
    """Summary should never be empty regardless of input."""
    result = generate_summary(
        risk_level="GREEN",
        flags=[],
        final_url="https://example.com",
        is_trusted=False,
        trust_score=100,
        domain_name="example.com",
        is_safe=True,
    )
    assert len(result) > 0


def test_ip_address_flag():
    result = generate_summary(
        risk_level="YELLOW",
        flags=[
            _flag("ip_address", Severity.WARNING, "IP 주소 사용"),
        ],
        final_url="http://192.168.1.1",
        is_trusted=False,
        trust_score=50,
        domain_name="192.168.1.1",
        is_safe=True,
    )
    assert "IP 주소를 사용" in result
