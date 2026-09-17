# Login API & JWT Verification Middleware Documentation

**Project:** Freelance CRM & Project Tracker  
**Roadmap Stage:** Din 6 (Login API + JWT)  
**Technology:** Node.js (v24+), Express.js (v5), Mongoose ODM, Bcrypt.js, JSON Web Tokens (JWT)  

> 🔗 **Related Architecture Guides:**
> - [Database Planning & Schema Specs (Din 1)](DATABASE_SCHEMA.md)
> - [Schema Relationships & Integrity Blueprint (Din 2)](SCHEMA_RELATIONSHIPS.md)
> - [Backend Setup & Server Initialization (Din 3)](BACKEND_SETUP.md)
> - [Folder Structure & MongoDB Connection (Din 4)](FOLDER_STRUCTURE_AND_DB.md)
> - [User Model & Signup API (Din 5)](USER_MODEL_AND_SIGNUP_API.md)

---

## 1. Overview & Objectives (Maqsad)

Din 6 ka bunyadi maqsad platform ka **Secure Login API & JWT Verification Middleware Layer** mukammal karna hai:
1. **Login API (`POST /api/auth/login` aur `/api/auth/signin`)**:
   - Email aur raw password ki validation (presence, sanitization, empty whitespace check).
   - User database lookup with explicitly selected password field (`select('+password')`).
   - Bcrypt cryptographic password comparison (`user.matchPassword(enteredPassword)`).
   - Email enumeration attack prevention (identical 401 response for non-existent user vs invalid password).
   - Signed JSON Web Token (JWT) issuance aur sanitized user object return karna (sensitive fields excluded).
2. **JWT Token Generation (`generateAuthToken`)**:
   - Standard claims (`id`, `role`) ke sath token signing with configurable secret (`JWT_SECRET`) aur expiration (`JWT_EXPIRE`, default: 30 days).
3. **JWT Verification Middleware (`protect` & `verifyToken`)**:
   - HTTP `Authorization: Bearer <token>` header parsing.
   - Cryptographic verification via `jwt.verify`.
   - Expired token (`TokenExpiredError`) aur malformed token errors ki distinct handling.
   - Database lookup to confirm the user still exists in MongoDB (`User.findById(decoded.id).select('-password')`).
   - Authenticated user document ko `req.user` par attach karna.
4. **Role-Based Authorization Guard (`authorize`)**:
   - Route-level role enforcement (`authorize('agency_owner', 'freelancer')`) with 403 Forbidden checks.
5. **Protected Profile Route (`GET /api/auth/me`)**:
   - Verified active session ke sath current user profile fetch karna.
6. **Automated Verification**:
   - 23-point unit & live database test suite (`server/tests/verify_day6.js`).

---

## 2. Authentication Architecture & Flow

```text
                        ┌──────────────────────────────┐
                        │   Client (Postman/Frontend)  │
                        └──────────────┬───────────────┘
                                       │ 1. POST /api/auth/login
                                       │    { email, password }
                                       ▼
                        ┌──────────────────────────────┐
                        │   Express Router & Parser    │
                        │   server/routes/authRoutes   │
                        └──────────────┬───────────────┘
                                       │ 2. Route Handler
                                       ▼
                        ┌──────────────────────────────┐
                        │    Login Controller Logic    │
                        │ server/controllers/authCont. │
                        └──────────────┬───────────────┘
                                       │ 3. Lookup: User.findOne({ email }).select('+password')
                                       ▼
                        ┌──────────────────────────────┐
                        │     MongoDB Atlas Cluster    │
                        └──────────────┬───────────────┘
                                       │ 4. User record with bcrypt hash ($2b$10$...)
                                       ▼
                        ┌──────────────────────────────┐
                        │  Bcrypt Password Comparison  │
                        │  user.matchPassword(rawPass) │
                        └──────────────┬───────────────┘
                                       ├── [Fail] ──> 401 "Invalid email or password"
                                       │
                                       ▼ [Pass]
                        ┌──────────────────────────────┐
                        │    Issue Signed JWT Token    │
                        │    user.generateAuthToken()  │
                        └──────────────┬───────────────┘
                                       │ 5. Returns { success: true, token, user }
                                       ▼
                        ┌──────────────────────────────┐
                        │ Client stores JWT for future │
                        │ requests (Authorization:     │
                        │ Bearer <token>)              │
                        └──────────────────────────────┘
```

---

## 3. JWT Verification Middleware Lifecycle

Subsequent protected requests (`/api/auth/me`, `/api/clients`, `/api/projects`, etc.) `protect` / `verifyToken` middleware se guzarte hain:

```text
Incoming Request
      │
      ├── Has "Authorization: Bearer <token>" header?
      │         ├── No  ──> 401 "Not authorized. No token provided."
      │         └── Yes
      ▼
Verify Token Signature & Expiration (jwt.verify)
      │
      ├── Expired?   ──> 401 "Session expired. Please log in again."
      ├── Tampered?  ──> 401 "Invalid authentication token."
      └── Valid
      ▼
Fetch User from DB: User.findById(decoded.id).select('-password')
      │
      ├── User deleted in DB? ──> 401 "The user belonging to this token no longer exists."
      └── User active
      ▼
Attach req.user = user  ──> Proceed to Controller via next()
```

---

## 4. API Endpoints Specification

### 1. User Login
- **Method:** `POST`
- **Endpoints:** `/api/auth/login`, `/api/auth/signin`
- **Access:** Public
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "email": "sarah@agency.com",
  "password": "SecurePassword123!"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "User logged in successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "673f4b81c2f9d51e7a001122",
    "name": "Sarah Connor",
    "email": "sarah@agency.com",
    "role": "agency_owner",
    "businessName": "Connor Digital Agency",
    "hourlyRate": 120,
    "currency": "USD",
    "skills": ["Project Management", "Full Stack"],
    "isEmailVerified": false,
    "createdAt": "2026-09-17T12:00:00.000Z",
    "updatedAt": "2026-09-17T12:00:00.000Z"
  }
}
```

#### Error Responses
- **Missing Fields (`400 Bad Request`):**
  ```json
  {
    "success": false,
    "message": "Please provide email and password"
  }
  ```
- **Invalid Credentials (`401 Unauthorized`):**
  ```json
  {
    "success": false,
    "message": "Invalid email or password"
  }
  ```

---

### 2. Get Current Authenticated Profile
- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Access:** Private (Requires JWT Token)
- **Headers:**
  ```http
  Authorization: Bearer <your_jwt_token_here>
  ```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "user": {
    "_id": "673f4b81c2f9d51e7a001122",
    "name": "Sarah Connor",
    "email": "sarah@agency.com",
    "role": "agency_owner",
    "hourlyRate": 120,
    "currency": "USD",
    "skills": ["Project Management"],
    "createdAt": "2026-09-17T12:00:00.000Z",
    "updatedAt": "2026-09-17T12:00:00.000Z"
  }
}
```

---

## 5. Security Best Practices Implemented

1. **User Enumeration Prevention:**
   Chahe user database me exist na karta ho, ya password galat ho — dono suraton me server identical message deta hai: `"Invalid email or password"`. Is se malicious attackers email scanning nahi kar sakte.
2. **Password Field Isolation:**
   Mongoose schema me `select: false` configure kiya gaya hai. Normal queries me password kabhi leak nahi hota jab tak `.select('+password')` explicitly call na kiya jaye.
3. **Response Sanitization (`toJSON` hook):**
   Mongoose level par `toJSON` transform hook automatically `password` aur `__v` ko remove kar deta hai before JSON serialization.
4. **Token Expiry & Signature Verification:**
   Tokens standard cryptographic HMAC-SHA256 se sign hote hain aur standard expiry enforce hoti hai.
5. **Role-Based Guards (`authorize`):**
   Specific routes par unauthorized access roki jati hai (`403 Forbidden`).

---

## 6. Verification & Automated Test Matrix

Run the dedicated test suite:
```bash
# Day 6 Tests Only (23/23 passing)
cd server
npm run test:day6

# All Test Suites Combined (45/45 passing)
npm run test:all
```

| # | Test Category | Scenario Tested | Result |
| :--- | :--- | :--- | :---: |
| 1 | Input Validation | Missing email returns 400 | ✅ PASS |
| 2 | Input Validation | Missing password returns 400 | ✅ PASS |
| 3 | Input Validation | Whitespace-only email returns 400 | ✅ PASS |
| 4 | Input Validation | Null/empty request body returns 400 | ✅ PASS |
| 5 | JWT Token | `generateAuthToken()` returns signed 3-segment JWT | ✅ PASS |
| 6 | JWT Token | Payload encodes correct `id` and `role` | ✅ PASS |
| 7 | JWT Token | Future expiration timestamp configured | ✅ PASS |
| 8 | Middleware | `verifyToken` exported as alias for `protect` | ✅ PASS |
| 9 | Middleware | Missing Authorization header rejected with 401 | ✅ PASS |
| 10 | Middleware | Non-Bearer headers rejected with 401 | ✅ PASS |
| 11 | Middleware | Malformed/tampered JWT rejected with 401 | ✅ PASS |
| 12 | Middleware | Expired JWT rejected with expired warning | ✅ PASS |
| 13 | Role Guard | `authorize()` rejects unpermitted role with 403 | ✅ PASS |
| 14 | Role Guard | `authorize()` invokes `next()` for allowed role | ✅ PASS |
| 15 | Live Database | Creates test user with bcrypt hash | ✅ PASS |
| 16 | Live Database | Non-existent email returns generic 401 | ✅ PASS |
| 17 | Live Database | Incorrect password returns generic 401 | ✅ PASS |
| 18 | Live Database | Successful login returns 200 OK + JWT token | ✅ PASS |
| 19 | Live Database | Excludes password from user profile | ✅ PASS |
| 20 | Live Database | `verifyToken` validates token & populates `req.user` | ✅ PASS |
| 21 | Live Database | `GET /api/auth/me` returns current user | ✅ PASS |
| 22 | Live Database | Cleanup removes test records | ✅ PASS |
