import React, { useState } from 'react'
import { Sliders, Play, Loader, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { runScenario } from '../../api/client.js'

function formatCr(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `₹${Number(v).toFixed(2)}Cr`
}
function formatPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return `${Number(v).toFixed(2)}%`
}
function formatDelta(v, isPercent = false) {
  if (v === null || v === undefined || isNaN(v)) return '—'
  const prefix = v > 0 ? '+' : ''
  return isPercent ? `${prefix}${Number(v).toFixed(2)}%` : `${prefix}₹${Number(v).toFixed(2)}Cr`
}

function SliderInput({ label, value, min, max, step, onChange, unit = '%' }) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ color: '#A0A0A0', fontSize: 13 }}>{label}</span>
        <span
          style={{
            color: value > 0 ? '#00C48C' : value < 0 ? '#FF4C4C' : '#FFFFFF',
            fontWeight: 700,
            fontSize: 15,
            minWidth: 60,
            textAlign: 'right',
          }}
        >
          {value > 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ color: '#555', fontSize: 10 }}>{min}{unit}</span>
        <span style={{ color: '#555', fontSize: 10 }}>{max}{unit}</span>
      </div>
    </div>
  )
}

function DeltaCell({ value, isPercent = false, suffix = '' }) {
  const num = Number(value)
  const color = num > 0.01 ? '#00C48C' : num < -0.01 ? '#FF4C4C' : '#A0A0A0'
  const Icon = num > 0.01 ? TrendingUp : num < -0.01 ? TrendingDown : Minus

  return (
    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        <Icon size={13} color={color} />
        <span style={{ color, fontWeight: 700, fontSize: 14 }}>
          {isPercent ? formatDelta(value, true) : formatDelta(value)}{suffix}
        </span>
      </div>
    </td>
  )
}

const COMPARISON_ROWS = [
  {
    label: 'Revenue',
    orig: 'revenue',
    adj: 'revenue',
    delta: 'revenue_delta',
    deltaPct: 'revenue_delta_pct',
    format: 'cr',
  },
  {
    label: 'Gross Profit',
    orig: 'gross_profit',
    adj: 'gross_profit',
    delta: 'gross_profit_delta',
    deltaPct: 'gross_profit_delta_pct',
    format: 'cr',
  },
  {
    label: 'Gross Margin %',
    orig: 'gross_margin_pct',
    adj: 'gross_margin_pct',
    delta: 'gross_margin_delta',
    deltaPct: null,
    format: 'pct',
  },
  {
    label: 'EBITDA',
    orig: 'ebitda',
    adj: 'ebitda',
    delta: 'ebitda_delta',
    deltaPct: 'ebitda_delta_pct',
    format: 'cr',
  },
  {
    label: 'EBITDA Margin %',
    orig: 'ebitda_margin_pct',
    adj: 'ebitda_margin_pct',
    delta: 'ebitda_margin_delta',
    deltaPct: null,
    format: 'pct',
  },
]

export default function ScenarioPlannerTab({ analysisResult, parsedData }) {
  const products = analysisResult?.products?.map((p) => p.product) || []

  const [selectedProduct, setSelectedProduct] = useState(products[0] || '')
  const [priceChg, setPriceChg] = useState(0)
  const [volChg, setVolChg] = useState(0)
  const [cogsChg, setCogsChg] = useState(0)
  const [sgaChg, setSgaChg] = useState(0)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleRun = async () => {
    if (!selectedProduct || !parsedData?.pl) return
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const res = await runScenario({
        product_id: selectedProduct,
        price_change_pct: priceChg,
        volume_change_pct: volChg,
        cogs_change_pct: cogsChg,
        sga_change_pct: sgaChg,
        pl_data: parsedData.pl,
      })
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  const handleReset = () => {
    setPriceChg(0)
    setVolChg(0)
    setCogsChg(0)
    setSgaChg(0)
    setResult(null)
    setError(null)
  }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Left panel — sliders */}
      <div
        style={{
          background: '#2C2C2C',
          border: '1px solid #3A3A3A',
          borderRadius: 12,
          padding: 24,
          width: 320,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Sliders size={18} color="#FFE600" />
          <span style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 700 }}>
            Scenario Controls
          </span>
        </div>

        {/* Product selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: '#A0A0A0', fontSize: 12, display: 'block', marginBottom: 8 }}>
            PRODUCT
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => {
              setSelectedProduct(e.target.value)
              setResult(null)
            }}
            style={{
              width: '100%',
              background: '#1A1A1A',
              border: '1px solid #3A3A3A',
              borderRadius: 8,
              color: '#FFFFFF',
              padding: '9px 14px',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
            }}
          >
            {products.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div style={{ height: 1, background: '#3A3A3A', marginBottom: 20 }} />

        {/* Sliders */}
        <SliderInput
          label="Price Change"
          value={priceChg}
          min={-30}
          max={30}
          step={1}
          onChange={setPriceChg}
        />
        <SliderInput
          label="Volume Change"
          value={volChg}
          min={-50}
          max={50}
          step={5}
          onChange={setVolChg}
        />
        <SliderInput
          label="COGS Change"
          value={cogsChg}
          min={-20}
          max={20}
          step={1}
          onChange={setCogsChg}
        />
        <SliderInput
          label="SGA Change"
          value={sgaChg}
          min={-20}
          max={20}
          step={1}
          onChange={setSgaChg}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            onClick={handleRun}
            disabled={running || !selectedProduct}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 0',
              background: running || !selectedProduct ? '#3A3A3A' : '#FFE600',
              color: running || !selectedProduct ? '#666' : '#1A1A1A',
              border: 'none',
              borderRadius: 8,
              cursor: running || !selectedProduct ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              transition: 'all 0.15s',
            }}
          >
            {running ? (
              <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Play size={14} />
            )}
            {running ? 'Running...' : 'Run Scenario'}
          </button>

          <button
            onClick={handleReset}
            style={{
              padding: '11px 16px',
              background: 'none',
              border: '1px solid #3A3A3A',
              borderRadius: 8,
              color: '#A0A0A0',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Right panel — results */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {!result && !running && !error && (
          <div
            style={{
              background: '#2C2C2C',
              border: '1px solid #3A3A3A',
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
            }}
          >
            <Sliders size={36} color="#3A3A3A" style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ color: '#A0A0A0', fontSize: 15 }}>
              Adjust the sliders and click{' '}
              <strong style={{ color: '#FFE600' }}>Run Scenario</strong> to see the impact.
            </div>
          </div>
        )}

        {running && (
          <div
            style={{
              background: '#2C2C2C',
              border: '1px solid #3A3A3A',
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
            }}
          >
            <Loader size={32} color="#FFE600" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', display: 'block' }} />
            <div style={{ color: '#A0A0A0', fontSize: 14 }}>Running scenario analysis...</div>
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'rgba(255,76,76,0.1)',
              border: '1px solid rgba(255,76,76,0.3)',
              borderRadius: 12,
              padding: 20,
              color: '#FF4C4C',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {result && !running && (
          <>
            {/* Comparison table */}
            <div
              style={{
                background: '#2C2C2C',
                border: '1px solid #3A3A3A',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '18px 24px',
                  borderBottom: '1px solid #3A3A3A',
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Scenario Impact — {selectedProduct}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1A1A1A' }}>
                    <th style={{ padding: '12px 24px', textAlign: 'left', color: '#A0A0A0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #3A3A3A' }}>
                      Metric
                    </th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: '#A0A0A0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #3A3A3A' }}>
                      Base Case
                    </th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: '#FFE600', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #3A3A3A' }}>
                      Scenario
                    </th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: '#A0A0A0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #3A3A3A' }}>
                      Delta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => {
                    const origVal = result.original?.[row.orig]
                    const adjVal = result.adjusted?.[row.adj]
                    const deltaVal = result.delta?.[row.delta]
                    const isPct = row.format === 'pct'

                    return (
                      <tr
                        key={row.label}
                        style={{
                          borderBottom: i < COMPARISON_ROWS.length - 1 ? '1px solid #3A3A3A' : 'none',
                          background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <td style={{ padding: '14px 24px', color: '#FFFFFF', fontSize: 14, fontWeight: 500 }}>
                          {row.label}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', color: '#A0A0A0', fontSize: 14 }}>
                          {isPct ? formatPct(origVal) : formatCr(origVal)}
                        </td>
                        <td style={{ padding: '14px 20px', textAlign: 'right', color: '#FFFFFF', fontSize: 14, fontWeight: 600 }}>
                          {isPct ? formatPct(adjVal) : formatCr(adjVal)}
                        </td>
                        <DeltaCell value={deltaVal} isPercent={isPct} />
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* AI Narrative */}
            {result.narrative && (
              <div
                style={{
                  background: '#2C2C2C',
                  border: '1px solid #3A3A3A',
                  borderLeft: '3px solid #FFE600',
                  borderRadius: 12,
                  padding: '20px 24px',
                }}
              >
                <div style={{ color: '#FFE600', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  CFO Commentary
                </div>
                <p style={{ color: '#D0D0D0', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                  {result.narrative}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
