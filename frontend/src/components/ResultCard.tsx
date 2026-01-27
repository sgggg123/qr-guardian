import type { Flag, Severity, InfoRequirement, SafeBrowsingResult } from '../types'

interface FlagCardProps {
  flag: Flag
}

const severityConfig: Record<
  Severity,
  { bg: string; border: string; icon: string; iconColor: string }
> = {
  info: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-blue-400',
  },
  warning: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    iconColor: 'text-yellow-400',
  },
  danger: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconColor: 'text-red-400',
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
        <p className="text-sm text-slate-200">{flag.message}</p>
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
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-medium text-slate-400 mb-2">URL 정보</h3>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500 mb-1">스캔된 URL</p>
          <p className="text-sm text-slate-300 break-all font-mono bg-slate-900/50 p-2 rounded">
            {originalUrl}
          </p>
        </div>

        {isDifferent && (
          <div>
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
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
            <p className="text-sm text-slate-300 break-all font-mono bg-slate-900/50 p-2 rounded">
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
      <h3 className="text-sm font-medium text-slate-400">탐지된 위험 요소</h3>
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
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  MEDIUM: {
    label: '중간',
    description: '로그인 정보 요청',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  HIGH: {
    label: '높음',
    description: '민감한 개인정보 요청',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
}

export function InfoRequirementCard({ info }: InfoRequirementCardProps) {
  const config = infoLevelConfig[info.level]

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-medium text-slate-400 mb-3">요구 정보 수준</h3>

      <div className="flex items-center gap-3 mb-3">
        <div className={`${config.bg} px-3 py-1 rounded-full`}>
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </div>
        <span className="text-sm text-slate-400">{config.description}</span>
      </div>

      {info.evidence.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-500 mb-2">감지된 입력 필드</p>
          <div className="flex flex-wrap gap-2">
            {info.evidence.map((item, index) => (
              <span
                key={index}
                className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded"
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
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-medium text-slate-400 mb-3">보안 데이터베이스 검사</h3>

      <div className="flex items-center gap-2">
        {result.is_safe ? (
          <>
            <svg
              className="w-5 h-5 text-green-400"
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
            <span className="text-sm text-green-400">알려진 위협 없음</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 text-red-400"
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
            <span className="text-sm text-red-400">위협 감지됨</span>
          </>
        )}
      </div>

      {result.threats.length > 0 && (
        <div className="mt-3 space-y-1">
          {result.threats.map((threat, index) => (
            <p key={index} className="text-sm text-red-300">
              {threat}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
