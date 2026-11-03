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

  const dbState = dbStatusMap[mongoose.connection.readyState] || 'unknown';

  return res.status(200).json({
    status: 'OK',
    message: 'DevCollab API server is running smoothly',
    service: 'devcollab-api',
    version: '0.1.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbState,
      readyState: mongoose.connection.readyState,
    },
  });
};
