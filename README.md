# Red Dot Score

This project started from a Replit fullstack template (Vite + Express + Drizzle).
For Vercel deployment, it now includes:

- `vercel.json` for static frontend output + SPA routing fallback.
- `api/[...path].ts` for serverless API routes (`/api/*`).
- Database fallback: when `DATABASE_URL` is missing, backend uses in-memory storage.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Import this repo in Vercel.
2. Keep default install/build command (`npm install`, `npm run build`).
3. No need to set output directory manually (already in `vercel.json`).
4. Optional but recommended: set `DATABASE_URL` in Vercel Environment Variables for persistent data.

### Without `DATABASE_URL`

- App still runs.
- Data is stored in memory only, so it may reset after function cold start/redeploy.
