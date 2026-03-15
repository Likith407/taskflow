require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Validate required environment variables
  const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'PAYLOAD_ENCRYPTION_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`🚀 TaskFlow API running on port ${PORT} [${process.env.NODE_ENV}]`);
    console.log(`📖 Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n⚡ ${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('💤 Server and DB connections closed.');
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      console.error('⏰ Force closing after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('💥 Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });
};

startServer();
