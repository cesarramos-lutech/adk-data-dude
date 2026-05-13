# Frontend — Next.js Copilot UI

Next.js (App Router) chat + insight canvas for the **dashboard_agent** backend. See the [root README](../README.md) for architecture and UX docs.

## Prerequisites

- Node 20+
- npm

## Install

From this directory:

```bash
npm install --legacy-peer-deps
```

## Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_ADK_API_BASE_URL=http://localhost:8081
ADK_API_BASE_URL=http://localhost:8081
ADK_APP_NAME=dashboard_agent
```

## Run (dev)

Backend must be running on **8081** (from repo root: `uv run adk web --port 8081` or `uvicorn main:app --host 0.0.0.0 --port 8081`).

```bash
npm run dev
```

Open **http://localhost:3000**.

## Build

```bash
npm run build
```

## Troubleshooting

- Port in use: `lsof -ti:3000,8081 | xargs kill -9`
- Backend unreachable: check `.env.local` URLs and `curl http://localhost:8081/health`
