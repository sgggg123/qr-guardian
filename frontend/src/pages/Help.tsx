import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scanUrl } from '../services/api'
import { addScanToHistory } from '../services/scanHistory'
import { notifyRiskLevel } from '../services/notifications'

interface DemoItem {
  url: string
  label: string
  expectedLevel: 'GREEN' | 'YELLOW' | 'RED'
  description: string
}

const DEMO_ITEMS: DemoItem[] = [
  {
    url: 'google.com',
    label: 'google.com',
    expectedLevel: 'GREEN',
    description: '신뢰할 수 있는 공식 도메인으로 안전 판정됩니다.',
  },
  {
    url: 'navar.com',
    label: 'navar.com',
    expectedLevel: 'RED',
    description: 'naver.com을 사칭하는 타이포스쿼팅으로 위험 판정됩니다.',
  },
  {
    url: 'gooogle.com',
    label: 'gooogle.com',
    expectedLevel: 'RED',
    description: 'google.com을 사칭하는 타이포스쿼팅으로 위험 판정됩니다.',
  },
]

const LEVEL_COLORS = {
  GREEN: {
    bg: 'bg-green-50 dark:bg-green-500/10',
    border: 'border-green-200 dark:border-green-500/30',
    text: 'text-green-700 dark:text-green-400',
    badge: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
    label: '안전',
  },
  YELLOW: {
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-200 dark:border-yellow-500/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    label: '주의',
  },
  RED: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
    label: '위험',
  },
}

export default function Help() {
  const navigate = useNavigate()
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDemo = async (index: number) => {
    setLoadingIndex(index)
    setError(null)
    try {
      const response = await scanUrl(DEMO_ITEMS[index].url)
      addScanToHistory(response.data)
      notifyRiskLevel(response.data.risk_level)
      navigate('/result', { state: { scanData: response.data } })
    } catch (err) {
      setError(err instanceof Error ? err.message : '스캔에 실패했습니다')
    } finally {
      setLoadingIndex(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">사용 가이드</h1>
        <p className="text-gray-500 dark:text-slate-400">
          QR Guardian의 기능과 탐지 원리를 알아보세요
        </p>
      </div>

      {/* How it works */}
      <section className="bg-white/80 dark:bg-slate-800/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          작동 원리
        </h2>
        <div className="space-y-3 text-sm text-gray-600 dark:text-slate-300">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <p>QR 코드를 스캔하거나 URL을 직접 입력합니다.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <p>리다이렉트를 추적하여 최종 목적지 URL을 확인합니다.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <p>도메인 신뢰도, SSL 인증서, 타이포스쿼팅, 피싱 패턴 등을 종합 분석합니다.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <p>신호등 방식(초록/노랑/빨강)으로 위험도를 한눈에 보여줍니다.</p>
          </div>
        </div>
      </section>

      {/* Detection features */}
      <section className="bg-white/80 dark:bg-slate-800/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          탐지 항목
        </h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'SSL 인증서 검증' },
            { icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: '도메인 신뢰도' },
            { icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', label: '리다이렉트 추적' },
            { icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', label: '타이포스쿼팅 감지' },
            { icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', label: '피싱 패턴 분석' },
            { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: '개인정보 수집 탐지' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/30 rounded-lg p-2.5">
              <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-gray-700 dark:text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Traffic light explanation */}
      <section className="bg-white/80 dark:bg-slate-800/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          신호등 판정 기준
        </h2>
        <div className="space-y-2">
          <div className="flex items-center gap-3 bg-green-50 dark:bg-green-500/10 rounded-lg p-3">
            <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">초록 (안전)</span>
              <p className="text-xs text-green-600 dark:text-green-500">위협 요소가 발견되지 않은 안전한 URL</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-3">
            <div className="w-4 h-4 rounded-full bg-yellow-500 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">노랑 (주의)</span>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">경미한 위험 요소가 있으나 큰 문제는 없음</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-500/10 rounded-lg p-3">
            <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-red-700 dark:text-red-400">빨강 (위험)</span>
              <p className="text-xs text-red-600 dark:text-red-500">피싱, 타이포스쿼팅 등 심각한 위협 감지</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo section */}
      <section className="bg-white/80 dark:bg-slate-800/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          탐지 체험
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          아래 예시 URL을 실제로 스캔하여 탐지 결과를 확인해보세요.
        </p>
        <div className="space-y-3">
          {DEMO_ITEMS.map((item, index) => {
            const colors = LEVEL_COLORS[item.expectedLevel]
            const isLoading = loadingIndex === index
            return (
              <div key={item.url} className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <code className={`text-sm font-mono font-medium ${colors.text}`}>{item.label}</code>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                    {colors.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">{item.description}</p>
                <button
                  onClick={() => handleDemo(index)}
                  disabled={loadingIndex !== null}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    isLoading
                      ? 'bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-400 cursor-wait'
                      : 'bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      검사 중...
                    </span>
                  ) : (
                    '체험하기'
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button onClick={() => setError(null)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 mt-1">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Additional features */}
      <section className="bg-white/80 dark:bg-slate-800/50 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          추가 기능
        </h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p><strong>벌크 스캔</strong> — 최대 20개 URL을 한번에 검사</p>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p><strong>QR 생성</strong> — 안전한 QR 코드를 직접 생성</p>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p><strong>검사 기록</strong> — 최근 스캔 이력을 저장하고 재열람</p>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p><strong>URL 신고</strong> — 의심스러운 URL을 직접 신고</p>
          </div>
        </div>
      </section>
    </div>
  )
}
