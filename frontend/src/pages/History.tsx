import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getScanHistory, clearScanHistory, deleteScanItem, getScanStats, type ScanHistoryItem, type ScanStats } from '../services/scanHistory'

export default function History() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([])
  const [stats, setStats] = useState<ScanStats | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    setHistory(getScanHistory())
    setStats(getScanStats())
  }, [])

  const handleClear = () => {
    if (window.confirm('모든 스캔 기록을 삭제하시겠습니까?')) {
      clearScanHistory()
      setHistory([])
      setStats(getScanStats())
    }
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteScanItem(id)
    setHistory(getScanHistory())
    setStats(getScanStats())
  }

  const handleItemClick = (item: ScanHistoryItem) => {
    if (item.scanData) {
      navigate('/result', { state: { scanData: item.scanData } })
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  const riskConfig = {
    GREEN: { bg: 'bg-green-500/20', text: 'text-green-400', label: '안전' },
    YELLOW: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '주의' },
    RED: { bg: 'bg-red-500/20', text: 'text-red-400', label: '위험' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">스캔 기록</h1>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="text-sm text-red-400 hover:text-red-300"
          >
            전체 삭제
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {stats && stats.totalScans > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <h2 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">통계</h2>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalScans}</p>
              <p className="text-xs text-gray-500 dark:text-slate-500">전체</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todayScans}</p>
              <p className="text-xs text-gray-500 dark:text-slate-500">오늘</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.weekScans}</p>
              <p className="text-xs text-gray-500 dark:text-slate-500">이번 주</p>
            </div>
          </div>

          {/* Risk Distribution Bar */}
          <div className="space-y-2">
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700">
              {stats.safePercent > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${stats.safePercent}%` }}
                />
              )}
              {stats.warningPercent > 0 && (
                <div
                  className="bg-yellow-500 transition-all"
                  style={{ width: `${stats.warningPercent}%` }}
                />
              )}
              {stats.dangerPercent > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${stats.dangerPercent}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-600 dark:text-green-400">{stats.safePercent}% 안전</span>
              <span className="text-yellow-600 dark:text-yellow-400">{stats.warningPercent}% 주의</span>
              <span className="text-red-600 dark:text-red-400">{stats.dangerPercent}% 위험</span>
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-slate-400">스캔 기록이 없습니다</p>
          <Link to="/" className="text-primary-500 hover:text-primary-400 text-sm mt-2 inline-block">
            첫 스캔 시작하기
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => {
            const config = riskConfig[item.riskLevel]
            const hasDetail = !!item.scanData
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700 ${hasDetail ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      {item.riskScore !== null && (
                        <span className="text-xs text-gray-500 dark:text-slate-500">
                          위험도 {item.riskScore}점
                        </span>
                      )}
                      {hasDetail && (
                        <svg className="w-4 h-4 text-gray-400 dark:text-slate-500 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300 font-mono truncate">
                      {item.url}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      {formatDate(item.scannedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="text-gray-400 dark:text-slate-500 hover:text-red-400 p-1"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Link
        to="/"
        className="block w-full py-3 text-center border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
      >
        새 스캔
      </Link>
    </div>
  )
}
