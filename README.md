# EY Pharma Profitability Intelligence

A full-stack AI-powered product profitability analysis tool for pharmaceutical portfolios, built for EY Pharma Advisory.

## What It Does

- **Upload** P&L, Budget vs Actual, and SKU cost breakdown files (Excel or CSV)
- **AI Insight** — Claude generates a CFO-ready executive brief: portfolio health, top issues, and recommended actions
- **Driver Tree** — Decomposes each product's gross margin vs portfolio average into five drivers: Price, Volume, Mix, COGS, and SGA
- **Scenario Planner** — Interactively model price, volume, COGS, and SGA changes with instant P&L recalculation and AI commentary
- **Ranked Table** — Sortable, filterable product ranking with status badges (Healthy / Watch / At Risk) and CSV export

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18 + Vite + Tailwind CSS      |
| Charts   | Recharts                            |
| Backend  | FastAPI (Python)                    |
| AI       | Anthropic Claude (claude-opus-4-5)  |
| Parsing  | pandas, openpyxl, pdfplumber        |

---

## Folder Structure

```
/
├── backend/
│   ├── main.py                  FastAPI application
│   ├── requirements.txt
│   ├── .env.example
│   └── services/
│       ├── calc_engine.py       Margin calculations, ranking, scenario modelling
│       ├── driver_tree.py       Margin driver decomposition
│       └── ai_engine.py         Anthropic Claude integration
├── frontend/
│   ├── src/
│   │   ├── App.jsx              Root component with state & routing
│   │   ├── api/client.js        Axios API client
│   │   └── components/
│   │       ├── Sidebar.jsx
│   │       ├── Header.jsx
│   │       ├── UploadCard.jsx
│   │       ├── KPITile.jsx
│   │       └── tabs/
│   │           ├── AIInsightTab.jsx
│   │           ├── DriverTreeTab.jsx
│   │           ├── ScenarioPlannerTab.jsx
│   │           └── RankedTableTab.jsx
└── sample-data/
    ├── generate_samples.py      Script to generate test Excel files
    ├── sample_pl.xlsx
    ├── sample_budget.xlsx
    └── sample_sku.xlsx
```

---

## Running Locally

### Prerequisites

- Python 3.10+ with pip
- Node.js 18+ with npm

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start the backend
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variable (optional — defaults to localhost:8000)
cp .env.example .env

# Start the dev server
npm run dev
```

Frontend runs at: http://localhost:5173

### 3. Generate Sample Data

```bash
cd sample-data
python generate_samples.py
```

This creates `sample_pl.xlsx`, `sample_budget.xlsx`, and `sample_sku.xlsx`. Upload them in the app to test immediately.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable           | Description                        | Required |
|--------------------|------------------------------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key            | Yes      |

Get your API key at: https://console.anthropic.com

### Frontend (`frontend/.env`)

| Variable       | Description                          | Default                  |
|----------------|--------------------------------------|--------------------------|
| `VITE_API_URL` | Backend API base URL                 | `http://localhost:8000`  |

---

## Expected File Formats

### P&L Statement
Required columns: `Product`, `Revenue`, `COGS`
Optional: `Therapy Area`, `Gross Profit`, `Gross Margin %`, `SGA`, `EBITDA`, `EBITDA Margin %`

### Budget vs Actual
Required columns: `Product`, `Budget`, `Actual`
Optional: `Metric`, `Variance`, `Variance %`, `Period`

### SKU Cost Breakdown
Required columns: `SKU`, `Product`, `Total COGS`, `Selling Price`
Optional: `API Cost`, `Packaging Cost`, `Distribution Cost`, `Other COGS`, `Contribution Margin`

---

## Deployment

### Backend — Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repository
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable: `ANTHROPIC_API_KEY`
5. Deploy — note the service URL (e.g. `https://pharma-api.onrender.com`)

### Frontend — Netlify

1. Create a new site on [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Set:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
4. Add environment variable: `VITE_API_URL=https://your-render-service.onrender.com`
5. Deploy

---

## Sample Data Details

The sample dataset covers 12 pharma products across 3 therapy areas:

| Therapy Area | Products | Revenue Range |
|--------------|----------|---------------|
| Oncology     | 4        | ₹195Cr–₹780Cr |
| Cardiology   | 4        | ₹155Cr–₹510Cr |
| CNS          | 4        | ₹55Cr–₹210Cr  |

Key data characteristics:
- **2 products** have Gross Margin % below 30% (At Risk): Carbolin 75mg, Cognivex 10mg
- **3 products** have budget variance worse than -15%: Carbolin 75mg, Cognivex 10mg, Moodstab 15mg
- **20 SKUs** with API costs representing 40-60% of COGS (typical pharma profile)
- Total portfolio revenue: ₹3,825 Cr | Blended GM: ~53%

---

## API Reference

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| POST   | `/upload/pl`          | Upload P&L Excel/CSV               |
| POST   | `/upload/budget`      | Upload Budget vs Actual            |
| POST   | `/upload/sku`         | Upload SKU cost breakdown          |
| POST   | `/analyse`            | Run full portfolio analysis        |
| POST   | `/scenario`           | Run what-if scenario               |
| POST   | `/driver-tree/{name}` | Get driver tree for one product    |
| GET    | `/health`             | Health check                       |

Interactive API docs: http://localhost:8000/docs

---

## Notes

- All uploaded data is stored client-side in React state and sent in full to the backend for analysis and scenario modelling.
- All monetary values are in Indian Rupees (Crores).
- Claude model used: `claude-opus-4-5` with a 2048-token limit per call.
