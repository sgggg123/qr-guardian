"""Template-based natural language summary generator for scan results."""

from app.models.schemas import Flag


def generate_summary(
    risk_level: str,
    flags: list[Flag],
    final_url: str,
    is_trusted: bool,
    trust_score: int,
    domain_name: str,
    is_safe: bool,
) -> str:
    """Generate a human-readable Korean summary of scan results.

    Combines a main verdict, threat details, and action guide
    into 2-3 natural sentences.
    """
    flag_types = {f.type for f in flags}

    verdict = _build_verdict(risk_level, is_trusted, domain_name)
    details = _build_details(flag_types, flags, is_safe)
    guide = _build_guide(risk_level, flag_types, is_safe)

    parts = [p for p in [verdict, details, guide] if p]
    return " ".join(parts)


def _build_verdict(risk_level: str, is_trusted: bool, domain_name: str) -> str:
    """Step 1: Main verdict based on risk_level."""
    if risk_level == "GREEN":
        if is_trusted and domain_name:
            label = _friendly_domain(domain_name)
            return f"{label} 공식 사이트입니다. 안심하고 이용하셔도 됩니다."
        return "특별한 위험 요소가 발견되지 않았습니다."
    if risk_level == "YELLOW":
        return "일부 주의가 필요한 요소가 발견되었습니다."
    # RED
    return "이 사이트는 위험할 수 있습니다."


def _build_details(flag_types: set[str], flags: list[Flag], is_safe: bool) -> str:
    """Step 2: Threat details from flag combinations (most severe first)."""
    parts: list[str] = []

    # Typosquatting — extract brand from flag message
    if "typosquatting" in flag_types:
        brand = _extract_brand(flags)
        if brand:
            parts.append(f"'{brand}'을(를) 사칭하는 것으로 의심됩니다.")
        else:
            parts.append("유명 브랜드를 사칭하는 것으로 의심됩니다.")

    # Phishing pattern
    if "phishing_pattern" in flag_types:
        parts.append("피싱 공격에 사용되는 URL 패턴이 포함되어 있습니다.")

    # Safe Browsing threat
    if "safe_browsing_threat" in flag_types or not is_safe:
        parts.append("보안 데이터베이스에 위험 사이트로 등록되어 있습니다.")

    # Expired SSL cert
    if "expired_cert" in flag_types:
        parts.append("SSL 인증서가 만료된 상태입니다.")

    # Shortened URL + cross-domain redirect combo
    if "shortened_url" in flag_types and "cross_domain_redirect" in flag_types:
        parts.append("단축 URL 뒤에 여러 사이트를 거쳐 연결됩니다.")
    elif "shortened_url" in flag_types:
        parts.append("단축 URL로 실제 목적지가 숨겨져 있습니다.")
    elif "cross_domain_redirect" in flag_types:
        parts.append("여러 도메인을 거쳐 리다이렉트됩니다.")

    # New domain + low trust issuer combo
    if "new_domain" in flag_types and "low_trust_issuer" in flag_types:
        parts.append("최근 만들어진 사이트이며 무료 인증서를 사용합니다.")
    elif "new_domain" in flag_types:
        parts.append("최근 만들어진 사이트입니다.")
    elif "low_trust_issuer" in flag_types:
        parts.append("무료 인증서를 사용하는 사이트입니다.")

    # Multiple redirects (only if not already covered by shortened/cross-domain)
    if "multiple_redirects" in flag_types and "shortened_url" not in flag_types and "cross_domain_redirect" not in flag_types:
        parts.append("다중 리다이렉트가 감지되었습니다.")

    # Suspicious TLD
    if "suspicious_tld" in flag_types:
        parts.append("의심스러운 도메인 확장자를 사용합니다.")

    # IP address URL
    if "ip_address" in flag_types:
        parts.append("도메인 대신 IP 주소를 사용합니다.")

    # Login/personal info related
    if "personal_info_request" in flag_types:
        parts.append("개인정보 입력을 요구하는 페이지입니다.")
    elif "payment_form" in flag_types:
        parts.append("결제 정보 입력을 요구하는 페이지입니다.")

    return " ".join(parts)


def _build_guide(risk_level: str, flag_types: set[str], is_safe: bool) -> str:
    """Step 3: Action guide based on risk_level."""
    if risk_level == "GREEN":
        return "정상적으로 이용 가능합니다."

    if risk_level == "YELLOW":
        return "개인정보 입력 시 주의하세요."

    # RED — more specific guidance
    if "typosquatting" in flag_types or "phishing_pattern" in flag_types:
        return "절대 로그인하거나 개인정보를 입력하지 마세요."

    if "safe_browsing_threat" in flag_types or not is_safe:
        return "이 사이트에 접속하지 않는 것을 권장합니다."

    return "이 사이트에 접속하지 않는 것을 권장합니다."


def _extract_brand(flags: list[Flag]) -> str | None:
    """Extract brand name from typosquatting flag message."""
    for f in flags:
        if f.type == "typosquatting" and "'" in f.message:
            # message format: "'brand' 브랜드를 사칭하는 것으로 의심됩니다"
            start = f.message.index("'") + 1
            end = f.message.index("'", start)
            return f.message[start:end]
    return None


def _friendly_domain(domain_name: str) -> str:
    """Convert a raw domain to a friendly display name."""
    # Remove TLD-like suffixes for display
    base = domain_name.split(".")[0] if "." in domain_name else domain_name
    return base.capitalize()
