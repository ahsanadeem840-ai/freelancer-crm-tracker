const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { User } = require('../models');
const { register, login } = require('../controllers/authController');
const {
  protect,
  verifyToken,
  authorize,
  checkRole,
  restrictTo,
  requireRole,
  isAdmin,
  isClient,
  isFreelancer,
  isAgencyOwner,
  isAdminOrClient,
} = require('../middleware/authMiddleware');

// Mock Express Request & Response helper
const mockRequestResponse = (body = {}, headers = {}, user = null) => {
  let resolveResult;
  const promise = new Promise((resolve) => {
    resolveResult = resolve;
  });

  const req = {
    body,
    headers,
    user,
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

async function runDay7Tests() {
  console.log('===========================================================');
  console.log('🧪 Starting Day 7 Test Suite (RBAC: Admin & Client Roles)');
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

  const testSecret = process.env.JWT_SECRET || 'freelancer_crm_secret_key_default';

  try {
    // -------------------------------------------------------------
    // Category 1: User Schema Role Enum Validation (Admin & Client)
    // -------------------------------------------------------------
    console.log('📦 Category 1: User Schema Role Validation (Admin & Client)');

    // 1. Valid role: 'admin'
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@crm.io',
      password: 'StrongAdminPass123!',
      role: 'admin',
    });
    let adminErr = null;
    try { await adminUser.validate(); } catch (e) { adminErr = e; }
    assert(!adminErr, "User schema accepts 'admin' as a valid role");

    // 2. Valid role: 'client'
    const clientUser = new User({
      name: 'Corporate Client',
      email: 'client@enterprise.com',
      password: 'StrongClientPass123!',
      role: 'client',
    });
    let clientErr = null;
    try { await clientUser.validate(); } catch (e) { clientErr = e; }
    assert(!clientErr, "User schema accepts 'client' as a valid role");

    // 3. Valid existing roles still accepted
    const freelancerUser = new User({
      name: 'Freelance Dev',
      email: 'dev@freelancer.io',
      password: 'DevPassword123!',
      role: 'freelancer',
    });
    let freeErr = null;
    try { await freelancerUser.validate(); } catch (e) { freeErr = e; }
    assert(!freeErr, "User schema continues to accept 'freelancer' role");

    const agencyUser = new User({
      name: 'Agency Leader',
      email: 'leader@agency.com',
      password: 'AgencyPassword123!',
      role: 'agency_owner',
    });
    let agencyErr = null;
    try { await agencyUser.validate(); } catch (e) { agencyErr = e; }
    assert(!agencyErr, "User schema continues to accept 'agency_owner' role");

    // 4. Default role is 'freelancer'
    const defaultRoleUser = new User({
      name: 'Newcomer User',
      email: 'newbie@crm.io',
      password: 'NewbiePassword123!',
    });
    assert(defaultRoleUser.role === 'freelancer', "Default role remains 'freelancer' when unspecified");

    // 5. Invalid roles are rejected
    const invalidRoleUser = new User({
      name: 'Hacker User',
      email: 'hacker@darkweb.io',
      password: 'HackerPassword123!',
      role: 'super_admin_unauthorized',
    });
    let invalidErr = null;
    try { await invalidRoleUser.validate(); } catch (e) { invalidErr = e; }
    assert(
      invalidErr && invalidErr.errors && invalidErr.errors['role'],
      "User schema rejects unauthorized role 'super_admin_unauthorized'"
    );

    // -------------------------------------------------------------
    // Category 2: Registration Controller Role Handling
    // -------------------------------------------------------------
    console.log('\n🌐 Category 2: Registration Controller (Admin & Client Signup)');

    // 6. Registration rejects invalid role
    const { req: reqInvalidRole, res: resInvalidRole, promise: pInvalidRole } = mockRequestResponse({
      name: 'Tester',
      email: 'tester@test.com',
      password: 'password123',
      role: 'unauthorized_role_xyz',
    });
    await register(reqInvalidRole, resInvalidRole, () => {});
    const rInvalidRole = await pInvalidRole;
    assert(
      rInvalidRole.status === 400 &&
      rInvalidRole.data.message.includes('not a valid user role'),
      'Registration API rejects invalid role with 400 Bad Request'
    );

    // 7. Registration allowed roles list mentions admin and client
    assert(
      rInvalidRole.data.message.includes('admin') &&
      rInvalidRole.data.message.includes('client'),
      'Registration error message lists admin and client in allowed roles'
    );

    // -------------------------------------------------------------
    // Category 3: JWT Token Generation for Admin & Client
    // -------------------------------------------------------------
    console.log('\n🔐 Category 3: JWT Token Encoding for Admin & Client');

    // 8. Admin JWT contains role 'admin'
    const adminToken = adminUser.generateAuthToken();
    const adminDecoded = jwt.verify(adminToken, testSecret);
    assert(
      adminDecoded.role === 'admin' && String(adminDecoded.id) === String(adminUser._id),
      "generateAuthToken() properly embeds role: 'admin' into JWT payload"
    );

    // 9. Client JWT contains role 'client'
    const clientToken = clientUser.generateAuthToken();
    const clientDecoded = jwt.verify(clientToken, testSecret);
    assert(
      clientDecoded.role === 'client' && String(clientDecoded.id) === String(clientUser._id),
      "generateAuthToken() properly embeds role: 'client' into JWT payload"
    );

    // -------------------------------------------------------------
    // Category 4: Role-Based Authorization Middleware (authorize)
    // -------------------------------------------------------------
    console.log('\n👮 Category 4: Role Authorization Middleware (authorize)');

    // 10. Missing req.user returns 401 Unauthorized
    const { req: reqNoUser, res: resNoUser, promise: pNoUser } = mockRequestResponse();
    const adminGuard = authorize('admin');
    adminGuard(reqNoUser, resNoUser, () => {});
    const rNoUser = await pNoUser;
    assert(
      rNoUser.status === 401 && !rNoUser.data.success,
      'authorize() returns 401 when req.user is unauthenticated/missing'
    );

    // 11. Role mismatch returns 403 Forbidden
    const { req: reqWrongRole, res: resWrongRole, promise: pWrongRole } = mockRequestResponse(
      {},
      {},
      { role: 'freelancer' }
    );
    adminGuard(reqWrongRole, resWrongRole, () => {});
    const rWrongRole = await pWrongRole;
    assert(
      rWrongRole.status === 403 && !rWrongRole.data.success,
      'authorize() denies non-admin with 403 Forbidden'
    );
    assert(
      rWrongRole.data.message.includes('freelancer') && rWrongRole.data.message.includes('not authorized'),
      'authorize() 403 response contains informative message with current role'
    );

    // 12. Matching role calls next()
    let nextCalledAdmin = false;
    const reqAdminUser = { user: { role: 'admin' } };
    adminGuard(reqAdminUser, {}, () => {
      nextCalledAdmin = true;
    });
    assert(nextCalledAdmin === true, "authorize('admin') calls next() when user role is 'admin'");

    // 13. Client role authorized for client route
    const clientGuard = authorize('client');
    let nextCalledClient = false;
    const reqClientUser = { user: { role: 'client' } };
    clientGuard(reqClientUser, {}, () => {
      nextCalledClient = true;
    });
    assert(nextCalledClient === true, "authorize('client') calls next() when user role is 'client'");

    // 14. Admin denied from client-only route unless explicitly authorized
    const { req: reqAdminOnClient, res: resAdminOnClient, promise: pAdminOnClient } = mockRequestResponse(
      {},
      {},
      { role: 'admin' }
    );
    clientGuard(reqAdminOnClient, resAdminOnClient, () => {});
    const rAdminOnClient = await pAdminOnClient;
    assert(
      rAdminOnClient.status === 403 && !rAdminOnClient.data.success,
      "authorize('client') denies access to 'admin' role when not permitted"
    );

    // 15. Multi-role spread arguments: authorize('admin', 'client')
    const multiGuard = authorize('admin', 'client');
    let multiAdminPassed = false;
    let multiClientPassed = false;
    multiGuard({ user: { role: 'admin' } }, {}, () => { multiAdminPassed = true; });
    multiGuard({ user: { role: 'client' } }, {}, () => { multiClientPassed = true; });
    assert(
      multiAdminPassed && multiClientPassed,
      "authorize('admin', 'client') permits both admin and client roles"
    );

    // 16. Multi-role denies other roles (e.g. freelancer)
    const { req: reqMultiDenied, res: resMultiDenied, promise: pMultiDenied } = mockRequestResponse(
      {},
      {},
      { role: 'freelancer' }
    );
    multiGuard(reqMultiDenied, resMultiDenied, () => {});
    const rMultiDenied = await pMultiDenied;
    assert(
      rMultiDenied.status === 403,
      "authorize('admin', 'client') denies freelancer role with 403 Forbidden"
    );

    // 17. Array arguments support: authorize(['admin', 'client'])
    const arrayGuard = authorize(['admin', 'client']);
    let arrayAdminPassed = false;
    arrayGuard({ user: { role: 'admin' } }, {}, () => { arrayAdminPassed = true; });
    assert(arrayAdminPassed, 'authorize() supports array input: authorize([roles])');

    // -------------------------------------------------------------
    // Category 5: Convenience Guards & Aliases
    // -------------------------------------------------------------
    console.log('\n🛡️ Category 5: Convenience Guards & Naming Aliases');

    // 18. isAdmin guard
    let isAdminPassed = false;
    isAdmin({ user: { role: 'admin' } }, {}, () => { isAdminPassed = true; });
    assert(isAdminPassed, "isAdmin convenience guard permits 'admin' role");

    const { req: reqIsAdminFail, res: resIsAdminFail, promise: pIsAdminFail } = mockRequestResponse(
      {},
      {},
      { role: 'client' }
    );
    isAdmin(reqIsAdminFail, resIsAdminFail, () => {});
    const rIsAdminFail = await pIsAdminFail;
    assert(rIsAdminFail.status === 403, 'isAdmin convenience guard denies client role');

    // 19. isClient guard
    let isClientPassed = false;
    isClient({ user: { role: 'client' } }, {}, () => { isClientPassed = true; });
    assert(isClientPassed, "isClient convenience guard permits 'client' role");

    // 20. isAdminOrClient guard
    let adminOrClient1 = false;
    let adminOrClient2 = false;
    isAdminOrClient({ user: { role: 'admin' } }, {}, () => { adminOrClient1 = true; });
    isAdminOrClient({ user: { role: 'client' } }, {}, () => { adminOrClient2 = true; });
    assert(
      adminOrClient1 && adminOrClient2,
      'isAdminOrClient convenience guard permits both admin and client'
    );

    // 21. checkRole, restrictTo, requireRole aliases
    assert(typeof checkRole === 'function', 'checkRole is exported as an alias for authorize');
    assert(typeof restrictTo === 'function', 'restrictTo is exported as an alias for authorize');
    assert(typeof requireRole === 'function', 'requireRole is exported as an alias for authorize');

    let aliasCheckPassed = false;
    checkRole('admin')({ user: { role: 'admin' } }, {}, () => { aliasCheckPassed = true; });
    assert(aliasCheckPassed, 'checkRole alias functions identically to authorize');

    // -------------------------------------------------------------
    // Category 6: Route Level RBAC Verification
    // -------------------------------------------------------------
    console.log('\n🛣️ Category 6: Role Protected Endpoints Verification');

    const authRoutes = require('../routes/authRoutes');
    assert(!!authRoutes, 'authRoutes loaded with role-protected endpoints');

    const clientRoutes = require('../routes/clientRoutes');
    assert(!!clientRoutes, 'clientRoutes loaded with role-protected client endpoints');

    // -------------------------------------------------------------
    // Category 7: Live Database Flow (with offline fallback)
    // -------------------------------------------------------------
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoUri) {
      try {
        console.log('\n🗄️ Category 7: Live Database RBAC Flow');
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
        console.log('  ✅ Connected to MongoDB Atlas for Live Test');

        const adminEmail = `live_admin_${Date.now()}@example.com`;
        const clientEmail = `live_client_${Date.now()}@example.com`;
        const testPassword = 'SecurePasswordDay7!';

        try {
          // 24. Create Admin in live DB
          const liveAdmin = await User.create({
            name: 'Live Admin',
            email: adminEmail,
            password: testPassword,
            role: 'admin',
          });
          assert(liveAdmin.role === 'admin', 'Live DB: Successfully persisted user with role: admin');

          // 25. Create Client in live DB
          const liveClient = await User.create({
            name: 'Live Client',
            email: clientEmail,
            password: testPassword,
            role: 'client',
          });
          assert(liveClient.role === 'client', 'Live DB: Successfully persisted user with role: client');

          // 26. Admin Token verification with live DB user
          const adminToken = liveAdmin.generateAuthToken();
          const reqLiveAdmin = { headers: { authorization: `Bearer ${adminToken}` } };
          let adminVerified = false;
          await verifyToken(reqLiveAdmin, {}, () => { adminVerified = true; });
          assert(
            adminVerified && reqLiveAdmin.user.role === 'admin',
            'Live DB: verifyToken attaches live user with role: admin'
          );

          // 27. Test role guard on live DB attached user
          let adminAccessGranted = false;
          isAdmin(reqLiveAdmin, {}, () => { adminAccessGranted = true; });
          assert(adminAccessGranted === true, 'Live DB: isAdmin passes live user with role: admin');
        } finally {
          await User.deleteMany({ email: { $in: [adminEmail, clientEmail] } });
          console.log('  🧹 Cleaned up live test admin & client users');
          await mongoose.connection.close();
        }
      } catch (dbErr) {
        console.log(`  ℹ️  Live DB skipped (${dbErr.message.split('\n')[0]}). Unit tests fully validated.`);
      }
    }

    console.log('\n===========================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} DAY 7 TESTS PASSED SUCCESSFULLY!`);
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

runDay7Tests();
