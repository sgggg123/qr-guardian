import { useState } from 'react'
import { Link } from 'react-router-dom'
import { bulkScanUrls, type BulkScanItem } from '../services/api'

export default function BulkScan() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<BulkScanItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const urls = input
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0)

    if (urls.length === 0) return
    if (urls.length > 20) {
      setError('최대 20개 URL까지 검사할 수 있습니다')
      return
    }

    setIsLoading(true)
    setError(null)
    setResults([])

    try {
      const response = await bulkScanUrls(urls)
      setResults(response.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : '벌크 스캔에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const riskConfig = {
    GREEN: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', label: '안전' },
    YELLOW: { bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', label: '주의' },
    RED: { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', label: '위험' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">벌크 스캔</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">여러 URL을 한꺼번에 검사합니다 (최대 20개)</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"URL을 한 줄에 하나씩 입력하세요\nhttps://example1.com\nhttps://example2.com"}
          rows={6}
          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono text-sm resize-none"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
        >
          {isLoading ? '검사 중...' : '일괄 검사'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-slate-700/50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-500 dark:text-slate-400">
            결과 ({results.length}건)
          </h2>
          {results.map((item, index) => {
            const config = item.risk_level ? riskConfig[item.risk_level] : null
            return (
              <div
                key={index}
                className="bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {config ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400">
                          오류
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-slate-300 font-mono truncate">{item.url}</p>
                    {item.summary && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{item.summary}</p>
                    )}
                    {item.error && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">{item.error}</p>
                    )}
                  </div>
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
        홈으로
      </Link>
    </div>
  )
}
