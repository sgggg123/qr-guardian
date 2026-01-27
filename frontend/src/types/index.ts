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

export interface ScanData {
  original_url: string
  final_url: string
  risk_level: RiskLevel
  flags: Flag[]
  info_requirement: InfoRequirement
  safe_browsing: SafeBrowsingResult
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
