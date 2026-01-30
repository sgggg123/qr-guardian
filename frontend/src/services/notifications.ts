import type { RiskLevel } from '../types'

// Sound frequencies for different risk levels
const FREQUENCIES = {
  GREEN: [800, 1000], // Pleasant chime
  YELLOW: [600, 400], // Warning tone
  RED: [300, 200, 300], // Alert
}

const DURATIONS = {
  GREEN: [100, 100],
  YELLOW: [150, 150],
  RED: [200, 100, 200],
}

// Check if notifications are enabled
const STORAGE_KEY = 'qr-guardian-notifications'

export function getNotificationSettings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : { sound: true, vibration: true }
  } catch {
    return { sound: true, vibration: true }
  }
}

export function setNotificationSettings(settings: { sound: boolean; vibration: boolean }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

// Play notification sound using Web Audio API
export function playRiskSound(riskLevel: RiskLevel) {
  const settings = getNotificationSettings()
  if (!settings.sound) return

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const frequencies = FREQUENCIES[riskLevel]
    const durations = DURATIONS[riskLevel]

    let startTime = audioContext.currentTime

    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = freq
      oscillator.type = riskLevel === 'GREEN' ? 'sine' : 'square'

      gainNode.gain.setValueAtTime(0.3, startTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + durations[index] / 1000)

      oscillator.start(startTime)
      oscillator.stop(startTime + durations[index] / 1000)

      startTime += durations[index] / 1000 + 0.05
    })
  } catch {
    // Audio API not supported
  }
}

// Trigger vibration based on risk level
export function vibrateForRisk(riskLevel: RiskLevel) {
  const settings = getNotificationSettings()
  if (!settings.vibration) return

  if (!navigator.vibrate) return

  try {
    switch (riskLevel) {
      case 'GREEN':
        navigator.vibrate(100) // Short single vibration
        break
      case 'YELLOW':
        navigator.vibrate([100, 50, 100]) // Two short pulses
        break
      case 'RED':
        navigator.vibrate([200, 100, 200, 100, 200]) // Three long pulses
        break
    }
  } catch {
    // Vibration not supported
  }
}

// Combined notification
export function notifyRiskLevel(riskLevel: RiskLevel) {
  playRiskSound(riskLevel)
  vibrateForRisk(riskLevel)
}
