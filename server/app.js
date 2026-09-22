const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from server/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/db');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ==========================================
// Database Connection Ready State Helper
// ==========================================
const getDbStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const state = states[mongoose.connection.readyState] || 'unknown';
  return {
    status: state,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

// ==========================================
// Core Middlewares
// ==========================================

// 1. Helmet for HTTP security headers
app.use(helmet());

// 2. CORS configuration for frontend cross-origin requests
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://localhost:3000',
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
// Core Diagnostic Endpoints
// ==========================================

// Root endpoint: API Information & Status
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Freelance CRM & Project Tracker API',
    version: '1.0.0',
    status: 'online',
    roadmapDay: 'Din 9: Project CRUD API (Client-Project Relationship & Pipeline Stats)',
    documentation: 'https://github.com/ahsanadeem840-ai/freelancer-crm-tracker',
    database: getDbStatus(),
    endpoints: {
      health: '/api/health',
      apiOverview: '/api',
      auth: '/api/auth',
      clients: '/api/clients',
      projects: '/api/projects',
      tasks: '/api/tasks',
      invoices: '/api/invoices',
      notifications: '/api/notifications',
    },
    timestamp: new Date().toISOString(),
  });
});

// API Health Check endpoint
app.get('/api/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const dbStatus = getDbStatus();

  res.status(200).json({
    success: true,
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    database: dbStatus,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
        heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      },
    },
  });
});

// ==========================================
// Modular Application Routes
// ==========================================
app.use('/api', apiRoutes);

// ==========================================
// Error Handling Middlewares
// ==========================================
app.use(notFound);
app.use(errorHandler);

// ==========================================
// Server Listener & Initialization
// ==========================================
if (require.main === module) {
  // Connect to MongoDB Atlas
  connectDB().catch((err) => {
    console.error('⚠️  Initial MongoDB connection could not be established.');
    console.error(`⚠️  Reason: ${err.message}`);
    console.error('👉 The server is still running for API inspection. Fix credentials in server/.env to establish database connection.\n');
  });

  const server = app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`💼 Freelance CRM & Project Tracker - Backend Server`);
    console.log(`==================================================`);
    console.log(`🚀 Server Running on: http://localhost:${PORT}`);
    console.log(`🏥 Health Check:      http://localhost:${PORT}/api/health`);
    console.log(`⚙️  Environment:       ${NODE_ENV}`);
    console.log(`📅 Roadmap Progress:  Din 8 - Client CRUD API (Full CRM Pipeline)`);
    console.log(`📂 Modular Structure: models, routes, controllers, middleware`);
    console.log(`==================================================\n`);
  });

  // Graceful termination handling
  const shutdown = (signal) => {
    console.log(`\n[${signal}] Initiating graceful shutdown...`);
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        console.log('MongoDB connection closed.');
        console.log('HTTP server closed cleanly. Exiting process.');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
