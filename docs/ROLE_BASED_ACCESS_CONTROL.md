# Role-Based Access Control (RBAC) & Middleware Documentation

**Project:** Freelance CRM & Project Tracker  
**Roadmap Stage:** Din 7 (Role-Based Access Control)  
**Technology:** Node.js (v24+), Express.js (v5), Mongoose ODM, JSON Web Tokens (JWT)  

> 🔗 **Related Architecture Guides:**
> - [Database Planning & Schema Specs (Din 1)](DATABASE_SCHEMA.md)
> - [Schema Relationships & Integrity Blueprint (Din 2)](SCHEMA_RELATIONSHIPS.md)
> - [Backend Setup & Server Initialization (Din 3)](BACKEND_SETUP.md)
> - [Folder Structure & MongoDB Connection (Din 4)](FOLDER_STRUCTURE_AND_DB.md)
> - [User Model & Signup API (Din 5)](USER_MODEL_AND_SIGNUP_API.md)
> - [Login API & JWT Verification (Din 6)](LOGIN_API_AND_JWT.md)

---

## 1. Overview & Objectives (Maqsad)

Din 7 ka bunyadi maqsad platform par **Role-Based Access Control (RBAC)** implement karna hai taake har user sirf apne role ke mutabiq authorized resources aur endpoints access kar sake:

1. **Admin aur Client Role Addition in User Model**:
   - `User` Mongoose schema ke `role` enum field mein **`admin`** aur **`client`** roles shamil kiye gaye.
   - Platform ke complete 5 supported roles:
     - `admin`: System-wide access, platform oversight, user & workspace management.
     - `client`: Customer portal access, view own projects, approve invoices, monitor deliverables.
     - `freelancer`: Default role, manage clients, track tasks, create invoices, view project boards.
     - `agency_owner`: Team management, multi-client portfolios, financial analytics.
     - `team_member`: Assigned task execution, timesheet logging, project collaboration.
2. **Signup & Registration Controller Updates**:
   - `ALLOWED_ROLES` whitelist array ko update kiya gaya taake `admin` aur `client` roles registration ke waqt accept ho sakein.
   - Invalid / unauthorized roles par informative `400 Bad Request` validation message.
3. **Role Authorization Middleware (`authorize`)**:
   - Role-based route guard banaya gaya jo checks karta hai:
     - Kya user authenticated hai (`req.user` mojood hai)? Agar nahi to `401 Unauthorized`.
     - Kya user ka role allowed roles mein shamil hai? Agar nahi to `403 Forbidden`.
   - Flexible arguments support: spread (`authorize('admin', 'client')`) aur arrays (`authorize(['admin', 'client'])`).
4. **Convenience Guards & Naming Aliases**:
   - Pre-configured role guards: `isAdmin`, `isClient`, `isFreelancer`, `isAgencyOwner`, `isAdminOrClient`.
   - Aliases: `checkRole`, `restrictTo`, `requireRole` taake different conventions seamlessly support hon.
5. **Route Protection Integration**:
   - `authRoutes.js` mein role-protected demonstration routes:
     - `GET /api/auth/admin-dashboard` (Protected by `isAdmin`)
     - `GET /api/auth/client-portal` (Protected by `isClient`)
     - `GET /api/auth/admin-or-client` (Protected by `isAdminOrClient`)
   - `clientRoutes.js` mein CRUD operations par role-based restrictions.
6. **Comprehensive Automated Verification Suite**:
   - 29-point test suite (`server/tests/verify_day7.js`) covering schema validation, registration, JWT token decoding, middleware permissions, 401/403 status codes, and DB operations.

---

## 2. RBAC Permissions Matrix

| Endpoint | Method | Allowed Roles | Middleware Guard | Purpose |
| :--- | :---: | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | None | New user registration |
| `/api/auth/login` | `POST` | Public | None | User authentication & JWT issuance |
| `/api/auth/me` | `GET` | All Authenticated | `protect` | Current user profile |
| `/api/auth/admin-dashboard` | `GET` | `admin` | `protect, isAdmin` | Admin system dashboard |
| `/api/auth/client-portal` | `GET` | `client` | `protect, isClient` | Client invoice & project view |
| `/api/auth/admin-or-client` | `GET` | `admin`, `client` | `protect, isAdminOrClient` | Shared administrative/client view |
| `/api/clients` | `GET` | `admin`, `agency_owner`, `freelancer` | `protect, authorize(...)` | CRM client listing |
| `/api/clients` | `POST` | `admin`, `agency_owner` | `protect, authorize(...)` | Create new client record |

---

## 3. Middleware Architecture & Flow

```text
Incoming Request
       │
       ▼
┌──────────────────────────────┐
│      protect Middleware      │
│  (Validates JWT Bearer Token)│
└──────────────┬───────────────┘
       │
       ├─ No / Invalid Token ──────► 401 Unauthorized
       ▼
req.user Attached
       │
       ▼
┌──────────────────────────────┐
│  authorize(...roles) Guard   │
│  (Validates req.user.role)   │
└──────────────┬───────────────┘
       │
       ├─ Role not in allowed ─────► 403 Forbidden
       ▼
next() -> Controller Executed
```

---

## 4. Code Implementation Highlights

### 4.1. User Schema Role Field (`server/models/User.js`)

```javascript
role: {
  type: String,
  enum: {
    values: ['admin', 'client', 'freelancer', 'agency_owner', 'team_member'],
    message: '{VALUE} is not a valid user role',
  },
  default: 'freelancer',
},
```

### 4.2. Role-Based Authorization Middleware (`server/middleware/authMiddleware.js`)

```javascript
const authorize = (...roles) => {
  const allowedRoles = roles.flat(Infinity);

  return (req, res, next) => {
    // 1. Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please log in first.',
      });
    }

    // 2. Check if user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role || 'unknown'}' is not authorized to access this route.`,
      });
    }

    next();
  };
};

// Aliases
const checkRole = authorize;
const restrictTo = authorize;
const requireRole = authorize;

// Convenience guards
const isAdmin = authorize('admin');
const isClient = authorize('client');
const isFreelancer = authorize('freelancer');
const isAgencyOwner = authorize('agency_owner');
const isAdminOrClient = authorize('admin', 'client');
```

---

## 5. Status Codes & Error Responses

| Scenario | HTTP Status | Response Payload |
| :--- | :---: | :--- |
| Missing or invalid JWT | `401 Unauthorized` | `{"success": false, "message": "Not authorized to access this route. No token provided."}` |
| Token valid but user lacks required role | `403 Forbidden` | `{"success": false, "message": "User role 'freelancer' is not authorized to access this route."}` |
| Token valid & role matches permitted list | `200 OK` | `{"success": true, "message": "Welcome to the Admin Dashboard...", "user": {...}}` |

---

## 6. How to Run Verification Tests

Run the dedicated Day 7 RBAC verification suite:
```bash
# In project root
npm run test:day7

# Or inside server directory
npm run test
```

Run all test suites (Day 5 + Day 6 + Day 7):
```bash
npm run test:all
```
