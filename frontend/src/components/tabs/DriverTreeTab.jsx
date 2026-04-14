import React, { useState, useEffect } from 'react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { GitBranch, ChevronUp, ChevronDown, Minus, Loader } from 'lucide-react'
import { getDriverTree } from '../../api/client.js'

function DirectionBadge({ direction }) {
  if (direction === 'Positive') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 10px',
          background: 'rgba(0,196,140,0.15)',
          border: '1px solid rgba(0,196,140,0.3)',
          borderRadius: 20,
          color: '#00C48C',
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        <ChevronUp size={11} />
        Positive
      </span>
    )
  }
  if (direction === 'Negative') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 10px',
          background: 'rgba(255,76,76,0.15)',
          border: '1px solid rgba(255,76,76,0.3)',
          borderRadius: 20,
          color: '#FF4C4C',
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        <ChevronDown size={11} />
        Negative
      </span>
    )
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        background: 'rgba(160,160,160,0.15)',
        border: '1px solid rgba(160,160,160,0.3)',
        borderRadius: 20,
        color: '#A0A0A0',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <Minus size={11} />
      Neutral
    </span>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div
      style={{
        background: '#1A1A1A',
        border: '1px solid #3A3A3A',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
      }}
    >
      <div style={{ color: '#FFE600', fontWeight: 700, marginBottom: 6 }}>{d.driver}</div>
      <div style={{ color: '#FFFFFF' }}>
        Impact: <strong>{d.impact_pct > 0 ? '+' : ''}{d.impact_pct?.toFixed(2)}%</strong>
      </div>
      <div style={{ color: d.direction === 'Positive' ? '#00C48C' : d.direction === 'Negative' ? '#FF4C4C' : '#A0A0A0', marginTop: 4 }}>
        {d.direction}
      </div>
    </div>
  )
}

export default function DriverTreeTab({ analysisResult, parsedData }) {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [driverData, setDriverData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const products = analysisResult?.products?.map((p) => p.product) || []

  // On mount, default to first product from analysis result
  useEffect(() => {
    if (analysisResult?.driver_tree) {
      setDriverData(analysisResult.driver_tree)
      setSelectedProduct(analysisResult.driver_tree.product_name || products[0] || '')
    } else if (products.length > 0) {
      setSelectedProduct(products[0])
    }
  }, [analysisResult])

  const handleProductChange = async (productName) => {
    if (!productName || !parsedData?.pl) return
    setSelectedProduct(productName)

    // If it's the default product from analysis, use cached data
    if (
      analysisResult?.driver_tree?.product_name === productName
    ) {
      setDriverData(analysisResult.driver_tree)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await getDriverTree(productName, parsedData.pl)
      setDriverData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const drivers = driverData?.drivers || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header + product selector */}
      <div
        style={{
          background: '#2C2C2C',
          border: '1px solid #3A3A3A',
          borderRadius: 12,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitBranch size={20} color="#FFE600" />
          <div>
            <div style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700 }}>
              Margin Driver Decomposition
            </div>
            <div style={{ color: '#A0A0A0', fontSize: 12, marginTop: 2 }}>
              Breakdown of gross margin vs portfolio average
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: '#A0A0A0', fontSize: 13 }}>Product:</label>
          <select
            value={selectedProduct}
            onChange={(e) => handleProductChange(e.target.value)}
            style={{
              background: '#1A1A1A',
              border: '1px solid #3A3A3A',
              borderRadius: 8,
              color: '#FFFFFF',
              padding: '8px 16px',
              fontSize: 13,
              fontFamily: 'Inter, sans-serif',
              cursor: 'pointer',
              minWidth: 200,
            }}
          >
            {products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Loader size={28} color="#FFE600" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
          <div style={{ color: '#A0A0A0' }}>Loading driver analysis...</div>
        </div>
      )}

      {error && (
        <div style={{ color: '#FF4C4C', background: 'rgba(255,76,76,0.1)', border: '1px solid rgba(255,76,76,0.3)', borderRadius: 8, padding: 16 }}>
          {error}
        </div>
      )}

      {!loading && !error && drivers.length > 0 && (
        <>
          {/* Waterfall Chart */}
          <div
            style={{
              background: '#2C2C2C',
              border: '1px solid #3A3A3A',
              borderRadius: 12,
              padding: '24px',
            }}
          >
            <div style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
              Driver Impact Waterfall — {selectedProduct}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={drivers}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3A" vertical={false} />
                <XAxis
                  dataKey="driver"
                  tick={{ fill: '#A0A0A0', fontSize: 12, fontFamily: 'Inter' }}
                  axisLine={{ stroke: '#3A3A3A' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#A0A0A0', fontSize: 12, fontFamily: 'Inter' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#4A4A4A" />
                <Bar dataKey="impact_pct" radius={[4, 4, 0, 0]} maxBarSize={64}>
                  {drivers.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.direction === 'Positive'
                          ? '#00C48C'
                          : entry.direction === 'Negative'
                          ? '#FF4C4C'
                          : '#4A4A4A'
                      }
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Driver breakdown table */}
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
              Driver Breakdown
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1A1A1A' }}>
                  {['Driver', 'Impact (%)', 'Direction', 'Commentary'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        color: '#A0A0A0',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        borderBottom: '1px solid #3A3A3A',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drivers.map((d, i) => (
                  <tr
                    key={d.driver}
                    style={{
                      borderBottom: i < drivers.length - 1 ? '1px solid #3A3A3A' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <td style={{ padding: '14px 24px', color: '#FFFFFF', fontSize: 14, fontWeight: 500 }}>
                      {d.driver}
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <span
                        style={{
                          color: d.direction === 'Positive' ? '#00C48C' : d.direction === 'Negative' ? '#FF4C4C' : '#A0A0A0',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {d.impact_pct > 0 ? '+' : ''}{d.impact_pct?.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ padding: '14px 24px' }}>
                      <DirectionBadge direction={d.direction} />
                    </td>
                    <td style={{ padding: '14px 24px', color: '#A0A0A0', fontSize: 13 }}>
                      {d.commentary || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !error && drivers.length === 0 && !driverData && (
        <div style={{ color: '#A0A0A0', textAlign: 'center', padding: 40 }}>
          Select a product to view driver decomposition.
        </div>
      )}
    </div>
  )
}
