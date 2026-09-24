/**
 * Automated Verification Test Suite for Din 12 (React App Setup + React Router)
 * Project: Freelancer CRM & Project Tracker
 */

const fs = require('fs');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
    testsPassed++;
  } else {
    console.error(`  \x1b[31m✖\x1b[0m ${message}`);
    testsFailed++;
  }
}

async function runDay12Tests() {
  console.log('\n======================================================');
  console.log('🚀 Running Din 12 Automated Verification Test Suite');
  console.log('   React App Setup (Vite) + React Router v7 Routes');
  console.log('======================================================\n');

  const rootDir = path.resolve(__dirname, '../..');
  const clientDir = path.join(rootDir, 'client');

  // Test 1: Client folder & Vite config exist
  console.log('--- Step 1: Vite Project Scaffolding & Configuration ---');
  assert(fs.existsSync(clientDir), 'Client directory exists at root of project');
  
  const viteConfigPath = path.join(clientDir, 'vite.config.js');
  assert(fs.existsSync(viteConfigPath), 'vite.config.js exists in client directory');

  if (fs.existsSync(viteConfigPath)) {
    const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');
    assert(viteConfigContent.includes('@vitejs/plugin-react'), 'vite.config.js imports @vitejs/plugin-react');
    assert(viteConfigContent.includes('proxy'), 'vite.config.js configures proxy for /api');
    assert(viteConfigContent.includes('5000'), 'vite.config.js proxies requests to Express backend port 5000');
  }

  // Test 2: Client package.json and dependencies
  console.log('\n--- Step 2: Dependencies & Package Configuration ---');
  const packageJsonPath = path.join(clientDir, 'package.json');
  assert(fs.existsSync(packageJsonPath), 'client/package.json exists');

  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert(pkg.dependencies && pkg.dependencies['react'], 'React dependency installed');
    assert(pkg.dependencies && pkg.dependencies['react-dom'], 'React-DOM dependency installed');
    assert(pkg.dependencies && pkg.dependencies['react-router-dom'], 'react-router-dom dependency installed');
    assert(pkg.dependencies && pkg.dependencies['lucide-react'], 'lucide-react dependency installed for icons');
  }

  // Test 3: HTML & Entry Point files
  console.log('\n--- Step 3: Entry Points & HTML Structure ---');
  const indexPath = path.join(clientDir, 'index.html');
  assert(fs.existsSync(indexPath), 'index.html exists');

  if (fs.existsSync(indexPath)) {
    const htmlContent = fs.readFileSync(indexPath, 'utf8');
    assert(htmlContent.includes('id="root"'), 'index.html contains #root mounting div');
    assert(htmlContent.includes('src="/src/main.jsx"'), 'index.html mounts /src/main.jsx');
    assert(htmlContent.includes('Plus+Jakarta+Sans'), 'index.html imports modern Google Fonts typography');
  }

  const mainJsxPath = path.join(clientDir, 'src/main.jsx');
  assert(fs.existsSync(mainJsxPath), 'src/main.jsx exists');

  const appJsxPath = path.join(clientDir, 'src/App.jsx');
  assert(fs.existsSync(appJsxPath), 'src/App.jsx exists');

  if (fs.existsSync(appJsxPath)) {
    const appContent = fs.readFileSync(appJsxPath, 'utf8');
    assert(appContent.includes('BrowserRouter'), 'App.jsx initializes BrowserRouter from react-router-dom');
    assert(appContent.includes('AppRoutes'), 'App.jsx mounts AppRoutes component');
  }

  // Test 4: Design System & Styling
  console.log('\n--- Step 4: Modern Design System & CSS Styling ---');
  const cssPath = path.join(clientDir, 'src/index.css');
  assert(fs.existsSync(cssPath), 'src/index.css exists');

  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert(cssContent.includes('--bg-app'), 'index.css defines dark theme background variables');
    assert(cssContent.includes('--primary-gradient'), 'index.css defines modern vibrant gradients');
    assert(cssContent.includes('.glass-card'), 'index.css provides glassmorphism card utilities');
    assert(cssContent.includes('.app-sidebar'), 'index.css provides responsive sidebar styling');
    assert(cssContent.includes('.kanban-board'), 'index.css provides Kanban board responsive grid');
  }

  // Test 5: Layout & Navigation Components
  console.log('\n--- Step 5: Layout & Navigation Components ---');
  const layoutDir = path.join(clientDir, 'src/components/layout');
  assert(fs.existsSync(layoutDir), 'src/components/layout directory exists');

  const layoutFiles = ['Layout.jsx', 'Sidebar.jsx', 'Navbar.jsx', 'Footer.jsx'];
  layoutFiles.forEach((file) => {
    const filePath = path.join(layoutDir, file);
    assert(fs.existsSync(filePath), `layout/${file} component exists`);
  });

  const sidebarContent = fs.readFileSync(path.join(layoutDir, 'Sidebar.jsx'), 'utf8');
  assert(sidebarContent.includes('NavLink'), 'Sidebar.jsx uses NavLink for active link highlighting');
  assert(sidebarContent.includes('/clients'), 'Sidebar includes Clients CRM route link');
  assert(sidebarContent.includes('/projects'), 'Sidebar includes Projects route link');
  assert(sidebarContent.includes('/tasks'), 'Sidebar includes Tasks route link');
  assert(sidebarContent.includes('/invoices'), 'Sidebar includes Invoices route link');

  // Test 6: Route Page Components
  console.log('\n--- Step 6: Route Page Components & Schemas ---');
  const pagesDir = path.join(clientDir, 'src/pages');
  assert(fs.existsSync(pagesDir), 'src/pages directory exists');

  const pageFiles = [
    { file: 'Dashboard.jsx', check: 'Command Center Overview' },
    { file: 'Clients.jsx', check: 'Client CRM Directory' },
    { file: 'Projects.jsx', check: 'Project Management' },
    { file: 'Tasks.jsx', check: 'Kanban Task Board' },
    { file: 'Invoices.jsx', check: 'Invoicing & Billing' },
    { file: 'Login.jsx', check: 'Welcome back' },
    { file: 'Register.jsx', check: 'Create your account' },
    { file: 'NotFound.jsx', check: '404' },
  ];

  pageFiles.forEach(({ file, check }) => {
    const pagePath = path.join(pagesDir, file);
    assert(fs.existsSync(pagePath), `pages/${file} exists`);
    if (fs.existsSync(pagePath)) {
      const content = fs.readFileSync(pagePath, 'utf8');
      assert(content.includes(check), `pages/${file} renders expected content ('${check}')`);
    }
  });

  // Test 7: Router Map & Nested Routes Configuration
  console.log('\n--- Step 7: React Router Configuration ---');
  const routesPath = path.join(clientDir, 'src/routes/AppRoutes.jsx');
  assert(fs.existsSync(routesPath), 'src/routes/AppRoutes.jsx exists');

  if (fs.existsSync(routesPath)) {
    const routesContent = fs.readFileSync(routesPath, 'utf8');
    assert(routesContent.includes('<Routes>'), 'AppRoutes defines <Routes>');
    assert(routesContent.includes('element={<Layout />}'), 'AppRoutes configures nested Layout wrapper');
    assert(routesContent.includes('path="clients"'), 'AppRoutes registers /clients route');
    assert(routesContent.includes('path="projects"'), 'AppRoutes registers /projects route');
    assert(routesContent.includes('path="tasks"'), 'AppRoutes registers /tasks route');
    assert(routesContent.includes('path="invoices"'), 'AppRoutes registers /invoices route');
    assert(routesContent.includes('path="login"'), 'AppRoutes registers /login route');
    assert(routesContent.includes('path="register"'), 'AppRoutes registers /register route');
    assert(routesContent.includes('path="*"'), 'AppRoutes registers catch-all 404 route');
  }

  // Test 8: Production Build Output Exists
  console.log('\n--- Step 8: Production Build Bundle Verification ---');
  const distDir = path.join(clientDir, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  assert(fs.existsSync(distIndex), 'Vite production build output (dist/index.html) generated cleanly');

  // Summary
  console.log('\n======================================================');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 Din 12 React App Setup & React Router verification SUCCESSFUL!\n');
    process.exit(0);
  }
}

runDay12Tests();
