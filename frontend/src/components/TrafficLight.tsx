import type { RiskLevel } from '../types'

interface TrafficLightProps {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
}

const riskConfig = {
  GREEN: {
    label: '안전',
    description: '위험 요소가 감지되지 않았습니다',
    color: 'bg-risk-green',
    glow: 'shadow-risk-green/50',
    textColor: 'text-risk-green',
  },
  YELLOW: {
    label: '주의',
    description: '의심스러운 요소가 감지되었습니다',
    color: 'bg-risk-yellow',
    glow: 'shadow-risk-yellow/50',
    textColor: 'text-risk-yellow',
  },
  RED: {
    label: '위험',
    description: '보안 위협이 감지되었습니다',
    color: 'bg-risk-red',
    glow: 'shadow-risk-red/50',
    textColor: 'text-risk-red',
  },
}

const sizeConfig = {
  sm: {
    container: 'w-16',
    light: 'w-4 h-4',
    gap: 'gap-1',
  },
  md: {
    container: 'w-20',
    light: 'w-5 h-5',
    gap: 'gap-1.5',
  },
  lg: {
    container: 'w-24',
    light: 'w-6 h-6',
    gap: 'gap-2',
  },
}

export default function TrafficLight({ level, size = 'md' }: TrafficLightProps) {
  const config = riskConfig[level]
  const sizes = sizeConfig[size]

  return (
    <div className="flex flex-col items-center">
      <div
        className={`${sizes.container} bg-slate-800 rounded-full p-3 flex flex-col items-center ${sizes.gap} border border-slate-700`}
      >
        {(['RED', 'YELLOW', 'GREEN'] as RiskLevel[]).map((l) => {
          const isActive = l === level
          const lightConfig = riskConfig[l]

          return (
            <div
              key={l}
              className={`${sizes.light} rounded-full transition-all duration-300 ${
                isActive
                  ? `${lightConfig.color} ${lightConfig.glow} shadow-lg animate-pulse-slow`
                  : 'bg-slate-700'
              }`}
            />
          )
        })}
      </div>

      <div className="mt-3 text-center">
        <p className={`text-lg font-bold ${config.textColor}`}>{config.label}</p>
        <p className="text-sm text-slate-400 mt-1 max-w-[200px]">{config.description}</p>
      </div>
    </div>
  )
}
