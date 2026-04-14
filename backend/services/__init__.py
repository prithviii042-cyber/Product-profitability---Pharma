# Services package for Pharma Profitability Intelligence
from .calc_engine import (
    calculate_margins,
    rank_products,
    flag_at_risk,
    flag_underperforming,
    get_portfolio_kpis,
    compute_scenario,
)
from .driver_tree import decompose_margin
from .ai_engine import (
    generate_analysis_narrative,
    generate_scenario_narrative,
    generate_driver_commentary,
)

__all__ = [
    "calculate_margins",
    "rank_products",
    "flag_at_risk",
    "flag_underperforming",
    "get_portfolio_kpis",
    "compute_scenario",
    "decompose_margin",
    "generate_analysis_narrative",
    "generate_scenario_narrative",
    "generate_driver_commentary",
]
