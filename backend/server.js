const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, logger } = require('./config/db');

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'https://brainomath.netlify.app',    // Your Netlify frontend
    'https://brainomath.online',          // Your custom domain
    'http://localhost:8080', 
    'https://brainomath.dpdns.org'             // Local dev
                                       // Allow all (temporary for debugging)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();

const coordinatorRoutes = require('./routes/coordinatorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const registrationRoutes = require('./routes/registrationRoutes');

app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/registration', registrationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Brain-O-Math Olympiad API Server', version: '1.0.0' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;
