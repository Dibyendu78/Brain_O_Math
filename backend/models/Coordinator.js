const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const coordinatorSchema = new mongoose.Schema({
    coordinatorName: {
        type: String,
        required: [true, 'Coordinator name is required'],
        trim: true
    },
    coordinatorEmail: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    coordinatorPhone: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    coordinatorPassword: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [4, 'Password must be at least 4 characters']
    },
    schoolName: {
        type: String,
        required: [true, 'School name is required'],
        trim: true
    },
    schoolAddress: {
        type: String,
        required: [true, 'School address is required'],
        trim: true
    },
    registrationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'payment_submitted'],
        default: 'pending'
    },
    isLocked: {
        type: Boolean,
        default: false,
        comment: 'Locks coordinator form after final UTR submission'
    },
    registrationId: {
        type: String,
        unique: true,
        sparse: true
    },
    utrNumber: {
        type: String,
        default: null,
        trim: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'submitted', 'verified', 'rejected'],
        default: 'pending'
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    totalStudents: {
        type: Number,
        default: 0
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],
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

// Hash password before saving
//coordinatorSchema.pre('save', async function(next) {
   // if (!this.isModified('coordinatorPassword')) {
  //      return next();
   // }

   // try {
     //   const salt = await bcrypt.genSalt(10);
      //  this.coordinatorPassword = await bcrypt.hash(this.coordinatorPassword, salt);
      //  next();
   // } catch (error) {
    //    next(error);
    //}
//});

// Method to compare password
coordinatorSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.coordinatorPassword);
};

// Method to check if coordinator can add/edit students
coordinatorSchema.methods.canModifyStudents = function() {
    return !this.isLocked;
};

module.exports = mongoose.model('Coordinator', coordinatorSchema);
