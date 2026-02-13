"""URL report (신고) router — JSON file persistent store.

Reports now include analysis data (risk_score, ai_summary, risk_level)
when provided by the client, enabling richer admin insights.
"""
import json
import time
from collections import Counter
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Query, Request
from app.models.schemas import ReportRequest, ReportResponse
from app.core.logging import get_logger
from app.core.rate_limiter import limiter

router = APIRouter(prefix="/api", tags=["report"])
logger = get_logger("report")

# Persistent file storage
_REPORTS_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "reports.json"
_REPORTS_FILE.parent.mkdir(parents=True, exist_ok=True)
MAX_REPORTS = 1000


def _load_reports() -> list[dict]:
    """Load reports from JSON file."""
    if _REPORTS_FILE.exists():
        try:
            data = json.loads(_REPORTS_FILE.read_text(encoding="utf-8"))
            return data if isinstance(data, list) else []
        except (json.JSONDecodeError, OSError):
            return []
    return []


def _save_reports(reports: list[dict]) -> None:
    """Save reports to JSON file."""
    try:
        _REPORTS_FILE.write_text(
            json.dumps(reports, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except OSError as e:
        logger.error("Failed to save reports", extra={"error": str(e)})


@router.post("/report", response_model=ReportResponse)
@limiter.limit("10/minute")
async def report_url(report_request: ReportRequest, request: Request):
    """Report a suspicious/dangerous URL with optional analysis data."""
    url = report_request.url.strip()
    if not url:
        return ReportResponse(status="error", message="URL이 비어있습니다")

    reports = _load_reports()

    # Build report with analysis data when available
    report: dict = {
        "url": url,
        "reason": report_request.reason,
        "reported_at": time.time(),
        "client_ip": request.client.host if request.client else "unknown",
        # Analysis-linked fields (from frontend scan result)
        "risk_score": report_request.risk_score,
        "ai_summary": report_request.ai_summary,
    }

    if len(reports) >= MAX_REPORTS:
        reports.pop(0)
    reports.append(report)

    _save_reports(reports)

    # Count how many times THIS url was reported
    url_count = sum(1 for r in reports if r["url"] == url)

    logger.info("URL reported", extra={"url": url, "url_count": url_count})

    return ReportResponse(
        status="success",
        message="신고가 접수되었습니다. 검토 후 반영됩니다.",
        report_count=url_count,
        total_reports=len(reports),
    )


@router.get("/reports/stats")
async def report_stats(sort_by: Optional[str] = Query(None, regex="^(count|risk_score)$")):
    """Get report statistics (admin). Supports sort_by=count|risk_score."""
    reports = _load_reports()
    url_counts = Counter(r["url"] for r in reports)

    if sort_by == "risk_score":
        # Sort by highest risk_score among reports for each URL
        url_max_risk: dict[str, float] = {}
        for r in reports:
            u = r["url"]
            score = r.get("risk_score")
            if score is not None:
                url_max_risk[u] = max(url_max_risk.get(u, 0.0), score)
        # Sort URLs: those with risk_score first (desc), then by count
        top_urls = sorted(
            url_counts.keys(),
            key=lambda u: (url_max_risk.get(u, -1), url_counts[u]),
            reverse=True,
        )[:10]
        top = [(u, url_counts[u]) for u in top_urls]
    else:
        top = url_counts.most_common(10)

    return {
        "total_reports": len(reports),
        "top_reported": [{"url": url, "count": count} for url, count in top],
    }
