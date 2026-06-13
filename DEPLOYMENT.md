# Deployment Notes

## Why The APK Shows "Site Cannot Be Reached"

The APK is a WebView shell. It does not contain the full Next.js/FastAPI/Postgres/Redis app inside the phone. It opens a URL.

For local testing, the laptop must be running:

- Frontend on `http://<laptop-ip>:3000`
- Backend on `http://<laptop-ip>:8001`
- PostgreSQL and Redis

If the laptop server is not running, the phone shows "site cannot be reached". `localhost` also does not work from the phone because `localhost` means the phone itself.

## Vercel Frontend

Vercel is enough for the frontend.

Recommended Vercel settings:

- Root Directory: `apps/web`
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: leave blank

Set these Vercel environment variables:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_API_URL=https://your-api-host.example
NEXT_PUBLIC_WS_URL=wss://your-api-host.example/ws
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

## Backend

The FastAPI backend is not a simple static deployment. It needs:

- Python runtime
- PostgreSQL
- Redis
- Long-running API process
- WebSocket support
- Background scheduler support

Use Railway, Render, Fly.io, or a VPS for the backend. Vercel serverless can host small Python functions, but this backend uses startup state, scheduler jobs, ChromaDB, WebSockets, Postgres, and Redis, so a long-running backend host is the safer path.

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
