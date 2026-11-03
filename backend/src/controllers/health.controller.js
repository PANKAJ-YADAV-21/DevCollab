import mongoose from 'mongoose';

/**
 * Health check endpoint handler
 * Returns system uptime, timestamp, environment, and DB status
 */
export const getHealthStatus = (req, res) => {
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const readyState = mongoose.connection.readyState;
  const dbState = dbStatusMap[readyState] || 'unknown';
  const isDbConnected = readyState === 1;

  const statusCode = isDbConnected ? 200 : 503;

  return res.status(statusCode).json({
    status: isDbConnected ? 'OK' : 'DEGRADED',
    message: isDbConnected
      ? 'DevCollab API server is running smoothly'
      : 'DevCollab API server is running but database is not connected',
    service: 'devcollab-api',
    version: '0.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbState,
      readyState: readyState,
      healthy: isDbConnected,
    },
  });
};
