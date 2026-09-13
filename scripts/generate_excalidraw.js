const fs = require('fs');
const path = require('path');

// Helper to generate random seed and id
let idCounter = 1;
function genId(prefix = 'elem') {
  return `${prefix}_${idCounter++}_${Math.random().toString(36).substr(2, 9)}`;
}
function genSeed() {
  return Math.floor(Math.random() * 2000000000);
}

// 6 Collections definitions
const collections = [
  {
    name: "User (users)",
    x: 60,
    y: 60,
    w: 320,
    h: 380,
    color: "#4f46e5",
    bgColor: "#eef2ff",
    fields: [
      { name: "_id", type: "ObjectId", key: "PK" },
      { name: "name", type: "String", req: true },
      { name: "email", type: "String", req: true, unique: true },
      { name: "password", type: "String (hash)", req: true },
      { name: "role", type: "Enum", note: "freelancer|agency" },
      { name: "businessName", type: "String" },
      { name: "hourlyRate", type: "Number" },
      { name: "currency", type: "String", def: "USD" },
      { name: "stripeAccountId", type: "String" },
      { name: "skills", type: "Array[String]" },
      { name: "createdAt / updatedAt", type: "Date" }
    ]
  },
  {
    name: "Client (clients)",
    x: 480,
    y: 60,
    w: 320,
    h: 380,
    color: "#059669",
    bgColor: "#ecfdf5",
    fields: [
      { name: "_id", type: "ObjectId", key: "PK" },
      { name: "userId", type: "ObjectId", key: "FK -> User" },
      { name: "name", type: "String", req: true },
      { name: "company", type: "String" },
      { name: "email", type: "String", req: true },
      { name: "phone", type: "String" },
      { name: "status", type: "Enum", note: "lead|prospect|active" },
      { name: "address", type: "Object (embedded)" },
      { name: "totalBilled", type: "Number", def: "0" },
      { name: "totalPaid", type: "Number", def: "0" },
      { name: "createdAt / updatedAt", type: "Date" }
    ]
  },
  {
    name: "Notification (notifications)",
    x: 900,
    y: 60,
    w: 320,
    h: 280,
    color: "#d97706",
    bgColor: "#fffbeb",
    fields: [
      { name: "_id", type: "ObjectId", key: "PK" },
      { name: "userId", type: "ObjectId", key: "FK -> User" },
      { name: "title", type: "String", req: true },
      { name: "message", type: "String", req: true },
      { name: "type", type: "Enum", note: "invoice|task|client" },
      { name: "link", type: "String" },
      { name: "isRead", type: "Boolean", def: "false" },
      { name: "createdAt", type: "Date (TTL 30d)" }
    ]
  },
  {
    name: "Invoice (invoices)",
    x: 60,
    y: 520,
    w: 320,
    h: 400,
    color: "#dc2626",
    bgColor: "#fef2f2",
    fields: [
      { name: "_id", type: "ObjectId", key: "PK" },
      { name: "invoiceNumber", type: "String", unique: true },
      { name: "userId", type: "ObjectId", key: "FK -> User" },
      { name: "clientId", type: "ObjectId", key: "FK -> Client" },
      { name: "projectId", type: "ObjectId (opt)", key: "FK -> Project" },
      { name: "items", type: "Array[Object] (embedded)" },
      { name: "subtotal / tax / discount", type: "Number" },
      { name: "totalAmount", type: "Number", req: true },
      { name: "currency", type: "String", def: "USD" },
      { name: "status", type: "Enum", note: "draft|sent|paid|overdue" },
      { name: "stripePaymentIntentId", type: "String" },
      { name: "dueDate / paidAt", type: "Date" }
    ]
  },
  {
    name: "Project (projects)",
    x: 480,
    y: 520,
    w: 320,
    h: 400,
    color: "#2563eb",
    bgColor: "#eff6ff",
    fields: [
      { name: "_id", type: "ObjectId", key: "PK" },
      { name: "userId", type: "ObjectId", key: "FK -> User" },
      { name: "clientId", type: "ObjectId", key: "FK -> Client" },
      { name: "title", type: "String", req: true },
      { name: "description", type: "String" },
      { name: "status", type: "Enum", note: "planning|in_progress|done" },
      { name: "priority", type: "Enum", note: "low|medium|high" },
      { name: "pricingType", type: "Enum", note: "fixed|hourly" },
      { name: "budget", type: "Number", req: true },
      { name: "startDate / dueDate", type: "Date" },
      { name: "attachments", type: "Array[Object]" },
      { name: "createdAt / updatedAt", type: "Date" }
    ]
  },
  {
    name: "Task (tasks)",
    x: 900,
    y: 520,
    w: 320,
    h: 380,
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    fields: [
      { name: "_id", type: "ObjectId", key: "PK" },
      { name: "userId", type: "ObjectId", key: "FK -> User" },
      { name: "projectId", type: "ObjectId", key: "FK -> Project" },
      { name: "title", type: "String", req: true },
      { name: "description", type: "String" },
      { name: "status", type: "Enum", note: "todo|in_progress|review|done" },
      { name: "priority", type: "Enum", note: "low|medium|high|urgent" },
      { name: "dueDate", type: "Date" },
      { name: "estimatedHours / actual", type: "Number" },
      { name: "order", type: "Number (Kanban index)" },
      { name: "isCompleted", type: "Boolean", def: "false" }
    ]
  }
];

// Relationships
const relationships = [
  { from: "User", to: "Client", label: "1 : N (manages)", start: [380, 150], end: [480, 150] },
  { from: "User", to: "Notification", label: "1 : N (receives)", start: [380, 100], end: [900, 100] },
  { from: "User", to: "Invoice", label: "1 : N (issues)", start: [220, 440], end: [220, 520] },
  { from: "Client", to: "Project", label: "1 : N (has projects)", start: [640, 440], end: [640, 520] },
  { from: "Client", to: "Invoice", label: "1 : N (billed to)", start: [480, 300], end: [380, 600] },
  { from: "Project", to: "Task", label: "1 : N (contains tasks)", start: [800, 650], end: [900, 650] },
  { from: "Project", to: "Invoice", label: "1 : N (optional link)", start: [480, 720], end: [380, 720] },
  { from: "User", to: "Task", label: "1 : N (assigned to)", start: [380, 250], end: [900, 580] }
];

// Build Excalidraw Elements
const excalidrawElements = [];

// Header Title element
excalidrawElements.push({
  id: genId('title'),
  type: "text",
  x: 60,
  y: 10,
  width: 700,
  height: 35,
  angle: 0,
  strokeColor: "#1e293b",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 0,
  opacity: 100,
  groupIds: [],
  roundness: null,
  seed: genSeed(),
  version: 1,
  versionNonce: genSeed(),
  isDeleted: false,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
  text: "Freelance CRM & Project Tracker - Database Schema & Relationships (Din 2)",
  fontSize: 20,
  fontFamily: 3,
  textAlign: "left",
  verticalAlign: "top",
  baseline: 28
});

// Render cards
collections.forEach(col => {
  // Box
  excalidrawElements.push({
    id: genId('box'),
    type: "rectangle",
    x: col.x,
    y: col.y,
    width: col.w,
    height: col.h,
    angle: 0,
    strokeColor: col.color,
    backgroundColor: col.bgColor,
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    roundness: { type: 3 },
    seed: genSeed(),
    version: 1,
    versionNonce: genSeed(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false
  });

  // Header background banner
  excalidrawElements.push({
    id: genId('header_bg'),
    type: "rectangle",
    x: col.x,
    y: col.y,
    width: col.w,
    height: 42,
    angle: 0,
    strokeColor: col.color,
    backgroundColor: col.color,
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: { type: 3 },
    seed: genSeed(),
    version: 1,
    versionNonce: genSeed(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false
  });

  // Header text
  excalidrawElements.push({
    id: genId('header_txt'),
    type: "text",
    x: col.x + 15,
    y: col.y + 10,
    width: col.w - 30,
    height: 24,
    angle: 0,
    strokeColor: "#ffffff",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: genSeed(),
    version: 1,
    versionNonce: genSeed(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    text: col.name,
    fontSize: 16,
    fontFamily: 3,
    textAlign: "left",
    verticalAlign: "top",
    baseline: 18
  });

  // Fields
  let currentY = col.y + 52;
  col.fields.forEach(field => {
    let text = `• ${field.name}: ${field.type}`;
    if (field.key) text += ` [${field.key}]`;
    if (field.note) text += ` (${field.note})`;

    excalidrawElements.push({
      id: genId('field_txt'),
      type: "text",
      x: col.x + 12,
      y: currentY,
      width: col.w - 24,
      height: 20,
      angle: 0,
      strokeColor: field.key ? (field.key.includes("PK") ? "#b91c1c" : "#1d4ed8") : "#334155",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 0,
      opacity: 100,
      groupIds: [],
      roundness: null,
      seed: genSeed(),
      version: 1,
      versionNonce: genSeed(),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      text: text,
      fontSize: 12,
      fontFamily: 3,
      textAlign: "left",
      verticalAlign: "top",
      baseline: 14
    });
    currentY += 26;
  });
});

// Render relationship arrows in Excalidraw
relationships.forEach(rel => {
  const dx = rel.end[0] - rel.start[0];
  const dy = rel.end[1] - rel.start[1];

  excalidrawElements.push({
    id: genId('arrow'),
    type: "arrow",
    x: rel.start[0],
    y: rel.start[1],
    width: Math.abs(dx),
    height: Math.abs(dy),
    angle: 0,
    strokeColor: "#475569",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "dashed",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    roundness: { type: 2 },
    seed: genSeed(),
    version: 1,
    versionNonce: genSeed(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    points: [
      [0, 0],
      [dx, dy]
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: "circle",
    endArrowhead: "arrow"
  });

  // Arrow label text
  const midX = rel.start[0] + dx * 0.5 - 40;
  const midY = rel.start[1] + dy * 0.5 - 12;
  excalidrawElements.push({
    id: genId('arrow_txt'),
    type: "text",
    x: midX,
    y: midY,
    width: 140,
    height: 18,
    angle: 0,
    strokeColor: "#0f172a",
    backgroundColor: "#ffffff",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: genSeed(),
    version: 1,
    versionNonce: genSeed(),
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    text: rel.label,
    fontSize: 11,
    fontFamily: 3,
    textAlign: "center",
    verticalAlign: "top",
    baseline: 13
  });
});

const excalidrawFile = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: excalidrawElements,
  appState: {
    viewBackgroundColor: "#f8fafc",
    gridSize: 20
  },
  files: {}
};

const outputDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outputDir, 'schema-diagram.excalidraw'),
  JSON.stringify(excalidrawFile, null, 2)
);
console.log('Successfully generated schema-diagram.excalidraw');
