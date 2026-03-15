# TaskFlow — Production-Ready Task Management Application

A full-stack task management application built with **Node.js/Express**, **Next.js 14**, and **MongoDB**, demonstrating production-grade architecture, JWT authentication, AES payload encryption, and comprehensive security practices.

---

## 🔗 Live Demo & Repository

| Resource | Link |
|---|---|
| **Frontend (Vercel)** | `https://taskflow-frontend-alpha.vercel.app` |
| **Backend API (Render)** | `https://taskflow-api-gz7u.onrender.com` |
| **GitHub** | `https://github.com/Likith407/taskflow`  |

---

## 🏗️ Architecture Overview

```
taskflow/
├── backend/                    # Express.js REST API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js     # MongoDB connection with graceful error handling
│   │   ├── controllers/
│   │   │   ├── authController.js   # Register, login, logout, refresh, getMe
│   │   │   └── taskController.js   # Full CRUD + stats + paginated listing
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification from HTTP-only cookies
│   │   │   ├── validate.js     # express-validator chains for all routes
│   │   │   └── errorHandler.js # Global error handler + 404
│   │   ├── models/
│   │   │   ├── User.js         # Mongoose schema, bcrypt pre-save hook
│   │   │   └── Task.js         # Task schema with compound indexes
│   │   ├── routes/
│   │   │   ├── auth.js         # /api/auth/*
│   │   │   └── tasks.js        # /api/tasks/*
│   │   ├── utils/
│   │   │   ├── jwt.js          # Token generation/verification + cookie config
│   │   │   ├── encryption.js   # AES-256 encrypt/decrypt helpers (CryptoJS)
│   │   │   └── response.js     # Standardized API response helpers
│   │   ├── app.js              # Express app (middleware stack, routes)
│   │   └── server.js           # Entry point, DB connect, graceful shutdown
│   ├── Dockerfile
│   ├── render.yaml             # One-click Render deployment
│   └── .env.example
│
└── frontend/                   # Next.js 14 App Router
    └── src/
        ├── app/
        │   ├── auth/
        │   │   ├── login/page.tsx      # Login form
        │   │   └── register/page.tsx   # Registration form
        │   ├── dashboard/
        │   │   └── page.tsx            # Stats overview + recent tasks
        │   └── tasks/
        │       └── page.tsx            # Full task table with CRUD
        ├── components/
        │   ├── layout/
        │   │   ├── AuthGuard.tsx       # Protected route wrapper
        │   │   └── Sidebar.tsx         # Navigation sidebar
        │   └── ui/
        │       ├── TaskModal.tsx       # Create/edit task modal
        │       └── ConfirmDialog.tsx   # Delete confirmation
        ├── lib/
        │   ├── api.ts          # Axios instance + token refresh interceptor
        │   ├── authApi.ts      # Auth API calls
        │   ├── tasksApi.ts     # Tasks API calls
        │   └── store.ts        # Zustand auth state
        └── types/index.ts      # TypeScript interfaces
```

### Request Flow

```
Browser → Next.js Frontend
         ↓ Axios (withCredentials: true)
         ↓ HTTP-only Cookie (accessToken)
Express API
  → helmet (security headers)
  → cors (origin whitelist)
  → mongoSanitize (NoSQL injection prevention)
  → rateLimiter (100 req/15min global; 10 req/15min auth)
  → authenticate middleware (JWT verify)
  → express-validator (input sanitization)
  → Controller → MongoDB
  → Standardized JSON response
```

---

## 🔒 Security Implementation

| Concern | Implementation |
|---|---|
| **Password storage** | bcrypt with 12 salt rounds |
| **Token transport** | HTTP-only, Secure, SameSite cookies — never in localStorage |
| **Token rotation** | Refresh token rotated on every use; reuse detected and rejected |
| **Payload encryption** | AES-256 via CryptoJS for sensitive fields |
| **NoSQL injection** | `express-mongo-sanitize` strips `$` and `.` from inputs |
| **Security headers** | `helmet` sets CSP, HSTS, X-Frame-Options, etc. |
| **Rate limiting** | Global 100 req/15min; Auth endpoints 10 req/15min |
| **Input validation** | `express-validator` on every route with type coercion |
| **Body size limit** | `express.json({ limit: '10kb' })` |
| **Authorization** | Every task query scoped to `owner: req.user._id` |
| **Environment secrets** | All secrets via `.env` — never hardcoded |
| **Error leakage** | Stack traces never exposed in production responses |

---

## 🚀 Local Setup

### Prerequisites

- Node.js ≥ 18
- MongoDB Atlas account (free tier) or local MongoDB
- Git

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/taskflow.git
cd taskflow
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/taskflow
JWT_SECRET=your-min-32-char-secret-here-!!
JWT_REFRESH_SECRET=another-min-32-char-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
COOKIE_SECRET=cookie-signing-secret-min-32-chars
PAYLOAD_ENCRYPTION_KEY=exactly-32-characters-here123456
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

```bash
npm run dev        # Development with nodemon
# or
npm start          # Production
```

API will be running at `http://localhost:5000`

### 3. Frontend setup

```bash
cd ../frontend
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

```bash
npm run dev        # Development
# or
npm run build && npm start   # Production
```

Frontend will be running at `http://localhost:3000`

---

## ☁️ Deployment

### Backend → Render (recommended)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo, set **Root Directory** to `backend/`
4. Render auto-detects `render.yaml` — fill in secret env vars in the dashboard
5. Deploy → copy the live URL

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
```

Set environment variable in Vercel dashboard:
```
NEXT_PUBLIC_API_URL=https://taskflow-api.onrender.com/api
```

### Backend → Docker

```bash
cd backend
docker build -t taskflow-api .
docker run -p 5000:5000 --env-file .env taskflow-api
```

---

## 📡 API Reference

Base URL: `https://taskflow-api.onrender.com/api`

All authenticated endpoints require a valid `accessToken` cookie (set automatically on login/register) or an `Authorization: Bearer <token>` header.

---

### Auth Endpoints

#### `POST /auth/register`

Register a new user.

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass1"
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "64f3a1b2c5e6d7e8f9a0b1c2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error `409` — Email taken:**
```json
{
  "success": false,
  "message": "An account with this email already exists",
  "code": "EMAIL_TAKEN"
}
```

---

#### `POST /auth/login`

**Request:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePass1"
}
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "64f3a1b2c5e6d7e8f9a0b1c2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "lastLogin": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error `401`:**
```json
{
  "success": false,
  "message": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

---

#### `POST /auth/refresh`

Silently refresh the access token using the `refreshToken` cookie.

**Response `200`:**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": { "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
}
```

---

#### `POST /auth/logout` 🔒

Invalidates the refresh token and clears cookies.

**Response `200`:**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

#### `GET /auth/me` 🔒

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "user": {
      "id": "64f3a1b2c5e6d7e8f9a0b1c2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### Task Endpoints (all require authentication 🔒)

#### `GET /tasks`

List tasks with pagination, filtering, and search.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page, max 100 (default: 10) |
| `status` | string | Filter: `todo`, `in_progress`, `completed`, `archived` |
| `priority` | string | Filter: `low`, `medium`, `high`, `urgent` |
| `search` | string | Full-text search on title + description |
| `sortBy` | string | `createdAt`, `updatedAt`, `dueDate`, `priority`, `title` |
| `sortOrder` | string | `asc` or `desc` (default: `desc`) |

**Example:** `GET /tasks?status=in_progress&search=API&page=1&limit=5`

**Response `200`:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "_id": "64f3a1b2c5e6d7e8f9a0b1c3",
      "title": "Implement API authentication",
      "description": "JWT-based auth with refresh token rotation",
      "status": "in_progress",
      "priority": "high",
      "dueDate": "2024-02-01T00:00:00.000Z",
      "tags": ["backend", "security"],
      "owner": "64f3a1b2c5e6d7e8f9a0b1c2",
      "completedAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 5,
    "totalPages": 9,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

#### `POST /tasks`

**Request:**
```json
{
  "title": "Write unit tests",
  "description": "Cover auth and task controllers",
  "status": "todo",
  "priority": "medium",
  "dueDate": "2024-02-15",
  "tags": ["testing", "backend"]
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "64f3a1b2c5e6d7e8f9a0b1c4",
    "title": "Write unit tests",
    "description": "Cover auth and task controllers",
    "status": "todo",
    "priority": "medium",
    "dueDate": "2024-02-15T00:00:00.000Z",
    "tags": ["testing", "backend"],
    "owner": "64f3a1b2c5e6d7e8f9a0b1c2",
    "completedAt": null,
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

#### `GET /tasks/:id`

**Response `200`:** Single task object (same shape as above).

**Error `404`:**
```json
{
  "success": false,
  "message": "Task not found",
  "code": "TASK_NOT_FOUND"
}
```

---

#### `PATCH /tasks/:id`

Partial update — only send fields to change.

**Request:**
```json
{
  "status": "completed",
  "priority": "high"
}
```

**Response `200`:** Updated task object. `completedAt` is auto-set when status becomes `completed`.

---

#### `DELETE /tasks/:id`

**Response `200`:**
```json
{ "success": true, "message": "Task deleted successfully" }
```

---

#### `GET /tasks/stats`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "todo": 12,
    "in_progress": 5,
    "completed": 23,
    "archived": 2,
    "total": 42
  }
}
```

---

### Common Error Codes

| Code | Status | Meaning |
|---|---|---|
| `AUTH_REQUIRED` | 401 | No token provided |
| `TOKEN_EXPIRED` | 401 | Access token expired (client should call `/auth/refresh`) |
| `TOKEN_INVALID` | 401 | Malformed or tampered token |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `EMAIL_TAKEN` | 409 | Email already registered |
| `TASK_NOT_FOUND` | 404 | Task doesn't exist or belongs to another user |
| `VALIDATION_ERROR` | 422 | Input failed validation (see `errors` array) |
| `NOT_FOUND` | 404 | Route doesn't exist |

---

## 🧪 Testing the API with curl

```bash
# Register
curl -c cookies.txt -X POST https://taskflow-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"TestPass1"}'

# Login
curl -c cookies.txt -X POST https://taskflow-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass1"}'

# Create a task (uses saved cookie)
curl -b cookies.txt -X POST https://taskflow-api.onrender.com/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"My first task","priority":"high","status":"todo"}'

# List tasks with filter + search
curl -b cookies.txt "https://taskflow-api.onrender.com/api/tasks?status=todo&search=first&limit=5"

# Update task status
curl -b cookies.txt -X PATCH https://taskflow-api.onrender.com/api/tasks/<TASK_ID> \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

---

## 📦 Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Backend framework | Express.js 4 | REST API |
| Database | MongoDB + Mongoose | Document storage with ODM |
| Authentication | JWT (jsonwebtoken) | Stateless auth tokens |
| Password hashing | bcryptjs (12 rounds) | Secure credential storage |
| Payload encryption | CryptoJS AES-256 | Encrypt sensitive fields |
| Input validation | express-validator | Sanitize and validate all inputs |
| NoSQL protection | express-mongo-sanitize | Strip injection operators |
| Security headers | Helmet.js | HTTP security headers |
| Rate limiting | express-rate-limit | Brute-force protection |
| Frontend framework | Next.js 14 (App Router) | React SSR/CSR hybrid |
| Styling | Tailwind CSS | Utility-first CSS |
| State management | Zustand | Lightweight client state |
| Forms | React Hook Form + Zod | Type-safe form validation |
| HTTP client | Axios | API calls with interceptors |
| Deployment (API) | Render / Docker | Cloud hosting |
| Deployment (UI) | Vercel | Edge-optimized hosting |
