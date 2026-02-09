import type { ScanData } from '../types'

export function generateShareText(scanData: ScanData): string {
  const riskEmoji = {
    GREEN: '🟢',
    YELLOW: '🟡',
    RED: '🔴'
  }

  const riskText = {
    GREEN: '안전',
    YELLOW: '주의',
    RED: '위험'
  }

  let text = `[QR Guardian 분석 결과]\n\n`
  text += `${riskEmoji[scanData.risk_level]} 위험도: ${riskText[scanData.risk_level]}\n\n`

  if (scanData.summary) {
    text += `${scanData.summary}\n\n`
  }

  text += `원본 URL: ${scanData.original_url}\n`

  if (scanData.original_url !== scanData.final_url) {
    text += `최종 URL: ${scanData.final_url}\n`
  }

  if (scanData.domain_analysis) {
    text += `\n신뢰 점수: ${scanData.domain_analysis.trust_score}/100\n`
    text += `도메인: ${scanData.domain_analysis.domain}\n`
  }

  if (scanData.flags.length > 0) {
    text += `\n탐지된 위험 요소:\n`
    scanData.flags.forEach(flag => {
      const severity = flag.severity === 'danger' ? '🔴' : flag.severity === 'warning' ? '🟡' : '🔵'
      text += `${severity} ${flag.message}\n`
    })
  }

  text += `\n---\nQR Guardian으로 검사됨`

  return text
}

export async function shareResult(scanData: ScanData): Promise<boolean> {
  const text = generateShareText(scanData)

  // Try native share API first (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'QR Guardian 분석 결과',
        text: text,
      })
      return true
    } catch (err) {
      // User cancelled or share failed, fall back to clipboard
    }
  }

  // Fall back to clipboard
  return copyToClipboard(text)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}
