import React from 'react'
import { Upload, Brain, GitBranch, Sliders, BarChart3 } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'upload',   label: 'Upload Data',      icon: Upload,    tab: 'upload'    },
  { id: 'ai',       label: 'AI Insight',        icon: Brain,     tab: 'analysis', sub: 'ai'       },
  { id: 'drivers',  label: 'Driver Tree',       icon: GitBranch, tab: 'analysis', sub: 'drivers'  },
  { id: 'scenario', label: 'Scenario Planner',  icon: Sliders,   tab: 'analysis', sub: 'scenario' },
  { id: 'ranked',   label: 'Ranked Table',      icon: BarChart3, tab: 'analysis', sub: 'ranked'   },
]

export default function Sidebar({ activeTab, analysisSubTab, onNavigate, hasAnalysis }) {
  const isActive = (item) => {
    if (item.tab === 'upload') return activeTab === 'upload'
    return activeTab === 'analysis' && analysisSubTab === item.sub
  }

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        background: '#1A1A1A',
        borderRight: '1px solid #3A3A3A',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 50,
      }}
    >
      {/* EY Logo */}
      <div style={{ padding: '28px 24px 24px' }}>
        <div
          style={{
            background: '#000000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 36,
            borderRadius: 4,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: '#FFE600',
              fontWeight: 700,
              fontSize: 22,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '-1px',
            }}
          >
            EY
          </span>
        </div>
        <div>
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Pharma Advisory
          </div>
          <div style={{ color: '#A0A0A0', fontSize: 10, marginTop: 2 }}>
            Profitability Intelligence
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#3A3A3A', margin: '0 16px 16px' }} />

      {/* Nav label */}
      <div
        style={{
          color: '#A0A0A0',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '0 24px 12px',
        }}
      >
        Navigation
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          const disabled = item.tab === 'analysis' && !hasAnalysis

          return (
            <button
              key={item.id}
              onClick={() => {
                if (!disabled) onNavigate(item.tab, item.sub)
              }}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 4,
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: active ? 'rgba(255, 230, 0, 0.1)' : 'transparent',
                color: active ? '#FFE600' : disabled ? '#555555' : '#A0A0A0',
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                textAlign: 'left',
                transition: 'all 0.15s ease',
                borderLeft: active ? '3px solid #FFE600' : '3px solid transparent',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!disabled && !active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                  e.currentTarget.style.color = '#FFFFFF'
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#A0A0A0'
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span>{item.label}</span>
              {disabled && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    color: '#555',
                    fontWeight: 400,
                  }}
                >
                  Run analysis
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid #3A3A3A',
        }}
      >
        <div style={{ color: '#555', fontSize: 10 }}>
          Powered by Claude AI
        </div>
        <div style={{ color: '#3A3A3A', fontSize: 10, marginTop: 2 }}>
          v1.0.0 — EY Internal
        </div>
      </div>
    </aside>
  )
}
