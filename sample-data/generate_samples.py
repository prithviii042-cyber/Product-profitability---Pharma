"""
Generate realistic sample pharma data for the EY Pharma Profitability Intelligence app.

Produces:
  - sample_pl.xlsx     — 12 products, P&L statement
  - sample_budget.xlsx — 12 products, Budget vs Actual (Q1 FY2025)
  - sample_sku.xlsx    — 20 SKUs across 12 products

Run: python generate_samples.py
"""

import os
import pandas as pd
import random

# ── Seed for reproducibility ──────────────────────────────────────────────────
random.seed(42)

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Product master ────────────────────────────────────────────────────────────
PRODUCTS = [
    # Oncology — high revenue, high margins
    {"product": "Oncovir 50mg",   "therapy": "Oncology",   "revenue": 780.0, "gm_pct": 68.5},
    {"product": "Lumitab 100mg",  "therapy": "Oncology",   "revenue": 620.0, "gm_pct": 63.2},
    {"product": "Nexagen 200mg",  "therapy": "Oncology",   "revenue": 430.0, "gm_pct": 57.8},
    {"product": "Carbolin 75mg",  "therapy": "Oncology",   "revenue": 195.0, "gm_pct": 28.4},  # At Risk

    # Cardiology — mid revenue, mid margins
    {"product": "Cardizest 10mg", "therapy": "Cardiology", "revenue": 510.0, "gm_pct": 52.1},
    {"product": "Statinex 20mg",  "therapy": "Cardiology", "revenue": 360.0, "gm_pct": 47.6},
    {"product": "Hyponorm 5mg",   "therapy": "Cardiology", "revenue": 280.0, "gm_pct": 41.3},
    {"product": "Vasodril 40mg",  "therapy": "Cardiology", "revenue": 155.0, "gm_pct": 36.9},

    # CNS — lower revenue, mixed margins
    {"product": "Neuroplex 25mg", "therapy": "CNS",        "revenue": 210.0, "gm_pct": 44.7},
    {"product": "Serozide 50mg",  "therapy": "CNS",        "revenue": 140.0, "gm_pct": 38.2},
    {"product": "Cognivex 10mg",  "therapy": "CNS",        "revenue": 90.0,  "gm_pct": 29.1},  # At Risk
    {"product": "Moodstab 15mg",  "therapy": "CNS",        "revenue": 55.0,  "gm_pct": 33.5},
]

# Sanity check: exactly 2 products have GM% < 30%
at_risk = [p for p in PRODUCTS if p["gm_pct"] < 30]
assert len(at_risk) == 2, f"Expected 2 At Risk products, got {len(at_risk)}"


# ── Build P&L DataFrame ───────────────────────────────────────────────────────

def build_pl_df(products):
    rows = []
    for p in products:
        revenue = round(p["revenue"], 2)
        gm_pct = p["gm_pct"]
        gross_profit = round(revenue * gm_pct / 100, 2)
        cogs = round(revenue - gross_profit, 2)
        # SGA: 12-18% of revenue for pharma, higher for smaller products
        sga_pct = 18.0 - (revenue / 800) * 6  # ranges ~17% small to ~11.5% large
        sga = round(revenue * sga_pct / 100, 2)
        ebitda = round(gross_profit - sga, 2)
        ebitda_margin = round(ebitda / revenue * 100, 2)
        gm_pct_rounded = round(gm_pct, 2)

        rows.append({
            "Product":           p["product"],
            "Therapy Area":      p["therapy"],
            "Revenue":           revenue,
            "COGS":              cogs,
            "Gross Profit":      gross_profit,
            "Gross Margin %":    gm_pct_rounded,
            "SGA":               sga,
            "EBITDA":            ebitda,
            "EBITDA Margin %":   ebitda_margin,
        })
    return pd.DataFrame(rows)


# ── Build Budget DataFrame ────────────────────────────────────────────────────

def build_budget_df(products):
    """
    Budget vs Actual for Q1 FY2025.
    Exactly 3 products have variance worse than -15%.
    Mix of positive and negative for realism.
    """
    # Assign variance profiles
    # Exactly 3 products → variance < -15%: Carbolin 75mg, Cognivex 10mg, Moodstab 15mg
    variance_profiles = {
        "Oncovir 50mg":    5.2,    # outperforming
        "Lumitab 100mg":   2.8,    # slight positive
        "Nexagen 200mg":   -4.5,   # minor miss
        "Carbolin 75mg":   -18.3,  # At Risk, big miss
        "Cardizest 10mg":  3.1,    # positive
        "Statinex 20mg":   -6.7,   # moderate miss
        "Hyponorm 5mg":    1.4,    # small positive
        "Vasodril 40mg":   -9.8,   # close to threshold
        "Neuroplex 25mg":  -2.1,   # slight miss
        "Serozide 50mg":   4.6,    # positive
        "Cognivex 10mg":   -21.5,  # At Risk, severe miss
        "Moodstab 15mg":   -16.2,  # 3rd product > -15%
    }

    # Sanity check
    bad = sum(1 for v in variance_profiles.values() if v < -15)
    assert bad == 3, f"Expected 3 products with variance < -15%, got {bad}"

    rows = []
    for p in products:
        name = p["product"]
        var_pct = variance_profiles.get(name, 0.0)
        budget_rev = round(p["revenue"] / 4, 2)  # quarterly
        actual_rev = round(budget_rev * (1 + var_pct / 100), 2)
        variance = round(actual_rev - budget_rev, 2)

        rows.append({
            "Product":     name,
            "Metric":      "Revenue",
            "Budget":      budget_rev,
            "Actual":      actual_rev,
            "Variance":    variance,
            "Variance %":  round(var_pct, 2),
            "Period":      "Q1 FY2025",
        })

    return pd.DataFrame(rows)


# ── Build SKU DataFrame ───────────────────────────────────────────────────────

def build_sku_df(products):
    """
    20 SKUs across 12 products.
    Each product has 1-2 SKUs.
    API Cost is typically 40-60% of Total COGS.
    """
    # Products with 2 SKUs (8 products → 8 extra SKUs = 20 total)
    dual_sku_products = {
        "Oncovir 50mg", "Lumitab 100mg", "Cardizest 10mg",
        "Statinex 20mg", "Neuroplex 25mg", "Hyponorm 5mg",
        "Nexagen 200mg", "Serozide 50mg",
    }
    # That gives 8*2 + 4*1 = 20 SKUs ✓

    rows = []
    for p in products:
        name = p["product"]
        revenue = p["revenue"]
        gm_pct = p["gm_pct"]
        cogs_per_unit_base = (revenue * (1 - gm_pct / 100)) / revenue  # total COGS ratio
        selling_price = round(random.uniform(850, 12000), 2)  # in ₹/unit

        def build_sku_row(sku_suffix, dose_factor=1.0):
            sp = round(selling_price * dose_factor, 2)
            total_cogs = round(sp * (1 - gm_pct / 100) * random.uniform(0.95, 1.05), 2)
            # API cost: 40-60% of COGS
            api_pct = random.uniform(0.42, 0.58)
            api_cost = round(total_cogs * api_pct, 2)
            packaging = round(total_cogs * random.uniform(0.15, 0.22), 2)
            distribution = round(total_cogs * random.uniform(0.08, 0.14), 2)
            other = round(max(0, total_cogs - api_cost - packaging - distribution), 2)
            # Recalculate total for consistency
            total_cogs = round(api_cost + packaging + distribution + other, 2)
            contribution = round(sp - total_cogs, 2)
            return {
                "SKU":                 f"{name.replace(' ', '_')}_{sku_suffix}",
                "Product":             name,
                "API Cost":            api_cost,
                "Packaging Cost":      packaging,
                "Distribution Cost":   distribution,
                "Other COGS":          other,
                "Total COGS":          total_cogs,
                "Selling Price":       sp,
                "Contribution Margin": contribution,
            }

        rows.append(build_sku_row("A"))
        if name in dual_sku_products:
            rows.append(build_sku_row("B", dose_factor=round(random.uniform(0.6, 0.85), 2)))

    df = pd.DataFrame(rows)
    assert len(df) == 20, f"Expected 20 SKUs, got {len(df)}"
    return df


# ── Write Excel files ─────────────────────────────────────────────────────────

def write_xlsx(df: pd.DataFrame, filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Data")
    print(f"  Written: {path}  ({len(df)} rows, {len(df.columns)} columns)")
    return path


def main():
    print("\nGenerating pharma sample data...\n")

    pl_df = build_pl_df(PRODUCTS)
    budget_df = build_budget_df(PRODUCTS)
    sku_df = build_sku_df(PRODUCTS)

    print("P&L Summary:")
    print(f"  Products: {len(pl_df)}")
    print(f"  At Risk (GM% < 30%): {(pl_df['Gross Margin %'] < 30).sum()}")
    print(f"  Total Revenue: INR {pl_df['Revenue'].sum():.1f}Cr")
    print(f"  Blended GM%: {(pl_df['Gross Profit'].sum() / pl_df['Revenue'].sum() * 100):.1f}%")

    print("\nBudget Summary:")
    miss_15 = (budget_df["Variance %"] < -15).sum()
    print(f"  Products with variance worse than -15%: {miss_15}")

    print("\nSKU Summary:")
    print(f"  SKUs: {len(sku_df)}")
    avg_api_share = (sku_df["API Cost"] / sku_df["Total COGS"]).mean()
    print(f"  Avg API cost share of COGS: {avg_api_share:.1%}")

    print("\nWriting Excel files...")
    write_xlsx(pl_df, "sample_pl.xlsx")
    write_xlsx(budget_df, "sample_budget.xlsx")
    write_xlsx(sku_df, "sample_sku.xlsx")

    print("\nDone! Upload these files in the app to get started.\n")


if __name__ == "__main__":
    main()
