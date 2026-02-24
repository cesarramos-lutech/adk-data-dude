# Playground dashboard agent: query BigQuery, build charts, recommend.
from dashboard_agent.agent import dashboard_agent

root_agent = dashboard_agent

__all__ = ["dashboard_agent", "root_agent"]
