import React, { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  Copy,
  CheckCheck,
  Activity,
  Zap,
  Shield,
} from 'lucide-react'
import KPITile from '../KPITile.jsx'

function formatCr(value) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}KCr`
  return `₹${Number(value).toFixed(1)}Cr`
}

function formatPct(value) {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return `${Number(value).toFixed(1)}%`
}

/**
 * Parse Claude's three-section narrative into structured sections.
 * Looks for section headers 1), 2), 3) or Portfolio Health, Top 3 Issues, Recommended Actions.
 */
function parseNarrative(text) {
  if (!text) return { health: '', issues: '', actions: '' }

  // Try to split on numbered sections
  const section1Patterns = [
    /1\)\s*portfolio health summary/i,
    /portfolio health summary/i,
    /^\s*1[\.\)]/im,
  ]
  const section2Patterns = [
    /2\)\s*top\s*3\s*issues/i,
    /top\s*3\s*issues/i,
    /^\s*2[\.\)]/im,
  ]
  const section3Patterns = [
    /3\)\s*recommended actions/i,
    /recommended actions/i,
    /^\s*3[\.\)]/im,
  ]

  let s1Start = -1, s2Start = -1, s3Start = -1

  for (const p of section1Patterns) {
    const m = text.search(p)
    if (m !== -1) { s1Start = m; break }
  }
  for (const p of section2Patterns) {
    const m = text.search(p)
    if (m !== -1) { s2Start = m; break }
  }
  for (const p of section3Patterns) {
    const m = text.search(p)
    if (m !== -1) { s3Start = m; break }
  }

  if (s1Start === -1 && s2Start === -1 && s3Start === -1) {
    // No clear structure - return whole text as health
    return { health: text, issues: '', actions: '' }
  }

  const health =
    s1Start !== -1 && s2Start !== -1
      ? text.slice(s1Start, s2Start).trim()
      : s1Start !== -1
      ? text.slice(s1Start).trim()
      : text.slice(0, s2Start !== -1 ? s2Start : text.length).trim()

  const issues =
    s2Start !== -1 && s3Start !== -1
      ? text.slice(s2Start, s3Start).trim()
      : s2Start !== -1
      ? text.slice(s2Start).trim()
      : ''

  const actions = s3Start !== -1 ? text.slice(s3Start).trim() : ''

  return { health, issues, actions }
}

/**
 * Render a section of the narrative with basic markdown-like formatting.
 * Bold: **text** → <strong>
 * Bullets: lines starting with - or • → styled bullets
 */
function RenderSection({ text }) {
  if (!text) return null

  const lines = text.split('\n').filter((l) => l.trim())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        // Skip section header lines
        if (/^[123]\)\s*(Portfolio Health|Top 3|Recommended)/i.test(trimmed)) return null
        if (/^(Portfolio Health Summary|Top 3 Issues|Recommended Actions)/i.test(trimmed)) return null

        const isBullet = /^[-•*]\s/.test(trimmed)
        const content = isBullet ? trimmed.replace(/^[-•*]\s/, '') : trimmed

        // Bold formatting
        const parts = content.split(/\*\*([^*]+)\*\*/)
        const rendered = parts.map((part, j) =>
          j % 2 === 1 ? (
            <strong key={j} style={{ color: '#FFFFFF', fontWeight: 700 }}>
              {part}
            </strong>
          ) : (
            <span key={j}>{part}</span>
          )
        )

        if (isBullet) {
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span
                style={{
                  color: '#FFE600',
                  fontWeight: 700,
                  fontSize: 14,
                  marginTop: 1,
                  flexShrink: 0,
                }}
              >
                ▸
              </span>
              <span style={{ color: '#D0D0D0', fontSize: 14, lineHeight: 1.6 }}>
                {rendered}
              </span>
            </div>
          )
        }

        return (
          <p
            key={i}
            style={{
              color: '#D0D0D0',
              fontSize: 14,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {rendered}
          </p>
        )
      })}
    </div>
  )
}

export default function AIInsightTab({ analysisResult }) {
  const [copied, setCopied] = useState(false)

  if (!analysisResult) {
    return (
      <div style={{ color: '#A0A0A0', textAlign: 'center', padding: 60 }}>
        No analysis data. Please run analysis first.
      </div>
    )
  }

  const { kpis, ai_narrative } = analysisResult

  const handleCopy = () => {
    navigator.clipboard.writeText(ai_narrative || '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const sections = parseNarrative(ai_narrative)

  const atRiskCount = kpis?.at_risk_count ?? 0
  const largestVar = kpis?.largest_variance ?? {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI Tiles */}
      <div style={{ display: 'flex', gap: 16 }}>
        <KPITile
          title="Total Portfolio Revenue"
          value={formatCr(kpis?.total_revenue)}
          subtitle="All products combined"
          icon={DollarSign}
        />
        <KPITile
          title="Blended Gross Margin"
          value={formatPct(kpis?.blended_gross_margin)}
          subtitle="Revenue-weighted avg"
          trend={kpis?.blended_gross_margin > 45 ? 'up' : kpis?.blended_gross_margin < 35 ? 'down' : 'neutral'}
          icon={TrendingUp}
        />
        <KPITile
          title="Products At Risk"
          value={String(atRiskCount)}
          subtitle="GM% below 30% threshold"
          danger={atRiskCount > 0}
          icon={AlertTriangle}
        />
        <KPITile
          title="Largest Variance"
          value={formatPct(largestVar?.variance)}
          subtitle={largestVar?.product || 'N/A'}
          trend={largestVar?.variance < 0 ? 'down' : 'up'}
          trendVal={largestVar?.product}
          warning={largestVar?.variance < -10}
          icon={BarChart2}
        />
      </div>

      {/* AI Narrative Card */}
      <div
        style={{
          background: '#2C2C2C',
          border: '1px solid #3A3A3A',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Card header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #3A3A3A',
            background: 'rgba(255,230,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={18} color="#FFE600" />
            <span style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700 }}>
              CFO Intelligence Brief
            </span>
            <span
              style={{
                padding: '2px 10px',
                background: 'rgba(255,230,0,0.15)',
                border: '1px solid rgba(255,230,0,0.3)',
                borderRadius: 20,
                color: '#FFE600',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Claude AI
            </span>
          </div>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: 'none',
              border: '1px solid #3A3A3A',
              borderRadius: 6,
              cursor: 'pointer',
              color: copied ? '#00C48C' : '#A0A0A0',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!copied) e.currentTarget.style.borderColor = '#FFE600'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3A3A3A'
            }}
          >
            {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Narrative body */}
        <div style={{ padding: '0' }}>
          {/* Portfolio Health */}
          <div
            style={{
              borderLeft: '3px solid #FFE600',
              padding: '20px 28px',
              borderBottom: '1px solid #3A3A3A',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Activity size={16} color="#FFE600" />
              <span style={{ color: '#FFE600', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Portfolio Health Summary
              </span>
            </div>
            <RenderSection text={sections.health} />
          </div>

          {/* Top Issues */}
          {sections.issues && (
            <div
              style={{
                borderLeft: '3px solid #FF4C4C',
                padding: '20px 28px',
                borderBottom: '1px solid #3A3A3A',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <AlertTriangle size={16} color="#FF4C4C" />
                <span style={{ color: '#FF4C4C', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Top Issues Requiring CFO Attention
                </span>
              </div>
              <RenderSection text={sections.issues} />
            </div>
          )}

          {/* Recommended Actions */}
          {sections.actions && (
            <div
              style={{
                borderLeft: '3px solid #00C48C',
                padding: '20px 28px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <Shield size={16} color="#00C48C" />
                <span style={{ color: '#00C48C', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recommended Actions
                </span>
              </div>
              <RenderSection text={sections.actions} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
