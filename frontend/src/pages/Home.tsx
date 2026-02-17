import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import QRScanner from '../components/QRScanner'
import { scanUrl } from '../services/api'
import { addScanToHistory } from '../services/scanHistory'
import { notifyRiskLevel } from '../services/notifications'

export default function Home() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const [pasteHint, setPasteHint] = useState<string | null>(null)

  const handleScan = async (url: string) => {
    await analyzeUrl(url)
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (manualUrl.trim()) {
      await analyzeUrl(manualUrl.trim())
    }
  }

  // Ctrl+V: decode QR from pasted image
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (isLoading) return
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue

        setPasteHint('QR 코드 이미지 분석 중...')
        try {
          const bitmap = await createImageBitmap(blob)
          const canvas = document.createElement('canvas')
          canvas.width = bitmap.width
          canvas.height = bitmap.height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(bitmap, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)

          if (code?.data) {
            setPasteHint(null)
            await analyzeUrl(code.data)
          } else {
            setPasteHint(null)
            setError('이미지에서 QR 코드를 찾을 수 없습니다')
          }
        } catch {
          setPasteHint(null)
          setError('이미지 처리 중 오류가 발생했습니다')
        }
        return
      }
    }
  }, [isLoading])

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const analyzeUrl = async (url: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await scanUrl(url)

      // Save to history
      addScanToHistory(response.data)

      // Play notification sound/vibration
      notifyRiskLevel(response.data.risk_level)

      navigate('/result', { state: { scanData: response.data } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'URL 분석에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">QR 코드 스캔</h1>
        <p className="text-gray-500 dark:text-slate-400">
          QR 코드를 스캔하여 안전한 링크인지 확인하세요
        </p>
      </div>

      <QRScanner onScan={handleScan} />

      {/* Paste hint */}
      {pasteHint && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 text-center">
          <p className="text-sm text-blue-600 dark:text-blue-400">{pasteHint}</p>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-500">또는 직접 입력 / Ctrl+V로 QR 이미지 붙여넣기</span>
        </div>
      </div>

      <form onSubmit={handleManualSubmit} className="space-y-3">
        <input
          type="text"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="URL을 입력하세요"
          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !manualUrl.trim()}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
        >
          {isLoading ? '분석 중...' : 'URL 검사'}
        </button>
      </form>

      {isLoading && (
        <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl dark:shadow-none">
            {/* Skeleton: Traffic Light */}
            <div className="flex justify-center mb-4">
              <div className="w-20 bg-gray-100 dark:bg-slate-700 rounded-full p-3 flex flex-col items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-slate-600 animate-pulse" />
                <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-slate-600 animate-pulse" />
                <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-slate-600 animate-pulse" />
              </div>
            </div>
            {/* Skeleton: Summary */}
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-3/4 mx-auto" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-1/2 mx-auto" />
            </div>
            {/* Skeleton: Cards */}
            <div className="space-y-3">
              <div className="h-20 bg-gray-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
              <div className="h-16 bg-gray-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
              <div className="h-16 bg-gray-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
            </div>
            {/* Progress text */}
            <div className="mt-4 text-center">
              <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-slate-400">위협 요소를 검사하고 있습니다</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 mt-1"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
