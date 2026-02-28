# Zyoris v3 — Permanent Deployment (Public URL)

This guide publishes Zyoris permanently on the internet using:

- **Frontend**: Vercel (Next.js)
- **Backend**: Render (Node/Express + Prisma)
- **Database**: Neon (PostgreSQL)

---

## 0) Prerequisites

- A GitHub account
- A Vercel account
- A Render account
- A Neon account (or Supabase/Railway Postgres)

---

## 1) Push project to GitHub

From `p:\Zyoris`:

```powershell
git init
git add .
git commit -m "Initial commit"
```

Create a new GitHub repo (empty), then:

```powershell
git remote add origin https://github.com/<your-username>/zyoris.git
git branch -M main
git push -u origin main
```

---

## 2) Create a managed Postgres DB (Neon)

1. Neon → create a new project/database.
2. Copy the **connection string** (DATABASE_URL).

You will paste this into Render as `DATABASE_URL`.

---

## 3) Deploy Backend to Render

1. Render → **New** → **Web Service**
2. Select your GitHub repo.
3. **Root Directory**: `backend`
4. **Environment**: Node
5. **Build Command**:

```bash
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

6. **Start Command**:

```bash
npm start
```

7. Add Environment Variables in Render:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-strong-secret
WEBHOOK_SECRET=replace-with-a-strong-secret
FRONTEND_URLS=https://<your-vercel-app>.vercel.app
```

8. Deploy. After it’s live, copy the backend URL, e.g.:
`https://your-backend.onrender.com`

Health check:
`GET /health`

---

## 4) Deploy Frontend to Vercel

1. Vercel → **New Project**
2. Select your GitHub repo.
3. **Root Directory**: `frontend`
4. Add Environment Variables in Vercel:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

Optional (for ZII BOT GPT answers):

```env
OPENAI_API_KEY=sk-...
```

5. Deploy. You will get a permanent URL like:
`https://your-app.vercel.app`

---

## 5) Post-deploy checklist

- Open Vercel URL.
- Login.
- Dashboard loads without CORS errors.
- File upload + analysis works.
- ZII BOT widget opens and replies.

---

## Common issues

### CORS blocked
- Ensure Render has `FRONTEND_URLS=https://<your-vercel-app>.vercel.app`
- Redeploy backend.

### Prisma / DB errors
- Ensure `DATABASE_URL` is correct and points to a Postgres instance.
- In Render logs confirm `prisma migrate deploy` ran successfully.

---

