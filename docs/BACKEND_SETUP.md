# Backend Architecture & Server Initialization

**Project:** Freelance CRM & Project Tracker  
**Roadmap Stage:** Din 3 (Backend Project Init & Express Setup)  
**Technology:** Node.js (v24+), Express.js (v5), Helmet, CORS, Dotenv, Morgan  

> 🔗 **Related Architecture Guides:**
> - [Database Planning & Schema Specs (Din 1)](DATABASE_SCHEMA.md)
> - [Schema Relationships & Integrity Blueprint (Din 2)](SCHEMA_RELATIONSHIPS.md)
> - [Visual Architecture Vector Diagram](schema-diagram.svg)

---

## 1. Overview & Objectives (Maqsad)

Din 1 aur Din 2 me humne MongoDB ke tamam 6 collections (`User`, `Client`, `Project`, `Task`, `Invoice`, `Notification`) aur unke relational data models design kiye the.

**Din 3 ka Maqsad:**
1. Node.js backend project initialize karna (`npm init`).
2. Express.js framework install karna aur core REST server (`app.js`) configure karna.
3. Production-grade security headers (`helmet`) aur cross-origin access (`cors`) implement karna.
4. Environment variables isolation (`dotenv`, `.env`, `.env.example`).
5. HTTP request logging (`morgan`) aur auto-reload development engine (`nodemon`) configure karna.
6. Health check endpoints (`/api/health`) aur 404/global error handling establish karna.

---

## 2. Directory Architecture

Backend codebase ko standard MERN structure ke mutabiq `server/` directory me organize kiya gaya hai, sath hi root level convenience forwarder scripts provide ki gayi hain:

```text
freelancer-crm-tracker/
├── package.json              # Root workspace convenience scripts (npm run server)
├── app.js                    # Root proxy delegating to server/app.js
├── .gitignore                # Node modules, environment files, logs ignore rules
├── README.md                 # Complete roadmap tracker & documentation
├── docs/                     # Architectural & system design documentation
│   ├── DATABASE_SCHEMA.md    # Din 1 Schema specs
│   ├── SCHEMA_RELATIONSHIPS.md # Din 2 Relationships blueprint
│   ├── BACKEND_SETUP.md      # Din 3 Backend setup documentation (This file)
│   ├── schema-diagram.svg    # Din 2 Vector architecture diagram
│   └── schema-diagram.excalidraw
└── server/                   # Node.js + Express Backend Root
    ├── package.json          # Server dependencies and lifecycle scripts
    ├── package-lock.json     # Exact dependency lockfile
    ├── .env                  # Local environment configuration (Git-ignored)
    ├── .env.example          # Environment variables template
    └── app.js                # Core Express application and HTTP server
```

---

## 3. Installed Packages & Middleware Pipeline

| Package | Version | Type | Purpose & Functionality |
| :--- | :--- | :--- | :--- |
| **`express`** | `^5.2.1` | Production | High performance minimal Node.js REST API framework. |
| **`helmet`** | `^8.3.0` | Production | Sets 15+ secure HTTP headers (XSS Filter, Content-Security-Policy, Frameguard). |
| **`cors`** | `^2.8.6` | Production | Enables secure Cross-Origin Resource Sharing with frontend clients (React/Vite). |
| **`dotenv`** | `^17.4.2` | Production | Loads environment variables from `.env` securely into `process.env`. |
| **`morgan`** | `^1.12.1` | Production | HTTP request logger for debugging status codes and response times. |
| **`nodemon`** | `^3.1.14` | DevDependency | File watcher that automatically restarts Node server upon code changes. |

### Middleware Execution Order in `server/app.js`

```text
Incoming HTTP Request
   │
   ▼
[1] Helmet Security Headers (Secure HTTP response headers)
   │
   ▼
[2] CORS Handler (Validates origin: localhost:3000, localhost:5173, etc.)
   │
   ▼
[3] Morgan HTTP Logger ('dev' mode logging in development)
   │
   ▼
[4] Body Parsers (express.json() & express.urlencoded() with 10MB limits)
   │
   ▼
[5] API Route Handlers (GET /, GET /api/health, GET /api)
   │
   ▼
[6] 404 Route Not Found Handler (JSON error for undefined paths)
   │
   ▼
[7] Global Error Handler Middleware (Sanitized errors, development stack traces)
```

---

## 4. Environment Configuration (`.env.example`)

Server environment variables ko `.env` me separate rakha gaya hai taake koi secrets ya sensitive credentials Git me commit na hon:

```env
# ==========================================
# Freelance CRM & Project Tracker - Server Config
# ==========================================

# Server Environment
PORT=5000
NODE_ENV=development

# Frontend Client URL (For CORS policies)
CLIENT_URL=http://localhost:3000

# Database Connection (MongoDB - Din 4)
MONGODB_URI=mongodb://127.0.0.1:27017/freelancer_crm

# Authentication & JWT (Din 5)
JWT_SECRET=freelancer_crm_development_secret_key_change_in_production
JWT_EXPIRE=30d

# Stripe Payments (Din 11)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
```

---

## 5. Core Endpoints & Verification

### 5.1 Root API Info (`GET /`)
API ka status aur basic details return karta hai:
```json
{
  "success": true,
  "message": "Welcome to Freelance CRM & Project Tracker API",
  "version": "1.0.0",
  "status": "online",
  "roadmapDay": "Din 3: Backend Project Init & Express Setup",
  "documentation": "https://github.com/ahsanadeem840-ai/freelancer-crm-tracker",
  "endpoints": {
    "health": "/api/health",
    "apiOverview": "/api"
  },
  "timestamp": "2026-09-14T17:43:48.377Z"
}
```

### 5.2 Health Check Endpoint (`GET /api/health`)
Server uptime, system memory consumption aur Node.js version monitor karne ke liye:
```json
{
  "success": true,
  "status": "ok",
  "uptimeSeconds": 1146,
  "environment": "development",
  "timestamp": "2026-09-14T17:43:48.379Z",
  "system": {
    "nodeVersion": "v24.15.0",
    "platform": "win32",
    "memory": {
      "rssMb": "124.94",
      "heapUsedMb": "7.97"
    }
  }
}
```

### 5.3 404 Undefined Route (`GET /api/unknown`)
Standardized JSON error formatting:
```json
{
  "success": false,
  "message": "Resource not found - GET /api/unknown"
}
```

---

## 6. How to Run the Server

### Option A: From Repository Root
```bash
# Start development server with nodemon
npm run server

# Start standard production server
npm start
```

### Option B: From `server/` Directory
```bash
cd server

# Install dependencies (if first time)
npm install

# Run development server with auto-reload
npm run dev

# Run directly with Node
node app.js
```

---

## 7. Next Steps (Din 4 Roadmap)

Din 3 successfully complete ho chuka hai. Agla marhala (**Din 4**) hoga:
- Local MongoDB / MongoDB Atlas connection setup with Mongoose.
- Mongoose Schemas aur Models implementation (`User`, `Client`, `Project`, `Task`, `Invoice`, `Notification`) as designed in Din 1 and Din 2.
