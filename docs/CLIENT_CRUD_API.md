# Client CRUD API & CRM Pipeline Documentation

**Project:** Freelance CRM & Project Tracker  
**Roadmap Stage:** Din 8 (Client CRUD API)  
**Technology:** Node.js (v24+), Express.js (v5), Mongoose ODM, JSON Web Tokens (JWT), Postman  

> 🔗 **Related Architecture Guides:**
> - [Database Planning & Schema Specs (Din 1)](DATABASE_SCHEMA.md)
> - [Schema Relationships & Integrity Blueprint (Din 2)](SCHEMA_RELATIONSHIPS.md)
> - [Backend Setup & Server Initialization (Din 3)](BACKEND_SETUP.md)
> - [Folder Structure & MongoDB Connection (Din 4)](FOLDER_STRUCTURE_AND_DB.md)
> - [User Model & Signup API (Din 5)](USER_MODEL_AND_SIGNUP_API.md)
> - [Login API & JWT Verification (Din 6)](LOGIN_API_AND_JWT.md)
> - [Role-Based Access Control - RBAC (Din 7)](ROLE_BASED_ACCESS_CONTROL.md)

---

## 1. Overview & Objectives (Maqsad)

Din 8 ka bunyadi maqsad platform ke CRM module ke liye **Enterprise-Grade Client CRUD API** banana hai taake freelancers aur agencies apne clients ki complete lifecycle (Leads ➡️ Prospects ➡️ Active Clients ➡️ Inactive) ko manage aur track kar sakein:

1. **Client Creation (Add Client)**:
   - `POST /api/clients`: Naye client ki contact details, company, address, pipeline status, currency, notes, aur tags save karta hai.
   - Authenticated user ki `userId` JWT token se automatic bind hoti hai.
   - Same workspace mein duplicate email se bachne ke liye intra-workspace validation mojood hai.

2. **Client Listing with Multi-Tenancy (List Clients)**:
   - `GET /api/clients`: Strict multi-tenancy guarantee karta hai ke Freelancer A sirf apne clients dekh sake.
   - Text search support (`?search=keyword`) jo `name`, `company`, aur `email` ko simultaneously scan karta hai.
   - Filter by status (`?status=active|lead|prospect|inactive`) aur tag filter (`?tag=VIP`).
   - Built-in pagination (`?page=1&limit=10`) aur sorting (`?sort=-createdAt`).

3. **Single Client Details (Get By ID)**:
   - `GET /api/clients/:id`: Single client ki complete profile fetch karta hai.
   - ObjectId format validation aur cross-tenant protection (`403 Forbidden` agar koi doosra user access karne ki koshish kare).

4. **Client Update (Edit Client)**:
   - `PUT /api/clients/:id` & `PATCH /api/clients/:id`: Contact info, pipeline stage, notes, address aur billing preferences ko seamlessly update karta hai.

5. **Client Deletion (Delete Client)**:
   - `DELETE /api/clients/:id`: Authorized owner ya admin ke zariye client record remove karta hai.

6. **CRM Pipeline Analytics (Summary Stats)**:
   - `GET /api/clients/stats`: Dashboard widgets ke liye live counts (Leads, Prospects, Active, Inactive) aur financial aggregates (`totalBilled`, `totalPaid`, `balanceOutstanding`) provide karta hai.

7. **Ready-to-Use Postman Collection**:
   - Automated test scripts aur environment variables (`{{baseUrl}}`, `{{token}}`, `{{clientId}}`) ke sath complete test suite file: [`postman/Freelancer_CRM_Day8_Clients.postman_collection.json`](../postman/Freelancer_CRM_Day8_Clients.postman_collection.json).

---

## 2. API Endpoints Specification Matrix

| Method | Endpoint | Access | Allowed Roles | Description |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/clients` | Private | `admin`, `agency_owner`, `freelancer` | Naya client add karein |
| `GET` | `/api/clients` | Private | `admin`, `agency_owner`, `freelancer` | Clients list karein (Search, Filter, Pagination) |
| `GET` | `/api/clients/stats` | Private | `admin`, `agency_owner`, `freelancer` | CRM pipeline status counts aur billing stats |
| `GET` | `/api/clients/:id` | Private | `admin`, `agency_owner`, `freelancer` | Single client details dekhein |
| `PUT` | `/api/clients/:id` | Private | `admin`, `agency_owner`, `freelancer` | Client profile aur status update karein |
| `DELETE` | `/api/clients/:id` | Private | `admin`, `agency_owner`, `freelancer` | Client ko system se delete karein |

> **Notice:** Users with role `client` are restricted (`403 Forbidden`) from managing clients in the CRM.

---

## 3. Detailed Request & Response Examples

### 3.1. Create Client (`POST /api/clients`)

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Sarah Jenkins",
  "email": "sarah@nexusmedia.io",
  "company": "Nexus Media Labs",
  "phone": "+1 (555) 349-8821",
  "website": "https://nexusmedia.io",
  "status": "lead",
  "currency": "USD",
  "notes": "Interested in SaaS redesign. Budget $5k - $10k.",
  "tags": ["SaaS", "High-Priority", "UI/UX"],
  "address": {
    "street": "100 Innovation Way, Suite 400",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94107",
    "country": "USA"
  }
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Client created successfully",
  "data": {
    "_id": "67de23a10b98544fbc40d12e",
    "userId": "67de21ff0b98544fbc40d110",
    "name": "Sarah Jenkins",
    "email": "sarah@nexusmedia.io",
    "company": "Nexus Media Labs",
    "phone": "+1 (555) 349-8821",
    "website": "https://nexusmedia.io",
    "address": {
      "street": "100 Innovation Way, Suite 400",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94107",
      "country": "USA"
    },
    "status": "lead",
    "currency": "USD",
    "notes": "Interested in SaaS redesign. Budget $5k - $10k.",
    "tags": ["SaaS", "High-Priority", "UI/UX"],
    "totalBilled": 0,
    "totalPaid": 0,
    "createdAt": "2026-09-20T07:45:00.000Z",
    "updatedAt": "2026-09-20T07:45:00.000Z"
  }
}
```

---

### 3.2. List Clients (`GET /api/clients`)

**Query Parameters:**
- `search`: Name, company, ya email mein case-insensitive matching (`?search=nexus`)
- `status`: Filter by status (`?status=active`)
- `tag`: Filter by specific tag (`?tag=SaaS`)
- `page`: Page number (Default: `1`)
- `limit`: Per-page count (Default: `10`, Max: `100`)
- `sort`: Sort order (Default: `-createdAt`, ya `name`, `status`)

**Request:**
```http
GET /api/clients?status=lead&page=1&limit=10&sort=-createdAt
Authorization: Bearer <JWT_TOKEN>
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "67de23a10b98544fbc40d12e",
      "userId": "67de21ff0b98544fbc40d110",
      "name": "Sarah Jenkins",
      "email": "sarah@nexusmedia.io",
      "company": "Nexus Media Labs",
      "status": "lead",
      "currency": "USD",
      "tags": ["SaaS", "High-Priority", "UI/UX"],
      "totalBilled": 0,
      "totalPaid": 0
    }
  ]
}
```

---

### 3.3. Get Pipeline Statistics (`GET /api/clients/stats`)

**Request:**
```http
GET /api/clients/stats
Authorization: Bearer <JWT_TOKEN>
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "total": 8,
    "leads": 3,
    "prospects": 2,
    "active": 3,
    "inactive": 0,
    "financials": {
      "totalBilled": 12500,
      "totalPaid": 9000,
      "balanceOutstanding": 3500
    }
  }
}
```

---

### 3.4. Update Client (`PUT /api/clients/:id`)

**Request Body:**
```json
{
  "status": "active",
  "company": "Nexus Media Labs Global Inc.",
  "notes": "Proposal approved! Kickoff call completed.",
  "tags": ["SaaS", "Active-Retainer", "Tier-1"]
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Client updated successfully",
  "data": {
    "_id": "67de23a10b98544fbc40d12e",
    "name": "Sarah Jenkins",
    "email": "sarah@nexusmedia.io",
    "company": "Nexus Media Labs Global Inc.",
    "status": "active",
    "notes": "Proposal approved! Kickoff call completed.",
    "tags": ["SaaS", "Active-Retainer", "Tier-1"]
  }
}
```

---

### 3.5. Delete Client (`DELETE /api/clients/:id`)

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Client deleted successfully",
  "data": {
    "id": "67de23a10b98544fbc40d12e",
    "name": "Sarah Jenkins",
    "email": "sarah@nexusmedia.io"
  }
}
```

---

## 4. Multi-Tenancy & Data Security Rules

1. **Owner Binding (`userId`)**:
   - Har client record par `userId` strictly bind hoti hai jo request ke authenticated JWT se extract ki jati hai. Koi user kisi aur ke naam se client add nahi kar sakta.
2. **Cross-Tenant Isolation**:
   - Jab Freelancer A `GET /api/clients` call karega to database query `{ userId: req.user._id }` execute hoti hai. Freelancer B ke clients total count ya data mein shamil nahi hote.
3. **Cross-Tenant Access Blocking (`403 Forbidden`)**:
   - Agar koi user kisi doosre user ke client ki `_id` direct access karne, update karne ya delete karne ki koshish kare to API `403 Forbidden` ("Not authorized to access this client") return karti hai.
4. **Intra-Workspace Duplicate Prevention**:
   - Ek freelancer apne workspace mein same email do bar enter nahi kar sakta (`400 Bad Request`). Lekin alag alag freelancers ka same client email hona allowed hai (Cross-tenant independence).

---

## 5. Postman Testing Guide (Step-by-Step)

### Step 1: Import Collection
1. Postman open karein.
2. Top-left par **Import** button click karein.
3. File select karein: `freelancer_crm_tracker/postman/Freelancer_CRM_Day8_Clients.postman_collection.json`.

### Step 2: Environment & Variables Setup
Collection mein auto-configured variables mojood hain:
- `baseUrl`: `http://localhost:5000`
- `token`: (Auto-saved during register / login)
- `clientId`: (Auto-saved during create client)

### Step 3: Run Requests in Order
1. **00 - Authentication Setup ➡️ Register Freelancer**:
   - Send click karein.
   - Status `201/200` aayega aur collection variable `token` automatic fill ho jayega.
2. **01 - Client CRUD Operations ➡️ 1. Create New Client**:
   - Send click karein.
   - Naya client create hoga aur `clientId` automatically save ho jayegi.
3. **2. List All Clients**:
   - Freelancer ke saved clients list honge.
4. **3. Get Single Client Details by ID**:
   - Created client ki details display hongi.
5. **4. Update Client**:
   - Status `lead` se `active` mein tabdeel ho jayega.
6. **02 - Search, Filter & Pipeline Analytics ➡️ 4. Get Client Pipeline Stats**:
   - Active leads, prospects, aur financial totals calculate honge.
7. **5. Delete Client by ID**:
   - Client delete ho jayega.
8. **6. Verify Deleted Client Returns 404**:
   - Check karega ke record genuinely delete ho chuka hai.

---

## 6. Automated Testing Suite

Har operation ko 36 unit/integration assertions ke sath verify kiya ja sakta hai:

```bash
# Day 8 test suite
npm run test:day8

# Full platform test suite (Day 5 + Day 6 + Day 7 + Day 8)
npm run test:all
```

**Result Output:**
```text
===========================================================
🧪 Starting Day 8 Test Suite (Client CRUD API & CRM Pipeline)
===========================================================
📦 Category 1: Client Schema Validation Rules (9 Tests)
📝 Category 2: Client Creation Controller (3 Tests)
🔍 Category 3: Single Client & ID Format Validations (3 Tests)
🛡️ Category 4: RBAC & Route Protection on Client Endpoints (5 Tests)
🗄️ Category 5: Live Database Multi-Tenant CRUD Operations (16 Tests)
===========================================================
🎉 ALL 36/36 DAY 8 TESTS PASSED SUCCESSFULLY!
===========================================================
```
