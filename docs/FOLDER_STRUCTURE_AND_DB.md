# Backend Folder Structure & MongoDB Atlas Connection

**Project:** Freelance CRM & Project Tracker  
**Roadmap Stage:** Din 4 (Folder Structure + DB Connect)  
**Technology:** Node.js (v24+), Express.js (v5), Mongoose (v8+), MongoDB Atlas  

> 🔗 **Related Architecture Guides:**
> - [Database Planning & Schema Specs (Din 1)](DATABASE_SCHEMA.md)
> - [Schema Relationships & Integrity Blueprint (Din 2)](SCHEMA_RELATIONSHIPS.md)
> - [Backend Setup & Server Initialization (Din 3)](BACKEND_SETUP.md)
> - [Visual Architecture Vector Diagram](schema-diagram.svg)

---

## 1. Overview & Objectives (Maqsad)

Din 4 ka maqsad backend application ko ek clean, modular, aur scalable **MVC (Model-View-Controller)** pattern me organize karna hai, aur **MongoDB Atlas** cloud database ko **Mongoose ODM** ke zariye connect karna hai.

### Din 4 ke Core Deliverables:
1. **Mongoose ODM Installation:** Data modeling aur database connectivity ke liye `mongoose` install kiya gaya.
2. **Modular Folder Architecture:**
   - `server/config/`: Database connection logic (`db.js`).
   - `server/models/`: MongoDB schemas aur models (`User`, `Client`, `Project`, `Task`, `Invoice`, `Notification`).
   - `server/controllers/`: Business logic aur request handling controllers.
   - `server/routes/`: Domain-specific REST API routers.
   - `server/middleware/`: Reusable middlewares (error handler, auth guards).
3. **Database Connection Manager (`server/config/db.js`):**
   - Asynchronous `connectDB()` function.
   - Server selection timeout (8 seconds) with connection lifecycle event listeners (`connected`, `disconnected`, `reconnected`).
   - Actionable hints for IP whitelist and authentication failures.
4. **Mongoose Schemas & Compilations:**
   - Din 1 aur Din 2 ke mutabiq tamam 6 models strict type validation, enums, compound indexes, aur pre-save hooks ke sath implement kiye gaye.
5. **Dynamic Health Check Integration:**
   - `/api/health` aur `/` endpoints ab live MongoDB connection status (`connected`, `disconnected`, `host`, `name`) report karte hain.

---

## 2. Updated Project Directory Architecture

```text
freelancer-crm-tracker/
├── package.json                   # Root workspace scripts (npm run server)
├── app.js                         # Root proxy delegating to server/app.js
├── README.md                      # Complete roadmap tracker & documentation
├── docs/                          # Architectural & system design documentation
│   ├── DATABASE_SCHEMA.md         # Din 1 Schema specs
│   ├── SCHEMA_RELATIONSHIPS.md    # Din 2 Relationships blueprint
│   ├── BACKEND_SETUP.md           # Din 3 Express backend setup
│   └── FOLDER_STRUCTURE_AND_DB.md # Din 4 Folder structure & DB setup (This file)
└── server/                        # Node.js + Express Backend Root
    ├── package.json               # Server dependencies (includes mongoose)
    ├── package-lock.json          # Locked dependency tree
    ├── .env                       # Environment secrets (MONGODB_URI, JWT_SECRET)
    ├── .env.example               # Template environment configuration
    ├── app.js                     # Core Express application entrypoint
    ├── config/                    # Configuration modules
    │   └── db.js                  # Mongoose MongoDB Atlas connection manager
    ├── models/                    # Mongoose Data Models
    │   ├── User.js                # Freelancer / Agency User model
    │   ├── Client.js              # Client CRM model
    │   ├── Project.js             # Project tracking model
    │   ├── Task.js                # Kanban task model
    │   ├── Invoice.js             # Invoicing & Stripe billing model
    │   ├── Notification.js        # Socket.io notification model
    │   └── index.js               # Centralized barrel export
    ├── controllers/               # Request Handlers & Business Logic
    │   ├── authController.js      # Auth & registration handlers
    │   ├── clientController.js    # Client CRM handlers
    │   ├── projectController.js   # Project tracking handlers
    │   ├── taskController.js      # Kanban task handlers
    │   ├── invoiceController.js   # Invoice handlers
    │   └── notificationController.js # Notification handlers
    ├── routes/                    # Modular Express Routers
    │   ├── authRoutes.js          # /api/auth
    │   ├── clientRoutes.js        # /api/clients
    │   ├── projectRoutes.js       # /api/projects
    │   ├── taskRoutes.js          # /api/tasks
    │   ├── invoiceRoutes.js       # /api/invoices
    │   ├── notificationRoutes.js  # /api/notifications
    │   └── index.js               # Central router aggregator (/api)
    └── middleware/                # Custom Middlewares
        ├── errorMiddleware.js     # 404 handler & Mongoose centralized error formatter
        └── authMiddleware.js      # JWT protect & role authorize middleware placeholder
```

---

## 3. MongoDB Atlas Connection Guide (`server/config/db.js`)

Database connection ko robust aur production-grade banane ke liye event monitoring aur timeout protection di gayi hai:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is missing. Please check your .env file.');
  }

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  console.log(`📦 Database Name:    ${conn.connection.name}`);
  return conn;
};
```

### MongoDB Atlas Setup Checklist:
1. **Atlas Cluster:** Free M0 cluster created on [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2. **Database User:** Created in *Security -> Database Access* with username (e.g. `ahsan`) and password with `readWriteAnyDatabase` privileges.
3. **Network Access (IP Whitelist):**
   - Go to *Security -> Network Access*.
   - Click *Add IP Address* -> select **Allow Access from Anywhere** (`0.0.0.0/0`) during development.
4. **URI Encoding:**
   - If password contains special characters (like `@`), encode it with percent-encoding (`@` -> `%40`).
   - Example URI format in `server/.env`:
     ```env
     MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.82uoppt.mongodb.net/freelancer_crm?retryWrites=true&w=majority
     ```

---

## 4. Mongoose Models Summary

| Model | File | Primary Responsibility | Key Indexes |
| :--- | :--- | :--- | :--- |
| **`User`** | `models/User.js` | User authentication, agency profiles, Stripe account IDs. | `{ email: 1 }` (Unique) |
| **`Client`** | `models/Client.js` | CRM contact directory, pipeline status (`lead`, `active`, etc.). | `{ userId: 1, email: 1 }`, `{ userId: 1, status: 1 }` |
| **`Project`** | `models/Project.js` | Milestones, budgets, hourly/fixed pricing, client relationships. | `{ userId: 1, status: 1 }`, `{ clientId: 1 }` |
| **`Task`** | `models/Task.js` | Kanban columns (`todo`, `in_progress`, `done`), drag order, hours. | `{ projectId: 1, status: 1, order: 1 }`, `{ userId: 1, dueDate: 1 }` |
| **`Invoice`** | `models/Invoice.js` | Invoices, itemized calculations, tax, discount, Stripe status. | `{ invoiceNumber: 1 }`, `{ userId: 1, status: 1 }`, `{ clientId: 1 }` |
| **`Notification`** | `models/Notification.js` | In-app alerts, Socket.io event log with auto-cleanup (30d TTL). | `{ userId: 1 }`, `{ createdAt: 1 }` (Expires after 30 days) |

---

## 5. Verification & Testing

### Test 1: Compile & Load All Models
```bash
node -e "const models = require('./server/models'); console.log('MODELS LOADED:', Object.keys(models));"
```
**Output:**
```text
MODELS LOADED: [ 'User', 'Client', 'Project', 'Task', 'Invoice', 'Notification' ]
```

### Test 2: Check API Health & Database Status
Make a `GET` request to `http://localhost:5000/api/health`:
```json
{
  "success": true,
  "status": "ok",
  "uptimeSeconds": 12,
  "environment": "development",
  "database": {
    "status": "connected",
    "readyState": 1,
    "host": "cluster0-shard-00-00.82uoppt.mongodb.net",
    "name": "freelancer_crm"
  }
}
```

---

## 6. Next Steps (Din 5 Roadmap)

Din 4 successfully complete ho chuka hai! Agla marhala (**Din 5**) hoga:
- **Authentication API:** User registration & login with `bcryptjs` password hashing.
- **JWT Generation & Verification:** Access tokens, secure HTTP cookies, and protected route middlewares.
