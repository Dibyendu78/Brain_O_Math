// middleware/coordinatorAuth.js
const jwt = require('jsonwebtoken');
const Coordinator = require('../models/Coordinator');

const authenticateCoordinator = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    
    // Get coordinator from database
    const coordinator = await Coordinator.findById(decoded.schoolId).select('-coordinatorPassword');
    
    if (!coordinator) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Coordinator not found.'
      });
    }

    // Attach coordinator info to request
    req.coordinator = {
      schoolId: coordinator._id,
      coordinatorEmail: coordinator.coordinatorEmail,
      coordinatorName: coordinator.coordinatorName,
      schoolName: coordinator.schoolName,
      registrationId: coordinator.registrationId
    };

    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

module.exports = {
  authenticateCoordinator
};