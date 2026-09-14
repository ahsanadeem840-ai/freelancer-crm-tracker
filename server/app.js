const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from server/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==========================================
// Core Middlewares
// ==========================================

// 1. Helmet for HTTP security headers
app.use(helmet());

// 2. CORS configuration for frontend cross-origin requests
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://localhost:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. Request logger (Morgan)
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// 4. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// API Routes
// ==========================================

// Root endpoint: API Information & Status
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Freelance CRM & Project Tracker API',
    version: '1.0.0',
    status: 'online',
    roadmapDay: 'Din 3: Backend Project Init & Express Setup',
    documentation: 'https://github.com/ahsanadeem840-ai/freelancer-crm-tracker',
    endpoints: {
      health: '/api/health',
      apiOverview: '/api'
    },
    timestamp: new Date().toISOString()
  });
});

// API Health Check endpoint
app.get('/api/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    success: true,
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
        heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2)
      }
    }
  });
});

// API Overview & Roadmap index
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Freelance CRM API',
    description: 'REST API service powering CRM, Kanban workflows, real-time events, and Stripe payments.',
    plannedModules: [
      { day: 'Din 4', module: 'Database Connection & Mongoose Models' },
      { day: 'Din 5-6', module: 'Authentication & Role-Based Authorization' },
      { day: 'Din 7-9', module: 'Client CRM, Projects & Kanban Task APIs' },
      { day: 'Din 10-11', module: 'Invoicing & Stripe Checkout Webhooks' },
      { day: 'Din 12-13', module: 'Socket.io Real-Time Notifications' }
    ]
  });
});

// ==========================================
// Error Handling Middlewares
// ==========================================

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found - ${req.method} ${req.originalUrl}`
  });
});

// Global Centralized Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorResponse = {
    success: false,
    message: err.message || 'Internal Server Error'
  };

  if (NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
});

// ==========================================
// Server Listener
// ==========================================

// Start HTTP server only if run directly (allows importing in test suites)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`💼 Freelance CRM & Project Tracker - Backend Server`);
    console.log(`==================================================`);
    console.log(`🚀 Server Running on: http://localhost:${PORT}`);
    console.log(`🏥 Health Check:      http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Environment:       ${NODE_ENV}`);
    console.log(`📅 Roadmap Progress:  Din 3 - Backend Project Init Complete`);
    console.log(`==================================================\n`);
  });

  // Graceful termination handling
  const shutdown = (signal) => {
    console.log(`\n[${signal}] Initiating graceful shutdown...`);
    server.close(() => {
      console.log('HTTP server closed cleanly. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
