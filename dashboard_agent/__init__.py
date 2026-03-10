# Data Copilot: multi-agent router with quick_answer, analysis, and deep_analysis sub-agents.
from dashboard_agent.agent import dashboard_agent

root_agent = dashboard_agent

__all__ = ["dashboard_agent", "root_agent"]
