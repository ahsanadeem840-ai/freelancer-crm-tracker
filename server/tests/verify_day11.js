const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { User, Client, Project, Task, Invoice } = require('../models');
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  getInvoiceStats,
  getClientInvoices,
  getProjectInvoices,
} = require('../controllers/invoiceController');
const {
  createTask,
  updateTask,
} = require('../controllers/taskController');
const {
  createClient,
} = require('../controllers/clientController');
const {
  createProject,
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

async function runDay11Tests() {
  console.log('===========================================================');
  console.log('🧪 Starting Day 11 Test Suite (Invoice API & Full Backend E2E)');
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
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoose.connection.readyState && mongoUri) {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log('  ✅ Connected to MongoDB Atlas\n');
    }

    // -------------------------------------------------------------
    // Category 1: Invoice Schema Validation Rules
    // -------------------------------------------------------------
    console.log('📦 Category 1: Invoice Schema Validation Rules');

    // 1. Missing userId
    let userErr = null;
    try {
      const inv = new Invoice({
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'Dev', quantity: 1, unitPrice: 100 }],
        subtotal: 100,
        totalAmount: 100,
        dueDate: new Date(),
      });
      await inv.validate();
    } catch (err) {
      userErr = err;
    }
    assert(userErr && userErr.errors['userId'], 'Invoice schema rejects missing userId');

    // 2. Missing clientId
    let clientErr = null;
    try {
      const inv = new Invoice({
        userId: new mongoose.Types.ObjectId(),
        items: [{ description: 'Dev', quantity: 1, unitPrice: 100 }],
        subtotal: 100,
        totalAmount: 100,
        dueDate: new Date(),
      });
      await inv.validate();
    } catch (err) {
      clientErr = err;
    }
    assert(clientErr && clientErr.errors['clientId'], 'Invoice schema rejects missing clientId');

    // 3. Missing or empty items
    let emptyItemsErr = null;
    try {
      const inv = new Invoice({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        items: [],
        subtotal: 0,
        totalAmount: 0,
        dueDate: new Date(),
      });
      await inv.validate();
    } catch (err) {
      emptyItemsErr = err;
    }
    assert(
      emptyItemsErr && (emptyItemsErr.errors['items'] || emptyItemsErr.message.includes('line item')),
      'Invoice schema rejects empty items array'
    );

    // 4. Invalid status enum
    let statusErr = null;
    try {
      const inv = new Invoice({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'Dev', quantity: 1, unitPrice: 100 }],
        status: 'refunded', // invalid enum
      });
      await inv.validate();
    } catch (err) {
      statusErr = err;
    }
    assert(statusErr && statusErr.errors['status'], 'Invoice schema rejects invalid status enum');

    // 5. Negative taxRate
    let taxErr = null;
    try {
      const inv = new Invoice({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'Dev', quantity: 1, unitPrice: 100 }],
        taxRate: -5,
      });
      await inv.validate();
    } catch (err) {
      taxErr = err;
    }
    assert(taxErr && taxErr.errors['taxRate'], 'Invoice schema rejects negative taxRate');

    // 6. Negative discount
    let discErr = null;
    try {
      const inv = new Invoice({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'Dev', quantity: 1, unitPrice: 100 }],
        discount: -20,
      });
      await inv.validate();
    } catch (err) {
      discErr = err;
    }
    assert(discErr && discErr.errors['discount'], 'Invoice schema rejects negative discount');

    // 7. Line item missing description
    let lineDescErr = null;
    try {
      const inv = new Invoice({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        items: [{ quantity: 2, unitPrice: 50 }],
      });
      await inv.validate();
    } catch (err) {
      lineDescErr = err;
    }
    assert(lineDescErr && lineDescErr.errors['items.0.description'], 'Line item schema rejects missing description');

    // 8. Line item quantity < 1
    let lineQtyErr = null;
    try {
      const inv = new Invoice({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'Item A', quantity: 0, unitPrice: 50 }],
      });
      await inv.validate();
    } catch (err) {
      lineQtyErr = err;
    }
    assert(lineQtyErr && lineQtyErr.errors['items.0.quantity'], 'Line item schema rejects quantity < 1');

    // 9. Line item negative unitPrice
    let linePriceErr = null;
    try {
      const inv = new Invoice({
        userId: new mongoose.Types.ObjectId(),
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'Item A', quantity: 1, unitPrice: -10 }],
      });
      await inv.validate();
    } catch (err) {
      linePriceErr = err;
    }
    assert(linePriceErr && linePriceErr.errors['items.0.unitPrice'], 'Line item schema rejects negative unitPrice');

    // 10. Default invoice status is 'draft'
    const defaultInvoice = new Invoice({
      userId: new mongoose.Types.ObjectId(),
      clientId: new mongoose.Types.ObjectId(),
      items: [{ description: 'Audit', quantity: 1, unitPrice: 200 }],
    });
    assert(defaultInvoice.status === 'draft', "Default invoice status initializes to 'draft'");

    // 11. Default currency is 'USD'
    assert(defaultInvoice.currency === 'USD', "Default currency initializes to 'USD'");

    // 12. Pre-validate hook auto-calculates line item amounts
    await defaultInvoice.validate();
    assert(
      defaultInvoice.items[0].amount === 200,
      'Pre-validate hook auto-calculates line item amount (qty * unitPrice)'
    );

    // 13. Pre-validate hook auto-computes subtotal and totalAmount
    assert(defaultInvoice.subtotal === 200, 'Pre-validate hook auto-computes subtotal');
    assert(defaultInvoice.totalAmount === 200, 'Pre-validate hook auto-computes totalAmount');

    // 14. Pre-validate hook auto-generates unique invoiceNumber when omitted
    assert(
      defaultInvoice.invoiceNumber && defaultInvoice.invoiceNumber.startsWith('INV-'),
      'Pre-validate hook auto-generates formatted invoiceNumber (e.g. INV-2026-XXXX)'
    );

    // 15. Pre-validate hook auto-sets dueDate to 14 days after issueDate
    assert(
      defaultInvoice.dueDate instanceof Date && defaultInvoice.dueDate > defaultInvoice.issueDate,
      'Pre-validate hook auto-sets dueDate (defaults to 14 days after issueDate)'
    );

    // 16. Static method Invoice.generateInvoiceNumber() generates formatted identifier
    const staticGeneratedNumber = await Invoice.generateInvoiceNumber('TEST');
    assert(
      staticGeneratedNumber && staticGeneratedNumber.startsWith('TEST-'),
      'Static Invoice.generateInvoiceNumber() generates formatted sequential identifier'
    );

    // -------------------------------------------------------------
    // Category 2: Invoice Creation Controller Validations (POST /api/invoices)
    // -------------------------------------------------------------
    console.log('\n📝 Category 2: Invoice Creation Controller Validations');

    const mockUser = { _id: new mongoose.Types.ObjectId(), role: 'freelancer' };

    // 17. Missing clientId
    const { req: req17, res: res17, next: n17, promise: p17 } = mockRequestResponse(
      { items: [{ description: 'Logo', quantity: 1, unitPrice: 150 }] },
      {},
      {},
      mockUser
    );
    createInvoice(req17, res17, n17);
    const r17 = await p17;
    assert(r17.status === 400 && r17.data.message.includes('Client ID is required'), 'createInvoice() rejects missing clientId');

    // 18. Malformed clientId
    const { req: req18, res: res18, next: n18, promise: p18 } = mockRequestResponse(
      { clientId: 'invalid-client-id', items: [{ description: 'Logo', quantity: 1, unitPrice: 150 }] },
      {},
      {},
      mockUser
    );
    createInvoice(req18, res18, n18);
    const r18 = await p18;
    assert(r18.status === 400 && r18.data.message.includes('Invalid client ID format'), 'createInvoice() rejects malformed clientId');

    // 19. Malformed projectId
    const { req: req19, res: res19, next: n19, promise: p19 } = mockRequestResponse(
      {
        clientId: new mongoose.Types.ObjectId(),
        projectId: 'bad-project-id',
        items: [{ description: 'Logo', quantity: 1, unitPrice: 150 }],
      },
      {},
      {},
      mockUser
    );
    createInvoice(req19, res19, n19);
    const r19 = await p19;
    assert(r19.status === 400 && r19.data.message.includes('Invalid project ID format'), 'createInvoice() rejects malformed projectId');

    // 20. Missing items
    const { req: req20, res: res20, next: n20, promise: p20 } = mockRequestResponse(
      { clientId: new mongoose.Types.ObjectId() },
      {},
      {},
      mockUser
    );
    createInvoice(req20, res20, n20);
    const r20 = await p20;
    assert(r20.status === 400 && r20.data.message.includes('at least one line item'), 'createInvoice() rejects missing items');

    // 21. Empty items array
    const { req: req21, res: res21, next: n21, promise: p21 } = mockRequestResponse(
      { clientId: new mongoose.Types.ObjectId(), items: [] },
      {},
      {},
      mockUser
    );
    createInvoice(req21, res21, n21);
    const r21 = await p21;
    assert(r21.status === 400 && r21.data.message.includes('at least one line item'), 'createInvoice() rejects empty items array');

    // 22. Line item with empty description
    const { req: req22, res: res22, next: n22, promise: p22 } = mockRequestResponse(
      {
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: '   ', quantity: 1, unitPrice: 100 }],
      },
      {},
      {},
      mockUser
    );
    createInvoice(req22, res22, n22);
    const r22 = await p22;
    assert(r22.status === 400 && r22.data.message.includes('missing description'), 'createInvoice() rejects line item with blank description');

    // 23. Line item with quantity < 1
    const { req: req23, res: res23, next: n23, promise: p23 } = mockRequestResponse(
      {
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'SEO', quantity: 0, unitPrice: 100 }],
      },
      {},
      {},
      mockUser
    );
    createInvoice(req23, res23, n23);
    const r23 = await p23;
    assert(r23.status === 400 && r23.data.message.includes('quantity >= 1'), 'createInvoice() rejects line item with quantity < 1');

    // 24. Line item with negative unitPrice
    const { req: req24, res: res24, next: n24, promise: p24 } = mockRequestResponse(
      {
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'SEO', quantity: 1, unitPrice: -50 }],
      },
      {},
      {},
      mockUser
    );
    createInvoice(req24, res24, n24);
    const r24 = await p24;
    assert(r24.status === 400 && r24.data.message.includes('non-negative unit price'), 'createInvoice() rejects line item with negative unitPrice');

    // 25. Invalid status
    const { req: req25, res: res25, next: n25, promise: p25 } = mockRequestResponse(
      {
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'SEO', quantity: 1, unitPrice: 100 }],
        status: 'invalid_status',
      },
      {},
      {},
      mockUser
    );
    createInvoice(req25, res25, n25);
    const r25 = await p25;
    assert(r25.status === 400 && r25.data.message.includes('not a valid invoice status'), 'createInvoice() rejects invalid status enum');

    // 26. Invalid paymentMethod
    const { req: req26, res: res26, next: n26, promise: p26 } = mockRequestResponse(
      {
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'SEO', quantity: 1, unitPrice: 100 }],
        paymentMethod: 'crypto_doge',
      },
      {},
      {},
      mockUser
    );
    createInvoice(req26, res26, n26);
    const r26 = await p26;
    assert(r26.status === 400 && r26.data.message.includes('not a valid payment method'), 'createInvoice() rejects invalid paymentMethod');

    // 27. Negative taxRate
    const { req: req27, res: res27, next: n27, promise: p27 } = mockRequestResponse(
      {
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'SEO', quantity: 1, unitPrice: 100 }],
        taxRate: -10,
      },
      {},
      {},
      mockUser
    );
    createInvoice(req27, res27, n27);
    const r27 = await p27;
    assert(r27.status === 400 && r27.data.message.includes('Tax rate must be a non-negative number'), 'createInvoice() rejects negative taxRate');

    // 28. Negative discount
    const { req: req28, res: res28, next: n28, promise: p28 } = mockRequestResponse(
      {
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'SEO', quantity: 1, unitPrice: 100 }],
        discount: -25,
      },
      {},
      {},
      mockUser
    );
    createInvoice(req28, res28, n28);
    const r28 = await p28;
    assert(r28.status === 400 && r28.data.message.includes('Discount must be a non-negative number'), 'createInvoice() rejects negative discount');

    // -------------------------------------------------------------
    // Category 3: Single Invoice, ID Format & Status Update Validations
    // -------------------------------------------------------------
    console.log('\n🔍 Category 3: Single Invoice, ID Validations & Relationships');

    // 29. getInvoiceById bad ID
    const { req: req29, res: res29, next: n29, promise: p29 } = mockRequestResponse({}, {}, { id: 'invalid-id' }, mockUser);
    getInvoiceById(req29, res29, n29);
    const r29 = await p29;
    assert(r29.status === 400, 'getInvoiceById() returns 400 for bad ID');

    // 30. updateInvoice bad ID
    const { req: req30, res: res30, next: n30, promise: p30 } = mockRequestResponse({ notes: 'new note' }, {}, { id: 'invalid-id' }, mockUser);
    updateInvoice(req30, res30, n30);
    const r30 = await p30;
    assert(r30.status === 400, 'updateInvoice() returns 400 for bad ID');

    // 31. updateInvoiceStatus bad ID
    const { req: req31, res: res31, next: n31, promise: p31 } = mockRequestResponse({ status: 'paid' }, {}, { id: 'invalid-id' }, mockUser);
    updateInvoiceStatus(req31, res31, n31);
    const r31 = await p31;
    assert(r31.status === 400, 'updateInvoiceStatus() returns 400 for bad ID');

    // 32. updateInvoiceStatus invalid status
    const { req: req32, res: res32, next: n32, promise: p32 } = mockRequestResponse(
      { status: 'invalid_status' },
      {},
      { id: new mongoose.Types.ObjectId() },
      mockUser
    );
    updateInvoiceStatus(req32, res32, n32);
    const r32 = await p32;
    assert(r32.status === 400, 'updateInvoiceStatus() returns 400 for invalid status value');

    // 33. deleteInvoice bad ID
    const { req: req33, res: res33, next: n33, promise: p33 } = mockRequestResponse({}, {}, { id: 'invalid-id' }, mockUser);
    deleteInvoice(req33, res33, n33);
    const r33 = await p33;
    assert(r33.status === 400, 'deleteInvoice() returns 400 for bad ID');

    // 34. getClientInvoices bad ID
    const { req: req34, res: res34, next: n34, promise: p34 } = mockRequestResponse({}, {}, { id: 'invalid-id' }, mockUser);
    getClientInvoices(req34, res34, n34);
    const r34 = await p34;
    assert(r34.status === 400, 'getClientInvoices() returns 400 for bad client ID');

    // 35. getProjectInvoices bad ID
    const { req: req35, res: res35, next: n35, promise: p35 } = mockRequestResponse({}, {}, { id: 'invalid-id' }, mockUser);
    getProjectInvoices(req35, res35, n35);
    const r35 = await p35;
    assert(r35.status === 400, 'getProjectInvoices() returns 400 for bad project ID');

    // -------------------------------------------------------------
    // Category 4: RBAC & Route Protection on Invoice Endpoints
    // -------------------------------------------------------------
    console.log('\n🛡️ Category 4: RBAC & Route Protection on Invoice Endpoints');

    // 36. protect rejects unauthenticated request
    const { req: req36, res: res36, next: n36, promise: p36 } = mockRequestResponse();
    await protect(req36, res36, n36);
    const r36 = await p36;
    assert(r36.status === 401, 'protect() blocks unauthenticated requests with 401 Unauthorized');

    // 37. Users with role 'client' are forbidden
    const clientUser = { role: 'client' };
    const authMiddleware = authorize('admin', 'agency_owner', 'freelancer');
    const { req: req37, res: res37, next: n37, promise: p37 } = mockRequestResponse({}, {}, {}, clientUser);
    authMiddleware(req37, res37, n37);
    const r37 = await p37;
    assert(r37.status === 403, "Users with role 'client' are forbidden with 403");

    // 38. User role 'freelancer' is granted access
    let nextCalled38 = false;
    authMiddleware({ user: { role: 'freelancer' } }, {}, () => {
      nextCalled38 = true;
    });
    assert(nextCalled38, "User role 'freelancer' is granted access");

    // 39. User role 'agency_owner' is granted access
    let nextCalled39 = false;
    authMiddleware({ user: { role: 'agency_owner' } }, {}, () => {
      nextCalled39 = true;
    });
    assert(nextCalled39, "User role 'agency_owner' is granted access");

    // 40. User role 'admin' is granted access
    let nextCalled40 = false;
    authMiddleware({ user: { role: 'admin' } }, {}, () => {
      nextCalled40 = true;
    });
    assert(nextCalled40, "User role 'admin' is granted access");

    // -------------------------------------------------------------
    // Category 5: Live Database Multi-Tenant Invoice CRUD & Balancing
    // -------------------------------------------------------------
    console.log('\n🗄️ Category 5: Live Database Multi-Tenant Invoice CRUD & Client Balancing');

    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('  ✅ Connected to MongoDB Atlas for Live Test');
    }

    const testSuffix = Date.now();
    const freelancerA = await User.create({
      name: `Freelancer Alpha ${testSuffix}`,
      email: `alpha_${testSuffix}@example.com`,
      password: 'Password123!',
      role: 'freelancer',
    });

    const freelancerB = await User.create({
      name: `Freelancer Beta ${testSuffix}`,
      email: `beta_${testSuffix}@example.com`,
      password: 'Password123!',
      role: 'freelancer',
    });

    const clientA = await Client.create({
      userId: freelancerA._id,
      name: 'Acme Corp',
      company: 'Acme International',
      email: `acme_${testSuffix}@example.com`,
      currency: 'USD',
      totalBilled: 0,
      totalPaid: 0,
    });

    const clientB = await Client.create({
      userId: freelancerB._id,
      name: 'Beta Client',
      company: 'Beta Industries',
      email: `beta_client_${testSuffix}@example.com`,
      currency: 'USD',
      totalBilled: 0,
      totalPaid: 0,
    });

    const projectA = await Project.create({
      userId: freelancerA._id,
      clientId: clientA._id,
      title: 'Fullstack SaaS Platform',
      budget: 5000,
      status: 'in_progress',
    });

    const projectB = await Project.create({
      userId: freelancerB._id,
      clientId: clientB._id,
      title: 'Beta Mobile App',
      budget: 3000,
      status: 'in_progress',
    });

    // 41. Non-existent client
    const { req: req41, res: res41, next: n41, promise: p41 } = mockRequestResponse(
      {
        clientId: new mongoose.Types.ObjectId(),
        items: [{ description: 'Setup', quantity: 1, unitPrice: 200 }],
      },
      {},
      {},
      freelancerA
    );
    createInvoice(req41, res41, n41);
    const r41 = await p41;
    assert(r41.status === 404, 'Live DB: createInvoice() returns 404 when Client ID does not exist');

    // 42. Cross-tenant client rejection
    const { req: req42, res: res42, next: n42, promise: p42 } = mockRequestResponse(
      {
        clientId: clientB._id,
        items: [{ description: 'Setup', quantity: 1, unitPrice: 200 }],
      },
      {},
      {},
      freelancerA
    );
    createInvoice(req42, res42, n42);
    const r42 = await p42;
    assert(r42.status === 403, 'Live DB: createInvoice() prevents Freelancer A from billing Freelancer B client with 403 Forbidden');

    // 43. Cross-tenant project rejection
    const { req: req43, res: res43, next: n43, promise: p43 } = mockRequestResponse(
      {
        clientId: clientA._id,
        projectId: projectB._id, // Freelancer B's project
        items: [{ description: 'Setup', quantity: 1, unitPrice: 200 }],
      },
      {},
      {},
      freelancerA
    );
    createInvoice(req43, res43, n43);
    const r43 = await p43;
    assert(r43.status === 403, 'Live DB: createInvoice() prevents Freelancer A from linking Freelancer B project with 403 Forbidden');

    // 44. Successful invoice creation
    const { req: req44, res: res44, next: n44, promise: p44 } = mockRequestResponse(
      {
        clientId: clientA._id,
        projectId: projectA._id,
        items: [
          { description: 'Frontend Development (React)', quantity: 20, unitPrice: 50 },
          { description: 'Backend API Development (Express)', quantity: 10, unitPrice: 60 },
        ],
        taxRate: 10,
        discount: 100,
        notes: 'First milestone payment',
      },
      {},
      {},
      freelancerA
    );
    createInvoice(req44, res44, n44);
    const r44 = await p44;
    assert(r44.status === 201, 'Live DB: createInvoice() successfully creates invoice record with 201 Created');
    const createdInvoiceA = r44.data.data;

    // 45. Amounts calculation check: subtotal = (20*50 + 10*60) = 1600; tax = 160; discount = 100; total = 1660
    assert(
      createdInvoiceA.subtotal === 1600 &&
      createdInvoiceA.taxAmount === 160 &&
      createdInvoiceA.totalAmount === 1660,
      'Live DB: createInvoice() correctly computes subtotal, taxAmount, and totalAmount'
    );

    // 46. Check client's totalBilled incremented
    const updatedClientAAfterInvoice = await Client.findById(clientA._id);
    assert(
      updatedClientAAfterInvoice.totalBilled === 1660 && updatedClientAAfterInvoice.totalPaid === 0,
      "Live DB: createInvoice() automatically increments client's totalBilled balance"
    );

    // 47. getInvoices retrieves invoices for Freelancer A
    const { req: req47, res: res47, next: n47, promise: p47 } = mockRequestResponse({}, {}, {}, freelancerA);
    getInvoices(req47, res47, n47);
    const r47 = await p47;
    assert(r47.status === 200 && r47.data.data.length >= 1, 'Live DB: getInvoices() retrieves invoices for authenticated Freelancer A');

    // 48. Multi-tenancy isolation strictly hides Freelancer A invoices from Freelancer B
    const { req: req48, res: res48, next: n48, promise: p48 } = mockRequestResponse({}, {}, {}, freelancerB);
    getInvoices(req48, res48, n48);
    const r48 = await p48;
    assert(r48.status === 200 && r48.data.data.length === 0, 'Live DB: Multi-tenancy strictly hides Freelancer A invoices from Freelancer B');

    // 49. Filter by status
    const { req: req49, res: res49, next: n49, promise: p49 } = mockRequestResponse({}, { status: 'draft' }, {}, freelancerA);
    getInvoices(req49, res49, n49);
    const r49 = await p49;
    assert(r49.status === 200 && r49.data.data.every((inv) => inv.status === 'draft'), 'Live DB: getInvoices(?status=draft) returns only draft status invoices');

    // 50. Filter by clientId
    const { req: req50, res: res50, next: n50, promise: p50 } = mockRequestResponse({}, { clientId: String(clientA._id) }, {}, freelancerA);
    getInvoices(req50, res50, n50);
    const r50 = await p50;
    assert(r50.status === 200 && r50.data.data.length >= 1, 'Live DB: getInvoices(?clientId=...) correctly filters invoices by client');

    // 51. Search query
    const { req: req51, res: res51, next: n51, promise: p51 } = mockRequestResponse({}, { search: 'milestone' }, {}, freelancerA);
    getInvoices(req51, res51, n51);
    const r51 = await p51;
    assert(r51.status === 200 && r51.data.data.length >= 1, 'Live DB: getInvoices(?search=...) matches query against notes/invoiceNumber');

    // 52. getInvoiceById returns populated details
    const { req: req52, res: res52, next: n52, promise: p52 } = mockRequestResponse({}, {}, { id: createdInvoiceA._id }, freelancerA);
    getInvoiceById(req52, res52, n52);
    const r52 = await p52;
    assert(r52.status === 200 && r52.data.data.clientId.name === 'Acme Corp', 'Live DB: getInvoiceById() returns populated client and project details');

    // 53. getInvoiceById blocks cross-tenant view
    const { req: req53, res: res53, next: n53, promise: p53 } = mockRequestResponse({}, {}, { id: createdInvoiceA._id }, freelancerB);
    getInvoiceById(req53, res53, n53);
    const r53 = await p53;
    assert(r53.status === 403, 'Live DB: getInvoiceById() blocks cross-tenant access with 403 Forbidden');

    // 54. updateInvoice recalculates totals and synchronizes client totalBilled
    const { req: req54, res: res54, next: n54, promise: p54 } = mockRequestResponse(
      {
        items: [
          { description: 'Frontend Development (React)', quantity: 25, unitPrice: 50 }, // 1250
          { description: 'Backend API Development (Express)', quantity: 15, unitPrice: 60 }, // 900
        ], // Subtotal: 2150, Tax 10%: 215, Discount: 100 => Total: 2265
      },
      {},
      { id: createdInvoiceA._id },
      freelancerA
    );
    updateInvoice(req54, res54, n54);
    const r54 = await p54;
    assert(r54.status === 200 && r54.data.data.totalAmount === 2265, 'Live DB: updateInvoice() modifies items and recalculates totals (2265)');
    const clientAfterUpdate = await Client.findById(clientA._id);
    assert(clientAfterUpdate.totalBilled === 2265, "Live DB: updateInvoice() reconciles client's totalBilled (adjusted to 2265)");

    // 55. updateInvoiceStatus marks invoice as paid and increments client totalPaid
    const { req: req55, res: res55, next: n55, promise: p55 } = mockRequestResponse(
      { status: 'paid', paymentMethod: 'bank_transfer' },
      {},
      { id: createdInvoiceA._id },
      freelancerA
    );
    updateInvoiceStatus(req55, res55, n55);
    const r55 = await p55;
    assert(r55.status === 200 && r55.data.data.status === 'paid', "Live DB: updateInvoiceStatus() marks status as 'paid'");
    const clientAfterPaid = await Client.findById(clientA._id);
    assert(
      clientAfterPaid.totalPaid === 2265 && clientAfterPaid.totalBilled === 2265,
      "Live DB: updateInvoiceStatus('paid') automatically increments client's totalPaid to match totalBilled"
    );

    // 56. getClientInvoices returns linked client invoices
    const { req: req56, res: res56, next: n56, promise: p56 } = mockRequestResponse({}, {}, { id: clientA._id }, freelancerA);
    getClientInvoices(req56, res56, n56);
    const r56 = await p56;
    assert(r56.status === 200 && r56.data.data.length >= 1, 'Live DB: getClientInvoices() returns invoices linked to client (GET /api/clients/:id/invoices)');

    // 57. getProjectInvoices returns linked project invoices
    const { req: req57, res: res57, next: n57, promise: p57 } = mockRequestResponse({}, {}, { id: projectA._id }, freelancerA);
    getProjectInvoices(req57, res57, n57);
    const r57 = await p57;
    assert(r57.status === 200 && r57.data.data.length >= 1, 'Live DB: getProjectInvoices() returns invoices linked to project (GET /api/projects/:id/invoices)');

    // 58. getInvoiceStats computes accurate financial metrics
    const { req: req58, res: res58, next: n58, promise: p58 } = mockRequestResponse({}, {}, {}, freelancerA);
    getInvoiceStats(req58, res58, n58);
    const r58 = await p58;
    assert(
      r58.status === 200 &&
      r58.data.data.statusCounts.paid >= 1 &&
      r58.data.data.financials.totalPaid === 2265,
      'Live DB: getInvoiceStats() computes pipeline status counts and revenue metrics'
    );

    // 59. deleteInvoice blocks cross-tenant deletion
    const { req: req59, res: res59, next: n59, promise: p59 } = mockRequestResponse({}, {}, { id: createdInvoiceA._id }, freelancerB);
    deleteInvoice(req59, res59, n59);
    const r59 = await p59;
    assert(r59.status === 403, 'Live DB: deleteInvoice() blocks cross-tenant deletion with 403 Forbidden');

    // 60. deleteInvoice deletes document and safely reconciles client totals
    const { req: req60, res: res60, next: n60, promise: p60 } = mockRequestResponse({}, {}, { id: createdInvoiceA._id }, freelancerA);
    deleteInvoice(req60, res60, n60);
    const r60 = await p60;
    assert(r60.status === 200, 'Live DB: deleteInvoice() deletes invoice with 200 OK');
    const clientAfterDelete = await Client.findById(clientA._id);
    assert(
      clientAfterDelete.totalBilled === 0 && clientAfterDelete.totalPaid === 0,
      'Live DB: deleteInvoice() safely reconciles client totalBilled and totalPaid back to 0'
    );

    // 61. getInvoiceById on deleted record returns 404
    const { req: req61, res: res61, next: n61, promise: p61 } = mockRequestResponse({}, {}, { id: createdInvoiceA._id }, freelancerA);
    getInvoiceById(req61, res61, n61);
    const r61 = await p61;
    assert(r61.status === 404, 'Live DB: getInvoiceById() on deleted invoice returns 404 Not Found');

    // -------------------------------------------------------------
    // Category 6: Full End-to-End Backend Integration Test across All Modules
    // -------------------------------------------------------------
    console.log('\n🚀 Category 6: Full End-to-End Backend Integration Test across All Modules');

    const e2eSuffix = Date.now() + '_e2e';

    // 62. E2E Step 1: User Registration
    const e2eFreelancer = await User.create({
      name: `E2E Freelancer ${e2eSuffix}`,
      email: `e2e_${e2eSuffix}@example.com`,
      password: 'Password123!',
      role: 'freelancer',
    });
    const e2eToken = e2eFreelancer.getSignedJwtToken ? e2eFreelancer.getSignedJwtToken() : 'mock_token';
    assert(e2eFreelancer._id && e2eToken, 'E2E Step 1: Freelancer registered via User model & generated authentication token');

    // 63. E2E Step 2: Create Client
    const { req: req63, res: res63, next: n63, promise: p63 } = mockRequestResponse(
      {
        name: 'Globex Corporation',
        company: 'Globex Corp',
        email: `globex_${e2eSuffix}@example.com`,
        status: 'lead',
        currency: 'USD',
      },
      {},
      {},
      e2eFreelancer
    );
    createClient(req63, res63, n63);
    const r63 = await p63;
    assert(r63.status === 201, 'E2E Step 2: Client record created via POST /api/clients');
    const e2eClient = r63.data.data;

    // 64. E2E Step 3: Create Project linked to Client
    const { req: req64, res: res64, next: n64, promise: p64 } = mockRequestResponse(
      {
        clientId: e2eClient._id,
        title: 'Globex E-Commerce Redesign',
        budget: 4500,
        status: 'in_progress',
        priority: 'high',
      },
      {},
      {},
      e2eFreelancer
    );
    createProject(req64, res64, n64);
    const r64 = await p64;
    assert(r64.status === 201, 'E2E Step 3: Project created linked to Client via POST /api/projects');
    const e2eProject = r64.data.data;

    // 65. E2E Step 4: Create Task linked to Project
    const { req: req65, res: res65, next: n65, promise: p65 } = mockRequestResponse(
      {
        projectId: e2eProject._id,
        title: 'Design Checkout UI',
        status: 'todo',
        priority: 'high',
        estimatedHours: 8,
      },
      {},
      {},
      e2eFreelancer
    );
    createTask(req65, res65, n65);
    const r65 = await p65;
    assert(r65.status === 201, 'E2E Step 4: Task created linked to Project via POST /api/tasks');
    const e2eTask = r65.data.data;

    // 66. E2E Step 5: Complete Task
    const { req: req66, res: res66, next: n66, promise: p66 } = mockRequestResponse(
      {
        status: 'done',
        actualHours: 7.5,
      },
      {},
      { id: e2eTask._id },
      e2eFreelancer
    );
    updateTask(req66, res66, n66);
    const r66 = await p66;
    assert(r66.status === 200 && r66.data.data.isCompleted === true, 'E2E Step 5: Task completed with status: done and isCompleted: true');

    // 67. E2E Step 6: Generate Invoice for Client & Project
    const { req: req67, res: res67, next: n67, promise: p67 } = mockRequestResponse(
      {
        clientId: e2eClient._id,
        projectId: e2eProject._id,
        items: [
          { description: 'Design Checkout UI (Milestone 1)', quantity: 1, unitPrice: 1500 },
          { description: 'Stripe Integration (Milestone 2)', quantity: 1, unitPrice: 2000 },
        ],
        taxRate: 5,
        discount: 200,
        notes: 'Globex Project Milestone 1 & 2',
      },
      {},
      {},
      e2eFreelancer
    );
    createInvoice(req67, res67, n67);
    const r67 = await p67;
    assert(r67.status === 201, 'E2E Step 6: Invoice generated via POST /api/invoices/generate linked to Client & Project');
    const e2eInvoice = r67.data.data;
    // Subtotal: 3500, Tax 5%: 175, Discount: 200 => Total: 3475
    assert(e2eInvoice.totalAmount === 3475, 'E2E Step 6: Invoice totalAmount accurately computed to 3475 (3500 + 175 - 200)');

    // 68. E2E Step 7: Mark Invoice as Paid
    const { req: req68, res: res68, next: n68, promise: p68 } = mockRequestResponse(
      {
        status: 'paid',
        paymentMethod: 'stripe',
      },
      {},
      { id: e2eInvoice._id },
      e2eFreelancer
    );
    updateInvoiceStatus(req68, res68, n68);
    const r68 = await p68;
    assert(r68.status === 200 && r68.data.data.status === 'paid', 'E2E Step 7: Invoice marked as paid via PATCH /api/invoices/:id/status');

    // 69. E2E Step 8: Verify Client's totalBilled and totalPaid in DB
    const finalE2EClient = await Client.findById(e2eClient._id);
    assert(
      finalE2EClient.totalBilled === 3475 && finalE2EClient.totalPaid === 3475,
      'E2E Step 8: Client document in DB verifies totalBilled = 3475 and totalPaid = 3475'
    );

    // 70. E2E Step 9: Verify Invoices stats pipeline
    const { req: req70, res: res70, next: n70, promise: p70 } = mockRequestResponse({}, {}, {}, e2eFreelancer);
    getInvoiceStats(req70, res70, n70);
    const r70 = await p70;
    assert(
      r70.status === 200 &&
      r70.data.data.statusCounts.paid === 1 &&
      r70.data.data.financials.totalPaid === 3475 &&
      r70.data.data.financials.totalOutstanding === 0,
      'E2E Step 9: Invoices stats verify 1 paid invoice, totalPaid: 3475, and 0 outstanding balance'
    );

    // Cleanup live test documents
    await User.deleteMany({ _id: { $in: [freelancerA._id, freelancerB._id, e2eFreelancer._id] } });
    await Client.deleteMany({ _id: { $in: [clientA._id, clientB._id, e2eClient._id] } });
    await Project.deleteMany({ _id: { $in: [projectA._id, projectB._id, e2eProject._id] } });
    await Task.deleteMany({ _id: e2eTask._id });
    await Invoice.deleteMany({ _id: { $in: [createdInvoiceA._id, e2eInvoice._id] } });
    console.log('  🧹 Cleaned up live test users, clients, projects, tasks, and invoice records');

    console.log('\n===========================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} DAY 11 TESTS PASSED SUCCESSFULLY!`);
    console.log('===========================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test execution failed with error:');
    console.error(error);
    process.exit(1);
  }
}

runDay11Tests();
