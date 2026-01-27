import { useScanner } from '../hooks/useScanner'

interface QRScannerProps {
  onScan: (url: string) => void
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const { isScanning, hasPermission, error, toggleScanning, elementId } = useScanner({
    onScanSuccess: (decodedText) => {
      onScan(decodedText)
    },
  })

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          id={elementId}
          className={`w-full aspect-square bg-slate-800 rounded-2xl overflow-hidden ${
            !isScanning ? 'flex items-center justify-center' : ''
          }`}
        >
          {!isScanning && (
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">
                카메라를 시작하여 QR 코드를 스캔하세요
              </p>
            </div>
          )}
        </div>

        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-0.5 bg-primary-500/50 animate-scan-line" />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {hasPermission === false && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-300 mb-2">카메라 권한이 필요합니다</p>
          <p className="text-xs text-yellow-300/70">
            브라우저 설정에서 이 사이트의 카메라 접근을 허용해주세요.
          </p>
        </div>
      )}

      <button
        onClick={toggleScanning}
        className={`w-full py-4 rounded-xl font-medium text-white transition-all ${
          isScanning
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-primary-600 hover:bg-primary-700'
        }`}
      >
        {isScanning ? '스캔 중지' : '카메라 시작'}
      </button>

      <p className="text-center text-sm text-slate-500">
        QR 코드를 카메라에 비추면 자동으로 스캔됩니다
      </p>
    </div>
  )
}
