// File Location: /backend/models/Registration.js

const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  registrationId: {
    type: String,
    unique: true,
    required: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coordinator',
    required: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  totalAmount: {
    type: Number,
    default: 0
  },
  utr: {
    type: String,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'submitted', 'verified', 'rejected'],
    default: 'pending'
  },
  paymentUploadedAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
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
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
