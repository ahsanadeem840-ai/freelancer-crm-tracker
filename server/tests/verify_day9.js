const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { User, Client, Project } = require('../models');
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats,
} = require('../controllers/projectController');
const {
  getClientProjects,
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

async function runDay9Tests() {
  console.log('===========================================================');
  console.log('🧪 Starting Day 9 Test Suite (Project CRUD API & Client Linking)');
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
    // Category 1: Project Schema Validation Rules
    // -------------------------------------------------------------
    console.log('📦 Category 1: Project Schema Validation Rules');

    // 1. Missing userId
    let userErr = null;
    try {
      const p = new Project({
        clientId: new mongoose.Types.ObjectId(),
        title: 'Alpha App',
        budget: 1000,
      });
      await p.validate();
    } catch (err) {
      userErr = err;
    }
    assert(userErr && userErr.errors['userId'], 'Project schema rejects missing userId');

    // 2. Missing clientId (Client Relationship)
    let clientErr = null;
    try {
      const p = new Project({
        userId: new mongoose.Types.ObjectId(),
        title: 'Alpha App',
        budget: 1000,
      });
      await p.validate();
    } catch (err) {
      clientErr = err;
    }
    assert(clientErr && clientErr.errors['clientId'], 'Project schema rejects missing clientId (Client link mandatory)');

    // 3. Missing title
    let titleErr = null;
    try {
      const p = new Project({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        budget: 1000,
      });
      await p.validate();
    } catch (err) {
      titleErr = err;
    }
    assert(titleErr && titleErr.errors['title'], 'Project schema rejects missing title');

    // 4. Invalid status enum
    let badStatusErr = null;
    try {
      const p = new Project({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        title: 'Test',
        status: 'invalid_status_xyz',
      });
      await p.validate();
    } catch (err) {
      badStatusErr = err;
    }
    assert(badStatusErr && badStatusErr.errors['status'], 'Project schema rejects invalid status enum');

    // 5. Invalid priority enum
    let badPriorityErr = null;
    try {
      const p = new Project({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        title: 'Test',
        priority: 'super_high',
      });
      await p.validate();
    } catch (err) {
      badPriorityErr = err;
    }
    assert(badPriorityErr && badPriorityErr.errors['priority'], 'Project schema rejects invalid priority enum');

    // 6. Invalid pricingType enum
    let badPricingErr = null;
    try {
      const p = new Project({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        title: 'Test',
        pricingType: 'monthly',
      });
      await p.validate();
    } catch (err) {
      badPricingErr = err;
    }
    assert(badPricingErr && badPricingErr.errors['pricingType'], 'Project schema rejects invalid pricingType enum');

    // 7. Negative budget rejected
    let negBudgetErr = null;
    try {
      const p = new Project({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        title: 'Test',
        budget: -50,
      });
      await p.validate();
    } catch (err) {
      negBudgetErr = err;
    }
    assert(negBudgetErr && negBudgetErr.errors['budget'], 'Project schema rejects negative budget');

    // 8. Negative hourlyRate rejected
    let negRateErr = null;
    try {
      const p = new Project({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        title: 'Test',
        hourlyRate: -10,
      });
      await p.validate();
    } catch (err) {
      negRateErr = err;
    }
    assert(negRateErr && negRateErr.errors['hourlyRate'], 'Project schema rejects negative hourlyRate');

    // 9. Valid default values check
    const validP = new Project({
      userId: new mongoose.Types.ObjectId(),
      clientId: new mongoose.Types.ObjectId(),
      title: 'Awesome SaaS Portal',
    });
    assert(validP.status === 'planning', "Default project status is 'planning'");
    assert(validP.priority === 'medium', "Default project priority is 'medium'");
    assert(validP.pricingType === 'fixed', "Default project pricingType is 'fixed'");
    assert(validP.budget === 0, 'Default project budget initializes to 0');
    assert(validP.hourlyRate === 0, 'Default project hourlyRate initializes to 0');
    assert(Array.isArray(validP.attachments) && validP.attachments.length === 0, 'Attachments default to empty array');
    assert(Array.isArray(validP.tags) && validP.tags.length === 0, 'Tags default to empty array');

    // -------------------------------------------------------------
    // Category 2: Project Creation Controller Validations
    // -------------------------------------------------------------
    console.log('\n📝 Category 2: Project Creation Controller Validations (POST /api/projects)');

    const mockFreelancer = {
      _id: new mongoose.Types.ObjectId(),
      role: 'freelancer',
      name: 'Freelancer Dev',
      email: 'dev@example.com',
    };

    // 10. Missing title
    const { req: r1, res: res1, next: n1, promise: p1 } = mockRequestResponse(
      { clientId: new mongoose.Types.ObjectId().toString() },
      {},
      {},
      mockFreelancer
    );
    createProject(r1, res1, n1);
    const result1 = await p1;
    assert(result1.status === 400 && result1.data.message.includes('title is required'), 'createProject() rejects missing title');

    // 11. Missing clientId
    const { req: r2, res: res2, next: n2, promise: p2 } = mockRequestResponse(
      { title: 'Project without Client' },
      {},
      {},
      mockFreelancer
    );
    createProject(r2, res2, n2);
    const result2 = await p2;
    assert(result2.status === 400 && result2.data.message.includes('Client ID is required'), 'createProject() rejects missing clientId');

    // 12. Invalid clientId format
    const { req: r3, res: res3, next: n3, promise: p3 } = mockRequestResponse(
      { title: 'Project Bad Client', clientId: 'bad-id-string' },
      {},
      {},
      mockFreelancer
    );
    createProject(r3, res3, n3);
    const result3 = await p3;
    assert(result3.status === 400 && result3.data.message.includes('Invalid client ID format'), 'createProject() rejects malformed clientId');

    // 13. Invalid status value
    const { req: r4, res: res4, next: n4, promise: p4 } = mockRequestResponse(
      { title: 'Project Bad Status', clientId: new mongoose.Types.ObjectId().toString(), status: 'flying' },
      {},
      {},
      mockFreelancer
    );
    createProject(r4, res4, n4);
    const result4 = await p4;
    assert(result4.status === 400 && result4.data.message.includes('not a valid project status'), 'createProject() rejects invalid status');

    // 14. Invalid priority value
    const { req: r5, res: res5, next: n5, promise: p5 } = mockRequestResponse(
      { title: 'Project Bad Priority', clientId: new mongoose.Types.ObjectId().toString(), priority: 'critical' },
      {},
      {},
      mockFreelancer
    );
    createProject(r5, res5, n5);
    const result5 = await p5;
    assert(result5.status === 400 && result5.data.message.includes('not a valid priority'), 'createProject() rejects invalid priority');

    // 15. Invalid pricingType value
    const { req: r6, res: res6, next: n6, promise: p6 } = mockRequestResponse(
      { title: 'Project Bad Pricing', clientId: new mongoose.Types.ObjectId().toString(), pricingType: 'crypto' },
      {},
      {},
      mockFreelancer
    );
    createProject(r6, res6, n6);
    const result6 = await p6;
    assert(result6.status === 400 && result6.data.message.includes('not a valid pricing type'), 'createProject() rejects invalid pricingType');

    // 16. Negative budget value
    const { req: r7, res: res7, next: n7, promise: p7 } = mockRequestResponse(
      { title: 'Project Bad Budget', clientId: new mongoose.Types.ObjectId().toString(), budget: -500 },
      {},
      {},
      mockFreelancer
    );
    createProject(r7, res7, n7);
    const result7 = await p7;
    assert(result7.status === 400 && result7.data.message.includes('Budget must be a non-negative number'), 'createProject() rejects negative budget');

    // -------------------------------------------------------------
    // Category 3: Single Resource & ID Format Validations
    // -------------------------------------------------------------
    console.log('\n🔍 Category 3: Single Project & ID Format Validations');

    // 17. Bad ID on GET /api/projects/:id
    const { req: r8, res: res8, next: n8, promise: p8 } = mockRequestResponse({}, {}, { id: 'invalid_id' }, mockFreelancer);
    getProjectById(r8, res8, n8);
    const result8 = await p8;
    assert(result8.status === 400 && result8.data.message.includes('Invalid project ID format'), 'getProjectById() returns 400 for bad ID');

    // 18. Bad ID on PUT /api/projects/:id
    const { req: r9, res: res9, next: n9, promise: p9 } = mockRequestResponse({ title: 'New' }, {}, { id: 'invalid_id' }, mockFreelancer);
    updateProject(r9, res9, n9);
    const result9 = await p9;
    assert(result9.status === 400 && result9.data.message.includes('Invalid project ID format'), 'updateProject() returns 400 for bad ID');

    // 19. Bad ID on DELETE /api/projects/:id
    const { req: r10, res: res10, next: n10, promise: p10 } = mockRequestResponse({}, {}, { id: 'invalid_id' }, mockFreelancer);
    deleteProject(r10, res10, n10);
    const result10 = await p10;
    assert(result10.status === 400 && result10.data.message.includes('Invalid project ID format'), 'deleteProject() returns 400 for bad ID');

    // 20. Bad ID on GET /api/clients/:id/projects
    const { req: r11, res: res11, next: n11, promise: p11 } = mockRequestResponse({}, {}, { id: 'invalid_id' }, mockFreelancer);
    getClientProjects(r11, res11, n11);
    const result11 = await p11;
    assert(result11.status === 400 && result11.data.message.includes('Invalid client ID format'), 'getClientProjects() returns 400 for bad client ID');

    // -------------------------------------------------------------
    // Category 4: Role-Based Access Control (RBAC) on Project Endpoints
    // -------------------------------------------------------------
    console.log('\n🛡️ Category 4: RBAC & Route Protection on Project Endpoints');

    const projectManagerGuard = authorize('admin', 'agency_owner', 'freelancer');

    // 21. Unauthenticated request blocked
    const { req: rUnauth, res: resUnauth, promise: pUnauth } = mockRequestResponse();
    projectManagerGuard(rUnauth, resUnauth, () => {});
    const resUnauthResult = await pUnauth;
    assert(resUnauthResult.status === 401 && !resUnauthResult.data.success, 'authorize() blocks unauthenticated requests with 401 Unauthorized');

    // 22. 'client' role forbidden
    const mockClientRole = { _id: new mongoose.Types.ObjectId(), role: 'client' };
    const { req: rForbidden, res: resForbidden, promise: pForbidden } = mockRequestResponse({}, {}, {}, mockClientRole);
    projectManagerGuard(rForbidden, resForbidden, () => {});
    const resForbiddenResult = await pForbidden;
    assert(
      resForbiddenResult.status === 403 && resForbiddenResult.data.message.includes("User role 'client' is not authorized"),
      "Users with role 'client' are forbidden with 403"
    );

    // 23. Allowed roles
    let freelancerAllowed = false;
    projectManagerGuard({ user: { role: 'freelancer' } }, {}, () => { freelancerAllowed = true; });
    assert(freelancerAllowed, "User role 'freelancer' is granted access");

    let agencyAllowed = false;
    projectManagerGuard({ user: { role: 'agency_owner' } }, {}, () => { agencyAllowed = true; });
    assert(agencyAllowed, "User role 'agency_owner' is granted access");

    let adminAllowed = false;
    projectManagerGuard({ user: { role: 'admin' } }, {}, () => { adminAllowed = true; });
    assert(adminAllowed, "User role 'admin' is granted access");

    // -------------------------------------------------------------
    // Category 5: Live MongoDB Atlas Operations & Client Relationship Flow
    // -------------------------------------------------------------
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoUri) {
      console.log('\n🗄️ Category 5: Live Database Multi-Tenant Project CRUD & Client Relationship');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('  ✅ Connected to MongoDB Atlas for Live Test');

      const testTimestamp = Date.now();
      const freelancerA = await User.create({
        name: `Freelancer Alpha ${testTimestamp}`,
        email: `alpha_${testTimestamp}@test.com`,
        password: 'Password123!',
        role: 'freelancer',
      });

      const freelancerB = await User.create({
        name: `Freelancer Beta ${testTimestamp}`,
        email: `beta_${testTimestamp}@test.com`,
        password: 'Password123!',
        role: 'freelancer',
      });

      // Create Client for Freelancer A
      const clientA = await Client.create({
        userId: freelancerA._id,
        name: `Acme Corp ${testTimestamp}`,
        email: `acme_${testTimestamp}@test.com`,
        company: 'Acme International',
        status: 'active',
      });

      // Create Client for Freelancer B
      const clientB = await Client.create({
        userId: freelancerB._id,
        name: `Globex Corp ${testTimestamp}`,
        email: `globex_${testTimestamp}@test.com`,
        company: 'Globex Dynamics',
        status: 'lead',
      });

      let createdProjectId = null;

      try {
        // 24. Live DB: Attempt to create project with non-existent client ID -> 404
        const nonExistentClientId = new mongoose.Types.ObjectId().toString();
        const { req: rNonExist, res: resNonExist, next: nNonExist, promise: pNonExist } =
          mockRequestResponse(
            { title: 'Project NonExistent', clientId: nonExistentClientId, budget: 1000 },
            {},
            {},
            freelancerA
          );
        createProject(rNonExist, resNonExist, nNonExist);
        const nonExistResult = await pNonExist;
        assert(
          nonExistResult.status === 404 && nonExistResult.data.message.includes('Client not found'),
          'Live DB: createProject() returns 404 when referenced Client ID does not exist'
        );

        // 25. Live DB: Cross-tenant client rejection -> Freelancer A tries to link project to Freelancer B's client
        const { req: rCrossClient, res: resCrossClient, next: nCrossClient, promise: pCrossClient } =
          mockRequestResponse(
            { title: 'Cross Tenant Project', clientId: clientB._id.toString(), budget: 2500 },
            {},
            {},
            freelancerA
          );
        createProject(rCrossClient, resCrossClient, nCrossClient);
        const crossClientResult = await pCrossClient;
        assert(
          crossClientResult.status === 403 &&
            crossClientResult.data.message.includes('Client does not belong to your workspace'),
          'Live DB: createProject() prevents Freelancer A from linking Freelancer B client with 403 Forbidden'
        );

        // 26. Live DB: Successfully create project linked to Client A
        const { req: rCreate, res: resCreate, next: nCreate, promise: pCreate } =
          mockRequestResponse(
            {
              title: 'Mobile App Redesign',
              description: 'Full iOS and Android UI redesign with React Native',
              clientId: clientA._id.toString(),
              status: 'planning',
              priority: 'high',
              pricingType: 'fixed',
              budget: 4500,
              hourlyRate: 65,
              tags: ['Mobile', 'UI/UX', 'Figma'],
            },
            {},
            {},
            freelancerA
          );
        createProject(rCreate, resCreate, nCreate);
        const createResult = await pCreate;
        assert(
          createResult.status === 201 && createResult.data.success,
          'Live DB: createProject() successfully creates project record linked to client with 201 Created'
        );
        createdProjectId = createResult.data.data._id;
        assert(
          createResult.data.data.clientId &&
            createResult.data.data.clientId.name === clientA.name &&
            createResult.data.data.clientId.company === clientA.company,
          'Live DB: createProject() automatically populates linked client details (name, company)'
        );

        // 27. Live DB: Create project with status 'completed' auto-sets completedAt
        const { req: rComp, res: resComp, next: nComp, promise: pComp } =
          mockRequestResponse(
            {
              title: 'Quick Landing Page',
              clientId: clientA._id.toString(),
              status: 'completed',
              budget: 800,
            },
            {},
            {},
            freelancerA
          );
        createProject(rComp, resComp, nComp);
        const compResult = await pComp;
        assert(
          compResult.status === 201 && compResult.data.data.completedAt !== null,
          "Live DB: createProject() auto-sets 'completedAt' timestamp when status is 'completed'"
        );
        const quickProjectId = compResult.data.data._id;

        // 28. Live DB: Multi-tenant listing query: Freelancer A sees only their projects
        const { req: rListA, res: resListA, next: nListA, promise: pListA } =
          mockRequestResponse({}, {}, {}, freelancerA);
        getProjects(rListA, resListA, nListA);
        const listAResult = await pListA;
        assert(
          listAResult.status === 200 && listAResult.data.total >= 2,
          'Live DB: getProjects() retrieves all projects owned by authenticated Freelancer A'
        );

        // 29. Live DB: Multi-tenant listing query: Freelancer B sees 0 projects
        const { req: rListB, res: resListB, next: nListB, promise: pListB } =
          mockRequestResponse({}, {}, {}, freelancerB);
        getProjects(rListB, resListB, nListB);
        const listBResult = await pListB;
        assert(
          listBResult.status === 200 && listBResult.data.total === 0,
          'Live DB: Multi-tenancy isolation strictly hides Freelancer A projects from Freelancer B'
        );

        // 30. Live DB: Client filter query (?clientId=...)
        const { req: rClientFilter, res: resClientFilter, next: nClientFilter, promise: pClientFilter } =
          mockRequestResponse({}, { clientId: clientA._id.toString() }, {}, freelancerA);
        getProjects(rClientFilter, resClientFilter, nClientFilter);
        const clientFilterResult = await pClientFilter;
        assert(
          clientFilterResult.status === 200 &&
            clientFilterResult.data.data.every((p) => String(p.clientId._id || p.clientId) === String(clientA._id)),
          'Live DB: getProjects(?clientId=...) correctly filters projects belonging to specific client'
        );

        // 31. Live DB: Search filter (?search=Redesign)
        const { req: rSearch, res: resSearch, next: nSearch, promise: pSearch } =
          mockRequestResponse({}, { search: 'Redesign' }, {}, freelancerA);
        getProjects(rSearch, resSearch, nSearch);
        const searchResult = await pSearch;
        assert(
          searchResult.status === 200 &&
            searchResult.data.data.some((p) => p.title.includes('Redesign')),
          'Live DB: getProjects(?search=...) matches query against project title and description'
        );

        // 32. Live DB: Status filter (?status=completed)
        const { req: rStatusFilter, res: resStatusFilter, next: nStatusFilter, promise: pStatusFilter } =
          mockRequestResponse({}, { status: 'completed' }, {}, freelancerA);
        getProjects(rStatusFilter, resStatusFilter, nStatusFilter);
        const statusFilterResult = await pStatusFilter;
        assert(
          statusFilterResult.status === 200 &&
            statusFilterResult.data.data.every((p) => p.status === 'completed'),
          'Live DB: getProjects(?status=completed) returns only matching status projects'
        );

        // 33. Live DB: Single project retrieval (GET /api/projects/:id)
        const { req: rGetOne, res: resGetOne, next: nGetOne, promise: pGetOne } =
          mockRequestResponse({}, {}, { id: createdProjectId.toString() }, freelancerA);
        getProjectById(rGetOne, resGetOne, nGetOne);
        const getOneResult = await pGetOne;
        assert(
          getOneResult.status === 200 &&
            getOneResult.data.data._id.toString() === createdProjectId.toString() &&
            getOneResult.data.data.clientId.name === clientA.name,
          'Live DB: getProjectById() returns project with populated client document'
        );

        // 34. Live DB: Cross-tenant single project access denied (Freelancer B accessing Freelancer A project)
        const { req: rGetForbidden, res: resGetForbidden, next: nGetForbidden, promise: pGetForbidden } =
          mockRequestResponse({}, {}, { id: createdProjectId.toString() }, freelancerB);
        getProjectById(rGetForbidden, resGetForbidden, nGetForbidden);
        const getForbiddenResult = await pGetForbidden;
        assert(
          getForbiddenResult.status === 403 && !getForbiddenResult.data.success,
          'Live DB: getProjectById() blocks unauthorized cross-tenant view with 403 Forbidden'
        );

        // 35. Live DB: Update project (PUT /api/projects/:id)
        const { req: rUpdate, res: resUpdate, next: nUpdate, promise: pUpdate } =
          mockRequestResponse(
            {
              title: 'Mobile App Redesign (Phase 2)',
              budget: 5200,
              status: 'in_progress',
              priority: 'urgent',
            },
            {},
            { id: createdProjectId.toString() },
            freelancerA
          );
        updateProject(rUpdate, resUpdate, nUpdate);
        const updateResult = await pUpdate;
        assert(
          updateResult.status === 200 &&
            updateResult.data.data.title === 'Mobile App Redesign (Phase 2)' &&
            updateResult.data.data.budget === 5200 &&
            updateResult.data.data.status === 'in_progress' &&
            updateResult.data.data.priority === 'urgent',
          'Live DB: updateProject() modifies title, budget, status and priority successfully'
        );

        // 36. Live DB: Cross-tenant project update blocked
        const { req: rUpdForbidden, res: resUpdForbidden, next: nUpdForbidden, promise: pUpdForbidden } =
          mockRequestResponse({ title: 'Hacked Title' }, {}, { id: createdProjectId.toString() }, freelancerB);
        updateProject(rUpdForbidden, resUpdForbidden, nUpdForbidden);
        const updForbiddenResult = await pUpdForbidden;
        assert(
          updForbiddenResult.status === 403 && !updForbiddenResult.data.success,
          'Live DB: updateProject() blocks cross-tenant modification with 403 Forbidden'
        );

        // 37. Live DB: Relationship endpoint GET /api/clients/:id/projects
        const { req: rClientProj, res: resClientProj, next: nClientProj, promise: pClientProj } =
          mockRequestResponse({}, {}, { id: clientA._id.toString() }, freelancerA);
        getClientProjects(rClientProj, resClientProj, nClientProj);
        const clientProjResult = await pClientProj;
        assert(
          clientProjResult.status === 200 &&
            clientProjResult.data.success &&
            clientProjResult.data.client.name === clientA.name &&
            clientProjResult.data.total >= 2,
          'Live DB: getClientProjects() returns all projects linked to the specific client'
        );

        // 38. Live DB: Cross-tenant client projects access blocked (Freelancer B accessing Client A projects)
        const { req: rCPForbidden, res: resCPForbidden, next: nCPForbidden, promise: pCPForbidden } =
          mockRequestResponse({}, {}, { id: clientA._id.toString() }, freelancerB);
        getClientProjects(rCPForbidden, resCPForbidden, nCPForbidden);
        const cpForbiddenResult = await pCPForbidden;
        assert(
          cpForbiddenResult.status === 403 && !cpForbiddenResult.data.success,
          'Live DB: getClientProjects() blocks cross-tenant client projects inspection with 403 Forbidden'
        );

        // 39. Live DB: Project Pipeline Statistics (GET /api/projects/stats)
        const { req: rStats, res: resStats, next: nStats, promise: pStats } =
          mockRequestResponse({}, {}, {}, freelancerA);
        getProjectStats(rStats, resStats, nStats);
        const statsResult = await pStats;
        assert(
          statsResult.status === 200 &&
            statsResult.data.success &&
            statsResult.data.data.total >= 2 &&
            statsResult.data.data.statusBreakdown &&
            statsResult.data.data.priorityBreakdown &&
            statsResult.data.data.financials.totalBudget > 0,
          'Live DB: getProjectStats() computes pipeline status counts, priorities, and total budget'
        );

        // 40. Live DB: Delete project cross-tenant protection
        const { req: rDelForbidden, res: resDelForbidden, next: nDelForbidden, promise: pDelForbidden } =
          mockRequestResponse({}, {}, { id: createdProjectId.toString() }, freelancerB);
        deleteProject(rDelForbidden, resDelForbidden, nDelForbidden);
        const delForbiddenResult = await pDelForbidden;
        assert(
          delForbiddenResult.status === 403 && !delForbiddenResult.data.success,
          'Live DB: deleteProject() blocks cross-tenant deletion with 403 Forbidden'
        );

        // 41. Live DB: Delete project succeeds for owner
        const { req: rDel, res: resDel, next: nDel, promise: pDel } =
          mockRequestResponse({}, {}, { id: createdProjectId.toString() }, freelancerA);
        deleteProject(rDel, resDel, nDel);
        const delResult = await pDel;
        assert(
          delResult.status === 200 && delResult.data.success,
          'Live DB: deleteProject() deletes project document with 200 OK'
        );

        // 42. Live DB: Verification that deleted project returns 404
        const { req: rPostDel, res: resPostDel, next: nPostDel, promise: pPostDel } =
          mockRequestResponse({}, {}, { id: createdProjectId.toString() }, freelancerA);
        getProjectById(rPostDel, resPostDel, nPostDel);
        const postDelResult = await pPostDel;
        assert(
          postDelResult.status === 404 && !postDelResult.data.success,
          'Live DB: getProjectById() on deleted project returns 404 Not Found'
        );

        // Cleanup created test records
        await Project.deleteMany({ _id: { $in: [createdProjectId, quickProjectId] } });
        await Client.deleteMany({ _id: { $in: [clientA._id, clientB._id] } });
        await User.deleteMany({ _id: { $in: [freelancerA._id, freelancerB._id] } });
        console.log('  🧹 Cleaned up live test users, clients, and project records');
      } catch (err) {
        // Safe cleanup in case of test error
        if (createdProjectId) await Project.findByIdAndDelete(createdProjectId);
        await Client.deleteMany({ _id: { $in: [clientA._id, clientB._id] } });
        await User.deleteMany({ _id: { $in: [freelancerA._id, freelancerB._id] } });
        throw err;
      }
    }

    console.log('\n===========================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} DAY 9 TESTS PASSED SUCCESSFULLY!`);
    console.log('===========================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Suite Failed with Error:\n', error);
    process.exit(1);
  }
}

runDay9Tests();
