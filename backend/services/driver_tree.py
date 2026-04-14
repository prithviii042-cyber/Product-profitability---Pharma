"""
Driver Tree Decomposition for Pharma Product Profitability.
Decomposes margin deviation from portfolio average into key value drivers.
"""

from typing import Any


def decompose_margin(product_data: dict, portfolio_avg: dict) -> list[dict]:
    """
    Decompose a product's gross margin deviation from the portfolio average
    into five key drivers: Price, Volume, Mix, COGS, and SGA effects.

    Args:
        product_data: dict with product P&L fields (Revenue, COGS, Gross Profit,
                      Gross Margin %, SGA, EBITDA, EBITDA Margin %, Therapy Area, etc.)
        portfolio_avg: dict with average values across the portfolio
                       (avg_revenue, avg_gross_margin_pct, avg_cogs_ratio,
                        avg_sga_ratio, avg_ebitda_margin_pct)

    Returns:
        List of driver dicts: { driver, impact_value, impact_pct, direction }
    """
    revenue = float(product_data.get("Revenue", 0))
    cogs = float(product_data.get("COGS", 0))
    gross_profit = float(product_data.get("Gross Profit", revenue - cogs))
    sga = float(product_data.get("SGA", 0))
    ebitda = float(product_data.get("EBITDA", gross_profit - sga))
    gross_margin_pct = float(product_data.get("Gross Margin %", (gross_profit / revenue * 100) if revenue else 0))
    ebitda_margin_pct = float(product_data.get("EBITDA Margin %", (ebitda / revenue * 100) if revenue else 0))

    avg_revenue = float(portfolio_avg.get("avg_revenue", revenue))
    avg_gm_pct = float(portfolio_avg.get("avg_gross_margin_pct", gross_margin_pct))
    avg_cogs_ratio = float(portfolio_avg.get("avg_cogs_ratio", (cogs / revenue) if revenue else 0.5))
    avg_sga_ratio = float(portfolio_avg.get("avg_sga_ratio", (sga / revenue) if revenue else 0.15))
    avg_ebitda_pct = float(portfolio_avg.get("avg_ebitda_margin_pct", ebitda_margin_pct))

    # --- Price Effect ---
    # Proxy: selling price premium/discount vs portfolio average
    # Measured as revenue per unit relative efficiency
    # We approximate using gross margin deviation attributable to price
    # Higher GM% vs average implies favorable pricing power
    gm_deviation = gross_margin_pct - avg_gm_pct
    cogs_ratio = (cogs / revenue) if revenue else avg_cogs_ratio
    cogs_deviation = avg_cogs_ratio - cogs_ratio  # positive = product has lower COGS ratio

    # Price effect: portion of margin deviation NOT explained by COGS
    price_impact_pct = gm_deviation - (cogs_deviation * 100)
    price_impact_pct = max(min(price_impact_pct, 20), -20)  # cap for display
    price_impact_value = revenue * price_impact_pct / 100

    # --- Volume Effect ---
    # Revenue scale vs portfolio average
    revenue_scale = (revenue - avg_revenue) / avg_revenue if avg_revenue else 0
    # Operating leverage: larger products benefit from fixed cost absorption
    # Volume effect on margin: roughly 40% of revenue scale difference feeds into margin
    volume_impact_pct = revenue_scale * 0.4 * avg_gm_pct * 0.2
    volume_impact_pct = max(min(volume_impact_pct, 10), -10)
    volume_impact_value = revenue * volume_impact_pct / 100

    # --- Mix Effect ---
    # Therapy area premium: Oncology > Cardiology > CNS (typical pharma pricing dynamics)
    therapy_area = str(product_data.get("Therapy Area", "")).strip()
    therapy_premiums = {
        "Oncology": 8.0,
        "Cardiology": 2.0,
        "CNS": -3.0,
    }
    therapy_base = therapy_premiums.get(therapy_area, 0.0)
    # Scale by how much the product deviates from its therapy area norm
    mix_impact_pct = therapy_base * 0.3
    mix_impact_pct = max(min(mix_impact_pct, 8), -8)
    mix_impact_value = revenue * mix_impact_pct / 100

    # --- COGS Effect ---
    # Direct COGS efficiency vs portfolio
    cogs_impact_pct = cogs_deviation * 100  # positive = better (lower COGS ratio)
    cogs_impact_pct = max(min(cogs_impact_pct, 25), -25)
    cogs_impact_value = revenue * cogs_impact_pct / 100

    # --- SGA Effect ---
    # SGA efficiency vs portfolio average
    sga_ratio = (sga / revenue) if revenue else avg_sga_ratio
    sga_deviation = avg_sga_ratio - sga_ratio  # positive = product spends less on SGA
    sga_impact_pct = sga_deviation * 100
    sga_impact_pct = max(min(sga_impact_pct, 15), -15)
    sga_impact_value = revenue * sga_impact_pct / 100

    def direction(impact_pct: float) -> str:
        if impact_pct >= 0.5:
            return "Positive"
        elif impact_pct <= -0.5:
            return "Negative"
        return "Neutral"

    drivers = [
        {
            "driver": "Price Realization",
            "impact_value": round(price_impact_value, 2),
            "impact_pct": round(price_impact_pct, 2),
            "direction": direction(price_impact_pct),
        },
        {
            "driver": "Volume / Scale",
            "impact_value": round(volume_impact_value, 2),
            "impact_pct": round(volume_impact_pct, 2),
            "direction": direction(volume_impact_pct),
        },
        {
            "driver": "Product Mix",
            "impact_value": round(mix_impact_value, 2),
            "impact_pct": round(mix_impact_pct, 2),
            "direction": direction(mix_impact_pct),
        },
        {
            "driver": "COGS Efficiency",
            "impact_value": round(cogs_impact_value, 2),
            "impact_pct": round(cogs_impact_pct, 2),
            "direction": direction(cogs_impact_pct),
        },
        {
            "driver": "SGA Leverage",
            "impact_value": round(sga_impact_value, 2),
            "impact_pct": round(sga_impact_pct, 2),
            "direction": direction(sga_impact_pct),
        },
    ]

    return drivers
