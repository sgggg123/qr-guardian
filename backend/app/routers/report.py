"""URL report (신고) router — JSON file persistent store."""
import json
import time
from collections import Counter
from pathlib import Path
from fastapi import APIRouter, Request
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
    """Report a suspicious/dangerous URL."""
    url = report_request.url.strip()
    if not url:
        return ReportResponse(status="error", message="URL이 비어있습니다")

    reports = _load_reports()

    report = {
        "url": url,
        "reason": report_request.reason,
        "reported_at": time.time(),
        "client_ip": request.client.host if request.client else "unknown",
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
async def report_stats():
    """Get report statistics (admin)."""
    reports = _load_reports()
    url_counts = Counter(r["url"] for r in reports)
    top = url_counts.most_common(10)
    return {
        "total_reports": len(reports),
        "top_reported": [{"url": url, "count": count} for url, count in top],
    }
