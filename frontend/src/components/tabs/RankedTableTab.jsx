import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, BarChart3 } from 'lucide-react'

function StatusBadge({ status }) {
  const configs = {
    Healthy: {
      bg: 'rgba(0,196,140,0.15)',
      border: 'rgba(0,196,140,0.35)',
      color: '#00C48C',
    },
    'At Risk': {
      bg: 'rgba(255,76,76,0.15)',
      border: 'rgba(255,76,76,0.35)',
      color: '#FF4C4C',
    },
    Watch: {
      bg: 'rgba(255,230,0,0.15)',
      border: 'rgba(255,230,0,0.35)',
      color: '#FFE600',
    },
  }
  const cfg = configs[status] || configs['Watch']
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 20,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  )
}

function ActionBadge({ flag }) {
  const isWatch = flag === 'Investigate' || flag === 'Review'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        background: isWatch ? 'rgba(255,76,76,0.1)' : 'rgba(160,160,160,0.1)',
        border: `1px solid ${isWatch ? 'rgba(255,76,76,0.3)' : '#3A3A3A'}`,
        borderRadius: 20,
        color: isWatch ? '#FF4C4C' : '#A0A0A0',
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {flag || 'On Track'}
    </span>
  )
}

function SortIcon({ col, sortCol, sortDir }) {
  if (col !== sortCol) return <ChevronsUpDown size={12} color="#555" />
  return sortDir === 'asc' ? (
    <ChevronUp size={12} color="#FFE600" />
  ) : (
    <ChevronDown size={12} color="#FFE600" />
  )
}

const COLUMNS = [
  { key: 'rank', label: 'Rank', sortable: true, align: 'center', width: 60 },
  { key: 'product', label: 'Product', sortable: true, align: 'left', width: 180 },
  { key: 'therapy_area', label: 'Therapy Area', sortable: true, align: 'left', width: 130 },
  { key: 'revenue', label: 'Revenue (₹Cr)', sortable: true, align: 'right', width: 130 },
  { key: 'gross_margin_pct', label: 'Gross Margin %', sortable: true, align: 'right', width: 130 },
  { key: 'ebitda_margin_pct', label: 'EBITDA Margin %', sortable: true, align: 'right', width: 140 },
  { key: 'budget_variance_pct', label: 'Budget Var %', sortable: true, align: 'right', width: 120 },
  { key: 'status', label: 'Status', sortable: true, align: 'center', width: 100 },
  { key: 'action_flag', label: 'Action Flag', sortable: false, align: 'center', width: 120 },
]

function exportCSV(data) {
  const headers = [
    'Rank', 'Product', 'Therapy Area', 'Revenue (Cr)', 'Gross Margin %',
    'EBITDA Margin %', 'Budget Variance %', 'Status', 'Action Flag',
  ]
  const rows = data.map((p) => [
    p.rank,
    p.product,
    p.therapy_area,
    p.revenue?.toFixed(2),
    p.gross_margin_pct?.toFixed(2),
    p.ebitda_margin_pct?.toFixed(2),
    p.budget_variance_pct != null ? p.budget_variance_pct?.toFixed(2) : '',
    p.status,
    p.action_flag,
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'pharma_product_rankings.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function RankedTableTab({ analysisResult }) {
  const products = analysisResult?.products || []

  const [sortCol, setSortCol] = useState('rank')
  const [sortDir, setSortDir] = useState('asc')
  const [filterTherapy, setFilterTherapy] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')

  const therapyAreas = useMemo(() => {
    const areas = [...new Set(products.map((p) => p.therapy_area).filter(Boolean))]
    return ['All', ...areas.sort()]
  }, [products])

  const statuses = ['All', 'Healthy', 'Watch', 'At Risk']

  const handleSort = (col) => {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let data = [...products]
    if (filterTherapy !== 'All') {
      data = data.filter((p) => p.therapy_area === filterTherapy)
    }
    if (filterStatus !== 'All') {
      data = data.filter((p) => p.status === filterStatus)
    }
    data.sort((a, b) => {
      const aVal = a[sortCol]
      const bVal = b[sortCol]
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal
    })
    return data
  }, [products, filterTherapy, filterStatus, sortCol, sortDir])

  if (!products.length) {
    return (
      <div style={{ color: '#A0A0A0', textAlign: 'center', padding: 60 }}>
        No product data available. Run analysis first.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls bar */}
      <div
        style={{
          background: '#2C2C2C',
          border: '1px solid #3A3A3A',
          borderRadius: 12,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={18} color="#FFE600" />
          <span style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>
            Product Rankings
          </span>
          <span
            style={{
              padding: '2px 10px',
              background: '#3A3A3A',
              borderRadius: 20,
              color: '#A0A0A0',
              fontSize: 12,
            }}
          >
            {filtered.length} products
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Therapy area filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#A0A0A0', fontSize: 12 }}>Therapy Area:</span>
            <select
              value={filterTherapy}
              onChange={(e) => setFilterTherapy(e.target.value)}
              style={{
                background: '#1A1A1A',
                border: '1px solid #3A3A3A',
                borderRadius: 8,
                color: '#FFFFFF',
                padding: '6px 12px',
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
              }}
            >
              {therapyAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#A0A0A0', fontSize: 12 }}>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                background: '#1A1A1A',
                border: '1px solid #3A3A3A',
                borderRadius: 8,
                color: '#FFFFFF',
                padding: '6px 12px',
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
              }}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Export */}
          <button
            onClick={() => exportCSV(filtered)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: 'none',
              border: '1px solid #3A3A3A',
              borderRadius: 8,
              color: '#A0A0A0',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FFE600'
              e.currentTarget.style.color = '#FFE600'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#3A3A3A'
              e.currentTarget.style.color = '#A0A0A0'
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#2C2C2C',
          border: '1px solid #3A3A3A',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
            <thead>
              <tr style={{ background: '#1A1A1A' }}>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: '13px 20px',
                      textAlign: col.align,
                      color: sortCol === col.key ? '#FFE600' : '#A0A0A0',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      borderBottom: '1px solid #3A3A3A',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      width: col.width,
                    }}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {col.sortable && (
                        <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, i) => (
                <tr
                  key={product.product}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #2A2A2A' : 'none',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,230,0,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                  }}
                >
                  {/* Rank */}
                  <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: product.rank <= 3 ? 'rgba(255,230,0,0.15)' : '#3A3A3A',
                        color: product.rank <= 3 ? '#FFE600' : '#A0A0A0',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {product.rank}
                    </span>
                  </td>

                  {/* Product */}
                  <td style={{ padding: '13px 20px', color: '#FFFFFF', fontSize: 14, fontWeight: 500 }}>
                    {product.product}
                  </td>

                  {/* Therapy Area */}
                  <td style={{ padding: '13px 20px', color: '#A0A0A0', fontSize: 13 }}>
                    {product.therapy_area}
                  </td>

                  {/* Revenue */}
                  <td style={{ padding: '13px 20px', textAlign: 'right', color: '#FFFFFF', fontSize: 14, fontWeight: 500 }}>
                    ₹{Number(product.revenue || 0).toFixed(1)}Cr
                  </td>

                  {/* Gross Margin % */}
                  <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                    <span
                      style={{
                        color:
                          product.gross_margin_pct < 30
                            ? '#FF4C4C'
                            : product.gross_margin_pct < 40
                            ? '#FFE600'
                            : '#00C48C',
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {Number(product.gross_margin_pct || 0).toFixed(1)}%
                    </span>
                  </td>

                  {/* EBITDA Margin % */}
                  <td style={{ padding: '13px 20px', textAlign: 'right', color: '#FFFFFF', fontSize: 14 }}>
                    {Number(product.ebitda_margin_pct || 0).toFixed(1)}%
                  </td>

                  {/* Budget Variance % */}
                  <td style={{ padding: '13px 20px', textAlign: 'right' }}>
                    {product.budget_variance_pct != null ? (
                      <span
                        style={{
                          color: product.budget_variance_pct < -10 ? '#FF4C4C' : product.budget_variance_pct > 0 ? '#00C48C' : '#A0A0A0',
                          fontSize: 14,
                          fontWeight: product.budget_variance_pct < -10 ? 700 : 400,
                        }}
                      >
                        {product.budget_variance_pct > 0 ? '+' : ''}
                        {Number(product.budget_variance_pct).toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: '#555' }}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                    <StatusBadge status={product.status} />
                  </td>

                  {/* Action Flag */}
                  <td style={{ padding: '13px 20px', textAlign: 'center' }}>
                    <ActionBadge flag={product.action_flag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#A0A0A0' }}>
            No products match the selected filters.
          </div>
        )}
      </div>
    </div>
  )
}
