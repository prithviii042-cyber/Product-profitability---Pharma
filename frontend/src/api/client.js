import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
})

// Response interceptor for error normalisation
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred'
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
)

/**
 * Upload P&L Excel/CSV file.
 * @param {File} file
 * @returns {Promise<{rows, columns, preview, summary_stats}>}
 */
export async function uploadPL(file) {
  const form = new FormData()
  form.append('file', file)
  return api.post('/upload/pl', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * Upload Budget vs Actual Excel/CSV file.
 * @param {File} file
 * @returns {Promise<{rows, columns, preview, summary_stats}>}
 */
export async function uploadBudget(file) {
  const form = new FormData()
  form.append('file', file)
  return api.post('/upload/budget', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * Upload SKU cost breakdown Excel/CSV file.
 * @param {File} file
 * @returns {Promise<{rows, columns, preview, summary_stats}>}
 */
export async function uploadSKU(file) {
  const form = new FormData()
  form.append('file', file)
  return api.post('/upload/sku', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * Run full portfolio analysis.
 * @param {Array} plData - Parsed P&L rows
 * @param {Array|null} budgetData - Parsed Budget rows
 * @param {Array|null} skuData - Parsed SKU rows
 * @returns {Promise<AnalyseResponse>}
 */
export async function runAnalysis(plData, budgetData, skuData) {
  return api.post('/analyse', {
    pl_data: plData,
    budget_data: budgetData || null,
    sku_data: skuData || null,
  })
}

/**
 * Run a what-if scenario for a single product.
 * @param {object} params
 * @param {string} params.product_id
 * @param {number} params.price_change_pct
 * @param {number} params.volume_change_pct
 * @param {number} params.cogs_change_pct
 * @param {number} params.sga_change_pct
 * @param {Array}  params.pl_data
 * @returns {Promise<ScenarioResponse>}
 */
export async function runScenario(params) {
  return api.post('/scenario', params)
}

/**
 * Get driver tree for a specific product.
 * @param {string} productName
 * @param {Array} plData
 * @returns {Promise<{product_name, drivers}>}
 */
export async function getDriverTree(productName, plData) {
  return api.post(`/driver-tree/${encodeURIComponent(productName)}`, {
    pl_data: plData,
    budget_data: null,
    sku_data: null,
  })
}
