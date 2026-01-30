import { useState, useCallback, useRef, useEffect } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface UseScannerOptions {
  onScanSuccess?: (decodedText: string) => void
  onScanError?: (error: string) => void
}

export function useScanner(options: UseScannerOptions = {}) {
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const elementId = 'qr-reader'

  const startScanning = useCallback(async () => {
    if (scannerRef.current?.isScanning) return

    try {
      setError(null)
      // Set scanning state FIRST so the element becomes visible
      setIsScanning(true)

      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100))

      // Clean up any existing scanner
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
          scannerRef.current.clear()
        } catch {
          // Ignore cleanup errors
        }
      }

      scannerRef.current = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Stop scanning after successful scan
          stopScanning()
          options.onScanSuccess?.(decodedText)
        },
        () => {
          // Ignore scan errors (no QR code in view)
        }
      )

      setHasPermission(true)
    } catch (err) {
      setIsScanning(false)
      const errorMessage = err instanceof Error ? err.message : '카메라 접근에 실패했습니다'

      if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
        setHasPermission(false)
        setError('카메라 권한이 필요합니다. 브라우저 설정에서 카메라 권한을 허용해주세요.')
      } else if (errorMessage.includes('NotFound') || errorMessage.includes('not found')) {
        setError('카메라를 찾을 수 없습니다. 카메라가 연결되어 있는지 확인해주세요.')
      } else {
        setError(`카메라 오류: ${errorMessage}`)
      }

      options.onScanError?.(errorMessage)
    }
  }, [options])

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch {
        // Ignore stop errors
      }
    }
    setIsScanning(false)
  }, [])

  const toggleScanning = useCallback(() => {
    if (isScanning) {
      stopScanning()
    } else {
      startScanning()
    }
  }, [isScanning, startScanning, stopScanning])

  const scanFile = useCallback(async (file: File) => {
    setError(null)
    setIsProcessingFile(true)

    try {
      // Stop camera scanning if active
      await stopScanning()

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 50))

      // Create a new scanner instance for file scanning
      const fileScanner = new Html5Qrcode('qr-file-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })

      const decodedText = await fileScanner.scanFile(file, true)

      // Clean up file scanner
      fileScanner.clear()

      options.onScanSuccess?.(decodedText)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'QR 코드를 인식할 수 없습니다'

      if (errorMessage.includes('No QR code') || errorMessage.includes('No barcode') || errorMessage.includes('No MultiFormat')) {
        setError('이미지에서 QR 코드를 찾을 수 없습니다. 다른 이미지를 시도해주세요.')
      } else {
        setError(`QR 코드 인식 오류: ${errorMessage}`)
      }
      options.onScanError?.(errorMessage)
    } finally {
      setIsProcessingFile(false)
    }
  }, [options, stopScanning])

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop()
          }
          scannerRef.current.clear()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }, [])

  return {
    isScanning,
    isProcessingFile,
    hasPermission,
    error,
    startScanning,
    stopScanning,
    toggleScanning,
    scanFile,
    elementId,
  }
}
