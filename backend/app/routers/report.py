"""URL report (신고) router — in-memory store."""
import time
from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.models.schemas import ReportRequest, ReportResponse
from app.core.logging import get_logger

router = APIRouter(prefix="/api", tags=["report"])
logger = get_logger("report")

limiter = Limiter(key_func=get_remote_address)

# In-memory report store (list of dicts)
_reports: list[dict] = []
MAX_REPORTS = 1000


@router.post("/report", response_model=ReportResponse)
@limiter.limit("10/minute")
async def report_url(request: ReportRequest, req: Request):
    """Report a suspicious/dangerous URL."""
    url = request.url.strip()
    if not url:
        return ReportResponse(status="error", message="URL이 비어있습니다")

    report = {
        "url": url,
        "reason": request.reason,
        "reported_at": time.time(),
        "client_ip": req.client.host if req.client else "unknown",
    }

    if len(_reports) >= MAX_REPORTS:
        _reports.pop(0)
    _reports.append(report)

    logger.info("URL reported", extra={"url": url})

    return ReportResponse(
        status="success",
        message="신고가 접수되었습니다. 검토 후 반영됩니다.",
    )


@router.get("/reports/stats")
async def report_stats():
    """Get report statistics (admin)."""
    from collections import Counter
    url_counts = Counter(r["url"] for r in _reports)
    top = url_counts.most_common(10)
    return {
        "total_reports": len(_reports),
        "top_reported": [{"url": url, "count": count} for url, count in top],
    }
