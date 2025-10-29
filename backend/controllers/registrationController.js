// controllers/registrationController.js
const Registration = require('../models/Registration');
const Coordinator = require('../models/Coordinator');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');

function generateRegistrationId() {
  return 'BOM25' + Math.floor(1000 + Math.random() * 9000);
}

function calculateFee(subjects) {
  return subjects === 'both' ? 140 : 70;
}

function calculateCategory(cls) {
  const c = parseInt(cls, 10);
  if (c >= 3 && c <= 4) return 'A';
  if (c >= 5 && c <= 6) return 'B';
  if (c >= 7 && c <= 8) return 'C';
  if (c >= 9 && c <= 10) return 'D';
  if (c >= 11) return 'E';
  return '-';
}

exports.submitRegistration = async (req, res) => {
  try {
    const { school, students, totalAmount, utr } = req.body;

    // UTR validation
    if (!utr || typeof utr !== 'string') {
      return res.status(400).json({ success: false, message: 'UTR number is required' });
    }
    const cleanUTR = utr.trim().toUpperCase();
    if (!/^[0-9]{12}$/.test(cleanUTR)) {
      return res.status(400).json({ success: false, message: 'UTR must be exactly 12 digits' });
    }
    if (await Registration.findOne({ utr: cleanUTR })) {
      return res.status(400).json({ success: false, message: 'This UTR has already been used' });
    }

    // Validation
    if (!school?.schoolName || !school?.coordinatorName || !school?.coordinatorEmail || !school?.coordinatorPhone) {
      return res.status(400).json({ success: false, message: 'Missing required school info' });
    }
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one student required' });
    }

    // Clean students data
    const cleanStudents = students.map(s => ({
      name: (s.name || '').trim(),
      class: s.class || '',
      category: s.category || calculateCategory(s.class),
      subjects: s.subjects || '',
      fee: s.fee || calculateFee(s.subjects),
      parentName: (s.parentName || '').trim(),
      parentContact: (s.parentContact || '').trim()
    }));

    const calcTotal = cleanStudents.reduce((sum, s) => sum + s.fee, 0);
    if (calcTotal !== totalAmount) {
      return res.status(400).json({ success: false, message: `Total mismatch. Expected ₹${calcTotal}` });
    }

    // Upsert coordinator
    let coordinatorDoc = await Coordinator.findOne({ coordinatorEmail: school.coordinatorEmail.toLowerCase() });
    if (!coordinatorDoc) {
      const pwd = school.coordinatorPhone.slice(-4);
      const hashed = await bcrypt.hash(pwd, 10);
      const regId = generateRegistrationId();
      coordinatorDoc = await Coordinator.create({
        schoolName: school.schoolName.trim(),
        schoolAddress: (school.schoolAddress || '').trim(),
        coordinatorName: school.coordinatorName.trim(),
        coordinatorEmail: school.coordinatorEmail.toLowerCase().trim(),
        coordinatorPhone: school.coordinatorPhone.trim(),
        coordinatorPassword: hashed,
        registrationId: regId
      });
    }

    // Create students
    const last = await Student.findOne().sort({ studentId: -1 }).lean();
    let nextNum = last?.studentId?.match(/BOMO(\d+)/)?.[1] * 1 + 1 || 1;
    const studentDocs = [];
    
    for (const s of cleanStudents) {
      const sid = 'BOMO' + String(nextNum++).padStart(6, '0');
      const sd = await Student.create({
        studentId: sid,
        name: s.name,
        class: s.class,
        category: s.category,
        subjects: s.subjects,
        fee: s.fee,
        parentName: s.parentName,
        parentContact: s.parentContact,
        registrationId: coordinatorDoc.registrationId,
        school: coordinatorDoc._id,
        status: 'pending'
      });
      studentDocs.push(sd);
    }

    // Create registration
    const reg = await Registration.create({
      registrationId: coordinatorDoc.registrationId,
      school: coordinatorDoc._id,
      students: studentDocs.map(d => d._id),
      totalAmount,
      utr: cleanUTR,
      status: 'pending',
      paymentStatus: 'submitted'
    });

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully',
      data: {
        registrationId: reg.registrationId,
        utr: cleanUTR,
        status: reg.status,
        paymentStatus: reg.paymentStatus,
        totalStudents: studentDocs.length,
        totalAmount
      }
    });
  } catch (e) {
    if (e.code === 11000 && e.keyPattern?.utr) {
      return res.status(400).json({ success: false, message: 'UTR already used' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: e.message });
  }
};

exports.getRegistrationById = async (req, res) => {
  try {
    const reg = await Registration.findOne({ registrationId: req.params.id })
      .populate('school')
      .populate('students')
      .lean();
    if (!reg) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const locked = reg.paymentStatus !== 'pending';
    res.json({ success: true, locked, data: reg });
  } catch (error) {
    console.error('Get Registration Error:', error);
    res.status(500).json({ success: false, message: 'Fetch error' });
  }
};
