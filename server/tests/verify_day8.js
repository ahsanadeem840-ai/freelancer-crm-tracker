const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { User, Client } = require('../models');
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
} = require('../controllers/clientController');
const {
  protect,
  authorize,
} = require('../middleware/authMiddleware');

// Mock Express Request & Response helper
const mockRequestResponse = (body = {}, query = {}, params = {}, user = null, headers = {}) => {
  let resolveResult;
  const promise = new Promise((resolve) => {
    resolveResult = resolve;
  });

  const req = {
    body,
    query,
    params,
    user,
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

  const next = (err) => {
    if (err) {
      resolveResult({ status: 500, error: err });
    }
  };

  return { req, res, next, promise };
};

async function runDay8Tests() {
  console.log('===========================================================');
  console.log('🧪 Starting Day 8 Test Suite (Client CRUD API & CRM Pipeline)');
  console.log('===========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Category 1: Client Schema & Validation Rules
    // -------------------------------------------------------------
    console.log('📦 Category 1: Client Schema Validation Rules');

    // 1. Required fields check: missing userId
    let userErr = null;
    try {
      const noUserClient = new Client({ name: 'Alpha Client', email: 'alpha@example.com' });
      await noUserClient.validate();
    } catch (err) {
      userErr = err;
    }
    assert(
      userErr && userErr.errors['userId'],
      'Client schema rejects missing userId'
    );

    // 2. Required fields check: missing name
    let nameErr = null;
    try {
      const noNameClient = new Client({
        userId: new mongoose.Types.ObjectId(),
        email: 'alpha@example.com',
      });
      await noNameClient.validate();
    } catch (err) {
      nameErr = err;
    }
    assert(
      nameErr && nameErr.errors['name'],
      'Client schema rejects missing name'
    );

    // 3. Required fields check: missing email
    let emailErr = null;
    try {
      const noEmailClient = new Client({
        userId: new mongoose.Types.ObjectId(),
        name: 'Alpha Client',
      });
      await noEmailClient.validate();
    } catch (err) {
      emailErr = err;
    }
    assert(
      emailErr && emailErr.errors['email'],
      'Client schema rejects missing email'
    );

    // 4. Invalid email format
    let badEmailErr = null;
    try {
      const invalidEmailClient = new Client({
        userId: new mongoose.Types.ObjectId(),
        name: 'Alpha Client',
        email: 'invalid-email-address',
      });
      await invalidEmailClient.validate();
    } catch (err) {
      badEmailErr = err;
    }
    assert(
      badEmailErr && badEmailErr.errors['email'],
      'Client schema rejects malformed email address'
    );

    // 5. Invalid status enum
    let badStatusErr = null;
    try {
      const badStatusClient = new Client({
        userId: new mongoose.Types.ObjectId(),
        name: 'Alpha Client',
        email: 'valid@example.com',
        status: 'unsupported_status_test',
      });
      await badStatusClient.validate();
    } catch (err) {
      badStatusErr = err;
    }
    assert(
      badStatusErr && badStatusErr.errors['status'],
      'Client schema rejects invalid status enum value'
    );

    // 6. Valid client with defaults
    const validClient = new Client({
      userId: new mongoose.Types.ObjectId(),
      name: 'Acme Global',
      email: 'CONTACT@ACME.COM',
    });
    assert(
      validClient.status === 'lead',
      "Default client status is 'lead'"
    );
    assert(
      validClient.currency === 'USD',
      "Default client currency is 'USD'"
    );
    assert(
      validClient.totalBilled === 0 && validClient.totalPaid === 0,
      'Default billing totals initialize to 0'
    );
    assert(
      validClient.email === 'contact@acme.com',
      'Client email is automatically trimmed and lowercased by Mongoose'
    );

    // -------------------------------------------------------------
    // Category 2: Client Creation Controller (POST /api/clients)
    // -------------------------------------------------------------
    console.log('\n📝 Category 2: Client Creation Controller (POST /api/clients)');

    const mockUserId1 = new mongoose.Types.ObjectId();
    const mockUserFreelancer = {
      _id: mockUserId1,
      role: 'freelancer',
      name: 'Freelancer One',
      email: 'f1@example.com',
    };

    // 7. Missing required fields validation
    const { req: r1, res: res1, next: n1, promise: p1 } = mockRequestResponse(
      { company: 'Ghost Corp' },
      {},
      {},
      mockUserFreelancer
    );
    createClient(r1, res1, n1);
    const result1 = await p1;
    assert(
      result1.status === 400 && !result1.data.success,
      'createClient() rejects request when name or email is missing with 400 Bad Request'
    );

    // 8. Invalid email regex validation
    const { req: r2, res: res2, next: n2, promise: p2 } = mockRequestResponse(
      { name: 'John Doe', email: 'notanemail' },
      {},
      {},
      mockUserFreelancer
    );
    createClient(r2, res2, n2);
    const result2 = await p2;
    assert(
      result2.status === 400 && result2.data.message.includes('valid client email'),
      'createClient() rejects malformed email with descriptive error'
    );

    // 9. Invalid status validation
    const { req: r3, res: res3, next: n3, promise: p3 } = mockRequestResponse(
      { name: 'John Doe', email: 'john@example.com', status: 'invalid_status_xyz' },
      {},
      {},
      mockUserFreelancer
    );
    createClient(r3, res3, n3);
    const result3 = await p3;
    assert(
      result3.status === 400 && result3.data.message.includes('not a valid status'),
      'createClient() rejects invalid status filter with allowed values list'
    );

    // -------------------------------------------------------------
    // Category 3: Single Client Controller Validations (GET / PUT / DELETE)
    // -------------------------------------------------------------
    console.log('\n🔍 Category 3: Single Client & ID Format Validations');

    // 10. Invalid ObjectId format on GET /api/clients/:id
    const { req: r4, res: res4, next: n4, promise: p4 } = mockRequestResponse(
      {},
      {},
      { id: '123-not-an-objectid' },
      mockUserFreelancer
    );
    getClientById(r4, res4, n4);
    const result4 = await p4;
    assert(
      result4.status === 400 && result4.data.message.includes('Invalid client ID format'),
      'getClientById() validates ObjectId format and returns 400 for bad ID'
    );

    // 11. Invalid ObjectId format on PUT /api/clients/:id
    const { req: r5, res: res5, next: n5, promise: p5 } = mockRequestResponse(
      { name: 'Updated' },
      {},
      { id: 'bad_id' },
      mockUserFreelancer
    );
    updateClient(r5, res5, n5);
    const result5 = await p5;
    assert(
      result5.status === 400 && result5.data.message.includes('Invalid client ID format'),
      'updateClient() validates ObjectId format and returns 400 for bad ID'
    );

    // 12. Invalid ObjectId format on DELETE /api/clients/:id
    const { req: r6, res: res6, next: n6, promise: p6 } = mockRequestResponse(
      {},
      {},
      { id: 'bad_id' },
      mockUserFreelancer
    );
    deleteClient(r6, res6, n6);
    const result6 = await p6;
    assert(
      result6.status === 400 && result6.data.message.includes('Invalid client ID format'),
      'deleteClient() validates ObjectId format and returns 400 for bad ID'
    );

    // -------------------------------------------------------------
    // Category 4: Role-Based Access Control (RBAC) on Client Routes
    // -------------------------------------------------------------
    console.log('\n🛡️ Category 4: RBAC & Route Protection on Client Endpoints');

    const clientManagerGuard = authorize('admin', 'agency_owner', 'freelancer');

    // 13. Unauthenticated request blocked with 401
    const { req: rUnauth, res: resUnauth, promise: pUnauth } = mockRequestResponse();
    clientManagerGuard(rUnauth, resUnauth, () => {});
    const resUnauthResult = await pUnauth;
    assert(
      resUnauthResult.status === 401 && !resUnauthResult.data.success,
      'authorize() returns 401 Unauthorized when user is unauthenticated'
    );

    // 14. Customer 'client' role is forbidden from managing clients (403)
    const mockCustomerRole = { _id: new mongoose.Types.ObjectId(), role: 'client' };
    const { req: rForbidden, res: resForbidden, promise: pForbidden } = mockRequestResponse(
      {},
      {},
      {},
      mockCustomerRole
    );
    clientManagerGuard(rForbidden, resForbidden, () => {});
    const resForbiddenResult = await pForbidden;
    assert(
      resForbiddenResult.status === 403 &&
        resForbiddenResult.data.message.includes("User role 'client' is not authorized"),
      "Users with role 'client' are denied access to /api/clients with 403 Forbidden"
    );

    // 15. Freelancer role allowed
    let freelancerPassed = false;
    clientManagerGuard({ user: { role: 'freelancer' } }, {}, () => {
      freelancerPassed = true;
    });
    assert(freelancerPassed, "User role 'freelancer' is granted access to client CRUD");

    // 16. Agency owner role allowed
    let agencyOwnerPassed = false;
    clientManagerGuard({ user: { role: 'agency_owner' } }, {}, () => {
      agencyOwnerPassed = true;
    });
    assert(agencyOwnerPassed, "User role 'agency_owner' is granted access to client CRUD");

    // 17. Admin role allowed
    let adminPassed = false;
    clientManagerGuard({ user: { role: 'admin' } }, {}, () => {
      adminPassed = true;
    });
    assert(adminPassed, "User role 'admin' is granted access to client CRUD");

    // -------------------------------------------------------------
    // Category 5: Live MongoDB Atlas Operations & Multi-Tenancy Flow
    // -------------------------------------------------------------
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoUri) {
      console.log('\n🗄️ Category 5: Live Database Multi-Tenant CRUD Operations');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('  ✅ Connected to MongoDB Atlas for Live Test');

      const testTimestamp = Date.now();
      const freelancerA = await User.create({
        name: `Freelancer A ${testTimestamp}`,
        email: `freelancer_a_${testTimestamp}@testcrm.com`,
        password: 'Password123!',
        role: 'freelancer',
      });

      const freelancerB = await User.create({
        name: `Freelancer B ${testTimestamp}`,
        email: `freelancer_b_${testTimestamp}@testcrm.com`,
        password: 'Password123!',
        role: 'freelancer',
      });

      let createdClientId = null;
      let sharedClientEmail = `client_corp_${testTimestamp}@example.com`;

      try {
        // 18. Live Create Client for Freelancer A
        const { req: rCreateA, res: resCreateA, next: nCreateA, promise: pCreateA } =
          mockRequestResponse(
            {
              name: 'Acme Innovations',
              email: sharedClientEmail,
              company: 'Acme Corp',
              phone: '+1 555-0199',
              website: 'https://acme.example.com',
              status: 'lead',
              currency: 'USD',
              tags: ['enterprise', 'high-budget'],
              notes: 'Initial consultation scheduled for next Monday',
            },
            {},
            {},
            freelancerA
          );
        createClient(rCreateA, resCreateA, nCreateA);
        const resA = await pCreateA;
        assert(
          resA.status === 201 && resA.data.success && resA.data.data._id,
          'Live DB: Successfully created new client with 201 Created'
        );
        createdClientId = resA.data.data._id;
        assert(
          String(resA.data.data.userId) === String(freelancerA._id),
          'Live DB: Automatically attached authenticated freelancer userId to client record'
        );

        // 19. Duplicate Email Check within same workspace (Freelancer A duplicate)
        const { req: rDup, res: resDup, next: nDup, promise: pDup } = mockRequestResponse(
          {
            name: 'Acme Duplicate',
            email: sharedClientEmail,
          },
          {},
          {},
          freelancerA
        );
        createClient(rDup, resDup, nDup);
        const resDupResult = await pDup;
        assert(
          resDupResult.status === 400 && resDupResult.data.message.includes('already exists in your workspace'),
          'Live DB: Rejects duplicate client email within the same freelancer workspace'
        );

        // 20. Cross-Tenant Email Allowed: Freelancer B CAN create client with same email
        const { req: rCreateB, res: resCreateB, next: nCreateB, promise: pCreateB } =
          mockRequestResponse(
            {
              name: 'Acme by Freelancer B',
              email: sharedClientEmail,
              status: 'active',
            },
            {},
            {},
            freelancerB
          );
        createClient(rCreateB, resCreateB, nCreateB);
        const resB = await pCreateB;
        assert(
          resB.status === 201 && resB.data.success,
          'Live DB: Multi-tenancy permits identical client email across different freelancer workspaces'
        );
        const freelancerBClientId = resB.data.data._id;

        // 21. Live Listing & Isolation: Freelancer A only receives Freelancer A's client
        const { req: rListA, res: resListA, next: nListA, promise: pListA } = mockRequestResponse(
          {},
          {},
          {},
          freelancerA
        );
        getClients(rListA, resListA, nListA);
        const listResultA = await pListA;
        assert(
          listResultA.status === 200 &&
            listResultA.data.data.every((c) => String(c.userId) === String(freelancerA._id)),
          "Live DB: Multi-tenant list query only retrieves logged-in freelancer's clients"
        );

        // 22. Search functionality: Search by name
        const { req: rSearch, res: resSearch, next: nSearch, promise: pSearch } =
          mockRequestResponse(
            {},
            { search: 'Innovations' },
            {},
            freelancerA
          );
        getClients(rSearch, resSearch, nSearch);
        const searchResult = await pSearch;
        assert(
          searchResult.status === 200 &&
            searchResult.data.data.some((c) => c.name === 'Acme Innovations'),
          "Live DB: Client search matches text across 'name' field"
        );

        // 23. Filter functionality: Filter by status
        const { req: rFilter, res: resFilter, next: nFilter, promise: pFilter } =
          mockRequestResponse(
            {},
            { status: 'lead' },
            {},
            freelancerA
          );
        getClients(rFilter, resFilter, nFilter);
        const filterResult = await pFilter;
        assert(
          filterResult.status === 200 &&
            filterResult.data.data.every((c) => c.status === 'lead'),
          "Live DB: Client filtering by status 'lead' returns only matching records"
        );

        // 24. Pagination metadata verification
        const { req: rPage, res: resPage, next: nPage, promise: pPage } = mockRequestResponse(
          {},
          { page: 1, limit: 1 },
          {},
          freelancerA
        );
        getClients(rPage, resPage, nPage);
        const pageResult = await pPage;
        assert(
          pageResult.status === 200 &&
            pageResult.data.count <= 1 &&
            pageResult.data.page === 1 &&
            pageResult.data.pages >= 1,
          'Live DB: Pagination parameters correctly paginate result and calculate total pages'
        );

        // 25. Get Client by ID (Success)
        const { req: rGetId, res: resGetId, next: nGetId, promise: pGetId } =
          mockRequestResponse(
            {},
            {},
            { id: String(createdClientId) },
            freelancerA
          );
        getClientById(rGetId, resGetId, nGetId);
        const getByIdResult = await pGetId;
        assert(
          getByIdResult.status === 200 &&
            String(getByIdResult.data.data._id) === String(createdClientId),
          'Live DB: getClientById() returns full client document for owner'
        );

        // 26. Cross-Tenant Access Protection: Freelancer B CANNOT view Freelancer A's client (403)
        const { req: rCrossGet, res: resCrossGet, next: nCrossGet, promise: pCrossGet } =
          mockRequestResponse(
            {},
            {},
            { id: String(createdClientId) },
            freelancerB
          );
        getClientById(rCrossGet, resCrossGet, nCrossGet);
        const crossGetResult = await pCrossGet;
        assert(
          crossGetResult.status === 403 && !crossGetResult.data.success,
          "Live DB: getClientById() denies cross-tenant access with 403 Forbidden"
        );

        // 27. Update Client Details (PUT /api/clients/:id)
        const { req: rUpdate, res: resUpdate, next: nUpdate, promise: pUpdate } =
          mockRequestResponse(
            {
              status: 'active',
              company: 'Acme Global Holdings',
              notes: 'Contract signed. Initial milestone in progress.',
            },
            {},
            { id: String(createdClientId) },
            freelancerA
          );
        updateClient(rUpdate, resUpdate, nUpdate);
        const updateResult = await pUpdate;
        assert(
          updateResult.status === 200 &&
            updateResult.data.data.status === 'active' &&
            updateResult.data.data.company === 'Acme Global Holdings',
          'Live DB: updateClient() successfully modifies status, company and notes'
        );

        // 28. Cross-Tenant Update Protection: Freelancer B CANNOT update Freelancer A's client
        const { req: rCrossUpdate, res: resCrossUpdate, next: nCrossUpdate, promise: pCrossUpdate } =
          mockRequestResponse(
            { status: 'inactive' },
            {},
            { id: String(createdClientId) },
            freelancerB
          );
        updateClient(rCrossUpdate, resCrossUpdate, nCrossUpdate);
        const crossUpdateResult = await pCrossUpdate;
        assert(
          crossUpdateResult.status === 403,
          'Live DB: updateClient() prevents unauthorized cross-tenant modification with 403 Forbidden'
        );

        // 29. Client Pipeline Statistics (GET /api/clients/stats)
        const { req: rStats, res: resStats, next: nStats, promise: pStats } = mockRequestResponse(
          {},
          {},
          {},
          freelancerA
        );
        getClientStats(rStats, resStats, nStats);
        const statsResult = await pStats;
        assert(
          statsResult.status === 200 &&
            statsResult.data.data.total >= 1 &&
            statsResult.data.data.active >= 1 &&
            typeof statsResult.data.data.financials === 'object',
          'Live DB: getClientStats() aggregates total, active status count and financial breakdown'
        );

        // 30. Cross-Tenant Delete Protection: Freelancer B CANNOT delete Freelancer A's client
        const { req: rCrossDel, res: resCrossDel, next: nCrossDel, promise: pCrossDel } =
          mockRequestResponse(
            {},
            {},
            { id: String(createdClientId) },
            freelancerB
          );
        deleteClient(rCrossDel, resCrossDel, nCrossDel);
        const crossDelResult = await pCrossDel;
        assert(
          crossDelResult.status === 403,
          'Live DB: deleteClient() prevents unauthorized deletion by another user with 403 Forbidden'
        );

        // 31. Delete Client by Owner (DELETE /api/clients/:id)
        const { req: rDel, res: resDel, next: nDel, promise: pDel } = mockRequestResponse(
          {},
          {},
          { id: String(createdClientId) },
          freelancerA
        );
        deleteClient(rDel, resDel, nDel);
        const delResult = await pDel;
        assert(
          delResult.status === 200 && delResult.data.success,
          'Live DB: deleteClient() successfully removes client record with 200 OK'
        );

        // 32. Verification: Deleted client returns 404
        const { req: rPostDel, res: resPostDel, next: nPostDel, promise: pPostDel } =
          mockRequestResponse(
            {},
            {},
            { id: String(createdClientId) },
            freelancerA
          );
        getClientById(rPostDel, resPostDel, nPostDel);
        const postDelResult = await pPostDel;
        assert(
          postDelResult.status === 404 && !postDelResult.data.success,
          'Live DB: getClientById() on deleted client returns 404 Not Found'
        );

        // Cleanup test data
        await Client.deleteMany({
          _id: { $in: [createdClientId, freelancerBClientId] },
        });
        await User.deleteMany({
          _id: { $in: [freelancerA._id, freelancerB._id] },
        });
        console.log('  🧹 Cleaned up live test users and client records');
      } catch (err) {
        // Safe cleanup if error
        if (createdClientId) await Client.findByIdAndDelete(createdClientId);
        await User.deleteMany({
          _id: { $in: [freelancerA._id, freelancerB._id] },
        });
        throw err;
      }
    }

    console.log('\n===========================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} DAY 8 TESTS PASSED SUCCESSFULLY!`);
    console.log('===========================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Suite Failed with Error:\n', error);
    process.exit(1);
  }
}

runDay8Tests();
