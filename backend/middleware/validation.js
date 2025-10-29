const { body, validationResult } = require('express-validator');

// ✅ Middleware to parse JSON strings from FormData (if needed)
const parseFormData = (req, res, next) => {
  try {
    if (typeof req.body.school === 'string') {
      req.body.school = JSON.parse(req.body.school);
    }
    if (typeof req.body.students === 'string') {
      req.body.students = JSON.parse(req.body.students);
    }
    if (req.body.totalAmount) {
      req.body.totalAmount = Number(req.body.totalAmount);
    }

    next(); // proceed to next middleware
  } catch (err) {
    console.error('❌ JSON Parse Error:', err.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in form data',
    });
  }
};

// ✅ Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation Errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// ✅ Registration validation - FIXED
const validateRegistration = [
  parseFormData, // MUST come first to parse the JSON body

  // 📌 School validation
  body('school.schoolName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('School name must be between 2 and 200 characters'),

  // 🔧 FIXED: Make school address optional
  body('school.schoolAddress')
    .optional({ checkFalsy: true }) // Allow empty strings and null
    .trim()
    .isLength({ min: 0, max: 300 })
    .withMessage('School address must be less than 300 characters'),

  body('school.coordinatorName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Coordinator name must be between 2 and 100 characters'),

  body('school.coordinatorEmail')
    .isEmail()
    .withMessage('Invalid email address'),

  body('school.coordinatorPhone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Coordinator phone must be 10 digits'),

  // 📌 Students validation - ENHANCED
  body('students')
    .isArray({ min: 1 })
    .withMessage('At least one student is required'),

  body('students.*.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Student name must be between 2 and 100 characters'),

  body('students.*.class')
    .custom((value) => {
      const validClasses = ['3','4','5','6','7','8','9','10','11','12'];
      return validClasses.includes(String(value));
    })
    .withMessage('Student class must be between 3 and 12'),

  body('students.*.subjects')
    .isIn(['math', 'science', 'both'])
    .withMessage('Subjects must be math, science, or both'),

  // 🔧 FIXED: Make parent name required but allow empty parent contact
  body('students.*.parentName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Parent name must be between 2 and 100 characters'),

  body('students.*.parentContact')
    .optional({ checkFalsy: true }) // ✅ allow empty strings
    .matches(/^[0-9]{10}$/)
    .withMessage('Parent contact must be a 10-digit number'),

  // 📌 Amount validation
  body('totalAmount')
    .isNumeric()
    .withMessage('Total amount must be a valid number'),

  // ✅ Final handler
  handleValidationErrors,
];

// ✅ Admin login validation
const validateAdminLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// ✅ Status update validation
const validateStatusUpdate = [
  body('status')
    .isIn(['pending', 'verified', 'rejected'])
    .withMessage('Status must be one of: pending, verified, rejected'),

  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters'),

  handleValidationErrors,
];

module.exports = {
  validateRegistration,
  validateAdminLogin,
  validateStatusUpdate,
};