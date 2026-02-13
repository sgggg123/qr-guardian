import type { ScanResponse } from '../types'

// Production backend URL (fallback if VITE_API_URL not set)
const PRODUCTION_API = 'https://qr-guardianbackend-production.up.railway.app'

// Use environment variable if set, otherwise use production URL
const rawApiUrl = import.meta.env.VITE_API_URL || PRODUCTION_API
const API_BASE = rawApiUrl.startsWith('http') ? rawApiUrl : `https://${rawApiUrl}`

export async function scanUrl(url: string): Promise<ScanResponse> {
  const response = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'URL 분석에 실패했습니다')
  }

  return response.json()
}

export interface BulkScanItem {
  url: string
  risk_level?: 'GREEN' | 'YELLOW' | 'RED'
  summary?: string
  error?: string
}

export interface BulkScanResponse {
  status: string
  results: BulkScanItem[]
}

export async function bulkScanUrls(urls: string[]): Promise<BulkScanResponse> {
  const response = await fetch(`${API_BASE}/api/bulk-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '벌크 스캔에 실패했습니다')
  }

  return response.json()
}

export async function reportUrl(
  url: string,
  reason: string = '',
  riskScore?: number,
  aiSummary?: string,
): Promise<{ status: string; message: string; report_count?: number; total_reports?: number }> {
  const body: Record<string, unknown> = { url, reason }
  if (riskScore !== undefined) body.risk_score = riskScore
  if (aiSummary !== undefined) body.ai_summary = aiSummary

  const response = await fetch(`${API_BASE}/api/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error('신고 접수에 실패했습니다')
  }

  return response.json()
}

export function getScreenshotUrl(url: string): string {
  const encoded = encodeURIComponent(url)
  return `https://api.microlink.io/?url=${encoded}&screenshot=true&meta=false&embed=screenshot.url`
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`)
    return response.ok
  } catch {
    return false
  }
}
