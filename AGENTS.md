# AGENTS.md

## Cursor Cloud specific instructions

### Architecture
- **Frontend**: React 18 + TypeScript + Vite on port 3000 (`npm run dev`)
- **Backend**: Python FastAPI on port 8000 (`cd backend && source venv/bin/activate && python main.py`)
- API proxy: Vite proxies `/api` requests to the backend (configured in `vite.config.ts`)

### Running services
- **Backend**: `cd backend && source venv/bin/activate && python main.py`
- **Frontend**: `npm run dev` (runs Vite dev server on port 3000)

### Lint / Build / Test
- No `.eslintrc` config exists (pre-existing gap). The `npm run lint` script is defined but will fail without one.
- TypeScript check: `npx tsc --noEmit` (has one pre-existing unused-variable error in `interviewSlice.ts`)
- Build: `npx vite build` succeeds
- No automated test suite exists in this repo

### Environment variables
- Frontend `.env` needs `VITE_GEMINI_API_KEY` and `VITE_API_URL=http://localhost:8000`
- Backend `backend/.env` needs `GEMINI_API_KEY`, `HOST=0.0.0.0`, `PORT=8000`
- Supabase vars (`SUPABASE_URL`, `SUPABASE_KEY`) are optional; without them, data persistence endpoints return 500 but the core interview flow still works
- Copy from `.env.example` / `backend/.env.example` if `.env` files don't exist

### Gotchas
- `python3.12-venv` apt package must be installed before creating the backend venv (not included by default in Ubuntu 24.04 minimal)
- The backend uses the deprecated `google.generativeai` package; expect a `FutureWarning` on import (harmless)
