from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from enum import Enum


class RiskLevel(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    DANGER = "danger"


class InfoRequirementLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ScanRequest(BaseModel):
    url: str


class Flag(BaseModel):
    type: str
    severity: Severity
    message: str


class InfoRequirement(BaseModel):
    level: InfoRequirementLevel
    evidence: List[str]


class SafeBrowsingResult(BaseModel):
    is_safe: bool
    threats: List[str]
    mock_mode: bool = False


class SSLInfo(BaseModel):
    """SSL certificate information."""
    issuer: str
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    trust_level: str  # high, medium, low, unknown
    is_expired: bool
    days_until_expiry: Optional[int] = None


class DomainAnalysis(BaseModel):
    """Domain analysis results."""
    domain: str
    ssl_info: Optional[SSLInfo] = None
    domain_age_days: Optional[int] = None
    trust_score: int  # 0-100
    risk_factors: List[dict]


class RedirectHop(BaseModel):
    """A single hop in the redirect chain."""
    url: str
    status_code: int
    domain: str


class ScanData(BaseModel):
    original_url: str
    final_url: str
    risk_level: RiskLevel
    summary: str
    flags: List[Flag]
    info_requirement: InfoRequirement
    safe_browsing: SafeBrowsingResult
    domain_analysis: Optional[DomainAnalysis] = None
    redirect_chain: Optional[List[RedirectHop]] = None


class ScanResponse(BaseModel):
    status: str
    data: ScanData


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    detail: Optional[str] = None


# --- Bulk scan ---

class BulkScanRequest(BaseModel):
    urls: List[str]


class BulkScanItem(BaseModel):
    url: str
    risk_level: Optional[RiskLevel] = None
    summary: Optional[str] = None
    error: Optional[str] = None


class BulkScanResponse(BaseModel):
    status: str
    results: List[BulkScanItem]


# --- Report ---

class ReportRequest(BaseModel):
    url: str
    reason: str = ""


class ReportResponse(BaseModel):
    status: str
    message: str
