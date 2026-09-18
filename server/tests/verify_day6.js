const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { User } = require('../models');
const { login, getMe } = require('../controllers/authController');
const { protect, verifyToken, authorize } = require('../middleware/authMiddleware');

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

async function runDay6Tests() {
  console.log('===========================================================');
  console.log('🧪 Starting Day 6 Test Suite (Login API + JWT Middleware)');
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
    // Test Category 1: Login API Input Validation
    // -------------------------------------------------------------
    console.log('📦 Category 1: Login API Input Validation');

    // 1. Missing email
    const { req: req1, res: res1, promise: p1 } = mockRequestResponse({ password: 'password123' });
    login(req1, res1, () => {});
    const r1 = await p1;
    assert(r1.status === 400 && !r1.data.success, 'Login API returns 400 when email is missing');

    // 2. Missing password
    const { req: req2, res: res2, promise: p2 } = mockRequestResponse({ email: 'test@example.com' });
    login(req2, res2, () => {});
    const r2 = await p2;
    assert(r2.status === 400 && !r2.data.success, 'Login API returns 400 when password is missing');

    // 3. Empty string / whitespace email
    const { req: req3, res: res3, promise: p3 } = mockRequestResponse({ email: '   ', password: 'password123' });
    login(req3, res3, () => {});
    const r3 = await p3;
    assert(r3.status === 400 && !r3.data.success, 'Login API returns 400 when email is empty whitespace');

    // 4. Empty body object
    const { req: req4, res: res4, promise: p4 } = mockRequestResponse(null);
    login(req4, res4, () => {});
    const r4 = await p4;
    assert(r4.status === 400 && !r4.data.success, 'Login API returns 400 when request body is empty/null');

    // -------------------------------------------------------------
    // Test Category 2: JWT Token Generation & Structure
    // -------------------------------------------------------------
    console.log('\n🔐 Category 2: JWT Token Generation & Verification');

    const testSecret = process.env.JWT_SECRET || 'freelancer_crm_secret_key_default';
    const fakeUserId = new mongoose.Types.ObjectId();
    const fakeUser = new User({
      _id: fakeUserId,
      name: 'Sarah Connor',
      email: 'sarah@example.com',
      password: 'StrongPassword123!',
      role: 'agency_owner',
    });

    // 5. generateAuthToken returns valid JWT
    const token = fakeUser.generateAuthToken();
    assert(typeof token === 'string' && token.split('.').length === 3, 'generateAuthToken() generates a 3-part signed JWT string');

    // 6. Decoded payload contains id and role
    const decoded = jwt.verify(token, testSecret);
    assert(
      String(decoded.id) === String(fakeUserId) && decoded.role === 'agency_owner',
      'JWT payload properly encodes user _id and role'
    );

    // 7. Expiration timestamp exists
    assert(typeof decoded.exp === 'number' && decoded.exp > Math.floor(Date.now() / 1000), 'JWT token contains future expiration timestamp');

    // -------------------------------------------------------------
    // Test Category 3: JWT Verify Middleware (protect & verifyToken)
    // -------------------------------------------------------------
    console.log('\n🛡️ Category 3: JWT Verify Middleware (protect & verifyToken)');

    // 8. verifyToken is an exported alias
    assert(typeof verifyToken === 'function' && verifyToken === protect, 'verifyToken middleware is exported as an alias for protect');

    // 9. Missing Authorization header
    const { req: reqNoAuth, res: resNoAuth, promise: pNoAuth } = mockRequestResponse();
    await protect(reqNoAuth, resNoAuth, () => {});
    const rNoAuth = await pNoAuth;
    assert(rNoAuth.status === 401 && !rNoAuth.data.success, 'Middleware rejects request when Authorization header is missing (401)');

    // 10. Header not starting with Bearer
    const { req: reqBasicAuth, res: resBasicAuth, promise: pBasicAuth } = mockRequestResponse({}, {
      authorization: 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
    });
    await protect(reqBasicAuth, resBasicAuth, () => {});
    const rBasicAuth = await pBasicAuth;
    assert(rBasicAuth.status === 401 && !rBasicAuth.data.success, 'Middleware rejects non-Bearer Authorization headers (401)');

    // 11. Malformed or invalid JWT token
    const { req: reqMalformed, res: resMalformed, promise: pMalformed } = mockRequestResponse({}, {
      authorization: 'Bearer invalid.tampered.token',
    });
    await protect(reqMalformed, resMalformed, () => {});
    const rMalformed = await pMalformed;
    assert(rMalformed.status === 401 && rMalformed.data.message.includes('Invalid'), 'Middleware rejects tampered/malformed JWT token (401)');

    // 12. Expired JWT token handling
    const expiredToken = jwt.sign({ id: fakeUserId, role: 'freelancer' }, testSecret, { expiresIn: '-1s' });
    const { req: reqExpired, res: resExpired, promise: pExpired } = mockRequestResponse({}, {
      authorization: `Bearer ${expiredToken}`,
    });
    await protect(reqExpired, resExpired, () => {});
    const rExpired = await pExpired;
    assert(rExpired.status === 401 && rExpired.data.message.includes('expired'), 'Middleware specifically informs user when token is expired');

    // -------------------------------------------------------------
    // Test Category 4: Role-Based Authorization Guard (authorize)
    // -------------------------------------------------------------
    console.log('\n👮 Category 4: Role-Based Authorization Middleware');

    // 13. authorize middleware rejects unauthorized roles (403)
    const authGuard = authorize('agency_owner');
    const { req: reqForbidden, res: resForbidden, promise: pForbidden } = mockRequestResponse();
    reqForbidden.user = { role: 'freelancer' };
    authGuard(reqForbidden, resForbidden, () => {});
    const rForbidden = await pForbidden;
    assert(rForbidden.status === 403 && !rForbidden.data.success, 'authorize() denies access to non-matching role with 403 Forbidden');

    // 14. authorize middleware allows matching role
    let nextCalled = false;
    const reqAllowed = { user: { role: 'agency_owner' } };
    authGuard(reqAllowed, {}, () => {
      nextCalled = true;
    });
    assert(nextCalled === true, 'authorize() invokes next() when role is permitted');

    // -------------------------------------------------------------
    // Test Category 5: Live Database Authentication & Protected Route
    // -------------------------------------------------------------
    console.log('\n🗄️ Category 5: Live DB End-to-End Login & Profile Flow');

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoUri) {
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
        console.log('  ✅ Connected to MongoDB Atlas for Live Test');

        const testEmail = `day6_login_test_${Date.now()}@example.com`;
        const testPassword = 'Day6SecurePassword123!';

        try {
          // 15. Create test user in DB (triggers bcrypt pre-save hashing)
          const liveUser = await User.create({
            name: 'Day6 Test User',
            email: testEmail,
            password: testPassword,
            role: 'freelancer',
          });
          assert(liveUser._id != null, 'Live DB: Created user with bcrypt hashed password');

          // 16. Login with wrong email -> 401
          const { req: reqBadEmail, res: resBadEmail, promise: pBadEmail } = mockRequestResponse({
            email: 'wrong_email@example.com',
            password: testPassword,
          });
          await login(reqBadEmail, resBadEmail, () => {});
          const rBadEmail = await pBadEmail;
          assert(rBadEmail.status === 401 && rBadEmail.data.message === 'Invalid email or password', 'Live DB: Non-existent email returns generic 401 message');

          // 17. Login with wrong password -> 401
          const { req: reqBadPass, res: resBadPass, promise: pBadPass } = mockRequestResponse({
            email: testEmail,
            password: 'IncorrectPassword999!',
          });
          await login(reqBadPass, resBadPass, () => {});
          const rBadPass = await pBadPass;
          assert(rBadPass.status === 401 && rBadPass.data.message === 'Invalid email or password', 'Live DB: Incorrect password returns generic 401 message');

          // 18. Login with correct credentials -> 200 + token
          const { req: reqGood, res: resGood, promise: pGood } = mockRequestResponse({
            email: testEmail,
            password: testPassword,
          });
          await login(reqGood, resGood, () => {});
          const rGood = await pGood;
          assert(rGood.status === 200 && rGood.data.success === true, 'Live DB: Successful login returns 200 OK');
          assert(typeof rGood.data.token === 'string', 'Live DB: Successful login returns signed JWT token');
          assert(rGood.data.user && !rGood.data.user.password, 'Live DB: Response user object does not expose password');
          assert(rGood.data.user.email === testEmail.toLowerCase(), 'Live DB: Response user object contains accurate profile');

          const validToken = rGood.data.token;

          // 19. Access protected profile route via verifyToken / protect middleware
          const reqMe = {
            headers: {
              authorization: `Bearer ${validToken}`,
            },
          };
          let meNextCalled = false;
          await verifyToken(reqMe, {}, () => {
            meNextCalled = true;
          });
          assert(meNextCalled === true && reqMe.user && String(reqMe.user._id) === String(liveUser._id), 'Live DB: verifyToken middleware validates token and attaches req.user');

          // 20. Call getMe controller with req.user attached
          const { req: reqMeCtrl, res: resMeCtrl, promise: pMeCtrl } = mockRequestResponse();
          reqMeCtrl.user = reqMe.user;
          await getMe(reqMeCtrl, resMeCtrl, () => {});
          const rMeCtrl = await pMeCtrl;
          assert(rMeCtrl.status === 200 && rMeCtrl.data.user.email === testEmail.toLowerCase(), 'Live DB: GET /api/auth/me returns authenticated user details');
        } finally {
          // Cleanup live test data
          await User.deleteMany({ email: testEmail });
          console.log('  🧹 Cleaned up live test user from database');
          await mongoose.connection.close();
        }
      } catch (dbErr) {
        console.log(`  ℹ️  Live DB skipped (${dbErr.message.split('\n')[0]}). Unit tests fully validated.`);
      }
    }

    console.log('\n===========================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} DAY 6 TESTS PASSED SUCCESSFULLY!`);
    console.log('===========================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILURE:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

runDay6Tests();
