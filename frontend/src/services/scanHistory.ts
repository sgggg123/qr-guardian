import type { ScanData, RiskLevel } from '../types'

export interface ScanHistoryItem {
  id: string
  url: string
  finalUrl: string
  riskLevel: RiskLevel
  trustScore: number | null
  scannedAt: string
}

export interface ScanStats {
  totalScans: number
  todayScans: number
  weekScans: number
  safeCount: number
  warningCount: number
  dangerCount: number
  safePercent: number
  warningPercent: number
  dangerPercent: number
}

const STORAGE_KEY = 'qr-guardian-history'
const MAX_HISTORY = 50

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getScanHistory(): ScanHistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function addScanToHistory(scanData: ScanData): ScanHistoryItem {
  const history = getScanHistory()

  const newItem: ScanHistoryItem = {
    id: generateId(),
    url: scanData.original_url,
    finalUrl: scanData.final_url,
    riskLevel: scanData.risk_level,
    trustScore: scanData.domain_analysis?.trust_score ?? null,
    scannedAt: new Date().toISOString()
  }

  // Add to beginning, limit to MAX_HISTORY items
  const updated = [newItem, ...history].slice(0, MAX_HISTORY)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Storage full, try to clear old items
    const reduced = updated.slice(0, 20)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced))
  }

  return newItem
}

export function clearScanHistory(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function deleteScanItem(id: string): void {
  const history = getScanHistory()
  const filtered = history.filter(item => item.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

export function getScanStats(): ScanStats {
  const history = getScanHistory()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const todayScans = history.filter(item => new Date(item.scannedAt) >= today).length
  const weekScans = history.filter(item => new Date(item.scannedAt) >= weekAgo).length

  const safeCount = history.filter(item => item.riskLevel === 'GREEN').length
  const warningCount = history.filter(item => item.riskLevel === 'YELLOW').length
  const dangerCount = history.filter(item => item.riskLevel === 'RED').length

  const total = history.length || 1 // Avoid division by zero

  return {
    totalScans: history.length,
    todayScans,
    weekScans,
    safeCount,
    warningCount,
    dangerCount,
    safePercent: Math.round((safeCount / total) * 100),
    warningPercent: Math.round((warningCount / total) * 100),
    dangerPercent: Math.round((dangerCount / total) * 100)
  }
}
