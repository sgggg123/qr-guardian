import { useRef } from 'react'
import { useScanner } from '../hooks/useScanner'

interface QRScannerProps {
  onScan: (url: string) => void
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isScanning, isProcessingFile, hasPermission, error, toggleScanning, scanFile, elementId } = useScanner({
    onScanSuccess: (decodedText) => {
      onScan(decodedText)
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      scanFile(file)
    }
    e.target.value = ''
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Hidden element for file scanning - must be in DOM but hidden */}
      <div id="qr-file-reader" className="absolute" style={{ width: 0, height: 0, overflow: 'hidden' }} />

      {/* Main scanner area */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-slate-800" style={{ aspectRatio: '1/1' }}>

        {/* Camera video container */}
        <div
          id={elementId}
          style={{
            width: '100%',
            height: '100%',
            display: isScanning ? 'block' : 'none',
          }}
        />

        {/* Placeholder when not scanning */}
        {!isScanning && !isProcessingFile && (
          <div className="absolute inset-0 flex items-center justify-center">
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
                카메라를 시작하거나 이미지를 업로드하세요
              </p>
            </div>
          </div>
        )}

        {/* Processing file indicator */}
        {isProcessingFile && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <div className="text-center p-8">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">QR 코드 인식 중...</p>
            </div>
          </div>
        )}

        {/* Scanning overlay with corner markers */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="w-64 h-64 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg" />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
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

      {/* Camera permission warning */}
      {hasPermission === false && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-300 mb-2">카메라 권한이 필요합니다</p>
          <p className="text-xs text-yellow-300/70">
            브라우저 설정에서 이 사이트의 카메라 접근을 허용해주세요.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={toggleScanning}
          disabled={isProcessingFile}
          className={`py-4 rounded-xl font-medium text-white transition-all ${
            isScanning
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-primary-600 hover:bg-primary-700 disabled:bg-slate-700'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5"
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
            {isScanning ? '중지' : '카메라'}
          </div>
        </button>

        <button
          onClick={triggerFileInput}
          disabled={isScanning || isProcessingFile}
          className="py-4 rounded-xl font-medium text-white transition-all bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500"
        >
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            이미지
          </div>
        </button>
      </div>

      <p className="text-center text-sm text-slate-500">
        카메라로 스캔하거나 QR 코드 이미지를 업로드하세요
      </p>
    </div>
  )
}
