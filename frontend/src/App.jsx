import React, { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import UploadCard from './components/UploadCard.jsx'
import AIInsightTab from './components/tabs/AIInsightTab.jsx'
import DriverTreeTab from './components/tabs/DriverTreeTab.jsx'
import ScenarioPlannerTab from './components/tabs/ScenarioPlannerTab.jsx'
import RankedTableTab from './components/tabs/RankedTableTab.jsx'
import { uploadPL, uploadBudget, uploadSKU, runAnalysis } from './api/client.js'
import { AlertCircle, CheckCircle, ChevronRight } from 'lucide-react'

const PL_COLS = [
  'Product', 'Therapy Area', 'Revenue', 'COGS', 'Gross Profit',
  'Gross Margin %', 'SGA', 'EBITDA', 'EBITDA Margin %',
]
const BUDGET_COLS = ['Product', 'Metric', 'Budget', 'Actual', 'Variance', 'Variance %', 'Period']
const SKU_COLS = [
  'SKU', 'Product', 'API Cost', 'Packaging Cost', 'Distribution Cost',
  'Other COGS', 'Total COGS', 'Selling Price', 'Contribution Margin',
]

const initialUploadStatus = { pl: 'idle', budget: 'idle', sku: 'idle' }
const initialFileInfo = { pl: null, budget: null, sku: null }
const initialErrors = { pl: null, budget: null, sku: null }

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('upload')
  const [analysisSubTab, setAnalysisSubTab] = useState('ai')

  // Upload states
  const [uploadStatus, setUploadStatus] = useState(initialUploadStatus)
  const [fileInfo, setFileInfo] = useState(initialFileInfo)
  const [uploadErrors, setUploadErrors] = useState(initialErrors)
  const [parsedData, setParsedData] = useState({ pl: null, budget: null, sku: null })

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState(null)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)

  const canRunAnalysis = parsedData.pl !== null

  const handleNavigate = (tab, sub) => {
    setActiveTab(tab)
    if (sub) setAnalysisSubTab(sub)
  }

  // ── Upload handlers ─────────────────────────────────────────────────────────

  const handleUploadPL = async (file) => {
    setUploadStatus((s) => ({ ...s, pl: 'uploading' }))
    setUploadErrors((e) => ({ ...e, pl: null }))
    try {
      const res = await uploadPL(file)
      setUploadStatus((s) => ({ ...s, pl: 'success' }))
      setFileInfo((f) => ({
        ...f,
        pl: { name: file.name, rows: res.rows, columns: res.columns },
      }))
      setParsedData((d) => ({ ...d, pl: res.data }))
    } catch (err) {
      setUploadStatus((s) => ({ ...s, pl: 'error' }))
      setUploadErrors((e) => ({ ...e, pl: err.message }))
    }
  }

  const handleUploadBudget = async (file) => {
    setUploadStatus((s) => ({ ...s, budget: 'uploading' }))
    setUploadErrors((e) => ({ ...e, budget: null }))
    try {
      const res = await uploadBudget(file)
      setUploadStatus((s) => ({ ...s, budget: 'success' }))
      setFileInfo((f) => ({
        ...f,
        budget: { name: file.name, rows: res.rows, columns: res.columns },
      }))
      setParsedData((d) => ({ ...d, budget: res.data }))
    } catch (err) {
      setUploadStatus((s) => ({ ...s, budget: 'error' }))
      setUploadErrors((e) => ({ ...e, budget: err.message }))
    }
  }

  const handleUploadSKU = async (file) => {
    setUploadStatus((s) => ({ ...s, sku: 'uploading' }))
    setUploadErrors((e) => ({ ...e, sku: null }))
    try {
      const res = await uploadSKU(file)
      setUploadStatus((s) => ({ ...s, sku: 'success' }))
      setFileInfo((f) => ({
        ...f,
        sku: { name: file.name, rows: res.rows, columns: res.columns },
      }))
      setParsedData((d) => ({ ...d, sku: res.data }))
    } catch (err) {
      setUploadStatus((s) => ({ ...s, sku: 'error' }))
      setUploadErrors((e) => ({ ...e, sku: err.message }))
    }
  }

  // ── Analysis handler ────────────────────────────────────────────────────────

  const handleRunAnalysis = async () => {
    if (!canRunAnalysis) return
    setIsAnalysing(true)
    setAnalysisError(null)

    try {
      const result = await runAnalysis(
        parsedData.pl,
        parsedData.budget,
        parsedData.sku
      )
      setAnalysisResult(result)
      // Navigate to AI insight tab
      setActiveTab('analysis')
      setAnalysisSubTab('ai')
    } catch (err) {
      setAnalysisError(err.message)
    } finally {
      setIsAnalysing(false)
    }
  }

  // ── Analysis sub-tabs ───────────────────────────────────────────────────────

  const SUB_TABS = [
    { id: 'ai', label: 'AI Insight' },
    { id: 'drivers', label: 'Driver Tree' },
    { id: 'scenario', label: 'Scenario Planner' },
    { id: 'ranked', label: 'Ranked Table' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#1A1A1A' }}>
      <Sidebar
        activeTab={activeTab}
        analysisSubTab={analysisSubTab}
        onNavigate={handleNavigate}
        hasAnalysis={!!analysisResult}
      />

      {/* Main area — offset by sidebar width */}
      <div style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header
          activeTab={activeTab}
          analysisSubTab={analysisSubTab}
          isAnalysing={isAnalysing}
          onRunAnalysis={handleRunAnalysis}
          canRunAnalysis={canRunAnalysis}
        />

        {/* Content area — offset by header height */}
        <main
          style={{
            marginTop: 64,
            padding: 32,
            flex: 1,
          }}
        >
          {/* ── UPLOAD TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'upload' && (
            <div style={{ maxWidth: 1100 }}>
              {/* Page title */}
              <div style={{ marginBottom: 28 }}>
                <h1
                  style={{
                    color: '#FFFFFF',
                    fontSize: 24,
                    fontWeight: 700,
                    margin: '0 0 8px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Upload Data Sources
                </h1>
                <p style={{ color: '#A0A0A0', fontSize: 14, margin: 0 }}>
                  Upload your P&L, budget and SKU files to begin the analysis. P&L is required; others are optional.
                </p>
              </div>

              {/* Upload cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 28 }}>
                <UploadCard
                  title="P&L Statement (Required)"
                  expectedColumns={PL_COLS}
                  onUpload={handleUploadPL}
                  status={uploadStatus.pl}
                  fileInfo={fileInfo.pl}
                  errorMessage={uploadErrors.pl}
                />
                <UploadCard
                  title="Budget vs Actual"
                  expectedColumns={BUDGET_COLS}
                  onUpload={handleUploadBudget}
                  status={uploadStatus.budget}
                  fileInfo={fileInfo.budget}
                  errorMessage={uploadErrors.budget}
                />
                <UploadCard
                  title="SKU Cost Breakdown"
                  expectedColumns={SKU_COLS}
                  onUpload={handleUploadSKU}
                  status={uploadStatus.sku}
                  fileInfo={fileInfo.sku}
                  errorMessage={uploadErrors.sku}
                />
              </div>

              {/* Status summary */}
              <div
                style={{
                  background: '#2C2C2C',
                  border: '1px solid #3A3A3A',
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 24,
                }}
              >
                <div style={{ color: '#A0A0A0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  Data Readiness
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { key: 'pl', label: 'P&L Statement', required: true },
                    { key: 'budget', label: 'Budget vs Actual', required: false },
                    { key: 'sku', label: 'SKU Breakdown', required: false },
                  ].map(({ key, label, required }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {uploadStatus[key] === 'success' ? (
                        <CheckCircle size={16} color="#00C48C" />
                      ) : (
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: `2px solid ${required ? '#FF4C4C' : '#3A3A3A'}`,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span style={{ color: uploadStatus[key] === 'success' ? '#FFFFFF' : '#A0A0A0', fontSize: 14 }}>
                        {label}
                      </span>
                      {required && uploadStatus[key] !== 'success' && (
                        <span style={{ color: '#FF4C4C', fontSize: 11, fontWeight: 600 }}>REQUIRED</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis error */}
              {analysisError && (
                <div
                  style={{
                    background: 'rgba(255,76,76,0.1)',
                    border: '1px solid rgba(255,76,76,0.3)',
                    borderRadius: 8,
                    padding: '14px 20px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    color: '#FF4C4C',
                    fontSize: 14,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <strong>Analysis failed:</strong> {analysisError}
                  </div>
                </div>
              )}

              {/* Run analysis CTA */}
              {canRunAnalysis && (
                <div
                  style={{
                    background: 'rgba(255,230,0,0.06)',
                    border: '1px solid rgba(255,230,0,0.2)',
                    borderRadius: 12,
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={{ color: '#FFE600', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                      Ready to Analyse
                    </div>
                    <div style={{ color: '#A0A0A0', fontSize: 13 }}>
                      {uploadStatus.pl === 'success' ? '✓ P&L uploaded' : ''}
                      {uploadStatus.budget === 'success' ? ' · ✓ Budget uploaded' : ''}
                      {uploadStatus.sku === 'success' ? ' · ✓ SKU uploaded' : ''}
                    </div>
                  </div>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={isAnalysing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 28px',
                      background: isAnalysing ? '#3A3A3A' : '#FFE600',
                      color: isAnalysing ? '#666' : '#1A1A1A',
                      border: 'none',
                      borderRadius: 8,
                      cursor: isAnalysing ? 'not-allowed' : 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 15,
                      fontWeight: 700,
                      transition: 'all 0.15s',
                    }}
                  >
                    {isAnalysing ? 'Analysing Portfolio...' : 'Run Analysis'}
                    {!isAnalysing && <ChevronRight size={18} />}
                  </button>
                </div>
              )}

              {/* Sample data note */}
              <div style={{ marginTop: 32, padding: '16px 20px', background: '#2C2C2C', border: '1px solid #3A3A3A', borderRadius: 8 }}>
                <div style={{ color: '#A0A0A0', fontSize: 13 }}>
                  <strong style={{ color: '#FFE600' }}>Sample data available:</strong> Use the files in{' '}
                  <code style={{ background: '#1A1A1A', padding: '1px 8px', borderRadius: 4, color: '#FFFFFF' }}>
                    /sample-data/
                  </code>{' '}
                  — run{' '}
                  <code style={{ background: '#1A1A1A', padding: '1px 8px', borderRadius: 4, color: '#FFFFFF' }}>
                    python generate_samples.py
                  </code>{' '}
                  to generate them first.
                </div>
              </div>
            </div>
          )}

          {/* ── ANALYSIS TABS ───────────────────────────────────────────────── */}
          {activeTab === 'analysis' && (
            <div style={{ maxWidth: 1200 }}>
              {/* Sub-tab navigation */}
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  marginBottom: 28,
                  background: '#2C2C2C',
                  border: '1px solid #3A3A3A',
                  borderRadius: 10,
                  padding: 4,
                  width: 'fit-content',
                }}
              >
                {SUB_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalysisSubTab(tab.id)}
                    style={{
                      padding: '8px 20px',
                      borderRadius: 7,
                      border: 'none',
                      cursor: 'pointer',
                      background: analysisSubTab === tab.id ? '#FFE600' : 'transparent',
                      color: analysisSubTab === tab.id ? '#1A1A1A' : '#A0A0A0',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 13,
                      fontWeight: analysisSubTab === tab.id ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (analysisSubTab !== tab.id) {
                        e.currentTarget.style.color = '#FFFFFF'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (analysisSubTab !== tab.id) {
                        e.currentTarget.style.color = '#A0A0A0'
                      }
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {analysisSubTab === 'ai' && (
                <AIInsightTab analysisResult={analysisResult} />
              )}
              {analysisSubTab === 'drivers' && (
                <DriverTreeTab
                  analysisResult={analysisResult}
                  parsedData={parsedData}
                />
              )}
              {analysisSubTab === 'scenario' && (
                <ScenarioPlannerTab
                  analysisResult={analysisResult}
                  parsedData={parsedData}
                />
              )}
              {analysisSubTab === 'ranked' && (
                <RankedTableTab analysisResult={analysisResult} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
