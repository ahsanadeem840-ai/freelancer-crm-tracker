# Task CRUD API & Project Linking Documentation

**Project:** Freelance CRM & Project Tracker  
**Roadmap Stage:** Din 10 (Task CRUD API, Project Linking, Kanban Board & Analytics)  
**Technology:** Node.js (v24+), Express.js (v5), Mongoose ODM (v9), JSON Web Tokens (JWT), Postman  

> 🔗 **Related Architecture Guides:**
> - [Database Planning & Schema Specs (Din 1)](DATABASE_SCHEMA.md)
> - [Schema Relationships & Integrity Blueprint (Din 2)](SCHEMA_RELATIONSHIPS.md)
> - [Backend Setup & Server Initialization (Din 3)](BACKEND_SETUP.md)
> - [Folder Structure & MongoDB Connection (Din 4)](FOLDER_STRUCTURE_AND_DB.md)
> - [User Model & Signup API (Din 5)](USER_MODEL_AND_SIGNUP_API.md)
> - [Login API & JWT Verification (Din 6)](LOGIN_API_AND_JWT.md)
> - [Role-Based Access Control - RBAC (Din 7)](ROLE_BASED_ACCESS_CONTROL.md)
> - [Client CRUD API & CRM Pipeline (Din 8)](CLIENT_CRUD_API.md)
> - [Project CRUD API & Client Linking (Din 9)](PROJECT_CRUD_API.md)

---

## 1. Overview & Objectives (Maqsad)

Din 10 ka bunyadi maqsad platform ke core execution module ke liye **Enterprise-Grade Task Management CRUD API** tayyar karna hai, **Project aur Task ke darmiyan relational link** qaim karna hai, aur interactive **Kanban Board** ke liye drag-and-drop order updates aur status transitions ko implement karna hai:

1. **Task Creation & Parent Project Linking (`POST /api/tasks`)**:
   - Har task ko kisi na kisi valid parent project ke sath link karna lazmi hai (`projectId` is required).
   - **Multi-Tenant Referential Security**: Agar Freelancer A kisi aise project ki ID pass kare jo kisi doosre freelancer (Freelancer B) ka ho, ya DB mein exist na karta ho, tou system foran `403 Forbidden` ya `404 Not Found` return karta hai.
   - **Automatic Status & Completion Lifecycle**: Jab task create ya update karte waqt status `'done'` set kiya jaye, tou Mongoose pre-save hook automatically `isCompleted = true` synchronise kar deta hai. Agar status dobara kisi doosri state (`'todo'`, `'in_progress'`, `'in_review'`) mein move ho, tou `isCompleted = false` reset ho jata hai.
   - Estimated hours, actual hours, due dates, tags, aur Kanban column order positioning ka mukammal control.

2. **Task Listing with Multi-Tenancy & Population (`GET /api/tasks`)**:
   - Strict multi-tenancy: Har freelancer sirf apne banaye hue tasks inspect kar sakta hai. Admins sabhi ya specific user ke tasks inspect kar sakte hain.
   - **Automatic Mongoose Population**: Har task object ke andar linked `projectId` expand hokar project ka `title`, `status`, `priority`, aur `clientId` deliver karta hai. Sath hi owner ki details (`name`, `email`, `role`) populate hoti hain.
   - Relationship filtering: `?projectId=<id>` se specific project ke tamam tasks filter ho sakte hain.
   - Column status filtering: `?status=todo | in_progress | in_review | done`.
   - Priority filtering: `?priority=low | medium | high | urgent`.
   - Full-text search: `?search=keyword` jo task ke `title` aur `description` ko case-insensitively scan karta hai.
   - Flexible pagination (`?page=1&limit=10`) aur Kanban fetch-all mode (`?all=true` ya `?limit=0`).

3. **Direct Project-to-Tasks Relationship (`GET /api/projects/:id/tasks`)**:
   - Dedicated relationship endpoint jo project details ke sath uske tamam linked tasks ko Kanban column ordering (`order: 1, createdAt: 1`) ke mutabiq deliver karta hai.

4. **Single Task Details (`GET /api/tasks/:id`)**:
   - Populated Project aur Owner details ke sath single task provide karta hai.
   - Unauthorized cross-tenant inspection par strict `403 Forbidden` guard.

5. **Task Updates (`PUT /api/tasks/:id` & `PATCH /api/tasks/:id`)**:
   - Status transitions (`todo` ➔ `in_progress` ➔ `in_review` ➔ `done`).
   - Title, description, priority, due date, estimated/actual hours, tags aur column order modification.

6. **Interactive Kanban Drag-and-Drop Batch Reordering (`PUT /api/tasks/reorder`)**:
   - Frontend Kanban board par jab user cards ko ek column se doosre column mein drag karta hai ya order change karta hai, tou ek hi batch request mein `[{ id, status, order }]` payload send karke MongoDB `bulkWrite` ke zariye high-performance update kiya jata hai.

7. **Task Pipeline & Productivity Analytics (`GET /api/tasks/stats`)**:
   - Status breakdown (`todo`, `in_progress`, `in_review`, `done`).
   - Priority counts (`low`, `medium`, `high`, `urgent`).
   - Productivity metrics: `completed`, `pending`, `completionRate` (percentage), `overdue` tasks count, aur total `estimatedHours` vs `actualHours`.
   - Optional project scoping: `?projectId=<id>`.

8. **Automated Verification & Postman Suite**:
   - 55-point automated verification suite (`server/tests/verify_day10.js`).
   - Comprehensive Postman Collection with automated test scripts: [`postman/Freelancer_CRM_Day10_Tasks.postman_collection.json`](../postman/Freelancer_CRM_Day10_Tasks.postman_collection.json).

---

## 2. API Endpoints Specification Matrix

| Method | Endpoint | Access | Allowed Roles | Description |
| :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/tasks` | Private | `admin`, `agency_owner`, `freelancer` | Naya task create karein (Parent project link lazmi hai) |
| `GET` | `/api/tasks` | Private | `admin`, `agency_owner`, `freelancer` | Tasks list karein (Search, Project filter, Status, Pagination) |
| `GET` | `/api/tasks/stats` | Private | `admin`, `agency_owner`, `freelancer` | Task pipeline status counts, hours & productivity stats |
| `PUT` | `/api/tasks/reorder` | Private | `admin`, `agency_owner`, `freelancer` | Kanban cards ka batch order & column status update karein |
| `GET` | `/api/tasks/:id` | Private | `admin`, `agency_owner`, `freelancer` | Single task details with populated Project & Owner |
| `PUT` | `/api/tasks/:id` | Private | `admin`, `agency_owner`, `freelancer` | Task details, hours, priority, aur status update karein |
| `PATCH` | `/api/tasks/:id` | Private | `admin`, `agency_owner`, `freelancer` | Task ka partial update (e.g. status complete karna) |
| `DELETE` | `/api/tasks/:id` | Private | `admin`, `agency_owner`, `freelancer` | Task record delete karein |
| `GET` | `/api/projects/:id/tasks` | Private | `admin`, `agency_owner`, `freelancer` | Specific project ke tamam linked tasks fetch karein |

> **Security Guard:** `client` role users ko task management endpoints se restrict kiya gaya hai (`403 Forbidden`).

---

## 3. Detailed Request & Response Examples

### 3.1. Create Task (`POST /api/tasks`)

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Build Stripe Webhook Endpoint for Payment Verification",
  "description": "Handle checkout.session.completed and invoice.payment_succeeded events with idempotent database transactions.",
  "projectId": "673f8a1b2c3d4e5f6a7b8c9e",
  "status": "in_progress",
  "priority": "urgent",
  "dueDate": "2026-10-25T18:00:00.000Z",
  "estimatedHours": 8,
  "actualHours": 2.5,
  "tags": ["Stripe", "Webhooks", "Backend", "Security"]
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "67401a2b3c4d5e6f7a8b9c0d",
    "userId": "66f07a9b1c2d3e4f5a6b7c8a",
    "projectId": {
      "_id": "673f8a1b2c3d4e5f6a7b8c9e",
      "title": "E-Commerce Web Platform Re-architecture",
      "status": "in_progress",
      "priority": "high",
      "clientId": "66f07a9b1c2d3e4f5a6b7c8d"
    },
    "title": "Build Stripe Webhook Endpoint for Payment Verification",
    "description": "Handle checkout.session.completed and invoice.payment_succeeded events with idempotent database transactions.",
    "status": "in_progress",
    "priority": "urgent",
    "dueDate": "2026-10-25T18:00:00.000Z",
    "estimatedHours": 8,
    "actualHours": 2.5,
    "order": 1,
    "isCompleted": false,
    "tags": ["Stripe", "Webhooks", "Backend", "Security"],
    "createdAt": "2026-09-22T23:57:00.000Z",
    "updatedAt": "2026-09-22T23:57:00.000Z"
  }
}
```

---

### 3.2. List Tasks with Filters & Search (`GET /api/tasks`)

**Example Request:**
```http
GET /api/tasks?projectId=673f8a1b2c3d4e5f6a7b8c9e&status=in_progress&sort=order
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
      "_id": "67401a2b3c4d5e6f7a8b9c0d",
      "title": "Build Stripe Webhook Endpoint for Payment Verification",
      "status": "in_progress",
      "priority": "urgent",
      "estimatedHours": 8,
      "actualHours": 2.5,
      "order": 1,
      "isCompleted": false,
      "projectId": {
        "_id": "673f8a1b2c3d4e5f6a7b8c9e",
        "title": "E-Commerce Web Platform Re-architecture"
      }
    }
  ]
}
```

---

### 3.3. Batch Reorder Kanban Cards (`PUT /api/tasks/reorder`)

Kanban boards par cards ko move karne ke liye frontend single batch call execute kar sakta hai:

**Request Body:**
```json
{
  "tasks": [
    {
      "id": "67401a2b3c4d5e6f7a8b9c0d",
      "status": "done",
      "order": 0
    },
    {
      "id": "67402b3c4d5e6f7a8b9c0e1f",
      "status": "in_review",
      "order": 1
    }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Successfully reordered 2 tasks",
  "count": 2
}
```

---

### 3.4. Task Productivity & Pipeline Analytics (`GET /api/tasks/stats`)

**Request:**
```http
GET /api/tasks/stats
Authorization: Bearer <JWT_TOKEN>
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "total": 18,
    "statusBreakdown": {
      "todo": 5,
      "in_progress": 6,
      "in_review": 3,
      "done": 4
    },
    "priorityBreakdown": {
      "low": 2,
      "medium": 7,
      "high": 6,
      "urgent": 3
    },
    "productivity": {
      "completed": 4,
      "pending": 14,
      "completionRate": 22,
      "overdue": 1,
      "totalEstimatedHours": 94,
      "totalActualHours": 38.5
    }
  }
}
```

---

### 3.5. Get Project Tasks (`GET /api/projects/:id/tasks`)

**Request:**
```http
GET /api/projects/673f8a1b2c3d4e5f6a7b8c9e/tasks
Authorization: Bearer <JWT_TOKEN>
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "project": {
    "_id": "673f8a1b2c3d4e5f6a7b8c9e",
    "title": "E-Commerce Web Platform Re-architecture",
    "status": "in_progress",
    "priority": "high"
  },
  "count": 3,
  "total": 3,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "67401a2b3c4d5e6f7a8b9c0d",
      "title": "Design Database Schemas",
      "status": "done",
      "priority": "high",
      "order": 0,
      "isCompleted": true
    },
    {
      "_id": "67402b3c4d5e6f7a8b9c0e1f",
      "title": "Build Stripe Webhook Endpoint",
      "status": "in_progress",
      "priority": "urgent",
      "order": 1,
      "isCompleted": false
    }
  ]
}
```

---

## 4. Multi-Tenancy & Security Rules

1. **Isolation Guarantee**:
   - `User A` (Freelancer Alpha) kabhi bhi `User B` (Freelancer Beta) ke kisi task ko inspect, update, reorder ya delete nahi kar sakta.
   - Har request par MongoDB query filter mein `{ userId: req.user._id }` automatically inject hota hai.
   - Task create karte waqt check hota hai ke referenced `projectId` authenticated freelancer ki apni ownership mein ho (`project.userId === req.user._id`).
   - Cross-tenant violations par strict `403 Forbidden` return hota hai.

2. **Role-Based Access Control (RBAC)**:
   - Tasks manage karne ka ikhtiyar sirf `freelancer`, `agency_owner`, aur `admin` ke paas hai.
   - `client` role ko tasks modify ya create karne ki ijazat nahi hai (`403 Forbidden`).

---

## 5. Automated Verification Results

Din 10 ke tamam requirements ko test karne ke liye **55 automated tests** run kiye gaye hain:

```bash
# Run Day 10 test suite directly
npm run test:day10

# Run all roadmap tests (Day 5 to Day 10)
npm run test:all
```

**Test Suite Summary:**
- ✅ **Category 1: Task Schema Validation Rules** (14 tests passed)
- ✅ **Category 2: Task Creation Controller Validations** (7 tests passed)
- ✅ **Category 3: Single Task, Reorder & ID Format Validations** (6 tests passed)
- ✅ **Category 4: RBAC & Route Protection on Task Endpoints** (5 tests passed)
- ✅ **Category 5: Live Database Multi-Tenant Task CRUD & Project Linking** (23 tests passed)

**Overall Status:** `55 / 55 tests passed (100% success rate)`.
