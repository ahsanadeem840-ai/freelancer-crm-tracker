const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { User, Client, Project, Task } = require('../models');
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getTaskStats,
} = require('../controllers/taskController');
const {
  getProjectTasks,
} = require('../controllers/projectController');
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

async function runDay10Tests() {
  console.log('===========================================================');
  console.log('🧪 Starting Day 10 Test Suite (Task CRUD API & Project Linking)');
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
    // Category 1: Task Schema Validation Rules
    // -------------------------------------------------------------
    console.log('📦 Category 1: Task Schema Validation Rules');

    // 1. Missing userId
    let userErr = null;
    try {
      const t = new Task({
        projectId: new mongoose.Types.ObjectId(),
        title: 'Design Wireframes',
      });
      await t.validate();
    } catch (err) {
      userErr = err;
    }
    assert(userErr && userErr.errors['userId'], 'Task schema rejects missing userId');

    // 2. Missing projectId (Project Relationship link mandatory)
    let projectErr = null;
    try {
      const t = new Task({
        userId: new mongoose.Types.ObjectId(),
        title: 'Design Wireframes',
      });
      await t.validate();
    } catch (err) {
      projectErr = err;
    }
    assert(
      projectErr && projectErr.errors['projectId'],
      'Task schema rejects missing projectId (Project link mandatory)'
    );

    // 3. Missing title
    let titleErr = null;
    try {
      const t = new Task({
        userId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
      });
      await t.validate();
    } catch (err) {
      titleErr = err;
    }
    assert(titleErr && titleErr.errors['title'], 'Task schema rejects missing title');

    // 4. Invalid status enum
    let statusErr = null;
    try {
      const t = new Task({
        userId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        title: 'Invalid Status Test',
        status: 'archived_pending',
      });
      await t.validate();
    } catch (err) {
      statusErr = err;
    }
    assert(statusErr && statusErr.errors['status'], 'Task schema rejects invalid status enum');

    // 5. Invalid priority enum
    let priorityErr = null;
    try {
      const t = new Task({
        userId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        title: 'Invalid Priority Test',
        priority: 'critical_blocker',
      });
      await t.validate();
    } catch (err) {
      priorityErr = err;
    }
    assert(priorityErr && priorityErr.errors['priority'], 'Task schema rejects invalid priority enum');

    // 6. Negative estimatedHours
    let hoursErr = null;
    try {
      const t = new Task({
        userId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        title: 'Negative Hours Test',
        estimatedHours: -5,
      });
      await t.validate();
    } catch (err) {
      hoursErr = err;
    }
    assert(hoursErr && hoursErr.errors['estimatedHours'], 'Task schema rejects negative estimatedHours');

    // 7. Negative actualHours
    let actualHoursErr = null;
    try {
      const t = new Task({
        userId: new mongoose.Types.ObjectId(),
        projectId: new mongoose.Types.ObjectId(),
        title: 'Negative Actual Hours',
        actualHours: -3,
      });
      await t.validate();
    } catch (err) {
      actualHoursErr = err;
    }
    assert(actualHoursErr && actualHoursErr.errors['actualHours'], 'Task schema rejects negative actualHours');

    // 8. Default status is 'todo'
    const defaultTask = new Task({
      userId: new mongoose.Types.ObjectId(),
      projectId: new mongoose.Types.ObjectId(),
      title: 'Default Task',
    });
    assert(defaultTask.status === 'todo', "Default task status is 'todo'");

    // 9. Default priority is 'medium'
    assert(defaultTask.priority === 'medium', "Default task priority is 'medium'");

    // 10. Default estimatedHours is 0
    assert(defaultTask.estimatedHours === 0, 'Default estimatedHours initializes to 0');

    // 11. Default actualHours is 0
    assert(defaultTask.actualHours === 0, 'Default actualHours initializes to 0');

    // 12. Default order is 0
    assert(defaultTask.order === 0, 'Default Kanban order initializes to 0');

    // 13. Default isCompleted is false
    assert(defaultTask.isCompleted === false, 'Default isCompleted initializes to false');

    // 14. Tags default to empty array
    assert(Array.isArray(defaultTask.tags) && defaultTask.tags.length === 0, 'Tags default to empty array');

    // -------------------------------------------------------------
    // Category 2: Task Creation Controller Validations (POST /api/tasks)
    // -------------------------------------------------------------
    console.log('\n📝 Category 2: Task Creation Controller Validations (POST /api/tasks)');

    const mockFreelancer = {
      _id: new mongoose.Types.ObjectId(),
      role: 'freelancer',
      name: 'Freelancer Alex',
    };

    // 15. Missing title
    const { req: r1, res: res1, next: n1, promise: p1 } = mockRequestResponse(
      { projectId: new mongoose.Types.ObjectId().toString() },
      {},
      {},
      mockFreelancer
    );
    createTask(r1, res1, n1);
    const resTitle = await p1;
    assert(
      resTitle.status === 400 && resTitle.data.message.includes('title is required'),
      'createTask() rejects missing title'
    );

    // 16. Title exceeding 200 chars
    const { req: rLong, res: resLong, next: nLong, promise: pLong } = mockRequestResponse(
      {
        title: 'A'.repeat(201),
        projectId: new mongoose.Types.ObjectId().toString(),
      },
      {},
      {},
      mockFreelancer
    );
    createTask(rLong, resLong, nLong);
    const resLongTitle = await pLong;
    assert(
      resLongTitle.status === 400 && resLongTitle.data.message.includes('cannot exceed 200 characters'),
      'createTask() rejects title exceeding 200 characters'
    );

    // 17. Missing projectId
    const { req: r2, res: res2, next: n2, promise: p2 } = mockRequestResponse(
      { title: 'Setup Stripe Checkout' },
      {},
      {},
      mockFreelancer
    );
    createTask(r2, res2, n2);
    const resProject = await p2;
    assert(
      resProject.status === 400 && resProject.data.message.includes('project ID is required'),
      'createTask() rejects missing projectId'
    );

    // 18. Malformed projectId
    const { req: r3, res: res3, next: n3, promise: p3 } = mockRequestResponse(
      { title: 'Setup Stripe Checkout', projectId: 'invalid-mongoid-123' },
      {},
      {},
      mockFreelancer
    );
    createTask(r3, res3, n3);
    const resBadProjectId = await p3;
    assert(
      resBadProjectId.status === 400 && resBadProjectId.data.message.includes('Invalid project ID format'),
      'createTask() rejects malformed projectId'
    );

    // 19. Invalid status in request body
    const { req: r4, res: res4, next: n4, promise: p4 } = mockRequestResponse(
      {
        title: 'Setup Stripe Checkout',
        projectId: new mongoose.Types.ObjectId().toString(),
        status: 'invalid_status_enum',
      },
      {},
      {},
      mockFreelancer
    );
    createTask(r4, res4, n4);
    const resBadStatus = await p4;
    assert(
      resBadStatus.status === 400 && resBadStatus.data.message.includes('not a valid task status'),
      'createTask() rejects invalid status'
    );

    // 20. Invalid priority in request body
    const { req: r5, res: res5, next: n5, promise: p5 } = mockRequestResponse(
      {
        title: 'Setup Stripe Checkout',
        projectId: new mongoose.Types.ObjectId().toString(),
        priority: 'super_high',
      },
      {},
      {},
      mockFreelancer
    );
    createTask(r5, res5, n5);
    const resBadPriority = await p5;
    assert(
      resBadPriority.status === 400 && resBadPriority.data.message.includes('not a valid priority'),
      'createTask() rejects invalid priority'
    );

    // 21. Negative estimated hours
    const { req: r6, res: res6, next: n6, promise: p6 } = mockRequestResponse(
      {
        title: 'Setup Stripe Checkout',
        projectId: new mongoose.Types.ObjectId().toString(),
        estimatedHours: -10,
      },
      {},
      {},
      mockFreelancer
    );
    createTask(r6, res6, n6);
    const resNegHours = await p6;
    assert(
      resNegHours.status === 400 && resNegHours.data.message.includes('non-negative number'),
      'createTask() rejects negative estimatedHours'
    );

    // -------------------------------------------------------------
    // Category 3: Single Task, Reorder & ID Format Validations
    // -------------------------------------------------------------
    console.log('\n🔍 Category 3: Single Task, Reorder & ID Format Validations');

    // 22. getTaskById() with bad ID
    const { req: rId, res: resId, next: nId, promise: pId } = mockRequestResponse(
      {},
      {},
      { id: 'bad-task-id' },
      mockFreelancer
    );
    getTaskById(rId, resId, nId);
    const resBadId = await pId;
    assert(
      resBadId.status === 400 && resBadId.data.message.includes('Invalid task ID format'),
      'getTaskById() returns 400 for bad ID'
    );

    // 23. updateTask() with bad ID
    const { req: rUpId, res: resUpId, next: nUpId, promise: pUpId } = mockRequestResponse(
      { title: 'New Title' },
      {},
      { id: 'bad-task-id' },
      mockFreelancer
    );
    updateTask(rUpId, resUpId, nUpId);
    const resBadUpId = await pUpId;
    assert(
      resBadUpId.status === 400 && resBadUpId.data.message.includes('Invalid task ID format'),
      'updateTask() returns 400 for bad ID'
    );

    // 24. deleteTask() with bad ID
    const { req: rDelId, res: resDelId, next: nDelId, promise: pDelId } = mockRequestResponse(
      {},
      {},
      { id: 'bad-task-id' },
      mockFreelancer
    );
    deleteTask(rDelId, resDelId, nDelId);
    const resBadDelId = await pDelId;
    assert(
      resBadDelId.status === 400 && resBadDelId.data.message.includes('Invalid task ID format'),
      'deleteTask() returns 400 for bad ID'
    );

    // 25. getProjectTasks() with bad project ID
    const { req: rProjId, res: resProjId, next: nProjId, promise: pProjId } = mockRequestResponse(
      {},
      {},
      { id: 'bad-proj-id' },
      mockFreelancer
    );
    getProjectTasks(rProjId, resProjId, nProjId);
    const resBadProjId = await pProjId;
    assert(
      resBadProjId.status === 400 && resBadProjId.data.message.includes('Invalid project ID format'),
      'getProjectTasks() returns 400 for bad project ID'
    );

    // 26. reorderTasks() with empty tasks array
    const { req: rReo, res: resReo, next: nReo, promise: pReo } = mockRequestResponse(
      { tasks: [] },
      {},
      {},
      mockFreelancer
    );
    reorderTasks(rReo, resReo, nReo);
    const resEmptyReorder = await pReo;
    assert(
      resEmptyReorder.status === 400 && resEmptyReorder.data.message.includes('non-empty array'),
      'reorderTasks() returns 400 for empty tasks array'
    );

    // 27. reorderTasks() with invalid task ID
    const { req: rReoBadId, res: resReoBadId, next: nReoBadId, promise: pReoBadId } = mockRequestResponse(
      { tasks: [{ id: 'bad-id', order: 0, status: 'todo' }] },
      {},
      {},
      mockFreelancer
    );
    reorderTasks(rReoBadId, resReoBadId, nReoBadId);
    const resBadReorderId = await pReoBadId;
    assert(
      resBadReorderId.status === 400 && resBadReorderId.data.message.includes('Invalid task ID format'),
      'reorderTasks() returns 400 for invalid task ID'
    );

    // -------------------------------------------------------------
    // Category 4: RBAC & Route Protection on Task Endpoints
    // -------------------------------------------------------------
    console.log('\n🛡️ Category 4: RBAC & Route Protection on Task Endpoints');

    const taskManagerGuard = authorize('admin', 'agency_owner', 'freelancer');

    // 28. Unauthenticated request blocked
    const { req: rUnauth, res: resUnauth, promise: pUnauth } = mockRequestResponse();
    taskManagerGuard(rUnauth, resUnauth, () => {});
    const resUnauthResult = await pUnauth;
    assert(
      resUnauthResult.status === 401 && !resUnauthResult.data.success,
      'authorize() blocks unauthenticated requests with 401 Unauthorized'
    );

    // 29. Client role blocked with 403 Forbidden
    const mockClientRole = { _id: new mongoose.Types.ObjectId(), role: 'client' };
    const { req: rForbidden, res: resForbidden, promise: pForbidden } = mockRequestResponse({}, {}, {}, mockClientRole);
    taskManagerGuard(rForbidden, resForbidden, () => {});
    const resForbiddenResult = await pForbidden;
    assert(
      resForbiddenResult.status === 403 && resForbiddenResult.data.message.includes("User role 'client' is not authorized"),
      "Users with role 'client' are forbidden with 403"
    );

    // 30. Freelancer permitted
    let freelancerPermitted = false;
    taskManagerGuard({ user: { role: 'freelancer' } }, {}, () => {
      freelancerPermitted = true;
    });
    assert(freelancerPermitted, "User role 'freelancer' is granted access");

    // 31. Agency owner permitted
    let agencyOwnerPermitted = false;
    taskManagerGuard({ user: { role: 'agency_owner' } }, {}, () => {
      agencyOwnerPermitted = true;
    });
    assert(agencyOwnerPermitted, "User role 'agency_owner' is granted access");

    // 32. Admin permitted
    let adminPermitted = false;
    taskManagerGuard({ user: { role: 'admin' } }, {}, () => {
      adminPermitted = true;
    });
    assert(adminPermitted, "User role 'admin' is granted access");

    // -------------------------------------------------------------
    // Category 5: Live MongoDB Atlas Operations & Project Linking
    // -------------------------------------------------------------
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoUri) {
      console.log('\n🗄️ Category 5: Live Database Multi-Tenant Task CRUD & Project Linking');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('  ✅ Connected to MongoDB Atlas for Live Test');

      const testTimestamp = Date.now();
      const freelancerA = await User.create({
        name: `Freelancer Alpha ${testTimestamp}`,
        email: `alpha_task_${testTimestamp}@test.com`,
        password: 'Password123!',
        role: 'freelancer',
      });

      const freelancerB = await User.create({
        name: `Freelancer Beta ${testTimestamp}`,
        email: `beta_task_${testTimestamp}@test.com`,
        password: 'Password123!',
        role: 'freelancer',
      });

      // Create Clients
      const clientA = await Client.create({
        userId: freelancerA._id,
        name: `Client Alpha ${testTimestamp}`,
        email: `client_a_${testTimestamp}@test.com`,
        company: 'Alpha Digital',
        status: 'active',
      });

      const clientB = await Client.create({
        userId: freelancerB._id,
        name: `Client Beta ${testTimestamp}`,
        email: `client_b_${testTimestamp}@test.com`,
        company: 'Beta Systems',
        status: 'active',
      });

      // Create Projects
      const projectA = await Project.create({
        userId: freelancerA._id,
        clientId: clientA._id,
        title: `E-Commerce Storefront ${testTimestamp}`,
        budget: 5000,
        status: 'in_progress',
      });

      const projectB = await Project.create({
        userId: freelancerB._id,
        clientId: clientB._id,
        title: `Mobile App Build ${testTimestamp}`,
        budget: 8000,
        status: 'planning',
      });

      let createdTaskId1 = null;
      let createdTaskId2 = null;
      let createdTaskId3 = null;

      try {
        // 33. Live DB: Attempt to create task with non-existent Project ID -> 404
        const nonExistentProjectId = new mongoose.Types.ObjectId().toString();
        const { req: rNonExist, res: resNonExist, next: nNonExist, promise: pNonExist } =
          mockRequestResponse(
            { title: 'Non-existent project task', projectId: nonExistentProjectId },
            {},
            {},
            freelancerA
          );
        createTask(rNonExist, resNonExist, nNonExist);
        const nonExistResult = await pNonExist;
        assert(
          nonExistResult.status === 404 && !nonExistResult.data.success,
          'Live DB: createTask() returns 404 when referenced Project ID does not exist'
        );

        // 34. Live DB: Prevent Freelancer A from attaching task to Freelancer B's project -> 403
        const { req: rCross, res: resCross, next: nCross, promise: pCross } =
          mockRequestResponse(
            { title: 'Cross Tenant Task', projectId: projectB._id.toString() },
            {},
            {},
            freelancerA
          );
        createTask(rCross, resCross, nCross);
        const crossResult = await pCross;
        assert(
          crossResult.status === 403 && !crossResult.data.success,
          'Live DB: createTask() prevents Freelancer A from linking Freelancer B project with 403 Forbidden'
        );

        // 35. Live DB: Successful task creation (status: todo, linked to projectA)
        const { req: rCreate1, res: resCreate1, next: nCreate1, promise: pCreate1 } =
          mockRequestResponse(
            {
              title: 'Design Database Schemas',
              description: 'Create Mongoose models and indexes for CRM',
              projectId: projectA._id.toString(),
              status: 'todo',
              priority: 'high',
              estimatedHours: 6,
              tags: ['Backend', 'Database'],
            },
            {},
            {},
            freelancerA
          );
        createTask(rCreate1, resCreate1, nCreate1);
        const createResult1 = await pCreate1;
        assert(
          createResult1.status === 201 && createResult1.data.success,
          'Live DB: createTask() successfully creates task record linked to project with 201 Created'
        );
        createdTaskId1 = createResult1.data.data._id;

        // 36. Live DB: Check populated project data
        assert(
          createResult1.data.data.projectId &&
            createResult1.data.data.projectId.title === projectA.title,
          'Live DB: createTask() automatically populates linked project details (title, status, priority)'
        );

        // 37. Live DB: Create task with status 'done' -> auto-syncs isCompleted = true
        const { req: rCreateDone, res: resCreateDone, next: nCreateDone, promise: pCreateDone } =
          mockRequestResponse(
            {
              title: 'Setup Git Repository',
              projectId: projectA._id.toString(),
              status: 'done',
              priority: 'medium',
              actualHours: 2,
            },
            {},
            {},
            freelancerA
          );
        createTask(rCreateDone, resCreateDone, nCreateDone);
        const createDoneResult = await pCreateDone;
        assert(
          createDoneResult.status === 201 &&
            createDoneResult.data.data.status === 'done' &&
            createDoneResult.data.data.isCompleted === true,
          "Live DB: createTask() auto-sets 'isCompleted = true' when status is 'done'"
        );
        createdTaskId2 = createDoneResult.data.data._id;

        // 38. Create a 3rd task for in_progress status
        const { req: rCreate3, res: resCreate3, next: nCreate3, promise: pCreate3 } =
          mockRequestResponse(
            {
              title: 'Build Authentication Middleware',
              projectId: projectA._id.toString(),
              status: 'in_progress',
              priority: 'urgent',
              estimatedHours: 4,
            },
            {},
            {},
            freelancerA
          );
        createTask(rCreate3, resCreate3, nCreate3);
        const createResult3 = await pCreate3;
        createdTaskId3 = createResult3.data.data._id;

        // 39. Live DB: getTasks() retrieves tasks owned by Freelancer A
        const { req: rListA, res: resListA, next: nListA, promise: pListA } =
          mockRequestResponse({}, {}, {}, freelancerA);
        getTasks(rListA, resListA, nListA);
        const listResultA = await pListA;
        assert(
          listResultA.status === 200 && listResultA.data.count >= 3,
          'Live DB: getTasks() retrieves all tasks owned by authenticated Freelancer A'
        );

        // 40. Live DB: Multi-tenancy isolation strictly hides Freelancer A tasks from Freelancer B
        const { req: rListB, res: resListB, next: nListB, promise: pListB } =
          mockRequestResponse({}, {}, {}, freelancerB);
        getTasks(rListB, resListB, nListB);
        const listResultB = await pListB;
        assert(
          listResultB.status === 200 && listResultB.data.count === 0,
          'Live DB: Multi-tenancy isolation strictly hides Freelancer A tasks from Freelancer B'
        );

        // 41. Live DB: Filter tasks by projectId (?projectId=...)
        const { req: rFilterProj, res: resFilterProj, next: nFilterProj, promise: pFilterProj } =
          mockRequestResponse({}, { projectId: projectA._id.toString() }, {}, freelancerA);
        getTasks(rFilterProj, resFilterProj, nFilterProj);
        const filterProjResult = await pFilterProj;
        assert(
          filterProjResult.status === 200 &&
            filterProjResult.data.data.every(
              (t) => String(t.projectId._id || t.projectId) === String(projectA._id)
            ),
          'Live DB: getTasks(?projectId=...) correctly filters tasks belonging to specific project'
        );

        // 42. Live DB: Filter tasks by status (?status=done)
        const { req: rFilterDone, res: resFilterDone, next: nFilterDone, promise: pFilterDone } =
          mockRequestResponse({}, { status: 'done' }, {}, freelancerA);
        getTasks(rFilterDone, resFilterDone, nFilterDone);
        const filterDoneResult = await pFilterDone;
        assert(
          filterDoneResult.status === 200 &&
            filterDoneResult.data.data.every((t) => t.status === 'done'),
          'Live DB: getTasks(?status=done) returns only matching status tasks'
        );

        // 43. Live DB: Filter tasks by priority (?priority=urgent)
        const { req: rFilterUrg, res: resFilterUrg, next: nFilterUrg, promise: pFilterUrg } =
          mockRequestResponse({}, { priority: 'urgent' }, {}, freelancerA);
        getTasks(rFilterUrg, resFilterUrg, nFilterUrg);
        const filterUrgResult = await pFilterUrg;
        assert(
          filterUrgResult.status === 200 &&
            filterUrgResult.data.data.every((t) => t.priority === 'urgent'),
          'Live DB: getTasks(?priority=urgent) returns only urgent priority tasks'
        );

        // 44. Live DB: Full-text search (?search=Database)
        const { req: rSearch, res: resSearch, next: nSearch, promise: pSearch } =
          mockRequestResponse({}, { search: 'Database' }, {}, freelancerA);
        getTasks(rSearch, resSearch, nSearch);
        const searchResult = await pSearch;
        assert(
          searchResult.status === 200 &&
            searchResult.data.data.some((t) => t.title.includes('Database')),
          'Live DB: getTasks(?search=...) matches query against task title and description'
        );

        // 45. Live DB: getTaskById() returns single task with populated references
        const { req: rGetOne, res: resGetOne, next: nGetOne, promise: pGetOne } =
          mockRequestResponse({}, {}, { id: createdTaskId1.toString() }, freelancerA);
        getTaskById(rGetOne, resGetOne, nGetOne);
        const getOneResult = await pGetOne;
        assert(
          getOneResult.status === 200 &&
            getOneResult.data.data.title === 'Design Database Schemas' &&
            getOneResult.data.data.projectId &&
            getOneResult.data.data.userId,
          'Live DB: getTaskById() returns task with populated project and user documents'
        );

        // 46. Live DB: getTaskById() blocks unauthorized cross-tenant view with 403 Forbidden
        const { req: rGetCross, res: resGetCross, next: nGetCross, promise: pGetCross } =
          mockRequestResponse({}, {}, { id: createdTaskId1.toString() }, freelancerB);
        getTaskById(rGetCross, resGetCross, nGetCross);
        const getCrossResult = await pGetCross;
        assert(
          getCrossResult.status === 403 && !getCrossResult.data.success,
          'Live DB: getTaskById() blocks unauthorized cross-tenant view with 403 Forbidden'
        );

        // 47. Live DB: updateTask() updates status to 'done' and auto-syncs isCompleted = true
        const { req: rUpdate, res: resUpdate, next: nUpdate, promise: pUpdate } =
          mockRequestResponse(
            {
              status: 'done',
              actualHours: 5,
              priority: 'urgent',
            },
            {},
            { id: createdTaskId1.toString() },
            freelancerA
          );
        updateTask(rUpdate, resUpdate, nUpdate);
        const updateResult = await pUpdate;
        assert(
          updateResult.status === 200 &&
            updateResult.data.data.status === 'done' &&
            updateResult.data.data.isCompleted === true &&
            updateResult.data.data.actualHours === 5,
          "Live DB: updateTask() modifies status to 'done' and auto-syncs isCompleted = true"
        );

        // 48. Live DB: updateTask() blocks cross-tenant modification with 403 Forbidden
        const { req: rUpCross, res: resUpCross, next: nUpCross, promise: pUpCross } =
          mockRequestResponse(
            { title: 'Hacked Title' },
            {},
            { id: createdTaskId1.toString() },
            freelancerB
          );
        updateTask(rUpCross, resUpCross, nUpCross);
        const upCrossResult = await pUpCross;
        assert(
          upCrossResult.status === 403 && !upCrossResult.data.success,
          'Live DB: updateTask() blocks cross-tenant modification with 403 Forbidden'
        );

        // 49. Live DB: reorderTasks() batch drag-and-drop updater
        const { req: rBatchReorder, res: resBatchReorder, next: nBatchReorder, promise: pBatchReorder } =
          mockRequestResponse(
            {
              tasks: [
                { id: createdTaskId1.toString(), status: 'in_review', order: 0 },
                { id: createdTaskId3.toString(), status: 'done', order: 1 },
              ],
            },
            {},
            {},
            freelancerA
          );
        reorderTasks(rBatchReorder, resBatchReorder, nBatchReorder);
        const batchReorderResult = await pBatchReorder;
        assert(
          batchReorderResult.status === 200 && batchReorderResult.data.success,
          'Live DB: reorderTasks() batch updates Kanban column positions & statuses'
        );

        // 50. Live DB: reorderTasks() blocks cross-tenant reorder attempts with 403 Forbidden
        const { req: rReoCross, res: resReoCross, next: nReoCross, promise: pReoCross } =
          mockRequestResponse(
            {
              tasks: [{ id: createdTaskId1.toString(), status: 'todo', order: 0 }],
            },
            {},
            {},
            freelancerB
          );
        reorderTasks(rReoCross, resReoCross, nReoCross);
        const reoCrossResult = await pReoCross;
        assert(
          reoCrossResult.status === 403 && !reoCrossResult.data.success,
          'Live DB: reorderTasks() blocks cross-tenant reorder attempts with 403 Forbidden'
        );

        // 51. Live DB: getProjectTasks() returns all tasks linked to the specific project
        const { req: rProjTasks, res: resProjTasks, next: nProjTasks, promise: pProjTasks } =
          mockRequestResponse({}, {}, { id: projectA._id.toString() }, freelancerA);
        getProjectTasks(rProjTasks, resProjTasks, nProjTasks);
        const projTasksResult = await pProjTasks;
        assert(
          projTasksResult.status === 200 &&
            projTasksResult.data.project._id.toString() === projectA._id.toString() &&
            projTasksResult.data.count >= 3,
          'Live DB: getProjectTasks() returns all tasks linked to the specific project (GET /api/projects/:id/tasks)'
        );

        // 52. Live DB: getProjectTasks() blocks cross-tenant project inspection with 403 Forbidden
        const { req: rPTCross, res: resPTCross, next: nPTCross, promise: pPTCross } =
          mockRequestResponse({}, {}, { id: projectA._id.toString() }, freelancerB);
        getProjectTasks(rPTCross, resPTCross, nPTCross);
        const ptCrossResult = await pPTCross;
        assert(
          ptCrossResult.status === 403 && !ptCrossResult.data.success,
          'Live DB: getProjectTasks() blocks cross-tenant project inspection with 403 Forbidden'
        );

        // 53. Live DB: getTaskStats() computes pipeline status counts, priorities, and productivity metrics
        const { req: rStats, res: resStats, next: nStats, promise: pStats } =
          mockRequestResponse({}, {}, {}, freelancerA);
        getTaskStats(rStats, resStats, nStats);
        const statsResult = await pStats;
        assert(
          statsResult.status === 200 &&
            statsResult.data.data.total >= 3 &&
            statsResult.data.data.statusBreakdown !== undefined &&
            statsResult.data.data.productivity.completed !== undefined,
          'Live DB: getTaskStats() computes pipeline status counts, priorities, and productivity metrics'
        );

        // 54. Live DB: deleteTask() blocks cross-tenant deletion with 403 Forbidden
        const { req: rDelCross, res: resDelCross, next: nDelCross, promise: pDelCross } =
          mockRequestResponse({}, {}, { id: createdTaskId3.toString() }, freelancerB);
        deleteTask(rDelCross, resDelCross, nDelCross);
        const delCrossResult = await pDelCross;
        assert(
          delCrossResult.status === 403 && !delCrossResult.data.success,
          'Live DB: deleteTask() blocks cross-tenant deletion with 403 Forbidden'
        );

        // 55. Live DB: deleteTask() deletes task document with 200 OK
        const { req: rDel, res: resDel, next: nDel, promise: pDel } =
          mockRequestResponse({}, {}, { id: createdTaskId3.toString() }, freelancerA);
        deleteTask(rDel, resDel, nDel);
        const delResult = await pDel;
        assert(
          delResult.status === 200 && delResult.data.success,
          'Live DB: deleteTask() deletes task document with 200 OK'
        );

        // 56. Live DB: Verification that deleted task returns 404
        const { req: rPostDel, res: resPostDel, next: nPostDel, promise: pPostDel } =
          mockRequestResponse({}, {}, { id: createdTaskId3.toString() }, freelancerA);
        getTaskById(rPostDel, resPostDel, nPostDel);
        const postDelResult = await pPostDel;
        assert(
          postDelResult.status === 404 && !postDelResult.data.success,
          'Live DB: getTaskById() on deleted task returns 404 Not Found'
        );

        // Cleanup created test records
        await Task.deleteMany({
          _id: { $in: [createdTaskId1, createdTaskId2, createdTaskId3] },
        });
        await Project.deleteMany({ _id: { $in: [projectA._id, projectB._id] } });
        await Client.deleteMany({ _id: { $in: [clientA._id, clientB._id] } });
        await User.deleteMany({ _id: { $in: [freelancerA._id, freelancerB._id] } });
        console.log('  🧹 Cleaned up live test users, clients, projects, and task records');
      } catch (err) {
        // Safe cleanup in case of test failure
        await Task.deleteMany({
          _id: { $in: [createdTaskId1, createdTaskId2, createdTaskId3].filter(Boolean) },
        });
        await Project.deleteMany({ _id: { $in: [projectA._id, projectB._id] } });
        await Client.deleteMany({ _id: { $in: [clientA._id, clientB._id] } });
        await User.deleteMany({ _id: { $in: [freelancerA._id, freelancerB._id] } });
        throw err;
      }
    }

    console.log('\n===========================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} DAY 10 TESTS PASSED SUCCESSFULLY!`);
    console.log('===========================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Suite Failed with Error:\n', error);
    process.exit(1);
  }
}

runDay10Tests();
