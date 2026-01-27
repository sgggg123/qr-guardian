import type { ScanResponse } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || ''

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
