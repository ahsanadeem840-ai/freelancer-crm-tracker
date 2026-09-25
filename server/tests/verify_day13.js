/**
 * Automated Verification Test Suite for Din 13 (Login/Signup Pages & Tailwind CSS Setup)
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

async function runDay13Tests() {
  console.log('\n======================================================');
  console.log('🚀 Running Din 13 Automated Verification Test Suite');
  console.log('   Login/Signup Pages (Frontend) + Tailwind CSS Setup');
  console.log('======================================================\n');

  const rootDir = path.resolve(__dirname, '../..');
  const clientDir = path.join(rootDir, 'client');

  // Test 1: Tailwind CSS Packages in client/package.json
  console.log('--- Step 1: Tailwind CSS Dependencies ---');
  const packageJsonPath = path.join(clientDir, 'package.json');
  assert(fs.existsSync(packageJsonPath), 'client/package.json exists');

  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert(pkg.dependencies && pkg.dependencies['tailwindcss'], 'tailwindcss dependency installed');
    assert(pkg.dependencies && pkg.dependencies['@tailwindcss/vite'], '@tailwindcss/vite plugin installed');
    assert(pkg.dependencies && pkg.dependencies['axios'], 'axios HTTP client installed');
    assert(pkg.dependencies && pkg.dependencies['lucide-react'], 'lucide-react icons installed');
  }

  // Test 2: Tailwind Plugin in Vite Config
  console.log('\n--- Step 2: Tailwind Vite Configuration ---');
  const viteConfigPath = path.join(clientDir, 'vite.config.js');
  assert(fs.existsSync(viteConfigPath), 'client/vite.config.js exists');

  if (fs.existsSync(viteConfigPath)) {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
    assert(viteConfig.includes('@tailwindcss/vite'), 'vite.config.js imports @tailwindcss/vite');
    assert(viteConfig.includes('tailwindcss()'), 'vite.config.js registers tailwindcss() plugin');
  }

  // Test 3: Tailwind Import in CSS
  console.log('\n--- Step 3: Tailwind Global CSS Import ---');
  const indexCssPath = path.join(clientDir, 'src/index.css');
  assert(fs.existsSync(indexCssPath), 'client/src/index.css exists');

  if (fs.existsSync(indexCssPath)) {
    const cssContent = fs.readFileSync(indexCssPath, 'utf8');
    assert(cssContent.includes('@import "tailwindcss";') || cssContent.includes('@tailwind'), 'index.css imports Tailwind CSS directives');
  }

  // Test 4: Login Form Implementation & Tailwind Classes
  console.log('\n--- Step 4: Login Page & Form Architecture ---');
  const loginPath = path.join(clientDir, 'src/pages/Login.jsx');
  assert(fs.existsSync(loginPath), 'client/src/pages/Login.jsx exists');

  if (fs.existsSync(loginPath)) {
    const loginContent = fs.readFileSync(loginPath, 'utf8');
    assert(loginContent.includes('useAuth'), 'Login.jsx connects to AuthContext via useAuth hook');
    assert(loginContent.includes('showPassword'), 'Login.jsx provides show/hide password toggle');
    assert(loginContent.includes('handleDemoFill'), 'Login.jsx provides 1-click test credential fill buttons');
    assert(loginContent.includes('backdrop-blur'), 'Login.jsx uses Tailwind glassmorphism backdrop-blur classes');
    assert(loginContent.includes('bg-gradient-to-r'), 'Login.jsx uses Tailwind gradient accent utilities');
    assert(loginContent.includes('focus:ring-indigo-500'), 'Login.jsx includes Tailwind focus ring styling on inputs');
    assert(loginContent.includes('Loader2'), 'Login.jsx includes animated loading spinner during submit');
    assert(loginContent.includes('to="/register"'), 'Login.jsx includes navigation link to Register page');
  }

  // Test 5: Signup / Register Form Implementation & Features
  console.log('\n--- Step 5: Signup / Register Page & Form Architecture ---');
  const registerPath = path.join(clientDir, 'src/pages/Register.jsx');
  assert(fs.existsSync(registerPath), 'client/src/pages/Register.jsx exists');

  if (fs.existsSync(registerPath)) {
    const registerContent = fs.readFileSync(registerPath, 'utf8');
    assert(registerContent.includes('useAuth'), 'Register.jsx connects to AuthContext via useAuth hook');
    assert(registerContent.includes('getPasswordStrength'), 'Register.jsx provides real-time password strength meter');
    assert(registerContent.includes('confirmPassword'), 'Register.jsx includes confirm password validation');
    assert(registerContent.includes('role'), 'Register.jsx provides role selector matching backend RBAC');
    assert(registerContent.includes('freelancer') && registerContent.includes('agency_owner') && registerContent.includes('client'), 'Register.jsx supports freelancer, agency_owner, and client roles');
    assert(registerContent.includes('agreeTerms'), 'Register.jsx includes terms of service agreement checkbox');
    assert(registerContent.includes('to="/login"'), 'Register.jsx includes navigation link to Login page');
  }

  // Test 6: Auth Context & API Service Layer
  console.log('\n--- Step 6: Auth State Management & API Service Layer ---');
  const authContextPath = path.join(clientDir, 'src/context/AuthContext.jsx');
  assert(fs.existsSync(authContextPath), 'client/src/context/AuthContext.jsx exists');

  if (fs.existsSync(authContextPath)) {
    const authContext = fs.readFileSync(authContextPath, 'utf8');
    assert(authContext.includes('login') && authContext.includes('register') && authContext.includes('logout'), 'AuthContext provides login, register, and logout handlers');
    assert(authContext.includes('localStorage'), 'AuthContext persists token & user in localStorage');
  }

  const apiServicePath = path.join(clientDir, 'src/services/api.js');
  assert(fs.existsSync(apiServicePath), 'client/src/services/api.js exists');

  if (fs.existsSync(apiServicePath)) {
    const apiService = fs.readFileSync(apiServicePath, 'utf8');
    assert(apiService.includes('/auth/login'), 'api.js includes POST /auth/login endpoint handler');
    assert(apiService.includes('/auth/register'), 'api.js includes POST /auth/register endpoint handler');
    assert(apiService.includes('Authorization'), 'api.js includes JWT request interceptor');
  }

  // Test 7: Production Build Verification with Tailwind CSS
  console.log('\n--- Step 7: Vite Production Build Verification ---');
  const distDir = path.join(clientDir, 'dist');
  assert(fs.existsSync(distDir), 'client/dist directory exists');

  const distAssets = fs.readdirSync(path.join(distDir, 'assets'));
  const hasCss = distAssets.some(f => f.endsWith('.css'));
  const hasJs = distAssets.some(f => f.endsWith('.js'));
  assert(hasCss, 'Compiled Tailwind CSS asset bundle generated in dist/assets/');
  assert(hasJs, 'Compiled React JavaScript bundle generated in dist/assets/');

  // Summary
  console.log('\n======================================================');
  console.log(`Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 Din 13 Login/Signup Pages & Tailwind CSS setup SUCCESSFUL!\n');
    process.exit(0);
  }
}

runDay13Tests();
