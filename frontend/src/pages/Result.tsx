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
import type { ScanData } from '../types'

export default function Result() {
  const location = useLocation()
  const scanData = location.state?.scanData as ScanData | undefined

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
      alert('URL이 클립보드에 복사되었습니다')
    } catch {
      alert('URL 복사에 실패했습니다')
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-4">분석 결과</h1>
        <TrafficLight level={scanData.risk_level} size="lg" />
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
            className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
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

        <button
          onClick={handleCopyUrl}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          URL 복사
        </button>

        <Link
          to="/"
          className="w-full py-3 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
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
