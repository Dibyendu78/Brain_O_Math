// File Location: /backend/middleware/lockRegistration.js

const lockRegistration = (req, res, next) => {
  // Check if form is locked
  if (req.coordinator && req.coordinator.paymentStatus !== 'pending') {
    return res.status(403).json({
      success: false,
      message: 'Your registration is locked. You cannot add or modify students after payment submission.',
      isLocked: true
    });
  }
  next();
};

module.exports = lockRegistration;
