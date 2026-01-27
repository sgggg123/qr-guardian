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


class ScanData(BaseModel):
    original_url: str
    final_url: str
    risk_level: RiskLevel
    flags: List[Flag]
    info_requirement: InfoRequirement
    safe_browsing: SafeBrowsingResult


class ScanResponse(BaseModel):
    status: str
    data: ScanData


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    detail: Optional[str] = None
