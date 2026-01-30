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

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`)
    return response.ok
  } catch {
    return false
  }
}
