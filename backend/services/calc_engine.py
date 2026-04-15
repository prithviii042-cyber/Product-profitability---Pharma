"""
Calculation Engine for Pharma Product Profitability
Handles margin calculations, rankings, flags, KPIs and scenario modeling.
"""

import pandas as pd
from typing import Any


def calculate_margins(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute Gross Margin % and EBITDA Margin % from raw P&L data.
    Handles cases where columns already exist (recalculates for accuracy).
    """
    df = df.copy()

    # Ensure numeric types
    for col in ["Revenue", "COGS", "Gross Profit", "SGA", "EBITDA"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Compute Gross Profit if missing
    if "Gross Profit" not in df.columns or df["Gross Profit"].sum() == 0:
        df["Gross Profit"] = df["Revenue"] - df["COGS"]

    # Compute Gross Margin %
    df["Gross Margin %"] = df.apply(
        lambda r: (r["Gross Profit"] / r["Revenue"] * 100) if r["Revenue"] != 0 else 0,
        axis=1,
    )

    # Compute EBITDA if missing
    if "EBITDA" not in df.columns or df["EBITDA"].sum() == 0:
        df["EBITDA"] = df["Gross Profit"] - df.get("SGA", pd.Series([0] * len(df)))

    # Compute EBITDA Margin %
    df["EBITDA Margin %"] = df.apply(
        lambda r: (r["EBITDA"] / r["Revenue"] * 100) if r["Revenue"] != 0 else 0,
        axis=1,
    )

    return df


def rank_products(df: pd.DataFrame) -> pd.DataFrame:
    """
    Rank products by Gross Margin % descending. Adds a 'Rank' column.
    """
    df = df.copy()
    df = df.sort_values("Gross Margin %", ascending=False).reset_index(drop=True)
    df["Rank"] = df.index + 1
    return df


def flag_at_risk(df: pd.DataFrame) -> pd.DataFrame:
    """
    Flag products where Gross Margin % < 30% as 'At Risk'.
    Adds/updates 'Status' column.
    """
    df = df.copy()
    if "Status" not in df.columns:
        df["Status"] = "Healthy"

    df["Status"] = df.apply(
        lambda r: "At Risk" if r.get("Gross Margin %", 100) < 30 else r.get("Status", "Healthy"),
        axis=1,
    )
    return df


def flag_underperforming(df: pd.DataFrame) -> pd.DataFrame:
    """
    Flag products where budget variance % < -10% as 'Underperforming'.
    Expects a 'Variance %' or 'Budget Variance %' column.
    Adds/updates 'Action Flag' column.
    """
    df = df.copy()
    if "Action Flag" not in df.columns:
        df["Action Flag"] = "On Track"

    variance_col = None
    for col in ["Budget Variance %", "Variance %"]:
        if col in df.columns:
            variance_col = col
            break

    if variance_col:
        df["Action Flag"] = df.apply(
            lambda r: "Investigate" if pd.to_numeric(r.get(variance_col, 0), errors="coerce") < -10
            else r.get("Action Flag", "On Track"),
            axis=1,
        )

    return df


def get_portfolio_kpis(df: pd.DataFrame, budget_df: pd.DataFrame = None) -> dict:
    """
    Compute top-level portfolio KPIs:
    - total_revenue: sum of all product revenues
    - blended_gross_margin: revenue-weighted average gross margin %
    - at_risk_count: number of products with status 'At Risk'
    - largest_variance: product with worst budget variance
    """
    df = df.copy()

    # Total revenue
    total_revenue = float(df["Revenue"].sum()) if "Revenue" in df.columns else 0.0

    # Blended gross margin (revenue-weighted)
    if "Revenue" in df.columns and "Gross Profit" in df.columns and total_revenue > 0:
        blended_gross_margin = float(df["Gross Profit"].sum() / total_revenue * 100)
    elif "Gross Margin %" in df.columns:
        blended_gross_margin = float(df["Gross Margin %"].mean())
    else:
        blended_gross_margin = 0.0

    # At-risk count
    at_risk_count = 0
    if "Status" in df.columns:
        at_risk_count = int((df["Status"] == "At Risk").sum())
    elif "Gross Margin %" in df.columns:
        at_risk_count = int((df["Gross Margin %"] < 30).sum())

    # Largest variance
    largest_variance = {"product": "N/A", "variance": 0.0}
    if budget_df is not None and len(budget_df) > 0:
        budget_copy = budget_df.copy()
        # Calculate variance if not present
        if "Variance %" not in budget_copy.columns and "Budget" in budget_copy.columns and "Actual" in budget_copy.columns:
            budget_copy["Budget"] = pd.to_numeric(budget_copy["Budget"], errors="coerce").fillna(0)
            budget_copy["Actual"] = pd.to_numeric(budget_copy["Actual"], errors="coerce").fillna(0)
            budget_copy["Variance %"] = budget_copy.apply(
                lambda r: ((r["Actual"] - r["Budget"]) / r["Budget"] * 100)
                if r["Budget"] != 0 else 0,
                axis=1,
            )
        if "Variance %" in budget_copy.columns:
            # Get worst variance by product (aggregate if multiple metrics)
            budget_agg = (
                budget_copy.groupby("Product")["Variance %"].mean().reset_index()
                if "Product" in budget_copy.columns
                else budget_copy
            )
            worst_idx = budget_agg["Variance %"].idxmin()
            worst_row = budget_agg.iloc[worst_idx]
            product_name = worst_row.get("Product", "Unknown") if "Product" in worst_row.index else "Unknown"
            largest_variance = {
                "product": str(product_name),
                "variance": float(worst_row["Variance %"]),
            }

    return {
        "total_revenue": total_revenue,
        "blended_gross_margin": blended_gross_margin,
        "at_risk_count": at_risk_count,
        "largest_variance": largest_variance,
    }


def compute_scenario(
    base_row: dict,
    price_chg: float,
    vol_chg: float,
    cogs_chg: float,
    sga_chg: float,
) -> dict:
    """
    Compute original and adjusted P&L for a single product given percentage changes.

    price_chg, vol_chg, cogs_chg, sga_chg are all expressed as percentage points
    (e.g., 5 means +5%).

    Revenue effect: price * volume combined (multiplicative)
    COGS effect: volume passes through + cogs_chg on unit cost
    SGA effect: sga_chg on base SGA
    """
    # Extract base values
    base_revenue = float(base_row.get("Revenue", 0))
    base_cogs = float(base_row.get("COGS", 0))
    base_gross_profit = float(base_row.get("Gross Profit", base_revenue - base_cogs))
    base_sga = float(base_row.get("SGA", 0))
    base_ebitda = float(base_row.get("EBITDA", base_gross_profit - base_sga))

    # Compute adjusted values
    price_factor = 1 + price_chg / 100
    vol_factor = 1 + vol_chg / 100
    cogs_factor = 1 + cogs_chg / 100
    sga_factor = 1 + sga_chg / 100

    adj_revenue = base_revenue * price_factor * vol_factor
    adj_cogs = base_cogs * vol_factor * cogs_factor
    adj_gross_profit = adj_revenue - adj_cogs
    adj_sga = base_sga * sga_factor
    adj_ebitda = adj_gross_profit - adj_sga

    # Safe margin calculations
    def safe_margin(profit, revenue):
        return (profit / revenue * 100) if revenue != 0 else 0.0

    original = {
        "revenue": base_revenue,
        "gross_profit": base_gross_profit,
        "gross_margin_pct": safe_margin(base_gross_profit, base_revenue),
        "ebitda": base_ebitda,
        "ebitda_margin_pct": safe_margin(base_ebitda, base_revenue),
    }

    adjusted = {
        "revenue": adj_revenue,
        "gross_profit": adj_gross_profit,
        "gross_margin_pct": safe_margin(adj_gross_profit, adj_revenue),
        "ebitda": adj_ebitda,
        "ebitda_margin_pct": safe_margin(adj_ebitda, adj_revenue),
    }

    def pct_change(new_val, old_val):
        return ((new_val - old_val) / abs(old_val) * 100) if old_val != 0 else 0.0

    delta = {
        "revenue_delta": adj_revenue - base_revenue,
        "revenue_delta_pct": pct_change(adj_revenue, base_revenue),
        "gross_profit_delta": adj_gross_profit - base_gross_profit,
        "gross_profit_delta_pct": pct_change(adj_gross_profit, base_gross_profit),
        "gross_margin_delta": adjusted["gross_margin_pct"] - original["gross_margin_pct"],
        "ebitda_delta": adj_ebitda - base_ebitda,
        "ebitda_delta_pct": pct_change(adj_ebitda, base_ebitda),
        "ebitda_margin_delta": adjusted["ebitda_margin_pct"] - original["ebitda_margin_pct"],
    }

    return {"original": original, "adjusted": adjusted, "delta": delta}
