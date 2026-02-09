import time
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.models.schemas import (
    ScanRequest, ScanResponse, ScanData, Flag, Severity,
    RiskLevel, SafeBrowsingResult, ErrorResponse,
    SSLInfo, DomainAnalysis, RedirectHop
)
from app.core.config import settings
from app.services.url_analyzer import url_analyzer
from app.services.threat_detector import threat_detector
from app.services.safe_browsing import safe_browsing_service
from app.services.domain_analyzer import domain_analyzer
from app.services.summary_generator import generate_summary

router = APIRouter(prefix="/api", tags=["scan"])

# --- In-memory TTL cache ---
_scan_cache: dict[str, tuple[float, ScanResponse]] = {}
_CACHE_TTL = 600  # 10 minutes

limiter = Limiter(key_func=get_remote_address)


def _get_cached(key: str) -> ScanResponse | None:
    entry = _scan_cache.get(key)
    if entry and (time.time() - entry[0]) < _CACHE_TTL:
        return entry[1]
    if entry:
        del _scan_cache[key]
    return None


def _set_cache(key: str, value: ScanResponse) -> None:
    # Evict old entries if cache is too large
    if len(_scan_cache) > 500:
        now = time.time()
        expired = [k for k, (ts, _) in _scan_cache.items() if now - ts >= _CACHE_TTL]
        for k in expired:
            del _scan_cache[k]
    _scan_cache[key] = (time.time(), value)


@router.post(
    "/scan",
    response_model=ScanResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}
)
@limiter.limit("30/minute")
async def scan_url(request: ScanRequest, req: Request):
    """
    Scan a URL for security threats.

    Analyzes the URL structure, follows redirects, checks against
    threat databases, and returns a risk assessment.
    """
    url = request.url.strip()

    # Basic URL validation
    if not url:
        raise HTTPException(status_code=400, detail="URL이 비어있습니다")

    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    # Check cache
    cached = _get_cached(url)
    if cached:
        return cached

    try:
        all_flags: list[Flag] = []

        # Check if it's a shortened URL
        is_shortened = url_analyzer.is_shortened_url(url)
        if is_shortened:
            all_flags.append(Flag(
                type="shortened_url",
                severity=Severity.WARNING,
                message="단축 URL이 감지되었습니다. 실제 목적지가 숨겨져 있을 수 있습니다."
            ))

        # Resolve redirects with full chain
        final_url, redirect_chain, redirect_count = await url_analyzer.resolve_redirects_with_chain(url)

        if redirect_count > 3:
            all_flags.append(Flag(
                type="multiple_redirects",
                severity=Severity.WARNING,
                message=f"다중 리다이렉트가 감지되었습니다 ({redirect_count}회)"
            ))

        # Check for cross-domain redirects (suspicious behavior)
        domains_in_chain = set(hop["domain"] for hop in redirect_chain)
        if len(domains_in_chain) > 2:
            all_flags.append(Flag(
                type="cross_domain_redirect",
                severity=Severity.WARNING,
                message=f"여러 도메인을 거쳐 리다이렉트됩니다 ({len(domains_in_chain)}개 도메인)"
            ))

        # Extract domain info
        domain_info = url_analyzer.extract_domain_info(final_url)

        # Analyze URL structure for final URL
        structure_flags = threat_detector.analyze_url_structure(final_url, domain_info)
        all_flags.extend(structure_flags)

        # Also check original URL for typosquatting (important for redirects!)
        if url != final_url:
            original_domain_info = url_analyzer.extract_domain_info(url)
            original_flags = threat_detector.analyze_url_structure(url, original_domain_info)
            # Only add typosquatting flags from original URL
            for flag in original_flags:
                if flag.type == "typosquatting" and flag.type not in [f.type for f in all_flags]:
                    all_flags.append(flag)

        # Analyze page content
        content_flags, evidence = await threat_detector.analyze_page_content(final_url)
        all_flags.extend(content_flags)

        # Check Safe Browsing
        is_safe, threats = await safe_browsing_service.check_url(final_url)

        if not is_safe:
            for threat in threats:
                all_flags.append(Flag(
                    type="safe_browsing_threat",
                    severity=Severity.DANGER,
                    message=f"보안 위협 감지: {threat}"
                ))

        # Domain analysis (SSL, domain age)
        domain_result = await domain_analyzer.analyze_domain(final_url)

        # Add domain risk factors as flags (skip for trusted domains)
        is_trusted = _is_trusted_domain(final_url)
        if not is_trusted:
            for factor in domain_result.get("risk_factors", []):
                severity_map = {"danger": Severity.DANGER, "warning": Severity.WARNING, "info": Severity.INFO}
                all_flags.append(Flag(
                    type=factor.get("type", "domain_risk"),
                    severity=severity_map.get(factor.get("severity", "info"), Severity.INFO),
                    message=factor.get("message", "")
                ))

        # Determine info requirement level
        info_requirement = threat_detector.determine_info_requirement(all_flags, evidence)

        # Calculate overall risk level (include domain trust score)
        risk_level = _calculate_risk_level(all_flags, is_safe, final_url, domain_result.get("trust_score", 100))

        # Remove duplicate flags
        unique_flags = _deduplicate_flags(all_flags)

        # Generate natural language summary
        summary = generate_summary(
            risk_level=risk_level,
            flags=unique_flags,
            final_url=final_url,
            is_trusted=_is_trusted_domain(final_url),
            trust_score=domain_result.get("trust_score", 100),
            domain_name=domain_result.get("domain", ""),
            is_safe=is_safe,
        )

        # Build domain analysis response
        ssl_info_data = None
        if domain_result.get("ssl_info"):
            ssl = domain_result["ssl_info"]
            ssl_info_data = SSLInfo(
                issuer=ssl.get("issuer", "Unknown"),
                valid_from=ssl.get("valid_from"),
                valid_until=ssl.get("valid_until"),
                trust_level=ssl.get("trust_level", "unknown"),
                is_expired=ssl.get("is_expired", False),
                days_until_expiry=ssl.get("days_until_expiry")
            )

        domain_analysis_data = DomainAnalysis(
            domain=domain_result.get("domain", ""),
            ssl_info=ssl_info_data,
            domain_age_days=domain_result.get("domain_age_days"),
            trust_score=domain_result.get("trust_score", 100),
            risk_factors=domain_result.get("risk_factors", [])
        )

        # Build redirect chain response
        redirect_chain_data = [
            RedirectHop(
                url=hop["url"],
                status_code=hop["status_code"],
                domain=hop["domain"]
            )
            for hop in redirect_chain
        ] if redirect_chain else None

        response = ScanResponse(
            status="success",
            data=ScanData(
                original_url=request.url,
                final_url=final_url,
                risk_level=risk_level,
                summary=summary,
                flags=unique_flags,
                info_requirement=info_requirement,
                safe_browsing=SafeBrowsingResult(
                    is_safe=is_safe,
                    threats=threats,
                    mock_mode=safe_browsing_service.is_mock_mode,
                ),
                domain_analysis=domain_analysis_data,
                redirect_chain=redirect_chain_data
            )
        )

        # Cache the response
        _set_cache(url, response)

        return response

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"URL 분석 중 오류가 발생했습니다: {str(e)}"
        )


def _is_trusted_domain(url: str) -> bool:
    """Check if URL belongs to a trusted domain."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        # Remove www. prefix
        if domain.startswith("www."):
            domain = domain[4:]
        # Check exact match or subdomain match
        for trusted in settings.TRUSTED_DOMAINS:
            if domain == trusted or domain.endswith("." + trusted):
                return True
        return False
    except Exception:
        return False


def _calculate_risk_level(flags: list[Flag], is_safe: bool, final_url: str, trust_score: int = 100) -> RiskLevel:
    """Calculate overall risk level based on flags and domain trust score."""
    # Trusted domains are always GREEN (unless Safe Browsing flags them)
    if is_safe and _is_trusted_domain(final_url):
        return RiskLevel.GREEN

    if not is_safe:
        return RiskLevel.RED

    danger_count = sum(1 for f in flags if f.severity == Severity.DANGER)
    warning_count = sum(1 for f in flags if f.severity == Severity.WARNING)

    # High-risk flags that should immediately trigger RED
    high_risk_types = {"typosquatting", "phishing_pattern", "safe_browsing_threat", "expired_cert"}
    has_high_risk = any(f.type in high_risk_types for f in flags)

    # Very low trust score = RED
    if trust_score < 30:
        return RiskLevel.RED

    if danger_count > 0 or has_high_risk:
        return RiskLevel.RED
    elif warning_count >= 3 or trust_score < 60:
        return RiskLevel.YELLOW
    elif warning_count >= 1:
        # Only show yellow if there are significant warnings
        significant_warnings = {"suspicious_tld", "multiple_redirects", "ip_address", "payment_form", "personal_info_request", "new_domain", "low_trust_issuer"}
        has_significant = any(f.type in significant_warnings and f.severity == Severity.WARNING for f in flags)
        if has_significant:
            return RiskLevel.YELLOW
        return RiskLevel.GREEN
    else:
        return RiskLevel.GREEN


def _deduplicate_flags(flags: list[Flag]) -> list[Flag]:
    """Remove duplicate flags based on type."""
    seen_types = set()
    unique = []
    for flag in flags:
        if flag.type not in seen_types:
            seen_types.add(flag.type)
            unique.append(flag)
    return unique
