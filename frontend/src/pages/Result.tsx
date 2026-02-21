import { useState, useEffect, useRef } from 'react'
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
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportCount, setReportCount] = useState<number | null>(null)

  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 15-second timeout for preview loading
  useEffect(() => {
    if (previewLoading && showPreview) {
      previewTimeoutRef.current = setTimeout(() => {
        if (previewLoading) {
          setPreviewLoading(false)
          setPreviewError(true)
        }
      }, 15000)
    }
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current)
    }
  }, [previewLoading, showPreview])

  if (!scanData) {
    return <Navigate to="/" replace />
  }

  const summaryStyle = {
    GREEN: {
      bg: 'bg-green-50 dark:bg-green-500/10',
      border: 'border-green-200 dark:border-green-500/30',
      text: 'text-green-800 dark:text-green-200',
      icon: 'text-green-500 dark:text-green-400',
      iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    YELLOW: {
      bg: 'bg-yellow-50 dark:bg-yellow-500/10',
      border: 'border-yellow-200 dark:border-yellow-500/30',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: 'text-yellow-500 dark:text-yellow-400',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    },
    RED: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/30',
      text: 'text-red-800 dark:text-red-200',
      icon: 'text-red-500 dark:text-red-400',
      iconPath: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  }

  const style = summaryStyle[scanData.risk_level]

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

  const handleReport = async () => {
    if (reportSent || reportLoading) return
    setReportLoading(true)
    setReportError(null)
    try {
      const result = await reportUrl(
        scanData.final_url,
        '',
        scanData.risk_score,
        scanData.ai_summary,
      )
      setReportSent(true)
      setReportCount(result.report_count ?? null)
      setShareSuccess('신고가 접수되었습니다')
      setTimeout(() => setShareSuccess(null), 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '신고 접수에 실패했습니다'
      setReportError(msg)
      setTimeout(() => setReportError(null), 3000)
    } finally {
      setReportLoading(false)
    }
  }

  const handlePreviewToggle = () => {
    if (!showPreview) {
      setPreviewLoading(true)
      setPreviewError(false)
    }
    setShowPreview(!showPreview)
  }

  const handlePreviewRetry = () => {
    setPreviewError(false)
    setPreviewLoading(true)
    // Force re-render by toggling off/on
    setShowPreview(false)
    setTimeout(() => setShowPreview(true), 50)
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {shareSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          {shareSuccess}
        </div>
      )}
      {reportError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {reportError}
        </div>
      )}

      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">분석 결과</h1>
        <TrafficLight level={scanData.risk_level} size="lg" />
      </div>

      {/* Summary Card — AI 요약 우선, 없으면 템플릿 요약 폴백 */}
      {(scanData.ai_summary || scanData.summary) && (
        <div className={`${style.bg} ${style.border} border rounded-xl p-4`}>
          <div className="flex items-start gap-3">
            <svg className={`w-6 h-6 ${style.icon} flex-shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.iconPath} />
            </svg>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`text-sm font-semibold ${style.text}`}>분석 요약</h3>
                {scanData.ai_summary && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/50 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI
                  </span>
                )}
              </div>
              <p className={`text-sm ${style.text} leading-relaxed`}>
                {scanData.ai_summary ?? scanData.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <UrlInfo originalUrl={scanData.original_url} finalUrl={scanData.final_url} />

        {/* Action Guidelines Card */}
        {scanData.action_guidelines && scanData.action_guidelines.length > 0 && (
          <div className="bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              행동 수칙
            </h3>
            <ol className="space-y-2">
              {scanData.action_guidelines.map((guideline, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{guideline}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

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
              onClick={handlePreviewToggle}
              className="text-xs text-primary-500 hover:text-primary-400"
            >
              {showPreview ? '숨기기' : '미리보기'}
            </button>
          </div>
          {showPreview && (
            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600">
              {/* Loading skeleton */}
              {previewLoading && !previewError && (
                <div className="w-full h-48 bg-gray-100 dark:bg-slate-700 animate-pulse flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-8 h-8 text-gray-300 dark:text-slate-500 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-xs text-gray-400 dark:text-slate-500">스크린샷 로딩 중...</p>
                  </div>
                </div>
              )}
              {/* Error fallback with retry */}
              {previewError && (
                <div className="w-full h-36 bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-8 h-8 text-gray-300 dark:text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs text-gray-400 dark:text-slate-500">미리보기를 불러올 수 없습니다</p>
                    <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">외부 서비스 응답 지연 또는 일일 요청 한도 초과</p>
                    <button
                      onClick={handlePreviewRetry}
                      className="mt-2 text-xs text-primary-500 hover:text-primary-400 underline"
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              )}
              <img
                src={getScreenshotUrl(scanData.final_url)}
                alt="사이트 미리보기"
                className={`w-full h-auto ${previewError ? 'hidden' : ''}`}
                loading="lazy"
                onLoad={() => setPreviewLoading(false)}
                onError={() => {
                  setPreviewLoading(false)
                  setPreviewError(true)
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
            onClick={handleReport}
            disabled={reportSent || reportLoading}
            className={`py-3 border rounded-xl font-medium transition-colors flex flex-col items-center justify-center gap-0.5 text-sm ${
              reportSent
                ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-700'
                : reportLoading
                  ? 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-700 cursor-wait'
                  : 'bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 dark:text-red-400 border-red-200 dark:border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {reportLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              )}
              {reportSent ? '접수됨' : reportLoading ? '접수 중' : '신고'}
            </div>
            {reportSent && reportCount !== null && (
              <span className="text-xs text-gray-400 dark:text-slate-500">{reportCount}건 누적</span>
            )}
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
