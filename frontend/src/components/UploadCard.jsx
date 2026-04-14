import React, { useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Info, Loader, FileText } from 'lucide-react'

/**
 * UploadCard - drag-and-drop file upload card with status indicators.
 *
 * Props:
 *   title            - string
 *   expectedColumns  - string[]
 *   onUpload         - async (file) => void
 *   status           - 'idle' | 'uploading' | 'success' | 'error'
 *   fileInfo         - { name, rows, columns } | null
 *   errorMessage     - string | null
 */
export default function UploadCard({
  title,
  expectedColumns = [],
  onUpload,
  status = 'idle',
  fileInfo = null,
  errorMessage = null,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Please upload an Excel (.xlsx, .xls) or CSV file.')
      return
    }
    onUpload(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleClick = () => inputRef.current?.click()

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    handleFile(file)
    e.target.value = ''
  }

  const borderColor =
    status === 'success'
      ? '#00C48C'
      : status === 'error'
      ? '#FF4C4C'
      : dragging
      ? '#FFE600'
      : '#3A3A3A'

  const bgColor =
    status === 'success'
      ? 'rgba(0,196,140,0.05)'
      : status === 'error'
      ? 'rgba(255,76,76,0.05)'
      : dragging
      ? 'rgba(255,230,0,0.05)'
      : '#2C2C2C'

  return (
    <div
      style={{
        background: '#2C2C2C',
        border: '1px solid #3A3A3A',
        borderRadius: 12,
        padding: 24,
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={18} color="#FFE600" />
          <span style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 600 }}>
            {title}
          </span>
        </div>

        {/* Info icon + tooltip */}
        <div style={{ position: 'relative' }}>
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#A0A0A0',
              display: 'flex',
            }}
          >
            <Info size={16} />
          </button>

          {showTooltip && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 28,
                background: '#1A1A1A',
                border: '1px solid #3A3A3A',
                borderRadius: 8,
                padding: '12px 16px',
                zIndex: 100,
                minWidth: 260,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div style={{ color: '#A0A0A0', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Expected Columns
              </div>
              {expectedColumns.map((col) => (
                <div
                  key={col}
                  style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    padding: '3px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ color: '#FFE600', fontSize: 10 }}>▸</span>
                  {col}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 10,
          background: bgColor,
          padding: '28px 20px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          textAlign: 'center',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        {/* Idle state */}
        {status === 'idle' && (
          <>
            <Upload
              size={28}
              color="#A0A0A0"
              style={{ margin: '0 auto 12px' }}
            />
            <div style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              Drop file here or{' '}
              <span style={{ color: '#FFE600', textDecoration: 'underline' }}>browse</span>
            </div>
            <div style={{ color: '#A0A0A0', fontSize: 12 }}>
              Supports .xlsx, .xls, .csv
            </div>
          </>
        )}

        {/* Uploading state */}
        {status === 'uploading' && (
          <>
            <Loader
              size={28}
              color="#FFE600"
              style={{
                margin: '0 auto 12px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div style={{ color: '#FFE600', fontSize: 14, fontWeight: 500 }}>
              Uploading & parsing...
            </div>
          </>
        )}

        {/* Success state */}
        {status === 'success' && fileInfo && (
          <>
            <CheckCircle
              size={28}
              color="#00C48C"
              style={{ margin: '0 auto 12px' }}
            />
            <div style={{ color: '#00C48C', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              {fileInfo.name}
            </div>
            <div style={{ color: '#A0A0A0', fontSize: 12, marginBottom: 8 }}>
              {fileInfo.rows} rows parsed
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                justifyContent: 'center',
              }}
            >
              {(fileInfo.columns || []).slice(0, 3).map((col) => (
                <span
                  key={col}
                  style={{
                    padding: '2px 10px',
                    background: 'rgba(0,196,140,0.15)',
                    border: '1px solid rgba(0,196,140,0.3)',
                    borderRadius: 20,
                    color: '#00C48C',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {col}
                </span>
              ))}
              {(fileInfo.columns || []).length > 3 && (
                <span style={{ color: '#A0A0A0', fontSize: 11, padding: '2px 4px' }}>
                  +{fileInfo.columns.length - 3} more
                </span>
              )}
            </div>
          </>
        )}

        {/* Error state */}
        {status === 'error' && (
          <>
            <AlertCircle
              size={28}
              color="#FF4C4C"
              style={{ margin: '0 auto 12px' }}
            />
            <div style={{ color: '#FF4C4C', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              Upload failed
            </div>
            <div style={{ color: '#A0A0A0', fontSize: 12, marginBottom: 8, maxWidth: 280, margin: '0 auto 8px' }}>
              {errorMessage || 'Please check your file and try again.'}
            </div>
            <div style={{ color: '#FFE600', fontSize: 12, textDecoration: 'underline' }}>
              Click to try again
            </div>
          </>
        )}
      </div>
    </div>
  )
}
