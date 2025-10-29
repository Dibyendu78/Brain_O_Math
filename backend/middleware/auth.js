// backend/middleware/auth.js

const jwt = require('jsonwebtoken');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const generateToken = payload =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

// Middleware: protects routes by verifying Bearer token
const authenticateAdmin = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Not an admin' });
    }

    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Admin login handler
const adminLogin = (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = generateToken({ username, role: 'admin' });
  res.json({
    success: true,
    token,
    admin: { username, role: 'admin' }
  });
};

// Optional placeholder for RBAC
const isAdmin = (_, res, next) => {
  next(); // All admins are allowed
};

module.exports = {
  authenticateAdmin,
  adminLogin,
  isAdmin
};
