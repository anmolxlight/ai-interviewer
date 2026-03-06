# AGENTS.md

## Cursor Cloud specific instructions

### Architecture
- **Frontend**: React 18 + TypeScript + Vite on port 3000 (`npm run dev`)
- **Backend**: Python FastAPI on port 8000 (`cd backend && source venv/bin/activate && python main.py`)
- **Database**: Supabase (PostgreSQL) — schema at `supabase/schema.sql`
- API proxy: Vite proxies `/api` requests to the backend (configured in `vite.config.ts`)

### Running services (local dev)
- **Backend**: `cd backend && source venv/bin/activate && python main.py`
- **Frontend**: `npm run dev` (runs Vite dev server on port 3000)
- Start backend before frontend; the frontend proxies API calls to :8000

### Production deployment
- **Vercel**: Frontend as Vite static build + backend as Python serverless function at `/api/*`
- Production URL: `workspace-lovat-alpha.vercel.app`
- Config: `vercel.json`, serverless entry: `api/index.py`
- All 3 interview modes work on Vercel:
  - **Chat**: HTTP REST endpoints (always worked)
  - **Voice**: Rewritten to use HTTP POST `/api/voice-turn` instead of WebSocket
  - **Live**: Connects directly from browser to Gemini Live API via `@google/genai` SDK (WebSocket is browser→Google, not browser→Vercel)
- Deploy: `vercel deploy --prod --token $VERCEL_TOKEN --scope anmolxlights-projects`
- When piping env vars to `vercel env add`, use `printf '%s'` not `echo` to avoid trailing newlines

### Supabase
- Project: `ai-interview-assistant` in region `us-east-1`
- Schema: `supabase/schema.sql` (interviews + users tables with RLS)
- Setup script: `scripts/setup-supabase.sh` (requires `SUPABASE_ACCESS_TOKEN`)

### Lint / Build / Test
- No `.eslintrc` config exists. The `npm run lint` script is defined but will fail without one.
- TypeScript check: `npx tsc --noEmit` — should pass with zero errors
- Build: `npx vite build` succeeds
- No automated test suite exists in this repo

### Environment variables
- Frontend `.env` needs `VITE_GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Backend `backend/.env` needs `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `HOST=0.0.0.0`, `PORT=8000`
- Secrets `GEMINI_API_KEY` and `VITE_GEMINI_API_KEY` must be injected as env vars; write them into `.env` / `backend/.env` at startup
- Copy from `.env.example` / `backend/.env.example` if `.env` files don't exist

### Authentication
- Google OAuth via Supabase Auth — requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured in Supabase dashboard
- Auth is gated: app shows login page when `VITE_SUPABASE_URL` contains `supabase.co`
- For local dev without auth, clear `VITE_SUPABASE_URL` in `.env`

### Voice Interview
- Uses ElevenLabs TTS when `ELEVENLABS_API_KEY` is set (backend `POST /api/tts`), falls back to browser SpeechSynthesis
- Continuous listening: auto-starts mic after AI speaks, auto-sends after 1.5s silence
- Interruptable: user can tap the orb or speak to interrupt AI audio

### Gotchas
- `python3.12-venv` apt package must be installed before creating the backend venv (not included by default in Ubuntu 24.04 minimal)
- The backend uses the deprecated `google.generativeai` package; expect a `FutureWarning` on import (harmless)
- Redux Persist stores interview state in localStorage; to reset app state during testing, clear localStorage and reload
- Font: Object Sans loaded from CDNFonts CDN — requires internet access
