const Coordinator = require('../models/Coordinator');
const Registration = require('../models/Registration');
const Student = require('../models/Student');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendCoordinatorWelcomeEmail, sendCoordinatorCredentialsEmail } = require('../utils/mailer');


// ============================================
// HELPER FUNCTIONS
// ============================================

function generateRegistrationId() {
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // generates 4-digit random number
    return 'REG2025' + randomNumber;
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
    return 'A';
}


// ============================================
// SIGNUP - ✅ FIXED (hashes password ONCE)
// ============================================

const signupCoordinator = async (req, res) => {
    try {
        console.log('🚀 Starting coordinator signup at:', new Date().toISOString());
        const startTime = Date.now();

        const {
            schoolName,
            schoolAddress,
            coordinatorName,
            coordinatorEmail,
            coordinatorPhone
        } = req.body;

        // Validation
        if (!schoolName || !coordinatorName || !coordinatorEmail || !coordinatorPhone) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Email validation
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(coordinatorEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Phone validation - MUST be exactly 10 digits
        if (!/^[0-9]{10}$/.test(coordinatorPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Phone must be exactly 10 digits'
            });
        }

        console.log('📧 Checking email uniqueness...');
        const emailCheck = Date.now();

        const existingCoordinator = await Coordinator.findOne({
            coordinatorEmail: coordinatorEmail.toLowerCase()
        }).lean().exec();

        console.log(`📧 Email check completed in ${Date.now() - emailCheck}ms`);

        if (existingCoordinator) {
            return res.status(409).json({
                success: false,
                message: 'Email already registered. Please use a different email.'
            });
        }

        // ✅ CRITICAL FIX: Extract last 4 digits and hash ONCE (only here)
        console.log('🔐 Hashing password...');
        const hashStart = Date.now();

        const registrationId = generateRegistrationId();
        const plainPassword = coordinatorPhone.slice(-4);  // Extract last 4
        
        console.log('📱 Phone:', coordinatorPhone);
        console.log('🔑 Password (last 4):', plainPassword);

        // ✅ Hash password ONLY ONCE here (model will NOT hash it again)
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        console.log(`🔐 Password hashed in ${Date.now() - hashStart}ms`);

        // Create coordinator
        console.log('🏫 Creating coordinator record...');
        const createStart = Date.now();

        const newCoordinator = await Coordinator.create({
            schoolName: schoolName.trim(),
            schoolAddress: schoolAddress?.trim() || 'Not provided',
            coordinatorName: coordinatorName.trim(),
            coordinatorEmail: coordinatorEmail.toLowerCase().trim(),
            coordinatorPhone: coordinatorPhone.trim(),
            coordinatorPassword: hashedPassword,  // ✅ Already hashed!
            registrationId
        });

        console.log(`🏫 Coordinator created in ${Date.now() - createStart}ms`);

        const totalTime = Date.now() - startTime;
        console.log(`✅ Database operations completed in ${totalTime}ms`);

        // ✅ Send response immediately
        res.status(201).json({
            success: true,
            message: 'Account created successfully! Login credentials will be sent to your email shortly.',
            data: {
                registrationId,
                coordinatorName,
                schoolName,
                message: 'Registration completed successfully'
            }
        });

        // 📧 Send email AFTER response (non-blocking)
        setImmediate(async () => {
            try {
                console.log('📧 Sending welcome email asynchronously...');
                const emailStart = Date.now();

                await sendCoordinatorWelcomeEmail({
                    coordinatorName,
                    coordinatorEmail,
                    coordinatorPhone,
                    registrationId,
                    schoolName
                });

                console.log(`✅ Welcome email sent successfully in ${Date.now() - emailStart}ms`);
            } catch (emailError) {
                console.error('❌ Email Error (non-blocking):', emailError.message);
                console.error('📧 Email will be retried or sent manually if needed');
            }
        });

        console.log(`🎉 Total signup process: ${Date.now() - startTime}ms`);

    } catch (error) {
        console.error('❌ Coordinator Signup Error:', error.message);
        console.error('❌ Stack trace:', error.stack);

        res.status(500).json({
            success: false,
            message: 'Registration failed due to server error. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


// ============================================
// LOGIN - ✅ FIXED (compares correctly)
// ============================================

const coordinatorLogin = async (req, res) => {
    try {
        console.log('🔐 Coordinator login attempt at:', new Date().toISOString());
        const startTime = Date.now();

        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Password format validation - must be 4 digits
        if (!/^\d{4}$/.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be exactly 4 digits'
            });
        }

        // ✅ Find coordinator
        const queryStart = Date.now();
        const coordinator = await Coordinator.findOne({
            coordinatorEmail: email.toLowerCase().trim()
        }).lean().exec();

        console.log(`📊 Database query completed in ${Date.now() - queryStart}ms`);

        if (!coordinator) {
            console.log('❌ No coordinator found with email:', email.toLowerCase());
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password. Please check your credentials.'
            });
        }

        console.log('🔍 Coordinator found: YES');
        console.log('   Email in DB:', coordinator.coordinatorEmail);
        console.log('   Phone in DB:', coordinator.coordinatorPhone);

        // ✅ Compare password
        console.log('🔐 Comparing passwords...');
        console.log('   Password provided:', password);
        console.log('   Password length:', password.length);
        console.log('   Expected (last 4 of phone):', coordinator.coordinatorPhone.slice(-4));

        const compareStart = Date.now();
        const isPasswordValid = await bcrypt.compare(password, coordinator.coordinatorPassword);
        console.log(`🔐 Password comparison completed in ${Date.now() - compareStart}ms`);
        console.log('   Password match:', isPasswordValid ? 'YES ✅' : 'NO ❌');

        if (!isPasswordValid) {
            console.log('❌ Password mismatch');
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password. Please check your credentials.'
            });
        }

        console.log('✅ Login credentials valid. Generating token...');

        // ✅ Generate JWT token
        const tokenStart = Date.now();
        const token = jwt.sign(
            {
                schoolId: coordinator._id,
                coordinatorEmail: coordinator.coordinatorEmail,
                coordinatorName: coordinator.coordinatorName,
                schoolName: coordinator.schoolName,
                registrationId: coordinator.registrationId
            },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '24h' }
        );
        console.log(`🎫 JWT token generated in ${Date.now() - tokenStart}ms`);

        // Successful login response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            coordinator: {
                coordinatorName: coordinator.coordinatorName,
                coordinatorEmail: coordinator.coordinatorEmail,
                schoolName: coordinator.schoolName,
                coordinatorPhone: coordinator.coordinatorPhone,
                registrationId: coordinator.registrationId
            }
        });

        console.log(`✅ Login completed successfully in ${Date.now() - startTime}ms`);

    } catch (error) {
        console.error('❌ Coordinator Login Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Login failed due to server error. Please try again.'
        });
    }
};


// ============================================
// GET REGISTRATION (with lock flag)
// ============================================

const getRegistration = async (req, res) => {
    try {
        const startTime = Date.now();
        const schoolId = req.coordinator.schoolId;

        let registration = await Registration.findOne({ school: schoolId })
            .populate('students')
            .lean()
            .exec();

        if (!registration) {
            // Create new registration if doesn't exist
            registration = await Registration.create({
                registrationId: generateRegistrationId(),
                school: schoolId,
                students: [],
                totalAmount: 0,
                paymentStatus: 'pending',
                status: 'pending'
            });

            // Re-populate students after create
            registration = await Registration.findById(registration._id)
                .populate('students')
                .lean()
                .exec();
        }

        console.log(`📊 Registration data loaded in ${Date.now() - startTime}ms`);

        // ✅ Add locked flag for frontend
        const locked = registration.paymentStatus !== 'pending';

        res.status(200).json({
            success: true,
            locked,  // Frontend uses this to disable forms
            data: registration
        });

    } catch (error) {
        console.error('❌ Get Registration Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch registration data'
        });
    }
};


// ============================================
// ADD STUDENT
// ============================================

const addStudent = async (req, res) => {
    try {
        const startTime = Date.now();
        const schoolId = req.coordinator.schoolId;
        const { name, class: studentClass, subjects, parentName, parentContact } = req.body;

        // Validation
        if (!name || !studentClass || !subjects) {
            return res.status(400).json({
                success: false,
                message: 'Name, class, and subjects are required'
            });
        }

        // Validate class
        const classNum = parseInt(studentClass);
        if (isNaN(classNum) || classNum < 3 || classNum > 12) {
            return res.status(400).json({
                success: false,
                message: 'Class must be between 3 and 12'
            });
        }

        // Validate subjects
        if (!['math', 'science', 'both'].includes(subjects)) {
            return res.status(400).json({
                success: false,
                message: 'Subjects must be math, science, or both'
            });
        }

        // Validate parent contact if provided
        if (parentContact && !/^[0-9]{10}$/.test(parentContact)) {
            return res.status(400).json({
                success: false,
                message: 'Parent contact must be 10 digits'
            });
        }

        // Get last student ID
        const lastStudent = await Student.findOne({})
            .sort({ studentId: -1 })
            .lean()
            .exec();

        let nextNumber = 1;
        if (lastStudent && lastStudent.studentId) {
            const match = lastStudent.studentId.match(/BOMO(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        const studentId = 'BOMO' + String(nextNumber).padStart(6, '0');

        // Find or create registration
        let registration = await Registration.findOne({ school: schoolId }).exec();
        if (!registration) {
            registration = await Registration.create({
                registrationId: generateRegistrationId(),
                school: schoolId,
                students: [],
                totalAmount: 0,
                paymentStatus: 'pending',
                status: 'pending'
            });
        }

        // Create student
        const studentData = {
            studentId,
            name: name.trim(),
            class: studentClass,
            category: calculateCategory(studentClass),
            subjects,
            fee: calculateFee(subjects),
            parentName: parentName?.trim() || '',
            parentContact: parentContact?.trim() || '',
            registrationId: registration.registrationId,
            school: schoolId,
            status: 'pending'
        };

        const newStudent = await Student.create(studentData);

        // Update registration
        registration.students.push(newStudent._id);
        registration.totalAmount += newStudent.fee;
        await registration.save();

        console.log(`✅ Student added successfully in ${Date.now() - startTime}ms`);

        res.status(201).json({
            success: true,
            message: 'Student added successfully',
            data: {
                ...studentData,
                _id: newStudent._id
            }
        });

    } catch (error) {
        console.error('❌ Add Student Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to add student. Please try again.'
        });
    }
};


// ============================================
// UPDATE STUDENT
// ============================================

const updateStudent = async (req, res) => {
    try {
        const startTime = Date.now();
        const schoolId = req.coordinator.schoolId;
        const studentIndex = parseInt(req.params.index);
        const { name, class: studentClass, subjects, parentName, parentContact } = req.body;

        if (!name || !studentClass || !subjects) {
            return res.status(400).json({
                success: false,
                message: 'Name, class, and subjects are required'
            });
        }

        let registration = await Registration.findOne({ school: schoolId })
            .populate('students')
            .exec();

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        if (registration.paymentStatus === 'verified') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit students after payment verification'
            });
        }

        if (studentIndex >= registration.students.length || studentIndex < 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const student = registration.students[studentIndex];
        const oldFee = student.fee;

        // Update student
        student.name = name.trim();
        student.class = studentClass;
        student.category = calculateCategory(studentClass);
        student.subjects = subjects;
        student.fee = calculateFee(subjects);
        student.parentName = parentName?.trim() || '';
        student.parentContact = parentContact?.trim() || '';

        await student.save();

        // Update registration total
        registration.totalAmount = registration.totalAmount - oldFee + student.fee;
        await registration.save();

        console.log(`✅ Student updated successfully in ${Date.now() - startTime}ms`);

        res.status(200).json({
            success: true,
            message: 'Student updated successfully',
            data: student
        });

    } catch (error) {
        console.error('❌ Update Student Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to update student'
        });
    }
};


// ============================================
// REMOVE STUDENT
// ============================================

const removeStudent = async (req, res) => {
    try {
        const startTime = Date.now();
        const schoolId = req.coordinator.schoolId;
        const studentIndex = parseInt(req.params.index);

        let registration = await Registration.findOne({ school: schoolId })
            .populate('students')
            .exec();

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        if (registration.paymentStatus === 'verified') {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove students after payment verification'
            });
        }

        if (studentIndex >= registration.students.length || studentIndex < 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const student = registration.students[studentIndex];

        // Remove from registration
        registration.students.splice(studentIndex, 1);
        registration.totalAmount -= student.fee;
        await registration.save();

        // Delete student document
        await Student.findByIdAndDelete(student._id);

        console.log(`✅ Student removed successfully in ${Date.now() - startTime}ms`);

        res.status(200).json({
            success: true,
            message: 'Student removed successfully'
        });

    } catch (error) {
        console.error('❌ Remove Student Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to remove student'
        });
    }
};



const uploadPayment = async (req, res) => {
    try {
        const startTime = Date.now();
        const schoolId = req.coordinator.schoolId;
        const { utr } = req.body;

        // Validate UTR
        if (!utr || typeof utr !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'UTR number is required'
            });
        }

        const cleanUTR = utr.trim().toUpperCase();

        if (cleanUTR.length !== 12) {
            return res.status(400).json({
                success: false,
                message: `UTR must be exactly 12 digits. You provided ${cleanUTR.length} characters.`
            });
        }

        if (!/^[0-9]{12}$/.test(cleanUTR)) {
            return res.status(400).json({
                success: false,
                message: 'UTR must contain only numeric digits (0-9)'
            });
        }

        // Check for duplicate UTR
        const existingUTR = await Registration.findOne({
            utr: cleanUTR,
            _id: { $ne: null }
        }).lean().exec();

        if (existingUTR) {
            return res.status(400).json({
                success: false,
                message: 'This UTR number has already been used for another registration.'
            });
        }

        // Get registration
        const registration = await Registration.findOne({ school: schoolId }).exec();

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: 'No registration found for this school'
            });
        }

        if (registration.students.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please add at least one student before submitting payment'
            });
        }

        // ✅ UPDATE REGISTRATION WITH UTR (LOCKS FORM)
        registration.utr = cleanUTR;
        registration.paymentStatus = 'submitted';
        registration.paymentUploadedAt = new Date();
        await registration.save();

        console.log(`✅ UTR submitted successfully in ${Date.now() - startTime}ms`);

        // Send response immediately so UI doesn't hang
        res.status(200).json({
            success: true,
            message: 'Payment UTR submitted successfully',
            data: {
                registrationId: registration.registrationId,
                utr: cleanUTR,
                paymentStatus: registration.paymentStatus,
                totalAmount: registration.totalAmount
            }
        });

        // Send email notification asynchronously (fire and forget)
        // This won't block the response or cause UI loading issues
        setImmediate(async () => {
            try {
                const { sendStudentSubmissionEmail } = require('../utils/mailer');
                const coordinatorData = {
                    coordinatorName: req.coordinator.coordinatorName,
                    coordinatorEmail: req.coordinator.coordinatorEmail,
                    schoolName: req.coordinator.schoolName,
                    registrationId: registration.registrationId
                };
                
                await sendStudentSubmissionEmail(
                    coordinatorData, 
                    registration.students.length, 
                    registration.totalAmount
                );
                console.log('📧 Student submission email sent successfully');
            } catch (emailError) {
                console.error('❌ Failed to send student submission email:', emailError);
                // Email failure is logged but doesn't affect the main operation
            }
        });

    } catch (error) {
        console.error('❌ Upload Payment Error:', error.message);

        // Handle duplicate UTR error
        if (error.code === 11000 && error.keyPattern && error.keyPattern.utr) {
            return res.status(400).json({
                success: false,
                message: 'This UTR number has already been used.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to submit payment. Please try again.'
        });
    }
};



const healthCheck = async (req, res) => {
    try {
        // Quick database ping
        const dbPing = await Coordinator.findOne().lean().limit(1).exec();

        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbPing ? 'connected' : 'disconnected',
            uptime: Math.floor(process.uptime()),
            memory: process.memoryUsage(),
            version: process.version
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
};



const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const coordinator = await Coordinator.findOne({ coordinatorEmail: email.toLowerCase() });
        
        if (!coordinator) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address'
            });
        }

        // Send credentials email (registrationId and last 4 digits of phone)
        await sendCoordinatorCredentialsEmail({
            coordinatorName: coordinator.coordinatorName,
            coordinatorEmail: coordinator.coordinatorEmail,
            coordinatorPhone: coordinator.coordinatorPhone,
            registrationId: coordinator.registrationId,
            schoolName: coordinator.schoolName
        });

        res.status(200).json({
            success: true,
            message: 'Recovery email sent with your Registration ID and password'
        });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process password reset request'
        });
    }
};

module.exports = {
    signupCoordinator,
    coordinatorLogin,
    getRegistration,
    addStudent,
    updateStudent,
    removeStudent,
    uploadPayment,
    forgotPassword,
    healthCheck
};