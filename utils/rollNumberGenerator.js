const Student = require('../models/Student');
const Coordinator = require('../models/Coordinator');

/**
 * Generate a 10-digit roll number
 * Format: SSCCSBCTAAA (total 10 digits)
 * SS  = School code (2 digits): starts at 10, increments per school (MSB never zero to ensure 10 digits)
 * CC  = Class (2 digits): 03, 04, 05, 06, 07, 08, 09, 10, 11, 12
 * SB  = Subject (2 digits): 01=Math, 02=Science, 03=Both
 * CT  = Category (1 digit): 1=Class 3-4, 2=Class 5-6, 3=Class 7-8, 4=Class 9-10, 5=Class 11-12
 * AAA = Arrangement number (3 digits): 001-999 per category within each class within each school
 */

async function getSchoolCode(schoolId) {
    try {
        // Get school code from Coordinator document
        const coordinator = await Coordinator.findById(schoolId).select('schoolCode').lean();
        
        if (!coordinator) {
            throw new Error('School not found');
        }
        
        if (coordinator.schoolCode) {
            // Already has a code assigned, convert to 2-digit string
            return String(coordinator.schoolCode).padStart(2, '0');
        }
        
        // If no code, assign the next available code (starting from 10 to ensure MSB is never zero)
        const maxCodeDoc = await Coordinator.findOne().sort({ schoolCode: -1 }).select('schoolCode').lean();
        const nextCode = maxCodeDoc && maxCodeDoc.schoolCode ? maxCodeDoc.schoolCode + 1 : 10;
        
        // Update the coordinator with the new code
        await Coordinator.findByIdAndUpdate(schoolId, { schoolCode: nextCode });
        
        return String(nextCode).padStart(2, '0');
    } catch (error) {
        console.error('Error getting school code:', error);
        return '10'; // Default to 10 if error
    }
}

function getSubjectCode(subjects) {
    const subjectMap = {
        'math': '01',
        'science': '02',
        'both': '03'
    };
    return subjectMap[subjects] || '03';
}

function getCategoryDigit(cls) {
    const classNum = parseInt(cls, 10);
    if (classNum >= 3 && classNum <= 4) return '1';
    if (classNum >= 5 && classNum <= 6) return '2';
    if (classNum >= 7 && classNum <= 8) return '3';
    if (classNum >= 9 && classNum <= 10) return '4';
    if (classNum >= 11 && classNum <= 12) return '5';
    return '1';
}

async function generateRollNumber(student) {
    try {
        const { school, class: studentClass, subjects } = student;

        // School code (2 digits) - based on school creation order, starting at 10
        const schoolCode = await getSchoolCode(school);

        // Class (2 digits with leading zero)
        const classCode = String(studentClass).padStart(2, '0');

        // Subject code (2 digits)
        const subjectCode = getSubjectCode(subjects);

        // Category digit
        const categoryDigit = getCategoryDigit(studentClass);

        // Get arrangement number
        // Count students in the same school, class, and subject with assigned roll numbers
        const previousCount = await Student.countDocuments({
            school: school,
            class: studentClass,
            subjects: subjects,
            rollNumber: { $exists: true, $ne: null }
        });

        const arrangementNumber = String(previousCount + 1).padStart(3, '0');

        // Combine all parts: SS + CC + SB + CT + AAA = 10 digits total
        const rollNumber = schoolCode + classCode + subjectCode + categoryDigit + arrangementNumber;

        return rollNumber;
    } catch (error) {
        console.error('Error generating roll number:', error);
        throw error;
    }
}


async function generateRollNumberForBatch(students) {
    /**
     * Generate roll numbers for multiple students at once
     * Organized by class and category per school
     */
    try {
        const rollNumbers = {};
        
        // Group students by school, class, and subject
        const grouped = {};
        for (const student of students) {
            const key = `${student.school}-${student.class}-${student.subjects}`;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(student);
        }

        // Generate roll numbers for each group
        for (const key in grouped) {
            const schoolId = grouped[key][0].school;
            const cls = grouped[key][0].class;
            const subjects = grouped[key][0].subjects;

            // Get school code
            const schoolCode = await getSchoolCode(schoolId);

            // Get starting number for this group (count existing roll numbers in this class+subject)
            const existingCount = await Student.countDocuments({
                school: schoolId,
                class: cls,
                subjects: subjects,
                rollNumber: { $exists: true, $ne: null }
            });

            const classCode = String(cls).padStart(2, '0');
            const subjectCode = getSubjectCode(subjects);
            const categoryDigit = getCategoryDigit(cls);

            grouped[key].forEach((student, index) => {
                const arrangementNumber = String(existingCount + index + 1).padStart(3, '0');
                // Format: SSCCSBCTAAA (total 10 digits)
                const rollNumber = schoolCode + classCode + subjectCode + categoryDigit + arrangementNumber;
                rollNumbers[student._id.toString()] = rollNumber;
            });
        }

        return rollNumbers;
    } catch (error) {
        console.error('Error generating batch roll numbers:', error);
        throw error;
    }
}

module.exports = {
    generateRollNumber,
    generateRollNumberForBatch,
    getSubjectCode,
    getCategoryDigit
};
