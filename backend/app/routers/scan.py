from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ScanRequest, ScanResponse, ScanData, Flag, Severity,
    RiskLevel, SafeBrowsingResult, ErrorResponse
)
from app.services.url_analyzer import url_analyzer
from app.services.threat_detector import threat_detector
from app.services.safe_browsing import safe_browsing_service

router = APIRouter(prefix="/api", tags=["scan"])


@router.post(
    "/scan",
    response_model=ScanResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}
)
async def scan_url(request: ScanRequest):
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

        # Resolve redirects
        final_url, redirect_count = await url_analyzer.resolve_redirects(url)

        if redirect_count > 3:
            all_flags.append(Flag(
                type="multiple_redirects",
                severity=Severity.WARNING,
                message=f"다중 리다이렉트가 감지되었습니다 ({redirect_count}회)"
            ))

        # Extract domain info
        domain_info = url_analyzer.extract_domain_info(final_url)

        # Analyze URL structure
        structure_flags = threat_detector.analyze_url_structure(final_url, domain_info)
        all_flags.extend(structure_flags)

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

        # Determine info requirement level
        info_requirement = threat_detector.determine_info_requirement(all_flags, evidence)

        # Calculate overall risk level
        risk_level = _calculate_risk_level(all_flags, is_safe)

        # Remove duplicate flags
        unique_flags = _deduplicate_flags(all_flags)

        return ScanResponse(
            status="success",
            data=ScanData(
                original_url=request.url,
                final_url=final_url,
                risk_level=risk_level,
                flags=unique_flags,
                info_requirement=info_requirement,
                safe_browsing=SafeBrowsingResult(
                    is_safe=is_safe,
                    threats=threats
                )
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"URL 분석 중 오류가 발생했습니다: {str(e)}"
        )


def _calculate_risk_level(flags: list[Flag], is_safe: bool) -> RiskLevel:
    """Calculate overall risk level based on flags."""
    if not is_safe:
        return RiskLevel.RED

    danger_count = sum(1 for f in flags if f.severity == Severity.DANGER)
    warning_count = sum(1 for f in flags if f.severity == Severity.WARNING)

    if danger_count > 0:
        return RiskLevel.RED
    elif warning_count >= 2:
        return RiskLevel.YELLOW
    elif warning_count == 1:
        return RiskLevel.YELLOW
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
