const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin login
router.post('/login', adminController.adminLogin);
// Get dashboard statistics
router.get('/stats', adminController.getStats);
// Get all students
router.get('/students', adminController.getAllStudents);
// Get all registrations
router.get('/registrations', adminController.getAllRegistrations);
// Update student status
router.put('/students/:studentId/status', adminController.updateStudentStatus);
// Update registration status
router.put('/registrations/:registrationId/status', adminController.updateRegistrationStatus);
// Get revenue statistics
router.get('/revenue/stats', adminController.getRevenueStats);
// Get all revenue records
router.get('/revenue', adminController.getAllRevenue);
// Export registrations to CSV
router.get('/export', adminController.exportRegistrations);
// Export students to CSV
router.get('/export-students', adminController.exportStudents);

module.exports = router;
