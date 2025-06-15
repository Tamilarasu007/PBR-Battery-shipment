const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['THRESHOLD_WARNING', 'THRESHOLD_EXCEEDED', 'CONTRACT_LOCKED', 'CONTRACT_UNLOCKED'],
    default: 'THRESHOLD_EXCEEDED'
  }
});

const contractSchema = new mongoose.Schema({
  contractId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  deviceCount: {
    type: Number,
    required: true,
    min: 1
  },
  batteriesShipped: {
    type: Number,
    default: 0,
    min: 0
  },
  threshold: {
    type: Number,
    required: true,
    min: 1
  },
  isLocked: {
    type: Boolean,
    default: false,
    index: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notificationsSent: [notificationSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  clientName: {
    type: String,
    trim: true
  },
  contractStartDate: {
    type: Date
  },
  contractEndDate: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for threshold percentage
contractSchema.virtual('thresholdPercentage').get(function() {
  return this.threshold > 0 ? (this.batteriesShipped / this.threshold) * 100 : 0;
});

// Virtual for remaining capacity
contractSchema.virtual('remainingCapacity').get(function() {
  return Math.max(0, this.threshold - this.batteriesShipped);
});

// Virtual for status
contractSchema.virtual('status').get(function() {
  if (this.isLocked) return 'LOCKED';
  if (this.thresholdPercentage >= 100) return 'EXCEEDED';
  if (this.thresholdPercentage >= 80) return 'WARNING';
  return 'ACTIVE';
});

// Indexes for performance
contractSchema.index({ contractId: 1, isLocked: 1 });
contractSchema.index({ batteriesShipped: 1, threshold: 1 });
contractSchema.index({ lastUpdated: -1 });
contractSchema.index({ createdBy: 1 });

// Pre-save middleware to update lastUpdated
contractSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Instance method to add notification
contractSchema.methods.addNotification = function(email, message, type = 'THRESHOLD_EXCEEDED') {
  this.notificationsSent.push({
    email,
    message,
    type,
    timestamp: new Date()
  });
  return this.save();
};

// Instance method to check if can ship
contractSchema.methods.canShip = function(quantity) {
  if (this.isLocked) return false;
  return (this.batteriesShipped + quantity) <= this.threshold;
};

// Instance method to ship batteries atomically
contractSchema.methods.shipBatteries = async function(quantity, session = null) {
  const options = session ? { session } : {};
  
  const updated = await this.constructor.findOneAndUpdate(
    {
      _id: this._id,
      isLocked: false,
      $expr: {
        $lte: [
          { $add: ['$batteriesShipped', quantity] },
          '$threshold'
        ]
      }
    },
    {
      $inc: { batteriesShipped: quantity },
      $set: { lastUpdated: new Date() }
    },
    { new: true, ...options }
  );
  
  return updated;
};

module.exports = mongoose.model('Contract', contractSchema);
