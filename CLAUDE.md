# CLAUDE.md — adk-data-dude

## Local ports

- Backend: `8081`
- Frontend (Next.js): `3000`

```bash
uv run adk web --port 8081
cd frontend && npm run dev
```

Preflight check:

```bash
lsof -nP -iTCP:3000 -iTCP:8081 -sTCP:LISTEN
```

## .env variables

```
BQ_COMPUTE_PROJECT_ID=your-gcp-project
GOOGLE_CLOUD_PROJECT=your-gcp-project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

Run `adk web` from `adk-data-dude/` so it picks up `.env` automatically.
