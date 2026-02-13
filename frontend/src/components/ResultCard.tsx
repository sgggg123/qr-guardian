import type { Flag, Severity, InfoRequirement, SafeBrowsingResult, DomainAnalysis, RedirectHop } from '../types'

interface FlagCardProps {
  flag: Flag
}

const severityConfig: Record<
  Severity,
  { bg: string; border: string; icon: string; iconColor: string }
> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-200 dark:border-yellow-500/30',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    iconColor: 'text-yellow-500 dark:text-yellow-400',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-red-500 dark:text-red-400',
  },
}

function FlagCard({ flag }: FlagCardProps) {
  const config = severityConfig[flag.severity]

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-3`}>
      <div className="flex items-start gap-3">
        <svg
          className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
        </svg>
        <p className="text-sm text-gray-700 dark:text-slate-200">{flag.message}</p>
      </div>
    </div>
  )
}

interface UrlInfoProps {
  originalUrl: string
  finalUrl: string
}

export function UrlInfo({ originalUrl, finalUrl }: UrlInfoProps) {
  const isDifferent = originalUrl !== finalUrl

  return (
    <div className="bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">URL 정보</h3>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-500 mb-1">스캔된 URL</p>
          <p className="text-sm text-gray-700 dark:text-slate-300 break-all font-mono bg-gray-50 dark:bg-slate-900/50 p-2 rounded">
            {originalUrl}
          </p>
        </div>

        {isDifferent && (
          <div>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              최종 목적지
            </p>
            <p className="text-sm text-gray-700 dark:text-slate-300 break-all font-mono bg-gray-50 dark:bg-slate-900/50 p-2 rounded">
              {finalUrl}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface FlagsListProps {
  flags: Flag[]
}

export function FlagsList({ flags }: FlagsListProps) {
  if (flags.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">탐지된 위험 요소</h3>
      <div className="space-y-2">
        {flags.map((flag, index) => (
          <FlagCard key={`${flag.type}-${index}`} flag={flag} />
        ))}
      </div>
    </div>
  )
}

interface InfoRequirementCardProps {
  info: InfoRequirement
}

const infoLevelConfig = {
  LOW: {
    label: '낮음',
    description: '개인정보 요청 없음',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10',
  },
  MEDIUM: {
    label: '중간',
    description: '로그인 정보 요청',
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  HIGH: {
    label: '높음',
    description: '민감한 개인정보 요청',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
  },
}

export function InfoRequirementCard({ info }: InfoRequirementCardProps) {
  const config = infoLevelConfig[info.level]

  return (
    <div className="bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">요구 정보 수준</h3>

      <div className="flex items-center gap-3 mb-3">
        <div className={`${config.bg} px-3 py-1 rounded-full`}>
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
        <span className="text-sm text-gray-500 dark:text-slate-400">{config.description}</span>
      </div>

      {info.evidence.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-slate-500 mb-2">감지된 입력 필드</p>
          <div className="flex flex-wrap gap-2">
            {info.evidence.map((item, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-slate-300 px-2 py-1 rounded"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface SafeBrowsingCardProps {
  result: SafeBrowsingResult
}

export function SafeBrowsingCard({ result }: SafeBrowsingCardProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">보안 데이터베이스 검사</h3>

      <div className="flex items-center gap-2">
        {result.is_safe ? (
          <>
            <svg
              className="w-5 h-5 text-green-500 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-sm text-green-600 dark:text-green-400">알려진 위협 없음</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 text-red-500 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01"
              />
            </svg>
            <span className="text-sm text-red-600 dark:text-red-400">위협 감지됨</span>
          </>
        )}
      </div>

      {result.threats.length > 0 && (
        <div className="mt-3 space-y-1">
          {result.threats.map((threat, index) => (
            <p key={index} className="text-sm text-red-600 dark:text-red-300">
              {threat}
            </p>
          ))}
        </div>
      )}

    </div>
  )
}

interface DomainAnalysisCardProps {
  analysis: DomainAnalysis
}

const trustLevelConfig = {
  high: { label: '높음', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/20' },
  medium: { label: '보통', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/20' },
  low: { label: '낮음', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/20' },
  unknown: { label: '알 수 없음', color: 'text-gray-500 dark:text-slate-400', bg: 'bg-gray-200 dark:bg-slate-500/20' },
}

export function DomainAnalysisCard({ analysis }: DomainAnalysisCardProps) {
  const riskScore = analysis.risk_score ?? 0

  // Risk score colors (higher = more dangerous = redder)
  const riskScoreColor =
    riskScore <= 2
      ? 'text-green-600 dark:text-green-400'
      : riskScore <= 5
        ? 'text-yellow-600 dark:text-yellow-400'
        : riskScore <= 7
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-red-600 dark:text-red-400'

  const riskBarBg =
    riskScore <= 2
      ? 'bg-green-500'
      : riskScore <= 5
        ? 'bg-yellow-500'
        : riskScore <= 7
          ? 'bg-orange-500'
          : 'bg-red-500'

  return (
    <div className="bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">도메인 분석</h3>

      {/* Risk Score (0-10, higher = riskier) */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 dark:text-slate-500">위험도 점수</span>
          <span className={`text-lg font-bold ${riskScoreColor}`}>
            {riskScore.toFixed(1)}/10
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${riskBarBg} transition-all duration-500`}
            style={{ width: `${riskScore * 10}%` }}
          />
        </div>
      </div>

      {/* Risk Breakdown */}
      {analysis.risk_breakdown && analysis.risk_breakdown.length > 0 && (
        <div className="mb-4 space-y-2">
          <span className="text-xs text-gray-500 dark:text-slate-500">세부 항목</span>
          {analysis.risk_breakdown.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.score === 0
                      ? 'bg-green-500'
                      : item.score <= 1
                        ? 'bg-yellow-500'
                        : item.score <= 2
                          ? 'bg-orange-500'
                          : 'bg-red-500'
                  }`}
                />
                <span className="text-gray-600 dark:text-slate-400 truncate">{item.reason}</span>
              </div>
              <span className={`ml-2 font-mono flex-shrink-0 ${
                item.score === 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                +{item.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Domain Info */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-slate-500">도메인</span>
          <span className="text-gray-700 dark:text-slate-300 font-mono">{analysis.domain}</span>
        </div>

        {analysis.domain_age_days !== null && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-slate-500">도메인 나이</span>
            <span className={analysis.domain_age_days < 30 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-slate-300'}>
              {analysis.domain_age_days}일
            </span>
          </div>
        )}

        {/* SSL Info */}
        {analysis.ssl_info && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-500">SSL 발급기관</span>
              <span className="text-gray-700 dark:text-slate-300">{analysis.ssl_info.issuer}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-500">인증서 신뢰도</span>
              <span
                className={`px-2 py-0.5 rounded text-xs ${
                  trustLevelConfig[analysis.ssl_info.trust_level]?.bg || 'bg-gray-200 dark:bg-slate-500/20'
                } ${trustLevelConfig[analysis.ssl_info.trust_level]?.color || 'text-gray-500 dark:text-slate-400'}`}
              >
                {trustLevelConfig[analysis.ssl_info.trust_level]?.label || '알 수 없음'}
              </span>
            </div>

            {analysis.ssl_info.is_expired && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded p-2 text-red-600 dark:text-red-300 text-xs">
                SSL 인증서가 만료되었습니다
              </div>
            )}

            {analysis.ssl_info.days_until_expiry !== null &&
              analysis.ssl_info.days_until_expiry < 30 &&
              !analysis.ssl_info.is_expired && (
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded p-2 text-yellow-700 dark:text-yellow-300 text-xs">
                  인증서가 {analysis.ssl_info.days_until_expiry}일 후 만료됩니다
                </div>
              )}
          </>
        )}
      </div>
    </div>
  )
}

interface RedirectChainCardProps {
  chain: RedirectHop[]
}

export function RedirectChainCard({ chain }: RedirectChainCardProps) {
  if (chain.length <= 1) return null

  return (
    <div className="bg-white/80 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-3">리다이렉트 경로</h3>

      <div className="space-y-2">
        {chain.map((hop, index) => (
          <div key={index} className="flex items-start gap-2">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === 0
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : index === chain.length - 1
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                }`}
              >
                {index + 1}
              </div>
              {index < chain.length - 1 && (
                <div className="w-0.5 h-4 bg-gray-200 dark:bg-slate-700 my-1" />
              )}
            </div>

            {/* URL info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-slate-500 mb-0.5">
                {index === 0 ? '시작' : index === chain.length - 1 ? '최종 목적지' : `리다이렉트 ${index}`}
                {hop.status_code > 0 && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                      hop.status_code >= 200 && hop.status_code < 300
                        ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                        : hop.status_code >= 300 && hop.status_code < 400
                          ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                          : 'bg-gray-200 dark:bg-slate-500/20 text-gray-500 dark:text-slate-400'
                    }`}
                  >
                    {hop.status_code}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-700 dark:text-slate-300 font-mono break-all">{hop.domain}</p>
            </div>
          </div>
        ))}
      </div>

      {chain.length > 2 && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-3 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          여러 번의 리다이렉트가 감지되었습니다
        </p>
      )}
    </div>
  )
}
