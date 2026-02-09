import re
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.routers import scan

is_production = settings.ENVIRONMENT == "production"

# Rate limiter: IP-based, 30 requests/minute
limiter = Limiter(key_func=get_remote_address, default_limits=["30/minute"])

app = FastAPI(
    title="QR Guardian API",
    description="QR 코드 URL 보안 스캐너 API",
    version="1.0.0",
    docs_url=None if is_production else "/api/docs",
    redoc_url=None if is_production else "/api/redoc",
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "status": "error",
            "message": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
            "detail": str(exc.detail),
        },
    )


# CORS configuration — separate exact origins from wildcard patterns
_exact_origins = [o for o in settings.BACKEND_CORS_ORIGINS if "*" not in o]
_wildcard_patterns = [o for o in settings.BACKEND_CORS_ORIGINS if "*" in o]
_origin_regex = (
    "|".join(re.escape(p).replace(r"\*", ".*") for p in _wildcard_patterns)
    if _wildcard_patterns
    else None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_exact_origins,
    allow_origin_regex=_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scan.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "qr-guardian-api"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "QR Guardian API",
        "version": "1.0.0",
        "description": "QR 코드 URL 보안 스캐너"
    }
