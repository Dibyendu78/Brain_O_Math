// controllers/studentController.js

const Student = require('../models/Student');

/**
 * Get all students with pagination and enrichment (school, coordinator, registration)
 */
exports.getAllStudents = async (req, res) => {
  try {
    const { page = 1, status = '', class: studentClass = '' } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Dynamic match for filtering
    const matchStage = {};
    if (status) matchStage.status = status;
    if (studentClass) matchStage.class = studentClass;

    // Aggregation pipeline
    const pipeline = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Join Registration on registrationId (string field)
      {
        $lookup: {
          from: 'registrations',
          localField: 'registrationId',
          foreignField: 'registrationId',
          as: 'reg'
        }
      },
      { $unwind: { path: '$reg', preserveNullAndEmptyArrays: true } },
      // Join Coordinator on reg.school (ObjectId)
      {
        $lookup: {
          from: 'coordinators',
          localField: 'reg.school',
          foreignField: '_id',
          as: 'school'
        }
      },
      { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } },
      // Compose clean frontend object
      {
        $project: {
          studentId: 1,
          name: 1,
          class: 1,
          category: 1,
          subjects: 1,
          fee: 1,
          parentName: 1,
          parentContact: 1,
          schoolName: { $ifNull: ['$school.schoolName', 'N/A'] },
          coordinatorName: { $ifNull: ['$school.coordinatorName', 'N/A'] },
          coordinatorEmail: { $ifNull: ['$school.coordinatorEmail', 'N/A'] },
          registrationStatus: { $ifNull: ['$reg.status', 'NO_REG_FOUND'] },
          paymentStatus: { $ifNull: ['$reg.paymentStatus', 'NO_REG_FOUND'] },
          status: { $ifNull: ['$status', 'N/A'] },
          createdAt: 1
        }
      }
    ];

    const students = await Student.aggregate(pipeline);
    const total = await Student.countDocuments(matchStage);

    res.json({
      success: true,
      data: students,
      pagination: {
        page: parseInt(page),
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
};
