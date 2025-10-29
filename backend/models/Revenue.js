const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  registrationId: {
    type: String,
    required: true,
    unique: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coordinator',
    required: true
  },
  schoolName: {
    type: String,
    required: true
  },
  coordinatorName: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  studentCount: {
    type: Number,
    required: true
  },
  verifiedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['verified', 'rejected'],
    default: 'verified'
  }
}, {
  timestamps: true
});

// Index for faster queries
revenueSchema.index({ verifiedAt: -1 });
revenueSchema.index({ school: 1 });

module.exports = mongoose.model('Revenue', revenueSchema);
