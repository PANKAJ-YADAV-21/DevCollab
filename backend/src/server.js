import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import teamRoutes from './routes/team.routes.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

const isProduction = process.env.NODE_ENV === 'production';

// Normalize CLIENT_URL: strip trailing slashes and support comma-separated values
const rawClientUrl = process.env.CLIENT_URL || (isProduction ? '' : 'http://localhost:5173');
const configuredOrigins = rawClientUrl
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Local development origins allowed ONLY when NOT in production
const localDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

// In production: allow ONLY the exact origins configured through CLIENT_URL
// In development: include configured origins plus local development origins
const allowedOrigins = Array.from(
  new Set(isProduction ? configuredOrigins : [...configuredOrigins, ...localDevOrigins])
);

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'DevCollab API',
    description: 'Developer Collaboration Platform Backend Service',
    status: 'Running',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (Protected)',
      },
      teams: {
        list: 'GET /api/teams (Protected)',
        create: 'POST /api/teams (Protected)',
        details: 'GET /api/teams/:teamId (Protected)',
        addMember: 'POST /api/teams/:teamId/members (Admin/Leader)',
        removeMember: 'DELETE /api/teams/:teamId/members/:userId (Admin/Leader)',
        updateRole: 'PUT /api/teams/:teamId/members/:userId/role (Admin)',
        deleteTeam: 'DELETE /api/teams/:teamId (Admin)',
      },
      projects: {
        list: 'GET /api/projects (Protected)',
        create: 'POST /api/projects (Admin/Leader)',
        details: 'GET /api/projects/:projectId (Team Member)',
        update: 'PUT /api/projects/:projectId (Admin/Leader)',
        assignMember: 'POST /api/projects/:projectId/members (Admin/Leader)',
        removeMember: 'DELETE /api/projects/:projectId/members/:userId (Admin/Leader/Self)',
        deleteProject: 'DELETE /api/projects/:projectId (Admin)',
      },
    },
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

// Start Server
const startServer = async () => {
  // Attempt DB connection in background
  await connectDB();

  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` DevCollab Backend API Server`);
    console.log(` Listening on: http://localhost:${PORT}`);
    console.log(` Environment:  ${process.env.NODE_ENV || 'development'}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });
};

startServer();
