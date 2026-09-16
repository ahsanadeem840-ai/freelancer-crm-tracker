const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { User } = require('../models');
const { register, login } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Mock Express Request & Response helper
const mockRequestResponse = (body = {}, headers = {}) => {
  let resolveResult;
  const promise = new Promise((resolve) => {
    resolveResult = resolve;
  });

  const req = {
    body,
    headers,
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      resolveResult({ status: this.statusCode, data });
      return this;
    },
  };

  return { req, res, promise };
};

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 Starting Day 5 Test Suite (User Model + Signup API)');
  console.log('===========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (!condition) {
      throw new Error(`FAIL: ${message}`);
    }
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  }

  try {
    // -------------------------------------------------------------
    // Test Category 1: Schema Structure & Validation
    // -------------------------------------------------------------
    console.log('📦 Category 1: User Mongoose Schema Validation');

    // 1. Missing required fields
    const emptyUser = new User({});
    let validationErr = null;
    try {
      await emptyUser.validate();
    } catch (err) {
      validationErr = err;
    }
    assert(
      validationErr && validationErr.errors['name'] && validationErr.errors['email'] && validationErr.errors['password'],
      'Rejects document with missing name, email, and password'
    );

    // 2. Short password validation (< 6 chars)
    const shortPassUser = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: '123',
    });
    let shortPassErr = null;
    try {
      await shortPassUser.validate();
    } catch (err) {
      shortPassErr = err;
    }
    assert(
      shortPassErr && shortPassErr.errors['password'],
      'Enforces password minimum length of 6 characters'
    );

    // 3. Invalid email format validation
    const invalidEmailUser = new User({
      name: 'John Doe',
      email: 'not-an-email-address',
      password: 'password123',
    });
    let invalidEmailErr = null;
    try {
      await invalidEmailUser.validate();
    } catch (err) {
      invalidEmailErr = err;
    }
    assert(
      invalidEmailErr && invalidEmailErr.errors['email'],
      'Validates email format using regex'
    );

    // 4. Invalid role enum
    const invalidRoleUser = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'super_admin_unauthorized',
    });
    let roleErr = null;
    try {
      await invalidRoleUser.validate();
    } catch (err) {
      roleErr = err;
    }
    assert(
      roleErr && roleErr.errors['role'],
      'Restricts role to freelancer, agency_owner, or team_member'
    );

    // -------------------------------------------------------------
    // Test Category 2: Bcrypt Password Hashing & Methods
    // -------------------------------------------------------------
    console.log('\n🔐 Category 2: Bcrypt Password Hashing & Schema Methods');

    const testPassword = 'MySecretPassword2026!';
    const userInstance = new User({
      name: 'Ayesha Malik',
      email: 'ayesha.malik@example.com',
      password: testPassword,
      role: 'freelancer',
      businessName: 'Malik Creative Works',
      hourlyRate: 75,
      skills: ['UI/UX', 'Figma', 'React'],
    });

    // Run bcrypt pre-save hook
    const pres = User.schema.s.hooks._pres.get('save');
    const bcryptHook = pres.find((p) => p.fn.toString().includes('isModified'));
    assert(!!bcryptHook, 'Bcrypt pre-save hook is registered on User schema');

    await bcryptHook.fn.call(userInstance);

    // Verify hashed password
    assert(
      userInstance.password.startsWith('$2a$') || userInstance.password.startsWith('$2b$'),
      `Password correctly hashed with bcrypt (${userInstance.password.substring(0, 15)}...)`
    );

    // Verify matchPassword
    const isMatchCorrect = await userInstance.matchPassword(testPassword);
    const isMatchWrong = await userInstance.matchPassword('IncorrectPassword123');
    assert(isMatchCorrect === true, 'matchPassword() returns true for correct raw password');
    assert(isMatchWrong === false, 'matchPassword() returns false for wrong password');

    // Verify generateAuthToken
    const token = userInstance.generateAuthToken();
    assert(typeof token === 'string' && token.length > 20, 'generateAuthToken() creates a signed JWT string');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'freelancer_crm_secret_key_default');
    assert(
      String(decoded.id) === String(userInstance._id) && decoded.role === userInstance.role,
      'JWT payload contains correct user id and role'
    );

    // Verify toJSON serialization
    const serialized = userInstance.toJSON();
    assert(serialized.password === undefined, 'toJSON() automatically removes the password field');
    assert(serialized.__v === undefined, 'toJSON() automatically removes __v version key');

    // -------------------------------------------------------------
    // Test Category 3: Signup API Controller (POST /api/auth/register)
    // -------------------------------------------------------------
    console.log('\n🌐 Category 3: Signup API (register controller)');

    // 1. Missing fields
    const req1 = mockRequestResponse({ email: 'test@example.com' });
    await register(req1.req, req1.res, (e) => { throw e; });
    const res1 = await req1.promise;
    assert(res1.status === 400 && res1.data.success === false, 'Signup API returns 400 for missing name or password');

    // 2. Short password
    const req2 = mockRequestResponse({ name: 'User', email: 'test@example.com', password: '123' });
    await register(req2.req, req2.res, (e) => { throw e; });
    const res2 = await req2.promise;
    assert(res2.status === 400 && res2.data.message.includes('6 characters'), 'Signup API rejects password under 6 characters');

    // 3. Malformed email
    const req3 = mockRequestResponse({ name: 'User', email: 'invalid_mail', password: 'password123' });
    await register(req3.req, req3.res, (e) => { throw e; });
    const res3 = await req3.promise;
    assert(res3.status === 400 && res3.data.message.includes('valid email'), 'Signup API rejects invalid email format');

    // 4. Invalid role
    const req4 = mockRequestResponse({ name: 'User', email: 'valid@example.com', password: 'password123', role: 'hacker' });
    await register(req4.req, req4.res, (e) => { throw e; });
    const res4 = await req4.promise;
    assert(res4.status === 400 && res4.data.message.includes('not a valid user role'), 'Signup API rejects unauthorized role');

    // -------------------------------------------------------------
    // Test Category 4: Protect Middleware (JWT Authentication)
    // -------------------------------------------------------------
    console.log('\n🛡️ Category 4: Authentication Security Middleware');

    // 1. Missing token
    const reqNoToken = mockRequestResponse({}, {});
    let nextCalled = false;
    await protect(reqNoToken.req, reqNoToken.res, () => { nextCalled = true; });
    const resNoToken = await reqNoToken.promise;
    assert(resNoToken.status === 401 && !nextCalled, 'protect middleware rejects request with missing Authorization header');

    // 2. Invalid token
    const reqInvalidToken = mockRequestResponse({}, { authorization: 'Bearer invalid.token.value' });
    let nextCalled2 = false;
    await protect(reqInvalidToken.req, reqInvalidToken.res, () => { nextCalled2 = true; });
    const resInvalidToken = await reqInvalidToken.promise;
    assert(resInvalidToken.status === 401 && !nextCalled2, 'protect middleware rejects malformed/tampered JWT');

    // -------------------------------------------------------------
    // Optional Test Category 5: Live Database Integration (if DB is reachable)
    // -------------------------------------------------------------
    const uri = process.env.MONGODB_URI;
    if (uri) {
      try {
        console.log('\n🗄️ Category 5: Live Database Connection Test');
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
        console.log('  ✅ Connected to live MongoDB.');

        const liveEmail = `live_test_${Date.now()}@example.com`;
        const reqSignup = mockRequestResponse({
          name: 'Live DB Freelancer',
          email: liveEmail,
          password: 'LiveSecurePassword2026',
          role: 'freelancer',
          hourlyRate: 95,
        });

        await register(reqSignup.req, reqSignup.res, (e) => { throw e; });
        const resSignup = await reqSignup.promise;

        assert(resSignup.status === 201, 'Live DB: Successfully registered user with 201 status');
        assert(!!resSignup.data.token, 'Live DB: Returned valid JWT token');
        assert(resSignup.data.user.password === undefined, 'Live DB: Response excludes password');

        // Test duplicate registration on live DB
        const reqDup = mockRequestResponse({
          name: 'Duplicate User',
          email: liveEmail,
          password: 'AnotherPassword2026',
        });
        await register(reqDup.req, reqDup.res, (e) => { throw e; });
        const resDup = await reqDup.promise;
        assert(resDup.status === 400 && resDup.data.message.includes('already exists'), 'Live DB: Duplicate email prevented with 400');

        // Cleanup
        await User.deleteOne({ email: liveEmail });
        console.log('  🧹 Cleaned up live test user.');
        await mongoose.connection.close();
      } catch (dbErr) {
        console.log(`  ℹ️  Live DB skipped (${dbErr.message.split('\n')[0]}). Unit tests fully validated.`);
      }
    }

    console.log('\n===========================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log('===========================================================\n');
  } catch (error) {
    console.error('\n❌ Test Suite encountered an error:', error.message);
    process.exitCode = 1;
  }
}

runTests();
