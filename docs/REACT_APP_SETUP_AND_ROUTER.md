# React App Setup & React Router Architecture Documentation

**Project:** Freelance CRM & Project Tracker  
**Roadmap Stage:** Din 12 (Vite React SPA Scaffolding, Design System & React Router Setup)  
**Technology:** React 19, React Router v7, Vite v8, Lucide React, Modern CSS Design System  

> 🔗 **Related Architecture Guides:**
> - [Database Planning & Schema Architecture (Din 1)](DATABASE_SCHEMA.md)
> - [Schema Relationships & Relational Integrity Blueprint (Din 2)](SCHEMA_RELATIONSHIPS.md)
> - [Backend Setup & Server Initialization (Din 3)](BACKEND_SETUP.md)
> - [Folder Structure & MongoDB Connection (Din 4)](FOLDER_STRUCTURE_AND_DB.md)
> - [User Model & Signup API (Din 5)](USER_MODEL_AND_SIGNUP_API.md)
> - [Login API & JWT Verification (Din 6)](LOGIN_API_AND_JWT.md)
> - [Role-Based Access Control - RBAC (Din 7)](ROLE_BASED_ACCESS_CONTROL.md)
> - [Client CRUD API & CRM Pipeline (Din 8)](CLIENT_CRUD_API.md)
> - [Project CRUD API & Client Linking (Din 9)](PROJECT_CRUD_API.md)
> - [Task CRUD API & Project Linking (Din 10)](TASK_CRUD_API.md)
> - [Invoice API & Full Backend Test (Din 11)](INVOICE_API_AND_FULL_BACKEND_TEST.md)

---

## 1. Overview & Objectives (Maqsad)

Din 12 ka bunyadi maqsad platform ke **Frontend Single Page Application (SPA)** ko initialize karna aur robust routing architecture qaim karna hai:

1. **Vite se React Application Banayein**:
   - Next-generation build tool **Vite** ka istemal karte hue ultra-fast development server (HMR < 50ms) aur optimized production bundling.
   - Modern React (v19) environment setup with zero bloatware.
2. **React Router Architecture**:
   - `react-router-dom` (v7) install aur nested routes layout architecture setup.
   - Centralized layout wrapper (`Layout.jsx`) jisme persistent sidebar, dynamic breadcrumb top navbar, notification center aur footer shaamil hain.
   - Client-side navigation (`<NavLink />` and `<Link />`) with smooth transitions and active link indicators.
3. **Enterprise UI/UX Design System**:
   - Custom modern dark-slate theme (`#080c14`, `#0f172a`, `#111827`) with glassmorphism cards and vibrant gradient accents (`#6366f1` to `#8b5cf6`).
   - Professional typography (`Plus Jakarta Sans` Google Font) and responsive mobile drawer navigation.
4. **Core Workspace Route Pages Setup**:
   - **Dashboard (`/`)**: High-level command center with 4 financial and pipeline metrics, active projects list, and recent invoices.
   - **Clients CRM (`/clients`)**: Directory and pipeline view matching Din 8 backend schema (`lead`, `prospect`, `active`, `inactive`).
   - **Projects (`/projects`)**: Deliverable tracking with budgets, deadlines, and milestone progress bars matching Din 9 backend schema.
   - **Kanban Tasks (`/tasks`)**: Visual 4-column agile sprint board (`todo`, `in_progress`, `review`, `done`) matching Din 10 backend schema.
   - **Invoices & Billing (`/invoices`)**: Invoice ledger with automated line-item totals, tax, discounts, and payment statuses matching Din 11 backend schema.
   - **Authentication (`/login`, `/register`)**: Token-ready forms with role selection (`freelancer`, `agency_owner`, `client`) and demo credentials helper.
   - **404 Not Found (`*`)**: Graceful catch-all error handling.
5. **Backend Proxy & Fullstack Integration**:
   - `vite.config.js` me `/api` requests ko seedha `http://localhost:5000` (Node.js/Express server) par proxy forward karne ki configuration.

---

## 2. Directory Structure (`client/`)

```text
freelancer-crm-tracker/
├── client/
│   ├── index.html                   # HTML5 shell with Google Fonts & SEO tags
│   ├── package.json                 # Client dependencies & Vite build scripts
│   ├── vite.config.js               # Vite config + Express backend proxy (:5000)
│   ├── public/
│   │   └── favicon.svg              # Custom branded SVG vector tab icon
│   └── src/
│       ├── main.jsx                 # React root DOM mounting point
│       ├── App.jsx                  # Main router provider wrapper
│       ├── App.css                  # Transition & animation helper styles
│       ├── index.css                # Global design system & theme variables
│       ├── components/
│       │   └── layout/
│       │       ├── Layout.jsx       # Root shell layout with <Outlet />
│       │       ├── Sidebar.jsx      # Navigation sidebar with active indicators
│       │       ├── Navbar.jsx       # Top header, dynamic breadcrumb & search
│       │       └── Footer.jsx       # Responsive status & copyright footer
│       ├── pages/
│       │   ├── Dashboard.jsx        # Command center with KPIs & recent items
│       │   ├── Clients.jsx          # Client directory & pipeline stages (Din 8)
│       │   ├── Projects.jsx         # Project tracker & milestone progress (Din 9)
│       │   ├── Tasks.jsx            # Kanban agile board with 4 columns (Din 10)
│       │   ├── Invoices.jsx         # Invoice builder & financial ledger (Din 11)
│       │   ├── Login.jsx            # Sign-in form with demo credentials autofill
│       │   ├── Register.jsx         # Registration form with RBAC role select
│       │   └── NotFound.jsx         # 404 error page with return navigation
│       └── routes/
│           └── AppRoutes.jsx        # Centralized route tree definition
```

---

## 3. Route Map & Navigation Architecture

| URL Path | Component | Layout Wrapper | Purpose |
| :--- | :--- | :---: | :--- |
| `/` | `Dashboard.jsx` | Yes (`Layout`) | Key metrics, ongoing projects overview, recent billing activities |
| `/clients` | `Clients.jsx` | Yes (`Layout`) | Client directory with status filters (`lead`, `prospect`, `active`) |
| `/projects` | `Projects.jsx` | Yes (`Layout`) | Project deliverable milestones, budget usage, and task counts |
| `/tasks` | `Tasks.jsx` | Yes (`Layout`) | 4-column agile Kanban board with real-time status advancement |
| `/invoices` | `Invoices.jsx` | Yes (`Layout`) | Invoices ledger, total revenue cards, and payment tracking |
| `/login` | `Login.jsx` | Yes (`Layout`) | Secure JWT authentication entry point with instant demo seeds |
| `/register` | `Register.jsx` | Yes (`Layout`) | New user onboarding with platform RBAC role selection |
| `*` | `NotFound.jsx` | Yes (`Layout`) | Friendly 404 page for nonexistent or unlinked URLs |

---

## 4. Vite & Backend Proxy Configuration

`client/vite.config.js` Express backend ke sath direct integration enable karta hai:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

Jab frontend se `fetch('/api/clients')` ya `axios.get('/api/projects')` call kiya jata hai, browser directly `http://localhost:5173/api/clients` ko call karta hai, aur Vite dev server automatically usay `http://localhost:5000/api/clients` par forward kar deta hai. Is se CORS issues khatam ho jate hain!

---

## 5. Development & Verification Commands

### 1. Frontend Development Server Chalayein
```bash
# Workspace root se:
npm run client

# Ya direct client folder se:
cd client
npm run dev
```
Dev server **`http://localhost:5173/`** par accessible hoga.

### 2. Frontend Production Bundle Build Karein
```bash
# Workspace root se:
npm run client:build

# Ya direct client folder se:
cd client
npm run build
```

### 3. Din 12 Automated Verification Test Suite Chalayein
```bash
# 62-point verification suite
npm run test:day12
```

### 4. Mukammal Fullstack Regression Test Suite Chalayein (Day 5 - Day 12)
```bash
npm run test:all
```
