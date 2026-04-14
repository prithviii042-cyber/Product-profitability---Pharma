import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * KPI Tile component for displaying key portfolio metrics.
 *
 * Props:
 *   title     - string
 *   value     - string (pre-formatted)
 *   subtitle  - string (optional context line)
 *   trend     - 'up' | 'down' | 'neutral' | null
 *   trendVal  - string (e.g. "+3.2%")
 *   danger    - boolean (red background for At Risk)
 *   warning   - boolean (yellow tint)
 *   icon      - lucide-react icon component
 */
export default function KPITile({
  title,
  value,
  subtitle,
  trend,
  trendVal,
  danger = false,
  warning = false,
  icon: Icon,
}) {
  const bgColor = danger
    ? 'rgba(255, 76, 76, 0.12)'
    : warning
    ? 'rgba(255, 230, 0, 0.08)'
    : '#2C2C2C'

  const borderColor = danger
    ? 'rgba(255, 76, 76, 0.4)'
    : warning
    ? 'rgba(255, 230, 0, 0.3)'
    : '#3A3A3A'

  const trendColor =
    trend === 'up'
      ? '#00C48C'
      : trend === 'down'
      ? '#FF4C4C'
      : '#A0A0A0'

  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        padding: '20px 24px',
        flex: 1,
        minWidth: 0,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            color: '#A0A0A0',
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {title}
        </span>
        {Icon && (
          <Icon
            size={16}
            color={danger ? '#FF4C4C' : warning ? '#FFE600' : '#A0A0A0'}
          />
        )}
      </div>

      {/* Value */}
      <div
        style={{
          color: danger ? '#FF4C4C' : '#FFFFFF',
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {value}
      </div>

      {/* Subtitle / trend row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {trendVal && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: trendColor,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <TrendIcon size={12} />
            {trendVal}
          </div>
        )}
        {subtitle && (
          <span style={{ color: '#A0A0A0', fontSize: 12 }}>{subtitle}</span>
        )}
      </div>
    </div>
  )
}
