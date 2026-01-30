import { useRef, useState, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  onScan: (url: string) => void
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize scanner on mount
  useEffect(() => {
    scannerRef.current = new Html5Qrcode('qr-reader')

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {})
        }
        scannerRef.current.clear()
      }
    }
  }, [])

  const startCamera = async () => {
    if (!scannerRef.current || isScanning) return

    setError(null)

    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR code found
          stopCamera()
          onScan(decodedText)
        },
        () => {
          // QR code not found - ignore
        }
      )
      setIsScanning(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Permission')) {
        setError('카메라 권한을 허용해주세요')
      } else if (msg.includes('NotFound')) {
        setError('카메라를 찾을 수 없습니다')
      } else {
        setError(`카메라 오류: ${msg}`)
      }
    }
  }

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
      } catch {
        // ignore
      }
    }
    setIsScanning(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''
    setError(null)
    setIsProcessingFile(true)

    try {
      // Stop camera if running
      await stopCamera()

      // Scan file
      const html5QrCode = new Html5Qrcode('qr-file-reader')
      const result = await html5QrCode.scanFile(file, true)
      html5QrCode.clear()

      onScan(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('No QR code') || msg.includes('No barcode') || msg.includes('No MultiFormat')) {
        setError('QR 코드를 찾을 수 없습니다')
      } else {
        setError(`인식 오류: ${msg}`)
      }
    } finally {
      setIsProcessingFile(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Hidden elements */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div id="qr-file-reader" style={{ display: 'none' }} />

      {/* Camera view */}
      <div className="relative bg-slate-800 rounded-2xl overflow-hidden" style={{ aspectRatio: '1/1' }}>
        <div id="qr-reader" className="w-full h-full" />

        {/* Overlay when not scanning */}
        {!isScanning && !isProcessingFile && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">카메라를 시작하거나 이미지를 업로드하세요</p>
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessingFile && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">QR 코드 인식 중...</p>
            </div>
          </div>
        )}

        {/* Scanning frame overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg" />
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={isScanning ? stopCamera : startCamera}
          disabled={isProcessingFile}
          className={`py-4 rounded-xl font-medium text-white transition-all ${
            isScanning ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
          } disabled:opacity-50`}
        >
          {isScanning ? '중지' : '카메라'}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning || isProcessingFile}
          className="py-4 rounded-xl font-medium text-white bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
        >
          이미지
        </button>
      </div>

      <p className="text-center text-sm text-slate-500">
        카메라로 스캔하거나 QR 코드 이미지를 업로드하세요
      </p>
    </div>
  )
}
