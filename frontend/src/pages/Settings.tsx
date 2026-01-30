import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { getNotificationSettings, setNotificationSettings, playRiskSound, vibrateForRisk } from '../services/notifications'

export default function Settings() {
  const { theme, toggleTheme, isDark } = useTheme()
  const [notifications, setNotifications] = useState({ sound: true, vibration: true })

  useEffect(() => {
    setNotifications(getNotificationSettings())
  }, [])

  const handleSoundToggle = () => {
    const updated = { ...notifications, sound: !notifications.sound }
    setNotifications(updated)
    setNotificationSettings(updated)
    if (updated.sound) {
      playRiskSound('GREEN') // Play test sound
    }
  }

  const handleVibrationToggle = () => {
    const updated = { ...notifications, vibration: !notifications.vibration }
    setNotifications(updated)
    setNotificationSettings(updated)
    if (updated.vibration) {
      vibrateForRisk('GREEN') // Test vibration
    }
  }

  const testNotification = (level: 'GREEN' | 'YELLOW' | 'RED') => {
    if (notifications.sound) playRiskSound(level)
    if (notifications.vibration) vibrateForRisk(level)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">설정</h1>

      {/* Theme Settings */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h2 className="text-sm font-medium text-slate-400 mb-4">테마</h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-yellow-500/20'}`}>
              {isDark ? (
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-white font-medium">{isDark ? '다크 모드' : '라이트 모드'}</p>
              <p className="text-xs text-slate-500">현재 {isDark ? '어두운' : '밝은'} 테마 사용 중</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-primary-600' : 'bg-slate-600'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isDark ? 'left-7' : 'left-1'}`}
            />
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h2 className="text-sm font-medium text-slate-400 mb-4">알림</h2>

        <div className="space-y-4">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">효과음</p>
                <p className="text-xs text-slate-500">위험도에 따른 알림음</p>
              </div>
            </div>
            <button
              onClick={handleSoundToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${notifications.sound ? 'bg-primary-600' : 'bg-slate-600'}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.sound ? 'left-7' : 'left-1'}`}
              />
            </button>
          </div>

          {/* Vibration Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">진동</p>
                <p className="text-xs text-slate-500">위험 감지 시 진동 알림</p>
              </div>
            </div>
            <button
              onClick={handleVibrationToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${notifications.vibration ? 'bg-primary-600' : 'bg-slate-600'}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications.vibration ? 'left-7' : 'left-1'}`}
              />
            </button>
          </div>
        </div>

        {/* Test Notifications */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 mb-2">알림 테스트</p>
          <div className="flex gap-2">
            <button
              onClick={() => testNotification('GREEN')}
              className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
            >
              안전
            </button>
            <button
              onClick={() => testNotification('YELLOW')}
              className="flex-1 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30"
            >
              주의
            </button>
            <button
              onClick={() => testNotification('RED')}
              className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
            >
              위험
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h2 className="text-sm font-medium text-slate-400 mb-3">정보</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">버전</span>
            <span className="text-slate-300">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">개발</span>
            <span className="text-slate-300">QR Guardian Team</span>
          </div>
        </div>
      </div>

      <Link
        to="/"
        className="block w-full py-3 text-center border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-medium transition-colors"
      >
        홈으로
      </Link>
    </div>
  )
}
