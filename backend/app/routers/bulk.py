"""Bulk scan router — scan multiple URLs at once."""
import asyncio
from fastapi import APIRouter, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.models.schemas import (
    BulkScanRequest, BulkScanResponse, BulkScanItem,
    ScanRequest,
)
from app.routers.scan import scan_url as single_scan
from app.core.logging import get_logger

router = APIRouter(prefix="/api", tags=["bulk"])
logger = get_logger("bulk")

limiter = Limiter(key_func=get_remote_address)

MAX_BULK_URLS = 20


@router.post("/bulk-scan", response_model=BulkScanResponse)
@limiter.limit("5/minute")
async def bulk_scan(request: BulkScanRequest, req: Request):
    """Scan multiple URLs in parallel. Max 20 URLs per request."""
    urls = request.urls[:MAX_BULK_URLS]

    async def _scan_one(url: str) -> BulkScanItem:
        try:
            scan_req = ScanRequest(url=url)
            result = await single_scan(scan_req, req)
            return BulkScanItem(
                url=url,
                risk_level=result.data.risk_level,
                summary=result.data.summary,
            )
        except Exception as e:
            return BulkScanItem(url=url, error=str(e))

    results = await asyncio.gather(*[_scan_one(u) for u in urls])

    logger.info("Bulk scan completed", extra={"url_count": len(urls)})

    return BulkScanResponse(status="success", results=list(results))
