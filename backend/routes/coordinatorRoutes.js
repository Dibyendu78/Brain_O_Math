// routes/coordinatorRoutes.js
const express = require('express');
const router = express.Router();
const coordinatorController = require('../controllers/coordinatorController');
const { authenticateCoordinator } = require('../middleware/coordinatorAuth');

// Public routes
router.post('/signup', coordinatorController.signupCoordinator);
router.post('/login', coordinatorController.coordinatorLogin);
router.post('/forgot-password', coordinatorController.forgotPassword);

// Protected routes
router.use(authenticateCoordinator);
router.get('/registration', coordinatorController.getRegistration);
router.get('/health', coordinatorController.healthCheck);

// Student management routes
router.post('/students', coordinatorController.addStudent);
router.put('/students/:index', coordinatorController.updateStudent);
router.delete('/students/:index', coordinatorController.removeStudent);

// Payment submission route
router.post('/payment', coordinatorController.uploadPayment);

module.exports = router;
