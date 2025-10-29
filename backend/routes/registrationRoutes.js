// backend/routes/registrationRoutes.js

const express = require('express');
const router = express.Router();

// Import controller functions
const {
  submitRegistration,
  getRegistrationById
} = require('../controllers/registrationController');

// Import validation middleware
const { validateRegistration } = require('../middleware/validation');

// POST: Submit registration with validation
router.post(
  '/',
  validateRegistration,
  submitRegistration
);

// GET: Fetch registration by ID
router.get('/:id', getRegistrationById);

module.exports = router;
