import { useState, useCallback, useRef, useEffect } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface UseScannerOptions {
  onScanSuccess?: (decodedText: string) => void
  onScanError?: (error: string) => void
}

export function useScanner(options: UseScannerOptions = {}) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const elementId = 'qr-reader'

  const startScanning = useCallback(async () => {
    if (scannerRef.current?.isScanning) return

    try {
      setError(null)

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(elementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        })
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          options.onScanSuccess?.(decodedText)
        },
        () => {
          // Ignore scan errors (no QR code in view)
        }
      )

      setIsScanning(true)
      setHasPermission(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '카메라 접근에 실패했습니다'

      if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
        setHasPermission(false)
        setError('카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.')
      } else {
        setError(errorMessage)
      }

      options.onScanError?.(errorMessage)
    }
  }, [options])

  const stopScanning = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop()
        setIsScanning(false)
      } catch {
        // Ignore stop errors
      }
    }
  }, [])

  const toggleScanning = useCallback(() => {
    if (isScanning) {
      stopScanning()
    } else {
      startScanning()
    }
  }, [isScanning, startScanning, stopScanning])

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return {
    isScanning,
    hasPermission,
    error,
    startScanning,
    stopScanning,
    toggleScanning,
    elementId,
  }
}
