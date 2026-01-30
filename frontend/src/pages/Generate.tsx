import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

export default function Generate() {
  const [url, setUrl] = useState('')
  const [generated, setGenerated] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      setGenerated(true)
    }
  }

  const downloadQR = () => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    // Create canvas and draw SVG
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()

    img.onload = () => {
      canvas.width = 512
      canvas.height = 512

      // White background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw QR
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Download
      const link = document.createElement('a')
      link.download = 'qr-code.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const copyQR = async () => {
    if (!qrRef.current) return

    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()

    img.onload = async () => {
      canvas.width = 512
      canvas.height = 512
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      try {
        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ])
            alert('QR 코드가 클립보드에 복사되었습니다')
          }
        }, 'image/png')
      } catch {
        alert('복사에 실패했습니다')
      }
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">QR 코드 생성</h1>
        <p className="text-slate-400">
          안전한 URL을 QR 코드로 만들어 공유하세요
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-3">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setGenerated(false)
          }}
          placeholder="https://example.com"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
        >
          QR 코드 생성
        </button>
      </form>

      {generated && url && (
        <div className="space-y-4">
          {/* QR Code Display */}
          <div
            ref={qrRef}
            className="bg-white p-6 rounded-2xl mx-auto w-fit"
          >
            <QRCodeSVG
              value={url}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* URL Display */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-500 mb-1">인코딩된 URL</p>
            <p className="text-sm text-slate-300 font-mono break-all">{url}</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={downloadQR}
              className="py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              다운로드
            </button>
            <button
              onClick={copyQR}
              className="py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              복사
            </button>
          </div>
        </div>
      )}

      <Link
        to="/"
        className="block w-full py-3 text-center border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-medium transition-colors"
      >
        스캔으로 돌아가기
      </Link>
    </div>
  )
}
