// File Location: /backend/config/db.js

const mongoose = require('mongoose');
const winston = require('winston');

// Winston Logger Configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Mongoose 6+ doesn't need deprecated options
    });

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`❌ DB connection failed: ${err.message}`);
    console.error(`❌ DB connection failed:`, err.message);
    process.exit(1);
  }
};

// Connection event listeners
mongoose.connection.on('disconnected', () => {
  logger.info('⚠️  MongoDB disconnected');
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`❌ MongoDB connection error: ${err}`);
  console.error('❌ MongoDB connection error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('✅ MongoDB connection closed gracefully');
    console.log('✅ MongoDB connection closed gracefully');
    process.exit(0);
  } catch (err) {
    logger.error(`Error during MongoDB connection closure: ${err}`);
    process.exit(1);
  }
});

module.exports = { connectDB, logger };
