"""Query audit helpers for SQL trust, complexity, and recoverable errors."""

from __future__ import annotations

import re
from typing import Any

from google.adk.tools.bigquery.client import get_bigquery_client
from google.cloud import bigquery

USER_AGENT = "playground-dashboard-agent"
TABLE_RE = re.compile(r"`([^`]+)`")
LIMIT_RE = re.compile(r"\blimit\s+(\d+)\b", re.IGNORECASE)
JOIN_RE = re.compile(r"\bjoin\b", re.IGNORECASE)


def classify_error(message: str) -> str:
    """Return a stable, UI-friendly error category."""
    lower = (message or "").lower()
    if any(token in lower for token in ["syntax error", "parse error", "invalid query"]):
        return "sql_syntax"
    if any(token in lower for token in ["not found", "not found: table", "404"]):
        return "not_found"
    if any(token in lower for token in ["permission", "access denied", "forbidden", "403"]):
        return "permission"
    if any(token in lower for token in ["timeout", "deadline", "timed out"]):
        return "timeout"
    if any(token in lower for token in ["missing", "environment variable", "credentials"]):
        return "config"
    if any(token in lower for token in ["unavailable", "connection", "503"]):
        return "backend_unavailable"
    return "unknown"


def _limit_value(sql: str) -> int | None:
    match = LIMIT_RE.search(sql or "")
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None


def _complexity(join_count: int, limit_value: int | None, estimated_bytes: int | None) -> str:
    if join_count >= 3:
        return "complex"
    if estimated_bytes and estimated_bytes > 1_000_000_000:
        return "complex"
    if join_count >= 1 or limit_value is None or (limit_value and limit_value > 1000):
        return "moderate"
    return "simple"


def _warnings(sql: str, join_count: int, limit_value: int | None) -> list[str]:
    warnings: list[str] = []
    if limit_value is None:
        warnings.append("No LIMIT detected.")
    elif limit_value > 1000:
        warnings.append(f"High row limit detected: {limit_value}.")
    if join_count >= 3:
        warnings.append(f"Complex query: {join_count} JOINs detected.")
    if "select *" in sql.lower():
        warnings.append("SELECT * detected; prefer explicit columns.")
    return warnings


def build_query_audit(sql: str, compute_project_id: str | None = None) -> dict[str, Any]:
    """Build a JSON-serializable query audit with lightweight heuristics and dry-run stats."""
    normalized_sql = (sql or "").strip()
    referenced_tables = sorted(set(TABLE_RE.findall(normalized_sql)))
    join_count = len(JOIN_RE.findall(normalized_sql))
    limit_value = _limit_value(normalized_sql)
    estimated_bytes: int | None = None
    dry_run_error = ""

    if normalized_sql and compute_project_id:
        try:
            client = get_bigquery_client(
                project=compute_project_id,
                credentials=None,
                user_agent=USER_AGENT,
            )
            job_config = bigquery.QueryJobConfig(dry_run=True, use_query_cache=False)
            job = client.query(normalized_sql, job_config=job_config)
            estimated_bytes = int(job.total_bytes_processed or 0)
        except Exception as exc:  # Dry run should never block the user flow.
            dry_run_error = str(exc)

    estimated_mb = round(estimated_bytes / 1_000_000, 2) if estimated_bytes is not None else None
    warnings = _warnings(normalized_sql, join_count, limit_value)
    if dry_run_error:
        warnings.append("Dry run estimate unavailable.")

    return {
        "sql": normalized_sql,
        "referenced_tables": referenced_tables,
        "join_count": join_count,
        "has_limit": limit_value is not None,
        "limit_value": limit_value,
        "estimated_bytes": estimated_bytes,
        "estimated_mb": estimated_mb,
        "cost_note": (
            f"Estimated scan: {estimated_mb} MB."
            if estimated_mb is not None
            else "Estimated scan unavailable."
        ),
        "complexity": _complexity(join_count, limit_value, estimated_bytes),
        "warnings": warnings,
    }


def merge_execution_result(
    audit: dict[str, Any] | None,
    *,
    rows: list[dict[str, Any]] | None = None,
    error_message: str = "",
    elapsed_ms: int | None = None,
    job_id: str = "",
) -> dict[str, Any]:
    """Merge execution outcome into an existing audit payload."""
    merged = dict(audit or {})
    if elapsed_ms is not None:
        merged["elapsed_ms"] = elapsed_ms
    if job_id:
        merged["job_id"] = job_id
    if error_message:
        merged["error_message"] = error_message
        merged["error_category"] = classify_error(error_message)
    elif rows is not None and len(rows) == 0:
        merged["error_category"] = "empty_result"
        merged.setdefault("warnings", []).append("Query returned no rows.")
    return merged
