from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import scan

app = FastAPI(
    title="QR Guardian API",
    description="QR 코드 URL 보안 스캐너 API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
