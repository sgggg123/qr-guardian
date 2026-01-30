import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRScanner from '../components/QRScanner'
import { scanUrl } from '../services/api'
import { addScanToHistory } from '../services/scanHistory'
import { notifyRiskLevel } from '../services/notifications'

export default function Home() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')

  const handleScan = async (url: string) => {
    await analyzeUrl(url)
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (manualUrl.trim()) {
      await analyzeUrl(manualUrl.trim())
    }
  }

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
        <h1 className="text-2xl font-bold text-white mb-2">QR 코드 스캔</h1>
        <p className="text-slate-400">
          QR 코드를 스캔하여 안전한 링크인지 확인하세요
        </p>
      </div>

      <QRScanner onScan={handleScan} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-900 text-slate-500">또는 직접 입력</span>
        </div>
      </div>

      <form onSubmit={handleManualSubmit} className="space-y-3">
        <input
          type="text"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          placeholder="URL을 입력하세요"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !manualUrl.trim()}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
        >
          {isLoading ? '분석 중...' : 'URL 검사'}
        </button>
      </form>

      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">URL 분석 중...</p>
            <p className="text-sm text-slate-400 mt-2">
              위협 요소를 검사하고 있습니다
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
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
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-400 hover:text-red-300 mt-1"
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
