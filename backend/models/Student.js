const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true
    },
    class: {
        type: String,
        required: [true, 'Class is required'],
        enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10','11','12']
    },
    category: {
        type: String,
        required: true,
        enum: ['A', 'B', 'C', 'D', 'E']
    },
    subjects: {
        type: String,
        required: [true, 'Subject is required'],
        enum: ['math', 'science', 'both']
    },
    fee: {
        type: Number,
        required: [true, 'Fee is required']
    },
    parentName: {
        type: String,
        required: [true, 'Parent name is required'],
        trim: true
    },
    parentContact: {
        type: String,
        required: false,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coordinator',
        required: true
    },
    registrationId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
studentSchema.index({ school: 1, status: 1 });
studentSchema.index({ studentId: 1 });
studentSchema.index({ registrationId: 1 });

module.exports = mongoose.model('Student', studentSchema);