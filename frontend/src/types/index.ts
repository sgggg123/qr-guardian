export type RiskLevel = 'GREEN' | 'YELLOW' | 'RED'
export type Severity = 'info' | 'warning' | 'danger'
export type InfoRequirementLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Flag {
  type: string
  severity: Severity
  message: string
}

export interface InfoRequirement {
  level: InfoRequirementLevel
  evidence: string[]
}

export interface SafeBrowsingResult {
  is_safe: boolean
  threats: string[]
}

export interface SSLInfo {
  issuer: string
  valid_from: string | null
  valid_until: string | null
  trust_level: 'high' | 'medium' | 'low' | 'unknown'
  is_expired: boolean
  days_until_expiry: number | null
}

export interface RiskFactor {
  type: string
  message: string
  severity: 'danger' | 'warning' | 'info'
}

export interface RiskBreakdownItem {
  factor: string
  score: number
  reason: string
}

export interface DomainAnalysis {
  domain: string
  ssl_info: SSLInfo | null
  domain_age_days: number | null
  trust_score: number
  risk_factors: RiskFactor[]
  risk_score?: number
  risk_breakdown?: RiskBreakdownItem[]
}

export interface RedirectHop {
  url: string
  status_code: number
  domain: string
}

export interface ScanData {
  original_url: string
  final_url: string
  risk_level: RiskLevel
  summary: string
  flags: Flag[]
  info_requirement: InfoRequirement
  safe_browsing: SafeBrowsingResult
  domain_analysis?: DomainAnalysis
  redirect_chain?: RedirectHop[]
  risk_score?: number
  risk_breakdown?: RiskBreakdownItem[]
  ai_summary?: string
  action_guidelines?: string[]
}

export interface ScanResponse {
  status: string
  data: ScanData
}

export interface ScanError {
  status: string
  message: string
  detail?: string
}
