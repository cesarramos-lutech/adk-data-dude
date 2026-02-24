# Playground — Dashboard Agent

**Try and break things.** This is a playground data agent: it queries BigQuery (look_ecommerce), builds dynamic dashboards (Altair/Vega-Lite), and gives short business recommendations. It reuses the same GCP project, BigQuery dataset, and Gemini (Vertex) as the [data-science-agent](../data-science-agent).

## Setup

1. **Copy env from data-science-agent** (recommended for look_ecommerce):
   ```bash
   cp ../data-science-agent/.env .env
   ```
   Or copy `.env.example` to `.env` and set:
   - `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`
   - `BQ_COMPUTE_PROJECT_ID`, `BQ_DATA_PROJECT_ID`, `BQ_DATASET_ID`
   - `DATASET_CONFIG_FILE=./look_ecommerce_dataset_config.json`
   - `ROOT_AGENT_MODEL`, `BIGQUERY_AGENT_MODEL`, `BASELINE_NL2SQL_MODEL` (e.g. `gemini-2.5-pro`)

2. **Virtual environment and install**

   **Option A — uv (recommended)**  
   `uv sync` creates a `.venv` in the project and installs deps. Use it with or without activating:
   ```bash
   cd gcp-data-agents/playground
   uv sync
   # Run with uv (no need to activate):
   uv run adk web
   uv run adk run dashboard_agent
   uv run uvicorn main:app --host 0.0.0.0 --port 8081
   ```
   Or activate the venv and run directly:
   ```bash
   source .venv/bin/activate   # macOS/Linux
   # .venv\Scripts\activate   # Windows (Git Bash or cmd)
   adk web
   adk run dashboard_agent
   uvicorn main:app --host 0.0.0.0 --port 8081
   ```

   **Option B — standard venv + pip**
   ```bash
   cd gcp-data-agents/playground
   python3 -m venv .venv
   source .venv/bin/activate   # macOS/Linux
   # .venv\Scripts\activate   # Windows
   pip install -e .
   adk web
   adk run dashboard_agent
   uvicorn main:app --host 0.0.0.0 --port 8081
   ```

## Frontend (optional)

A React UI for the dashboard agent lives in `frontend/`. It talks to the backend over HTTP.

1. **Start the backend** (from `playground/`): `adk web` or `uvicorn main:app --port 8000`.
2. **Start the frontend** (from `playground/frontend/`):
   ```bash
   cd frontend
   npm install --legacy-peer-deps
   npm install lodash --legacy-peer-deps   # if needed for Looker components
   npx vite --mode dev
   ```
3. Open http://localhost:5173. The app proxies `/api` to the backend at http://localhost:8000.

## Dataset

Uses **look_ecommerce** (Looker ecommerce sample). Config: `look_ecommerce_dataset_config.json`. Same BQ dataset as data-science-agent when using the same `.env`.

## No API keys in code

All credentials come from environment variables (`.env`). Never commit `.env`; `.env.example` has placeholders only.
