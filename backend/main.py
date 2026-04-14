"""
Pharma Product Profitability Intelligence — FastAPI Backend
"""

import difflib
import io
import json
import os
import re
from typing import Any, Optional

import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from services.calc_engine import (
    calculate_margins,
    rank_products,
    flag_at_risk,
    flag_underperforming,
    get_portfolio_kpis,
    compute_scenario,
)
from services.driver_tree import decompose_margin
from services.ai_engine import (
    generate_analysis_narrative,
    generate_driver_commentary,
    generate_scenario_narrative,
    infer_upload_schema,
)

app = FastAPI(
    title="Pharma Profitability Intelligence API",
    description="Backend for the EY Pharma Product Profitability Agent",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Expected columns per upload type ────────────────────────────────────────

PL_REQUIRED = ["Product", "Revenue", "COGS"]
PL_ALL = ["Product", "Therapy Area", "Revenue", "COGS", "Gross Profit", "Gross Margin %", "SGA", "EBITDA", "EBITDA Margin %"]
PL_SYNONYMS = {
    "Product": ["Product Name", "Brand", "Product ID", "Product Code", "Item", "Product Description"],
    "Revenue": ["Net Revenue", "Sales", "Sales Revenue", "Turnover", "Gross Sales"],
    "COGS": ["Cost of Goods Sold", "Cost of Sales", "COS", "COGS (net)", "Cost Of Sales"],
    "Therapy Area": ["Therapy", "Therapeutic Area", "Business Unit", "Therapy Category"],
    "Gross Profit": ["GP", "Gross Margin Amount", "Gross Contribution"],
    "Gross Margin %": ["Gross Margin", "GM %", "GP %", "Gross Profit %", "Gross Margin Pct", "Gross Margin Percent"],
    "SGA": ["SG&A", "Sales General and Admin", "Sales General & Admin", "Selling General Administrative"],
    "EBITDA": ["EBITDA (Adj)", "EBITDA Value"],
    "EBITDA Margin %": ["EBITDA %", "EBITDA Margin", "EBITDA Margin Pct"],
}

BUDGET_REQUIRED = ["Product", "Budget", "Actual"]
BUDGET_ALL = ["Product", "Metric", "Budget", "Actual", "Variance", "Variance %", "Period"]
BUDGET_SYNONYMS = {
    "Product": ["Product Name", "Brand", "Product ID", "Product Code"],
    "Budget": ["Budget Amount", "Planned", "Forecast", "Budgeted"],
    "Actual": ["Actuals", "Reported", "Actual Amount"],
    "Variance": ["Variance Amount", "Difference", "Budget Variance"],
    "Variance %": ["Variance Percent", "Variance Percentage", "Variance Pct"],
    "Period": ["Quarter", "Month", "Financial Period", "FY Period"],
}

SKU_REQUIRED = ["SKU", "Product", "Total COGS", "Selling Price"]
SKU_ALL = ["SKU", "Product", "API Cost", "Packaging Cost", "Distribution Cost", "Other COGS", "Total COGS", "Selling Price", "Contribution Margin"]
SKU_SYNONYMS = {
    "SKU": ["SKU Code", "Stock Keeping Unit", "Item Code", "Product SKU"],
    "Product": ["Product Name", "Brand", "Product ID", "Product Code"],
    "Total COGS": ["Total Cost of Goods Sold", "Total Cost", "COGS Total", "Cost of Goods Sold"],
    "Selling Price": ["Price", "Unit Price", "Sale Price", "Net Price"],
    "API Cost": ["Active Ingredient Cost", "Active Pharma Ingredient Cost", "API"],
    "Packaging Cost": ["Package Cost", "Packaging"],
    "Distribution Cost": ["Logistics Cost", "Distribution"],
    "Other COGS": ["Other Costs", "Other Cost of Goods Sold", "Other Expenses"],
    "Contribution Margin": ["Contribution", "Margin Contribution", "Gross Contribution"],
}

# ─── Pydantic models ──────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    rows: int
    columns: list[str]
    preview: list[dict]
    data: list[dict]
    summary_stats: dict


class AnalyseRequest(BaseModel):
    pl_data: list[dict]
    budget_data: Optional[list[dict]] = None
    sku_data: Optional[list[dict]] = None


class ProductResult(BaseModel):
    rank: int
    product: str
    therapy_area: str
    revenue: float
    gross_margin_pct: float
    ebitda_margin_pct: float
    budget_variance_pct: Optional[float]
    status: str
    action_flag: str


class DriverEntry(BaseModel):
    driver: str
    impact_value: float
    impact_pct: float
    direction: str
    commentary: str


class DriverTreeResult(BaseModel):
    product_name: str
    drivers: list[DriverEntry]


class KPIs(BaseModel):
    total_revenue: float
    blended_gross_margin: float
    at_risk_count: int
    largest_variance: dict


class AnalyseResponse(BaseModel):
    kpis: KPIs
    products: list[ProductResult]
    driver_tree: DriverTreeResult
    ai_narrative: str


class ScenarioRequest(BaseModel):
    product_id: str
    price_change_pct: float = 0.0
    volume_change_pct: float = 0.0
    cogs_change_pct: float = 0.0
    sga_change_pct: float = 0.0
    pl_data: list[dict]


class ScenarioMetrics(BaseModel):
    revenue: float
    gross_profit: float
    gross_margin_pct: float
    ebitda: float
    ebitda_margin_pct: float


class ScenarioDelta(BaseModel):
    revenue_delta: float
    revenue_delta_pct: float
    gross_profit_delta: float
    gross_profit_delta_pct: float
    gross_margin_delta: float
    ebitda_delta: float
    ebitda_delta_pct: float
    ebitda_margin_delta: float


class ScenarioResponse(BaseModel):
    original: ScenarioMetrics
    adjusted: ScenarioMetrics
    delta: ScenarioDelta
    narrative: str


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _parse_upload(
    file: UploadFile,
    required_cols: list[str],
    all_cols: list[str],
    synonyms: dict[str, list[str]],
    upload_type: str,
) -> pd.DataFrame:
    """Read an uploaded Excel (or CSV) file and validate required columns."""
    filename = file.filename or ""
    content = await file.read()

    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse file '{filename}': {str(exc)}")

    if df.empty:
        raise HTTPException(status_code=400, detail=f"Uploaded file '{filename}' contains no data rows.")

    header_row_index, header_map = _find_best_header_row(df, synonyms, required_cols)
    if header_row_index is not None:
        header_values = df.loc[header_row_index].fillna("").astype(str).tolist()
        df = df.iloc[header_row_index + 1 :].reset_index(drop=True)
        df.columns = [str(c).strip() for c in header_values]
    else:
        df.columns = [str(c).strip() for c in df.iloc[0].tolist()]
        df = df.iloc[1:].reset_index(drop=True)

    df = await _normalize_and_map_columns(df, synonyms, required_cols, upload_type)

    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Missing required columns in '{filename}': {missing}. "
                f"Expected columns include: {all_cols}. "
                f"Found headers: {df.columns.tolist()}"
            ),
        )

    return df


def _normalize_column_name(column_name: str) -> str:
    return re.sub(r"\s+", " ", str(column_name).strip().lower())


def _build_synonym_map(synonyms: dict[str, list[str]]) -> dict[str, str]:
    normalized = {}
    for canonical, alias_list in synonyms.items():
        normalized[_normalize_column_name(canonical)] = canonical
        for alias in alias_list:
            normalized[_normalize_column_name(alias)] = canonical
    return normalized


def _find_best_header_row(
    df: pd.DataFrame,
    synonyms: dict[str, list[str]],
    required_cols: list[str],
    max_rows: int = 10,
) -> tuple[Optional[int], dict[str, str]]:
    """Detect the header row by scanning the first rows for recognizable column names."""
    synonym_map = _build_synonym_map(synonyms)
    best_match_count = 0
    best_row_index: Optional[int] = None
    best_column_map: dict[str, str] = {}

    for row_index in list(df.index)[:max_rows]:
        row_values = df.loc[row_index].fillna("").astype(str).tolist()
        column_map: dict[str, str] = {}
        matched: set[str] = set()

        for raw_value in row_values:
            normalized = _normalize_column_name(raw_value)
            if normalized in synonym_map:
                canonical = synonym_map[normalized]
                column_map[raw_value] = canonical
                matched.add(canonical)
            else:
                close = difflib.get_close_matches(normalized, list(synonym_map.keys()), n=1, cutoff=0.85)
                if close:
                    canonical = synonym_map[close[0]]
                    column_map[raw_value] = canonical
                    matched.add(canonical)

        match_count = len(matched)
        if match_count > best_match_count:
            best_match_count = match_count
            best_row_index = row_index
            best_column_map = column_map

        if match_count == len(required_cols):
            break

    return best_row_index, best_column_map


async def _normalize_and_map_columns(
    df: pd.DataFrame,
    synonyms: dict[str, list[str]],
    required_cols: list[str],
    upload_type: str,
) -> pd.DataFrame:
    current_cols = [str(c) for c in df.columns]
    synonym_map = _build_synonym_map(synonyms)
    column_map: dict[str, str] = {}

    normalized_actual = { _normalize_column_name(c): c for c in current_cols }
    for norm, actual_name in normalized_actual.items():
        if norm in synonym_map:
            column_map[actual_name] = synonym_map[norm]
        else:
            close = difflib.get_close_matches(norm, list(synonym_map.keys()), n=1, cutoff=0.85)
            if close:
                column_map[actual_name] = synonym_map[close[0]]

    if column_map:
        df = df.rename(columns=column_map)

    missing = [col for col in required_cols if col not in df.columns]
    if missing and os.environ.get("ENABLE_UPLOAD_AI_INFERENCE", "true").lower() in ("true", "1", "yes"):
        inferred_mapping = await infer_upload_schema(current_cols, upload_type, required_cols)
        if inferred_mapping:
            df = df.rename(columns=inferred_mapping)

    return df


def _df_summary_stats(df: pd.DataFrame) -> dict:
    """Return basic summary stats for numeric columns."""
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    stats = {}
    for col in numeric_cols[:8]:  # limit to first 8 for brevity
        stats[col] = {
            "min": round(float(df[col].min()), 2),
            "max": round(float(df[col].max()), 2),
            "mean": round(float(df[col].mean()), 2),
            "sum": round(float(df[col].sum()), 2),
        }
    return stats


def _safe_float(val, default=0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


# ─── Upload endpoints ─────────────────────────────────────────────────────────

@app.post("/upload/pl", response_model=UploadResponse)
async def upload_pl(file: UploadFile = File(...)):
    """Upload a P&L Excel/CSV file. Returns parsed rows, columns, preview and summary stats."""
    df = await _parse_upload(file, PL_REQUIRED, PL_ALL, PL_SYNONYMS, "P&L")
    df = calculate_margins(df)
    all_rows = df.fillna("").to_dict(orient="records")
    return UploadResponse(
        rows=len(df),
        columns=df.columns.tolist(),
        preview=all_rows[:5],
        data=all_rows,
        summary_stats=_df_summary_stats(df),
    )


@app.post("/upload/budget", response_model=UploadResponse)
async def upload_budget(file: UploadFile = File(...)):
    """Upload a Budget vs Actual Excel/CSV file."""
    df = await _parse_upload(file, BUDGET_REQUIRED, BUDGET_ALL, BUDGET_SYNONYMS, "Budget")

    # Compute variance columns if not present
    if "Variance" not in df.columns and "Budget" in df.columns and "Actual" in df.columns:
        df["Budget"] = pd.to_numeric(df["Budget"], errors="coerce").fillna(0)
        df["Actual"] = pd.to_numeric(df["Actual"], errors="coerce").fillna(0)
        df["Variance"] = df["Actual"] - df["Budget"]
        df["Variance %"] = df.apply(
            lambda r: (r["Variance"] / r["Budget"] * 100) if r["Budget"] != 0 else 0, axis=1
        )

    all_rows = df.fillna("").to_dict(orient="records")
    return UploadResponse(
        rows=len(df),
        columns=df.columns.tolist(),
        preview=all_rows[:5],
        data=all_rows,
        summary_stats=_df_summary_stats(df),
    )


@app.post("/upload/sku", response_model=UploadResponse)
async def upload_sku(file: UploadFile = File(...)):
    """Upload a SKU-level cost breakdown Excel/CSV file."""
    df = await _parse_upload(file, SKU_REQUIRED, SKU_ALL, SKU_SYNONYMS, "SKU")

    # Compute contribution margin if not present
    if "Contribution Margin" not in df.columns and "Selling Price" in df.columns and "Total COGS" in df.columns:
        df["Selling Price"] = pd.to_numeric(df["Selling Price"], errors="coerce").fillna(0)
        df["Total COGS"] = pd.to_numeric(df["Total COGS"], errors="coerce").fillna(0)
        df["Contribution Margin"] = df["Selling Price"] - df["Total COGS"]

    all_rows = df.fillna("").to_dict(orient="records")
    return UploadResponse(
        rows=len(df),
        columns=df.columns.tolist(),
        preview=all_rows[:5],
        data=all_rows,
        summary_stats=_df_summary_stats(df),
    )


# ─── Analysis endpoint ────────────────────────────────────────────────────────

@app.post("/analyse", response_model=AnalyseResponse)
async def analyse(request: AnalyseRequest):
    """
    Run the full profitability analysis:
    - Recalculate margins
    - Rank + flag products
    - Decompose margin drivers for the top product
    - Generate AI narrative via Claude
    """
    if not request.pl_data:
        raise HTTPException(status_code=400, detail="P&L data is required for analysis.")

    # Build DataFrames
    pl_df = pd.DataFrame(request.pl_data)
    budget_df = pd.DataFrame(request.budget_data) if request.budget_data else None
    sku_df = pd.DataFrame(request.sku_data) if request.sku_data else None

    # Ensure numeric types in PL
    for col in ["Revenue", "COGS", "Gross Profit", "SGA", "EBITDA"]:
        if col in pl_df.columns:
            pl_df[col] = pd.to_numeric(pl_df[col], errors="coerce").fillna(0)

    # Calculate margins
    pl_df = calculate_margins(pl_df)

    # Ensure Therapy Area column
    if "Therapy Area" not in pl_df.columns:
        pl_df["Therapy Area"] = "Unknown"

    # Rank and flag
    pl_df = rank_products(pl_df)
    pl_df = flag_at_risk(pl_df)

    # Budget variance merging
    budget_variance_map: dict[str, float] = {}
    if budget_df is not None and "Product" in budget_df.columns:
        budget_df["Budget"] = pd.to_numeric(budget_df.get("Budget", pd.Series()), errors="coerce").fillna(0)
        budget_df["Actual"] = pd.to_numeric(budget_df.get("Actual", pd.Series()), errors="coerce").fillna(0)
        if "Variance %" not in budget_df.columns:
            budget_df["Variance %"] = budget_df.apply(
                lambda r: ((r["Actual"] - r["Budget"]) / r["Budget"] * 100) if r["Budget"] != 0 else 0,
                axis=1,
            )
        budget_agg = budget_df.groupby("Product")["Variance %"].mean()
        budget_variance_map = budget_agg.to_dict()

    pl_df["Budget Variance %"] = pl_df["Product"].map(budget_variance_map)
    pl_df = flag_underperforming(pl_df)

    # Compute portfolio KPIs
    kpis_dict = get_portfolio_kpis(pl_df, budget_df)

    # Portfolio averages for driver tree
    avg_revenue = float(pl_df["Revenue"].mean()) if "Revenue" in pl_df.columns else 0
    total_revenue = float(pl_df["Revenue"].sum()) if "Revenue" in pl_df.columns else 1
    avg_gm_pct = float(pl_df["Gross Margin %"].mean()) if "Gross Margin %" in pl_df.columns else 0
    avg_cogs_ratio = float((pl_df["COGS"].sum() / total_revenue)) if "COGS" in pl_df.columns and total_revenue > 0 else 0.5
    avg_sga_ratio = float((pl_df["SGA"].sum() / total_revenue)) if "SGA" in pl_df.columns and total_revenue > 0 else 0.15
    avg_ebitda_pct = float(pl_df["EBITDA Margin %"].mean()) if "EBITDA Margin %" in pl_df.columns else 0

    portfolio_avg = {
        "avg_revenue": avg_revenue,
        "avg_gross_margin_pct": avg_gm_pct,
        "avg_cogs_ratio": avg_cogs_ratio,
        "avg_sga_ratio": avg_sga_ratio,
        "avg_ebitda_margin_pct": avg_ebitda_pct,
    }

    # Driver tree for the first (top-ranked) product
    first_product_row = pl_df.iloc[0].to_dict()
    raw_drivers = decompose_margin(first_product_row, portfolio_avg)
    enriched_drivers = await generate_driver_commentary(raw_drivers)

    driver_tree_result = {
        "product_name": str(first_product_row.get("Product", "Unknown")),
        "drivers": enriched_drivers,
    }

    # Build product results list
    products_list = []
    for _, row in pl_df.iterrows():
        product_name = str(row.get("Product", "Unknown"))
        variance_val = row.get("Budget Variance %")
        budget_var = _safe_float(variance_val, None) if pd.notna(variance_val) else None

        # Determine status and action flag
        status = str(row.get("Status", "Healthy"))
        action_flag = str(row.get("Action Flag", "On Track"))

        # Watch: between 30-40% GM
        gm_pct = _safe_float(row.get("Gross Margin %", 0))
        if status == "Healthy" and gm_pct < 40:
            status = "Watch"

        products_list.append(
            ProductResult(
                rank=int(row.get("Rank", 0)),
                product=product_name,
                therapy_area=str(row.get("Therapy Area", "Unknown")),
                revenue=_safe_float(row.get("Revenue", 0)),
                gross_margin_pct=round(_safe_float(row.get("Gross Margin %", 0)), 2),
                ebitda_margin_pct=round(_safe_float(row.get("EBITDA Margin %", 0)), 2),
                budget_variance_pct=round(budget_var, 2) if budget_var is not None else None,
                status=status,
                action_flag=action_flag,
            )
        )

    # Build data structures for AI prompt
    products_for_ai = [p.model_dump() for p in products_list]
    budget_for_ai = request.budget_data
    sku_for_ai = request.sku_data

    # Generate AI narrative
    narrative = await generate_analysis_narrative(kpis_dict, products_for_ai, budget_for_ai, sku_for_ai)

    return AnalyseResponse(
        kpis=KPIs(**kpis_dict),
        products=products_list,
        driver_tree=DriverTreeResult(
            product_name=driver_tree_result["product_name"],
            drivers=[DriverEntry(**d) for d in driver_tree_result["drivers"]],
        ),
        ai_narrative=narrative,
    )


# ─── Scenario endpoint ────────────────────────────────────────────────────────

@app.post("/scenario", response_model=ScenarioResponse)
async def scenario(request: ScenarioRequest):
    """
    Run a what-if scenario for a single product.
    Adjusts price, volume, COGS and SGA by given percentages.
    """
    pl_df = pd.DataFrame(request.pl_data)

    # Find the requested product
    if "Product" not in pl_df.columns:
        raise HTTPException(status_code=400, detail="P&L data must contain a 'Product' column.")

    product_rows = pl_df[pl_df["Product"] == request.product_id]
    if product_rows.empty:
        raise HTTPException(
            status_code=400,
            detail=f"Product '{request.product_id}' not found in uploaded P&L data.",
        )

    base_row = product_rows.iloc[0].to_dict()

    # Ensure numeric
    for col in ["Revenue", "COGS", "Gross Profit", "SGA", "EBITDA"]:
        if col in base_row:
            base_row[col] = _safe_float(base_row[col], 0)

    result = compute_scenario(
        base_row,
        request.price_change_pct,
        request.volume_change_pct,
        request.cogs_change_pct,
        request.sga_change_pct,
    )

    narrative = await generate_scenario_narrative(
        result["original"], result["adjusted"], result["delta"]
    )

    return ScenarioResponse(
        original=ScenarioMetrics(**result["original"]),
        adjusted=ScenarioMetrics(**result["adjusted"]),
        delta=ScenarioDelta(**result["delta"]),
        narrative=narrative,
    )


# ─── Driver tree endpoint (per product) ─────────────────────────────────────

@app.post("/driver-tree/{product_name}")
async def get_driver_tree(product_name: str, request: AnalyseRequest):
    """Get driver tree decomposition for a specific product."""
    if not request.pl_data:
        raise HTTPException(status_code=400, detail="P&L data required.")

    pl_df = pd.DataFrame(request.pl_data)
    for col in ["Revenue", "COGS", "Gross Profit", "SGA", "EBITDA"]:
        if col in pl_df.columns:
            pl_df[col] = pd.to_numeric(pl_df[col], errors="coerce").fillna(0)

    pl_df = calculate_margins(pl_df)

    product_rows = pl_df[pl_df["Product"] == product_name] if "Product" in pl_df.columns else pd.DataFrame()
    if product_rows.empty:
        raise HTTPException(status_code=400, detail=f"Product '{product_name}' not found.")

    product_row = product_rows.iloc[0].to_dict()
    total_revenue = float(pl_df["Revenue"].sum()) if "Revenue" in pl_df.columns else 1

    portfolio_avg = {
        "avg_revenue": float(pl_df["Revenue"].mean()),
        "avg_gross_margin_pct": float(pl_df["Gross Margin %"].mean()),
        "avg_cogs_ratio": float(pl_df["COGS"].sum() / total_revenue) if total_revenue else 0.5,
        "avg_sga_ratio": float(pl_df["SGA"].sum() / total_revenue) if "SGA" in pl_df.columns else 0.15,
        "avg_ebitda_margin_pct": float(pl_df["EBITDA Margin %"].mean()) if "EBITDA Margin %" in pl_df.columns else 0,
    }

    raw_drivers = decompose_margin(product_row, portfolio_avg)
    enriched_drivers = await generate_driver_commentary(raw_drivers)

    return {
        "product_name": product_name,
        "drivers": enriched_drivers,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Pharma Profitability Intelligence API"}
