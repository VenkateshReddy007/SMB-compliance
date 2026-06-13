# Deployment Notes

## Why The APK Shows "Site Cannot Be Reached"

The APK is a WebView shell. It does not contain the full Next.js/FastAPI/Postgres/Redis app inside the phone. It opens a URL.

For local testing, the laptop must be running:

- Frontend on `http://<laptop-ip>:3000`
- Backend on `http://<laptop-ip>:8001`
- PostgreSQL and Redis

If the laptop server is not running, the phone shows "site cannot be reached". `localhost` also does not work from the phone because `localhost` means the phone itself.

## Vercel

Recommended Vercel settings:

- Root Directory: `.`
- Framework: Other / detected by `vercel.json`

The root `vercel.json` defines two services:

- `web`: Next.js app from `apps/web`
- `api`: FastAPI app from `api/index.py`

Set these Vercel environment variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_API_URL=https://your-api-host.example
NEXT_PUBLIC_WS_URL=wss://your-api-host.example/ws
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

## Backend Caveat

The FastAPI backend still needs:

- Python runtime
- PostgreSQL
- Redis
- Long-running API process
- WebSocket support
- Background scheduler support

Vercel can import the service through `api/index.py`, but this backend uses startup state, scheduler jobs, ChromaDB, WebSockets, Postgres, and Redis. For a hackathon demo this may be enough to get HTTP routes online, but a long-running backend host such as Railway, Render, Fly.io, or a VPS is still the safer path.

Set backend environment variables from `env.example`, especially:

```env
DATABASE_URL=...
SYNC_DATABASE_URL=...
REDIS_URL=...
GROQ_API_KEY=...
CLERK_SECRET_KEY=...
CLERK_WEBHOOK_SECRET=...
```

## APK URL After Deployment

Once deployed, open the APK and enter the frontend URL:

```text
https://your-vercel-app.vercel.app
```
