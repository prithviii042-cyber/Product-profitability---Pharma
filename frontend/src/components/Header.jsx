import React from 'react'
import { Activity, RefreshCw } from 'lucide-react'

export default function Header({ activeTab, analysisSubTab, isAnalysing, onRunAnalysis, canRunAnalysis }) {
  const tabLabels = {
    upload: 'Upload Data',
    ai: 'AI Insight',
    drivers: 'Driver Tree',
    scenario: 'Scenario Planner',
    ranked: 'Ranked Table',
  }

  const currentLabel =
    activeTab === 'upload' ? tabLabels.upload : tabLabels[analysisSubTab] || 'Analysis'

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 240,
        right: 0,
        height: 64,
        background: '#1A1A1A',
        borderBottom: '1px solid #3A3A3A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        zIndex: 40,
      }}
    >
      {/* Left: title + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={20} color="#FFE600" />
          <span
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Pharma Profitability Intelligence
          </span>
        </div>
        <div
          style={{
            width: 1,
            height: 20,
            background: '#3A3A3A',
          }}
        />
        <span
          style={{
            color: '#FFE600',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {currentLabel}
        </span>
      </div>

      {/* Right: Run Analysis button (only on upload tab) */}
      {activeTab === 'upload' && (
        <button
          onClick={onRunAnalysis}
          disabled={!canRunAnalysis || isAnalysing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: !canRunAnalysis || isAnalysing ? 'not-allowed' : 'pointer',
            background: !canRunAnalysis || isAnalysing ? '#3A3A3A' : '#FFE600',
            color: !canRunAnalysis || isAnalysing ? '#666' : '#1A1A1A',
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (canRunAnalysis && !isAnalysing) {
              e.currentTarget.style.background = '#FFF176'
            }
          }}
          onMouseLeave={(e) => {
            if (canRunAnalysis && !isAnalysing) {
              e.currentTarget.style.background = '#FFE600'
            }
          }}
        >
          <RefreshCw
            size={15}
            style={isAnalysing ? { animation: 'spin 1s linear infinite' } : {}}
          />
          {isAnalysing ? 'Analysing...' : 'Run Analysis'}
        </button>
      )}

      {/* Date badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {activeTab !== 'upload' && (
          <div
            style={{
              padding: '4px 12px',
              background: '#2C2C2C',
              border: '1px solid #3A3A3A',
              borderRadius: 20,
              color: '#A0A0A0',
              fontSize: 12,
            }}
          >
            Q1 FY2025
          </div>
        )}
        <div
          style={{
            padding: '4px 12px',
            background: 'rgba(255,230,0,0.08)',
            border: '1px solid rgba(255,230,0,0.2)',
            borderRadius: 20,
            color: '#FFE600',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Live
        </div>
      </div>
    </header>
  )
}
