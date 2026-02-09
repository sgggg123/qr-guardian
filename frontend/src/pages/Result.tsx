import { useState } from 'react'
import { useLocation, Navigate, Link } from 'react-router-dom'
import TrafficLight from '../components/TrafficLight'
import {
  UrlInfo,
  FlagsList,
  InfoRequirementCard,
  SafeBrowsingCard,
  DomainAnalysisCard,
  RedirectChainCard,
} from '../components/ResultCard'
import { shareResult, generateShareText, copyToClipboard } from '../services/share'
import { reportUrl, getScreenshotUrl } from '../services/api'
import type { ScanData } from '../types'

export default function Result() {
  const location = useLocation()
  const scanData = location.state?.scanData as ScanData | undefined
  const [shareSuccess, setShareSuccess] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  if (!scanData) {
    return <Navigate to="/" replace />
  }

  const handleOpenUrl = () => {
    if (
      window.confirm(
        '이 URL을 열겠습니까?\n\n경고: 위험 요소가 감지된 URL일 수 있습니다. 계속하시겠습니까?'
      )
    ) {
      window.open(scanData.final_url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(scanData.final_url)
      setShareSuccess('URL이 복사되었습니다')
      setTimeout(() => setShareSuccess(null), 2000)
    } catch {
      alert('URL 복사에 실패했습니다')
    }
  }

  const handleShare = async () => {
    const success = await shareResult(scanData)
    if (success) {
      setShareSuccess('결과가 공유되었습니다')
      setTimeout(() => setShareSuccess(null), 2000)
    } else {
      // Fall back to copy
      const text = generateShareText(scanData)
      const copied = await copyToClipboard(text)
      if (copied) {
        setShareSuccess('결과가 클립보드에 복사되었습니다')
        setTimeout(() => setShareSuccess(null), 2000)
      } else {
        alert('공유에 실패했습니다')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {shareSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          {shareSuccess}
        </div>
      )}

      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">분석 결과</h1>
        <TrafficLight level={scanData.risk_level} size="lg" />

        {scanData.summary && (
          <div className="bg-white/80 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700 mt-4">
            <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed">
              {scanData.summary}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <UrlInfo originalUrl={scanData.original_url} finalUrl={scanData.final_url} />

        <FlagsList flags={scanData.flags} />

        <InfoRequirementCard info={scanData.info_requirement} />

        <SafeBrowsingCard result={scanData.safe_browsing} />

        {scanData.domain_analysis && (
          <DomainAnalysisCard analysis={scanData.domain_analysis} />
        )}

        {scanData.redirect_chain && scanData.redirect_chain.length > 1 && (
          <RedirectChainCard chain={scanData.redirect_chain} />
        )}

        {/* Site Preview */}
        <div className="bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">사이트 미리보기</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-primary-500 hover:text-primary-400"
            >
              {showPreview ? '숨기기' : '미리보기'}
            </button>
          </div>
          {showPreview && (
            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600">
              <img
                src={getScreenshotUrl(scanData.final_url)}
                alt="사이트 미리보기"
                className="w-full h-auto"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}
          {!showPreview && (
            <p className="text-xs text-gray-400 dark:text-slate-500">직접 접속하지 않고 사이트 모습을 확인할 수 있습니다</p>
          )}
        </div>
      </div>

      <div className="space-y-3 pt-4">
        {scanData.risk_level === 'GREEN' ? (
          <button
            onClick={handleOpenUrl}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            URL 열기
          </button>
        ) : (
          <button
            onClick={handleOpenUrl}
            className="w-full py-4 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            위험을 감수하고 열기
          </button>
        )}

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleCopyUrl}
            className="py-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-1.5 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            복사
          </button>

          <button
            onClick={handleShare}
            className="py-3 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-1.5 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            공유
          </button>

          <button
            onClick={async () => {
              if (reportSent) return
              try {
                await reportUrl(scanData.final_url)
                setReportSent(true)
                setShareSuccess('신고가 접수되었습니다')
                setTimeout(() => setShareSuccess(null), 2000)
              } catch {
                alert('신고 접수에 실패했습니다')
              }
            }}
            disabled={reportSent}
            className={`py-3 border rounded-xl font-medium transition-colors flex items-center justify-center gap-1.5 text-sm ${
              reportSent
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-700'
                : 'bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-400 border-red-200 dark:border-red-500/30'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            {reportSent ? '접수됨' : '신고'}
          </button>
        </div>

        <Link
          to="/"
          className="w-full py-3 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          다시 스캔
        </Link>
      </div>
    </div>
  )
}
