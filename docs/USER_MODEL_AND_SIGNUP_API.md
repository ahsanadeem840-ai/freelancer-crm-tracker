# User Model & Signup API Documentation

**Project:** Freelance CRM & Project Tracker  
**Roadmap Stage:** Din 5 (User Model + Signup API)  
**Technology:** Node.js (v24+), Express.js (v5), Mongoose ODM, Bcrypt.js, JSON Web Tokens (JWT)  

> 🔗 **Related Architecture Guides:**
> - [Database Planning & Schema Specs (Din 1)](DATABASE_SCHEMA.md)
> - [Schema Relationships & Integrity Blueprint (Din 2)](SCHEMA_RELATIONSHIPS.md)
> - [Backend Setup & Server Initialization (Din 3)](BACKEND_SETUP.md)
> - [Folder Structure & MongoDB Connection (Din 4)](FOLDER_STRUCTURE_AND_DB.md)

---

## 1. Overview & Objectives (Maqsad)

Din 5 ka maqsad platform ka core **User Identity & Authentication Foundation** establish karna hai:
1. **User Mongoose Schema:** Strict data validation, enums, default values, aur sanitization transforms implement karna.
2. **Cryptographic Password Hashing:** Plain-text passwords ko database me store hone se pehle `bcryptjs` (salt rounds: 10) se automatically hash karna.
3. **Password Comparison & JWT Methods:** User model par reusable helper methods (`matchPassword`, `generateAuthToken`) attach karna.
4. **Signup / Registration API:** Secure RESTful endpoint (`POST /api/auth/register` aur `/api/auth/signup`) build karna jo input validate kare, duplicate accounts roke, aur standard JWT token issue kare.
5. **Security Middleware:** Sensitive fields (`password`, `__v`) ko leak hone se protect karna (`select: false`, `toJSON` transform).

---

## 2. User Schema Specification (`server/models/User.js`)

User collection freelancers, agency owners, aur team members ki primary account details store karta hai:

```text
User Document Structure:
├── _id: ObjectId
├── name: String (required, max: 100, trimmed)
├── email: String (required, unique, lowercase, trimmed, regex validated)
├── password: String (required, minlength: 6, hashed with bcrypt, select: false)
├── role: String (enum: ['freelancer', 'agency_owner', 'team_member'], default: 'freelancer')
├── businessName: String (optional, max: 120, trimmed)
├── avatar: String (optional URL)
├── phone: String (optional)
├── hourlyRate: Number (min: 0, default: 0)
├── currency: String (default: 'USD', uppercase)
├── stripeAccountId: String (optional, for Stripe Connect payouts)
├── stripeCustomerId: String (optional)
├── skills: [String] (array of expertise tags)
├── isEmailVerified: Boolean (default: false)
├── resetPasswordToken: String
├── resetPasswordExpire: Date
└── timestamps: createdAt, updatedAt
```

### Schema Mongoose Implementation Highlights

```javascript
// Pre-save hook: Hashes password before saving to MongoDB
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method: Compares raw password with bcrypt hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method: Issues signed JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'freelancer_crm_secret_key_default',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};
```

---

## 3. Password Security & Bcrypt Lifecycle

Passwords ko secure rakhne ke liye multiple defense layers implement kiye gaye hain:

```text
User Signup Request: Plain-text password ("SecretPass123!")
       │
       ▼
Controller Validation (Length >= 6, presence check)
       │
       ▼
Mongoose pre('save') Hook
       ├── Check if password field is modified (avoids re-hashing during profile edits)
       ├── Generate cryptographic salt: bcrypt.genSalt(10)
       └── Hash password: bcrypt.hash("SecretPass123!", salt) -> "$2b$10$..."
       │
       ▼
MongoDB Persistence (Only the one-way $2b$ hash is stored)
       │
       ▼
JSON Serialization (toJSON Transform)
       └── delete ret.password; (Guarantees password is never leaked in HTTP responses)
```

---

## 4. Signup REST API Specification

### Endpoints
- **`POST /api/auth/register`**
- **`POST /api/auth/signup`** *(Route alias)*

### Headers
```http
Content-Type: application/json
```

### Request Payload (`req.body`)

| Field | Type | Required? | Constraints & Description |
| :--- | :--- | :--- | :--- |
| **`name`** | String | **Yes** | Full name (1–100 chars, trimmed) |
| **`email`** | String | **Yes** | Valid email address (normalized to lowercase) |
| **`password`** | String | **Yes** | Minimum 6 characters |
| **`role`** | String | No | `'freelancer'`, `'agency_owner'`, or `'team_member'` (Default: `'freelancer'`) |
| **`businessName`**| String | No | Agency or studio trade name |
| **`hourlyRate`** | Number | No | Hourly billing rate in USD (Min: 0, Default: 0) |
| **`skills`** | Array | No | String array, e.g. `["React", "Node.js", "CRM"]` |

#### Example Request Body
```json
{
  "name": "Sarah Khan",
  "email": "sarah.khan@example.com",
  "password": "ProductionPassword2026!",
  "role": "freelancer",
  "businessName": "Apex Creative Studio",
  "hourlyRate": 75,
  "currency": "USD",
  "skills": ["React", "Express", "Tailwind CSS"]
}
```

### Success Response (`201 Created`)

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "664be871923145a198c253bc",
    "name": "Sarah Khan",
    "email": "sarah.khan@example.com",
    "role": "freelancer",
    "businessName": "Apex Creative Studio",
    "avatar": "",
    "hourlyRate": 75,
    "currency": "USD",
    "skills": ["React", "Express", "Tailwind CSS"],
    "isEmailVerified": false,
    "createdAt": "2026-09-16T18:00:00.000Z",
    "updatedAt": "2026-09-16T18:00:00.000Z"
  }
}
```

---

## 5. Error Handling & Validation Responses

| Scenario | HTTP Status | Response Message |
| :--- | :--- | :--- |
| Missing name, email, or password | `400 Bad Request` | `"Please provide name, email, and password"` |
| Malformed email format | `400 Bad Request` | `"Please provide a valid email address"` |
| Password < 6 characters | `400 Bad Request` | `"Password must be at least 6 characters long"` |
| Invalid role value | `400 Bad Request` | `"'admin' is not a valid user role. Allowed roles: freelancer, agency_owner, team_member"` |
| Duplicate email address | `400 Bad Request` | `"An account with this email address already exists. Please log in instead."` |
| Missing Authorization token on `/me` | `401 Unauthorized` | `"Not authorized to access this route. No token provided."` |
| Malformed / expired token | `401 Unauthorized` | `"Invalid authentication token."` |

---

## 6. Verification & Automated Test Suite

A comprehensive 18-point verification test suite has been implemented in `server/tests/verify_day5.js`.

### Running the Test Suite
```bash
# Run from server directory
cd server
npm test

# Or run directly via Node
node tests/verify_day5.js
```

### Tested Capabilities
1. **Schema Validation:** Rejects empty payloads, short passwords, invalid emails, and unauthorized roles.
2. **Bcrypt Pre-save Hook:** Verifies salt generation and one-way cryptographic hash prefix (`$2b$`).
3. **Password Matching:** Verifies `matchPassword()` returns `true` for valid passwords and `false` for incorrect ones.
4. **JWT Generation:** Verifies `generateAuthToken()` emits a signed token containing the user ID and role.
5. **Data Sanitization:** Confirms `toJSON()` strips `password` and `__v` from responses.
6. **Signup API Controller:** Verifies 400 rejection on invalid data and 201 creation with token and sanitized user.
7. **Auth Middleware:** Verifies `protect` rejects unauthenticated and tampered requests.
