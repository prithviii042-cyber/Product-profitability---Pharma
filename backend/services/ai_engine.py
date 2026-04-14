"""
AI Engine for Pharma Product Profitability.
Uses Anthropic's Claude to generate executive-ready financial narratives.
"""

import json
import os
import anthropic
from typing import Any

# Initialise client lazily to respect environment loading order
_client: anthropic.Anthropic | None = None

MODEL = "claude-opus-4-5"
MAX_TOKENS = 2048

SYSTEM_PROMPT = (
    "You are a senior pharma finance analyst advising a CFO. "
    "Your tone is direct, precise, and executive-ready. "
    "Avoid jargon. Use numbers to support every claim. "
    "Structure your response in three sections: "
    "1) Portfolio Health Summary (3-4 sentences) "
    "2) Top 3 Issues requiring CFO attention (bullet points with numbers) "
    "3) Recommended Actions (bullet points, commercially actionable)"
)


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def _call_claude(user_prompt: str, system: str = SYSTEM_PROMPT) -> str:
    """
    Core wrapper to call Claude and return the text response.
    """
    client = _get_client()
    message = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text


async def infer_upload_schema(
    headers: list[str],
    upload_type: str,
    canonical_fields: list[str],
) -> dict[str, str]:
    """Attempt to infer schema mappings for upload headers using AI."""
    system = (
        "You are a data ingestion assistant. Your job is to map uploaded file column headers "
        "to canonical field names for a pharma profitability tool."
    )

    header_list = "\n".join([f"- {h}" for h in headers])
    expected_list = "\n".join([f"- {field}" for field in canonical_fields])
    user_prompt = f"""The user uploaded a {upload_type} file with these headers:\n{header_list}\n\n"""
    user_prompt += f"""The tool expects these canonical fields:\n{expected_list}\n\n"""
    user_prompt += (
        "Return a valid JSON object mapping the actual header names to canonical field names. "
        "Only include mappings you can confidently infer. Example: {\"Product Name\": \"Product\"}. "
        "Do not include any extra text."
    )

    try:
        response = _call_claude(user_prompt, system=system)
        mapping = json.loads(response.strip())
        if isinstance(mapping, dict):
            return {k: v for k, v in mapping.items() if v in canonical_fields}
    except Exception:
        return {}

    return {}


async def generate_analysis_narrative(
    kpis: dict,
    products: list[dict],
    budget_data: list[dict] | None,
    sku_data: list[dict] | None,
) -> str:
    """
    Build a dynamic prompt from portfolio data and call Claude for executive analysis.
    Returns the narrative string.
    """
    total_revenue = kpis.get("total_revenue", 0)
    blended_gm = kpis.get("blended_gross_margin", 0)
    at_risk_count = kpis.get("at_risk_count", 0)
    largest_variance = kpis.get("largest_variance", {})

    # Top 3 and bottom 3 products by gross margin
    sorted_products = sorted(products, key=lambda x: x.get("gross_margin_pct", 0), reverse=True)
    top_3 = sorted_products[:3]
    bottom_3 = sorted_products[-3:]

    top_3_text = "\n".join(
        [f"  - {p['product']}: GM% {p.get('gross_margin_pct', 0):.1f}%, Revenue ₹{p.get('revenue', 0):.1f}Cr" for p in top_3]
    )
    bottom_3_text = "\n".join(
        [f"  - {p['product']}: GM% {p.get('gross_margin_pct', 0):.1f}%, Revenue ₹{p.get('revenue', 0):.1f}Cr" for p in bottom_3]
    )

    at_risk_products = [p for p in products if p.get("status") == "At Risk"]
    at_risk_text = ", ".join([p["product"] for p in at_risk_products]) if at_risk_products else "None"

    budget_text = ""
    if budget_data and len(budget_data) > 0:
        underperforming = [r for r in budget_data if float(r.get("Variance %", r.get("variance_pct", 0))) < -10]
        if underperforming:
            budget_text = f"\nBudget underperformers (variance worse than -10%): {', '.join([str(r.get('Product', r.get('product', 'Unknown'))) for r in underperforming[:3]])}"

    sku_text = ""
    if sku_data and len(sku_data) > 0:
        high_api = [r for r in sku_data if float(r.get("API Cost", 0)) / max(float(r.get("Total COGS", 1)), 1) > 0.6]
        if high_api:
            sku_text = f"\nSKUs with high API cost concentration (>60% of COGS): {len(high_api)} SKUs flagged."

    user_prompt = f"""Analyse this pharma portfolio and provide CFO-ready insights:

PORTFOLIO OVERVIEW:
- Total Portfolio Revenue: ₹{total_revenue:.1f} Crores
- Blended Gross Margin: {blended_gm:.1f}%
- Products At Risk (GM% < 30%): {at_risk_count} products — {at_risk_text}
- Worst Budget Variance: {largest_variance.get('product', 'N/A')} at {largest_variance.get('variance', 0):.1f}%

TOP PERFORMING PRODUCTS (by Gross Margin %):
{top_3_text}

LOWEST PERFORMING PRODUCTS (by Gross Margin %):
{bottom_3_text}
{budget_text}
{sku_text}

Provide your three-section analysis now. Be specific with numbers. Flag what needs immediate CFO attention."""

    return _call_claude(user_prompt)


async def generate_scenario_narrative(original: dict, adjusted: dict, delta: dict) -> str:
    """
    Generate a 2-3 sentence narrative explaining the scenario impact.
    """
    system = (
        "You are a senior pharma finance analyst. "
        "Describe the financial impact of a scenario change in 2-3 concise, executive-ready sentences. "
        "Use specific numbers. State whether the change improves or worsens profitability."
    )

    user_prompt = f"""A pricing/cost scenario has been modelled for a pharma product. Summarise the impact:

BASE CASE:
- Revenue: ₹{original.get('revenue', 0):.1f}Cr
- Gross Profit: ₹{original.get('gross_profit', 0):.1f}Cr
- Gross Margin: {original.get('gross_margin_pct', 0):.1f}%
- EBITDA: ₹{original.get('ebitda', 0):.1f}Cr
- EBITDA Margin: {original.get('ebitda_margin_pct', 0):.1f}%

SCENARIO CASE:
- Revenue: ₹{adjusted.get('revenue', 0):.1f}Cr
- Gross Profit: ₹{adjusted.get('gross_profit', 0):.1f}Cr
- Gross Margin: {adjusted.get('gross_margin_pct', 0):.1f}%
- EBITDA: ₹{adjusted.get('ebitda', 0):.1f}Cr
- EBITDA Margin: {adjusted.get('ebitda_margin_pct', 0):.1f}%

DELTA:
- Revenue Change: ₹{delta.get('revenue_delta', 0):.1f}Cr ({delta.get('revenue_delta_pct', 0):.1f}%)
- Gross Profit Change: ₹{delta.get('gross_profit_delta', 0):.1f}Cr ({delta.get('gross_profit_delta_pct', 0):.1f}%)
- EBITDA Change: ₹{delta.get('ebitda_delta', 0):.1f}Cr ({delta.get('ebitda_delta_pct', 0):.1f}%)

Write 2-3 sentences summarising this scenario impact for the CFO."""

    return _call_claude(user_prompt, system=system)


async def generate_driver_commentary(driver_list: list[dict]) -> list[dict]:
    """
    Generate one-line commentary for each margin driver.
    Returns the driver list enriched with a 'commentary' field.
    """
    system = (
        "You are a pharma finance analyst. "
        "For each margin driver provided, write exactly one concise sentence (max 15 words) "
        "explaining its impact on profitability. Be direct and use the sign of the impact."
    )

    drivers_text = "\n".join(
        [f"- {d['driver']}: impact {d['impact_pct']:+.1f}% ({d['direction']})" for d in driver_list]
    )

    user_prompt = f"""For each of these margin drivers, provide a one-line commentary:

{drivers_text}

Respond with exactly one line per driver in this format:
Driver Name: [commentary]"""

    response = _call_claude(user_prompt, system=system)

    # Parse response lines to map back to drivers
    commentary_map = {}
    for line in response.strip().split("\n"):
        line = line.strip()
        if ":" in line:
            parts = line.split(":", 1)
            key = parts[0].strip()
            value = parts[1].strip() if len(parts) > 1 else ""
            commentary_map[key] = value

    enriched = []
    for d in driver_list:
        d_copy = dict(d)
        # Try exact match first, then partial match
        commentary = commentary_map.get(d["driver"], "")
        if not commentary:
            for key, val in commentary_map.items():
                if d["driver"].lower() in key.lower() or key.lower() in d["driver"].lower():
                    commentary = val
                    break
        if not commentary:
            # Fallback based on direction
            if d["direction"] == "Positive":
                commentary = f"Favorable {d['driver'].lower()} contributes positively to margin."
            elif d["direction"] == "Negative":
                commentary = f"Adverse {d['driver'].lower()} is dragging margin below portfolio average."
            else:
                commentary = f"{d['driver']} is broadly in line with portfolio norms."
        d_copy["commentary"] = commentary
        enriched.append(d_copy)

    return enriched
