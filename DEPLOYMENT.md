# TaskFlow — Deployment Guide

This guide covers deploying:
- **Backend** → Render (free tier)
- **Frontend** → Vercel (free tier)
- **Database** → MongoDB Atlas (free tier)

Total cost: $0

---

## Step 1 — MongoDB Atlas (Database)

### 1.1 Create a free cluster

1. Go to https://cloud.mongodb.com and sign up / log in
2. Click **"Build a Database"** → choose **M0 Free**
3. Select a cloud provider (AWS) and region closest to you
4. Name your cluster (e.g. `taskflow-cluster`) → click **Create**

### 1.2 Create a database user

1. In the left sidebar go to **Security → Database Access**
2. Click **"Add New Database User"**
3. Choose **Password** authentication
4. Username: `taskflow`
5. Password: click **"Autogenerate Secure Password"** → **copy and save it**
6. Under "Database User Privileges" select **"Read and write to any database"**
7. Click **Add User**

### 1.3 Whitelist all IPs (for Render)

1. Go to **Security → Network Access**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** → Confirm (`0.0.0.0/0`)
   > Render uses dynamic IPs so we allow all. You can restrict this later.

### 1.4 Get your connection string

1. Go to **Database → Connect** on your cluster
2. Choose **"Drivers"** → Driver: Node.js, Version: 5.5+
3. Copy the connection string — it looks like:
   ```
   mongodb+srv://taskflow:<password>@taskflow-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with the password you saved in step 1.2
5. Add your database name before the `?`:
   ```
   mongodb+srv://taskflow:<password>@taskflow-cluster.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority
   ```
6. **Save this string** — you'll need it in the next step.

---

## Step 2 — Backend → Render

### 2.1 Push your code to GitHub

```bash
# From the taskflow/ root directory
git init
git add .
git commit -m "feat: initial TaskFlow application"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### 2.2 Create a Web Service on Render

1. Go to https://render.com and sign up / log in with GitHub
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already → select your `taskflow` repo
4. Configure the service:

   | Field | Value |
   |---|---|
   | **Name** | `taskflow-api` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Plan** | `Free` |

5. Click **"Advanced"** to add environment variables (see 2.3 below)

### 2.3 Set environment variables on Render

Click **"Add Environment Variable"** for each of these:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | *(your Atlas connection string from Step 1.4)* |
| `JWT_SECRET` | *(generate: `openssl rand -base64 32`)* |
| `JWT_REFRESH_SECRET` | *(generate: `openssl rand -base64 32`)* |
| `JWT_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `30d` |
| `COOKIE_SECRET` | *(generate: `openssl rand -base64 32`)* |
| `PAYLOAD_ENCRYPTION_KEY` | *(generate exactly 32 chars: `openssl rand -base64 24`)* |
| `CORS_ORIGIN` | `https://your-app.vercel.app` *(update after frontend deploy)* |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX` | `100` |

> **Generate secrets quickly on your terminal:**
> ```bash
> openssl rand -base64 32   # for JWT secrets and COOKIE_SECRET
> openssl rand -base64 24   # gives ~32 chars for PAYLOAD_ENCRYPTION_KEY
> ```

### 2.4 Deploy

1. Click **"Create Web Service"**
2. Render will pull your repo, run `npm install`, then `npm start`
3. Watch the build logs — you should see:
   ```
   ✅ MongoDB Connected: taskflow-cluster.xxxxx.mongodb.net
   🚀 TaskFlow API running on port 10000 [production]
   ```
4. Your API URL will be: `https://taskflow-api.onrender.com`
5. Test it: `https://taskflow-api.onrender.com/health`
   ```json
   { "success": true, "status": "healthy" }
   ```

> **Note:** Free Render services spin down after 15 min of inactivity.
> First request after sleep takes ~30 seconds. Upgrade to Starter ($7/mo) to avoid this.

---

## Step 3 — Frontend → Vercel

### 3.1 Install Vercel CLI (optional but faster)

```bash
npm install -g vercel
```

### 3.2 Deploy via CLI

```bash
cd taskflow/frontend

vercel
# Follow the prompts:
#   Set up and deploy? Y
#   Which scope? (your account)
#   Link to existing project? N
#   Project name: taskflow-frontend
#   In which directory is your code? ./
#   Override settings? N
```

**Or deploy via the Vercel dashboard:**
1. Go to https://vercel.com → **"Add New Project"**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Framework Preset will auto-detect **Next.js**

### 3.3 Set environment variables on Vercel

In the Vercel dashboard → your project → **Settings → Environment Variables**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://taskflow-api.onrender.com/api` |

Click **Save**, then **Redeploy**.

### 3.4 Update CORS on Render

Now that you have your Vercel URL (e.g. `https://taskflow-frontend.vercel.app`):

1. Go back to Render → your `taskflow-api` service → **Environment**
2. Update `CORS_ORIGIN` to your exact Vercel URL (no trailing slash)
3. Render will auto-redeploy

---

## Step 4 — Verify the live deployment

Run these checks in order:

```bash
# 1. Health check
curl https://taskflow-api.onrender.com/health

# 2. Register a user
curl -c /tmp/cookies.txt -X POST https://taskflow-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPass1"}'

# 3. Create a task
curl -b /tmp/cookies.txt -X POST https://taskflow-api.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"My first live task","priority":"high"}'

# 4. List tasks
curl -b /tmp/cookies.txt https://taskflow-api.onrender.com/api/tasks

# 5. Open the frontend
open https://taskflow-frontend.vercel.app
```

---

## Step 5 — Optional: Custom Domain

### On Vercel
1. Dashboard → Project → **Settings → Domains**
2. Add your domain → follow DNS instructions

### On Render
1. Service → **Settings → Custom Domains**
2. Add domain → update your DNS CNAME record

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `MongoServerError: bad auth` | Wrong password in `MONGODB_URI` — re-check Step 1.2 |
| `CORS blocked` | `CORS_ORIGIN` on Render doesn't match your Vercel URL exactly |
| Cookies not sent | Make sure `withCredentials: true` is set in Axios (already done) and both domains use HTTPS |
| `PAYLOAD_ENCRYPTION_KEY` error | Key must be exactly 32 characters — use `openssl rand -base64 24` |
| Frontend shows blank page | Check Vercel build logs for TypeScript errors |
| API returns 429 | You've hit the rate limit — wait 15 min or raise `RATE_LIMIT_MAX` |
| Render deploy fails | Check build logs — usually a missing env var |

---

## Architecture Diagram (Production)

```
User Browser
    │
    ▼
Vercel Edge Network
  (Next.js Frontend)
  https://taskflow-frontend.vercel.app
    │
    │  HTTPS + HTTP-only cookies
    │  withCredentials: true
    ▼
Render Web Service
  (Express API)
  https://taskflow-api.onrender.com
    │
    │  mongoose connection pool
    │  TLS encrypted
    ▼
MongoDB Atlas
  (M0 Free Cluster)
  taskflow-cluster.xxxxx.mongodb.net
```
