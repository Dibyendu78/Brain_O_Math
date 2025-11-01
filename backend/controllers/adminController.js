// controllers/adminController.js
const Student = require('../models/Student');
const Registration = require('../models/Registration');
const Coordinator = require('../models/Coordinator');
const Revenue = require('../models/Revenue');

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    // Handle both email and username fields
    const loginField = email || username;
    
    // Case-insensitive email comparison
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@brainomath.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (loginField.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const token = require('jsonwebtoken').sign(
      { adminId: 'admin', email: loginField },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// Get dashboard statistics
exports.getStats = async (req, res) => {
  try {
    const [
      totalStudents,
      totalRegistrations,
      totalCoordinators,
      pendingRegistrations,
      verifiedRegistrations,
      rejectedRegistrations,
      totalRevenue
    ] = await Promise.all([
      Student.countDocuments(),
      Registration.countDocuments(),
      Coordinator.countDocuments(),
      Registration.countDocuments({ status: 'pending' }),
      Registration.countDocuments({ status: 'approved' }),
      Registration.countDocuments({ status: 'rejected' }),
      Revenue.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalRegistrations,
        totalCoordinators,
        pendingRegistrations,
        verifiedRegistrations,
        rejectedRegistrations,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const { page = 1, status = '', class: studentClass = '' } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    if (status) filter.status = status;
    if (studentClass) filter.class = studentClass;

    const students = await Student.find(filter)
      .populate({
        path: 'school',
        select: 'schoolName coordinatorName coordinatorEmail coordinatorPhone'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Student.countDocuments(filter);

    const transformedStudents = students.map(student => ({
      ...student,
      coordinatorName: student.school?.coordinatorName || 'N/A',
      coordinatorEmail: student.school?.coordinatorEmail || 'N/A',
      coordinatorPhone: student.school?.coordinatorPhone || 'N/A',
      schoolName: student.school?.schoolName || 'N/A'
    }));

    res.status(200).json({
      success: true,
      data: transformedStudents,
      count: transformedStudents.length,
      pagination: {
        page: parseInt(page),
        limit: limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get All Students Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
};

// Get all registrations
exports.getAllRegistrations = async (req, res) => {
  try {
    const { page = 1, status = '' } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};
    if (status) {
      // Filter by paymentStatus or status
      filter.$or = [
        { paymentStatus: status },
        { status: status }
      ];
    }

    const registrations = await Registration.find(filter)
      .populate({
        path: 'school',
        select: 'schoolName coordinatorName coordinatorEmail coordinatorPhone'
      })
      .populate('students')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Registration.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: registrations,
      count: registrations.length,
      pagination: {
        page: parseInt(page),
        limit: limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get All Registrations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch registrations'
    });
  }
};

// Update student status
exports.updateStudentStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { status } = req.body;

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const student = await Student.findByIdAndUpdate(
      studentId,
      { status },
      { new: true }
    ).populate('school');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student status updated',
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update student status'
    });
  }
};

// Update registration status
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { status, paymentStatus } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    // Check if registrationId is a valid ObjectId (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(registrationId);
    
    let registration;
    if (isValidObjectId) {
      // Try to find by _id first
      registration = await Registration.findByIdAndUpdate(
        registrationId,
        updateData,
        { new: true }
      ).populate('school').populate('students');
    }
    
    // If not found by _id or not a valid ObjectId, try by registrationId field
    if (!registration) {
      registration = await Registration.findOneAndUpdate(
        { registrationId: registrationId },
        updateData,
        { new: true }
      ).populate('school').populate('students');
    }

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // ✅ Update student statuses when registration is verified/rejected
    if (status === 'approved' || status === 'rejected' || paymentStatus === 'verified' || paymentStatus === 'rejected') {
      let studentStatus;
      
      // Determine student status based on both status and paymentStatus
      if (status === 'approved' || paymentStatus === 'verified') {
        studentStatus = 'verified';
      } else if (status === 'rejected' || paymentStatus === 'rejected') {
        studentStatus = 'rejected';
      }
      
      if (studentStatus) {
        // Update all students in this registration
        await Student.updateMany(
          { _id: { $in: registration.students } },
          { status: studentStatus }
        );
        
        console.log(`✅ Updated ${registration.students.length} students to status: ${studentStatus}`);
      }
      
      // ✅ Handle revenue tracking properly
      try {
        const existingRevenue = await Revenue.findOne({ registrationId: registration.registrationId });
        
        if (status === 'approved' || paymentStatus === 'verified') {
          // Add revenue when approved/verified
          if (!existingRevenue) {
            await Revenue.create({
              registrationId: registration.registrationId,
              school: registration.school,
              schoolName: registration.school.schoolName,
              coordinatorName: registration.school.coordinatorName,
              totalAmount: registration.totalAmount,
              studentCount: registration.students.length,
              status: 'verified'
            });
            console.log(`💰 Added revenue: ₹${registration.totalAmount} from ${registration.school.schoolName}`);
          }
        } else if (status === 'rejected' || paymentStatus === 'rejected') {
          // Remove revenue when rejected
          if (existingRevenue) {
            await Revenue.findOneAndDelete({ registrationId: registration.registrationId });
            console.log(`💰 Removed revenue: ₹${existingRevenue.totalAmount} from ${registration.school.schoolName}`);
          }
        }
      } catch (revenueError) {
        console.error('Revenue tracking error:', revenueError);
        // Don't fail the main operation if revenue tracking fails
      }
    }

    // Send response immediately so admin UI doesn't hang
    res.status(200).json({
      success: true,
      message: 'Registration status updated',
      data: registration
    });

    // Send email notification asynchronously (fire and forget)
    // This won't block the response or cause UI loading issues
    const finalStatus = status || paymentStatus;
    if (finalStatus === 'approved' || finalStatus === 'verified' || finalStatus === 'rejected') {
      setImmediate(async () => {
        try {
          const { sendPaymentVerificationEmail } = require('../utils/mailer');
          const coordinatorData = {
            coordinatorName: registration.school.coordinatorName,
            coordinatorEmail: registration.school.coordinatorEmail,
            schoolName: registration.school.schoolName,
            registrationId: registration.registrationId
          };
          
          await sendPaymentVerificationEmail(
            coordinatorData,
            finalStatus,
            registration.totalAmount,
            registration.students.length
          );
          console.log(`📧 Payment ${finalStatus} email sent successfully`);
        } catch (emailError) {
          console.error('❌ Failed to send payment verification email:', emailError);
          // Email failure is logged but doesn't affect the main operation
        }
      });
    }
  } catch (error) {
    console.error('Update Registration Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update registration status'
    });
  }
};

// Get revenue statistics
exports.getRevenueStats = async (req, res) => {
  try {
    const [
      totalRevenue,
      totalRegistrations,
      totalStudents,
      monthlyRevenue,
      recentRevenue
    ] = await Promise.all([
      Revenue.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Revenue.countDocuments(),
      Revenue.aggregate([
        { $group: { _id: null, total: { $sum: '$studentCount' } } }
      ]),
      Revenue.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$verifiedAt' },
              month: { $month: '$verifiedAt' }
            },
            revenue: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),
      Revenue.find()
        .populate('school', 'schoolName coordinatorName')
        .sort({ verifiedAt: -1 })
        .limit(10)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalRegistrations: totalRegistrations,
        totalStudents: totalStudents[0]?.total || 0,
        monthlyRevenue,
        recentRevenue
      }
    });
  } catch (error) {
    console.error('Get Revenue Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue statistics'
    });
  }
};

// Get all revenue records
exports.getAllRevenue = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const revenue = await Revenue.find()
      .populate('school', 'schoolName coordinatorName coordinatorEmail')
      .sort({ verifiedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Revenue.countDocuments();

    res.status(200).json({
      success: true,
      data: revenue,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get All Revenue Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue records'
    });
  }
};

// Export registrations to CSV
exports.exportRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find()
      .populate({
        path: 'school',
        select: 'schoolName coordinatorName coordinatorEmail coordinatorPhone'
      })
      .populate('students')
      .sort({ createdAt: -1 })
      .lean();

    // Create CSV header
    const headers = [
      'Registration ID',
      'School Name',
      'Coordinator Name',
      'Coordinator Email',
      'Coordinator Phone',
      'Total Students',
      'Total Amount',
      'UTR Number',
      'Payment Status',
      'Status',
      'Created At'
    ];

    // Create CSV rows
    const rows = registrations.map(reg => [
      reg.registrationId || '',
      reg.school?.schoolName || '',
      reg.school?.coordinatorName || '',
      reg.school?.coordinatorEmail || '',
      reg.school?.coordinatorPhone || '',
      reg.students?.length || 0,
      reg.totalAmount || 0,
      reg.utr || '',
      reg.paymentStatus || '',
      reg.status || '',
      new Date(reg.createdAt).toLocaleDateString()
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export Registrations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export registrations'
    });
  }
};

// Export students to CSV
exports.exportStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate({
        path: 'school',
        select: 'schoolName coordinatorName coordinatorEmail coordinatorPhone'
      })
      .sort({ createdAt: -1 })
      .lean();

    // Create CSV header
    const headers = [
      'Student ID',
      'Name',
      'Class',
      'Category',
      'Subjects',
      'Fee',
      'Parent Name',
      'Parent Contact',
      'School Name',
      'Coordinator Name',
      'Coordinator Email',
      'Coordinator Phone',
      'Status',
      'Registration ID',
      'Created At'
    ];

    // Create CSV rows
    const rows = students.map(student => [
      student.studentId || '',
      student.name || '',
      student.class || '',
      student.category || '',
      student.subjects || '',
      student.fee || 0,
      student.parentName || '',
      student.parentContact || '',
      student.school?.schoolName || '',
      student.school?.coordinatorName || '',
      student.school?.coordinatorEmail || '',
      student.school?.coordinatorPhone || '',
      student.status || '',
      student.registrationId || '',
      new Date(student.createdAt).toLocaleDateString()
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export Students Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export students'
    });
  }
};
