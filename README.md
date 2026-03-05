# Playground — ADK Dashboard Agent + Next.js Copilot UI

This project is a local playground for business-question answering on top of ADK + BigQuery:

- Backend agent (`dashboard_agent`) runs via FastAPI/ADK.
- Frontend is a Next.js app focused on chat + insight canvas + storytelling board.
- Users can pin chart and narrative cards to build a mixed data story.

## What changed recently

The frontend has migrated from older Vite patterns to a Next.js App Router app, with UX improvements for:

- explicit SQL trust states (`available`, `missing_backend`, `derived_from_text`, `redacted`)
- stronger response classification (`message_only`, `insight_partial`, `insight_ready`)
- canonical board titles (anti prompt-echo + length guard)
- narrative storytelling card support
- clear-board with 10s undo action

## Repository map (key files)

- Backend entry: `main.py`
- Agent package: `dashboard_agent/`
- Frontend app: `frontend/`
- API adapter: `frontend/app/api/chat/route.ts`
- UI state: `frontend/src/store/copilotStore.ts`
- Shared insight contract: `frontend/src/types/insight.ts`
- UX PRD: `frontend_ux_improvements_prd.md`
- Detailed architecture + API contract: `docs/architecture.md`
- UX docs:
  - `UX_INDEX.md`
  - `UX_QUICK_REFERENCE.md`
  - `UX_TESTING_SUITE_README.md`
  - `UX_TEST_REPORT.md`

## Prerequisites

- Python 3.11+ (recommended 3.12)
- Node 20+
- npm
- GCP credentials configured for BigQuery access

## Backend setup

1. Create `.env` in the project root (`playground/.env`) and configure:
   - `GOOGLE_CLOUD_PROJECT`
   - `GOOGLE_CLOUD_LOCATION`
   - `BQ_COMPUTE_PROJECT_ID`
   - `BQ_DATA_PROJECT_ID`
   - `BQ_DATASET_ID`
   - `DATASET_CONFIG_FILE=./look_ecommerce_dataset_config.json`
   - model variables used by the agent (`ROOT_AGENT_MODEL`, etc.)

2. Install Python deps:

   Option A (recommended):
   ```bash
   uv sync
   ```

   Option B:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e .
   ```

3. Run backend API:
   ```bash
   source .venv/bin/activate
   uvicorn main:app --host 0.0.0.0 --port 8081
   ```

4. Health check:
   ```bash
   curl http://localhost:8081/health
   ```

## Frontend setup

From `playground/frontend`:

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Ensure `frontend/.env.local` has:
   ```env
   NEXT_PUBLIC_ADK_API_BASE_URL=http://localhost:8081
   ADK_API_BASE_URL=http://localhost:8081
   ADK_APP_NAME=dashboard_agent
   ```

3. Run dev server:
   ```bash
   npm run dev
   ```

4. Open:
   - Frontend: http://localhost:3000

## Local run (quick start)

Open two terminals:

Terminal A (backend):
```bash
cd playground
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8081
```

Terminal B (frontend):
```bash
cd playground/frontend
npm run dev
```

## Architecture and contracts

For technical deep-dive (data flow, state model, endpoint contract, and operational sequence), see:

- `docs/architecture.md`

## Build and checks

From `frontend/`:
```bash
npm run build
```

Notes:
- Build compiles and type-checks.
- If environment is missing ESLint, Next.js may warn during build.

## Troubleshooting

- Port in use:
  ```bash
  lsof -ti:3000,8081 | xargs kill -9
  ```
- Backend unreachable from frontend:
  - check `frontend/.env.local` base URLs
  - verify backend health on `:8081/health`
- Slow responses (25s-60s) are expected for some ADK+BigQuery flows.

## Security

- Do not commit `.env` with secrets.
- Use service account / ADC credentials via environment variables.
