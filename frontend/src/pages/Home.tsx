import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import QRScanner from '../components/QRScanner'
import { scanUrl } from '../services/api'
import { addScanToHistory } from '../services/scanHistory'
import { notifyRiskLevel } from '../services/notifications'

const SCAN_STEPS = [
  { message: 'QR 코드에서 URL 읽는 중...', percent: 8 },
  { message: 'URL 구조 분석 중...', percent: 20 },
  { message: '리다이렉트 경로 추적 중...', percent: 35 },
  { message: '위협 데이터베이스 조회 중...', percent: 52 },
  { message: '도메인 보안 검사 중...', percent: 66 },
  { message: 'SSL 인증서 검증 중...', percent: 79 },
  { message: 'AI 위험도 분석 중...', percent: 91 },
]

export default function Home() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const [pasteHint, setPasteHint] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStep, setLoadingStep] = useState(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    setLoadingProgress(SCAN_STEPS[0].percent)
    setLoadingStep(0)

    let step = 0
    progressIntervalRef.current = setInterval(() => {
      step++
      if (step < SCAN_STEPS.length) {
        setLoadingStep(step)
        setLoadingProgress(SCAN_STEPS[step].percent)
      }
    }, 550)

    try {
      const response = await scanUrl(url)

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      setLoadingProgress(100)
      setLoadingStep(-1) // 완료 상태

      await new Promise(resolve => setTimeout(resolve, 350))

      addScanToHistory(response.data)
      notifyRiskLevel(response.data.risk_level)
      navigate('/result', { state: { scanData: response.data } })
    } catch (err) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      setError(err instanceof Error ? err.message : 'URL 분석에 실패했습니다')
    } finally {
      setIsLoading(false)
      setLoadingProgress(0)
      setLoadingStep(0)
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

            {/* 아이콘 + 완료 체크 */}
            <div className="flex justify-center mb-5">
              <div className="relative w-16 h-16">
                <svg
                  className={`w-16 h-16 transition-colors duration-500 ${loadingStep === -1 ? 'text-green-500' : 'text-primary-500'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  {loadingStep === -1 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  )}
                </svg>
                {loadingStep !== -1 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* 퍼센트 + 프로그레스 바 */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-gray-500 dark:text-slate-400 truncate pr-2">
                  {loadingStep === -1 ? '✓ 분석 완료!' : SCAN_STEPS[loadingStep]?.message}
                </span>
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 tabular-nums flex-shrink-0">
                  {loadingProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ease-out ${loadingStep === -1 ? 'bg-green-500' : 'bg-primary-500'}`}
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>

            {/* 단계 인디케이터 */}
            <div className="flex justify-center gap-1.5 mb-5">
              {SCAN_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    loadingStep === -1
                      ? 'w-1.5 h-1.5 bg-green-400'
                      : i < loadingStep
                        ? 'w-1.5 h-1.5 bg-primary-500'
                        : i === loadingStep
                          ? 'w-3 h-1.5 bg-primary-500'
                          : 'w-1.5 h-1.5 bg-gray-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* 스켈레톤 미리보기 */}
            <div className="space-y-2.5">
              <div className="h-14 bg-gray-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
              <div className="h-10 bg-gray-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
              <div className="flex gap-2">
                <div className="h-8 bg-gray-100 dark:bg-slate-700/50 rounded-lg animate-pulse flex-1" />
                <div className="h-8 bg-gray-100 dark:bg-slate-700/50 rounded-lg animate-pulse flex-1" />
              </div>
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
