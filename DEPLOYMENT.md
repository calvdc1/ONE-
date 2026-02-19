Deployment to Railway
=====================

This repo contains the Next.js app in the `one/` subfolder. Choose one of the following approaches.

Option A — Root Directory (recommended)
---------------------------------------
1) Push this repository to GitHub.
2) In Railway → New Project → Deploy from GitHub → select this repository.
3) In the service’s Settings:
   - Root Directory: `one`
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Start Command: `npm run start -- --port $PORT`
   - Environment:
     - `NODE_ENV=production`
     - Add any provider keys if needed (Firebase, etc.)
   - Node version: `20`
4) Redeploy.

Option B — Dockerfile (works without Root Directory)
----------------------------------------------------
This repository includes a Dockerfile at the root that builds the app from `one/` and runs `next start`.

1) In Railway → New Project → Deploy from GitHub.
2) Enable “Use Dockerfile” (if Railway doesn’t auto-detect).
3) Deploy. The container exposes port 3000; Railway maps it automatically.

Health Check
------------
Set the health check path to `/api/health` in Railway’s settings for better deploy reporting.

Notes
-----
- The app uses client-side localStorage for social features when no real backend keys are provided.
- If you add real auth (e.g., Firebase), set the environment variables in Railway and rebuild.

