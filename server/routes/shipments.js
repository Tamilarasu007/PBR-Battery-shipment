const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const { requirePermission } = require('../middleware/auth');
const { sendShipmentNotification } = require('../services/emailService');
const { acquireLock, releaseLock } = require('../services/lockService');

const router = express.Router();

// Shipment model (simplified for this implementation)
const shipmentSchema = new mongoose.Schema({
  shipmentId: {
    type: String,
    required: true,
    unique: true,
    default: () => `SHP-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase()
  },
  contractId: {
    type: String,
    required: true,
    index: true
  },
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contract',
    required: true
  },
  batteriesShipped: {
    type: Number,
    required: true,
    min: 1
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['APPROVED', 'BLOCKED', 'PENDING'],
    required: true,
    index: true
  },
  initiatedBy: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blockReason: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

const Shipment = mongoose.model('Shipment', shipmentSchema);

// Get all shipments with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, contractId, search, sortBy = 'timestamp', sortOrder = 'desc' } = req.query;

    const filter = {};
    
    if (status) {
      filter.status = status;
    }

    if (contractId) {
      filter.contractId = contractId;
    }

    if (search) {
      filter.$or = [
        { shipmentId: { $regex: search, $options: 'i' } },
        { contractId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Shipment.countDocuments(filter);

    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sort = { [sortBy]: sortDirection };

    const shipments = await Shipment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username fullName')
      .populate('contract', 'contractId deviceCount threshold isLocked')
      .lean();

    res.json({
      shipments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({
      error: 'Failed to fetch shipments',
      code: 'FETCH_ERROR'
    });
  }
});

// Create new shipment with atomic validation
router.post('/', requirePermission('create'), [
  body('contractId').notEmpty().withMessage('Contract ID is required'),
  body('batteriesShipped').isInt({ min: 1 }).withMessage('Batteries shipped must be a positive integer')
], async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { contractId, batteriesShipped, notes } = req.body;

    await session.startTransaction();

    // Acquire Redis lock to prevent race conditions
    const lockKey = `shipment:${contractId}`;
    const redisClient = req.app.get('redis');
    const lockAcquired = await acquireLock(redisClient, lockKey, 10000);

    if (!lockAcquired) {
      await session.abortTransaction();
      return res.status(423).json({
        error: 'Another shipment is being processed for this contract. Please try again.',
        code: 'CONCURRENT_SHIPMENT'
      });
    }

    try {
      // Find contract
      const contract = await Contract.findOne({ contractId }).session(session);

      if (!contract) {
        throw new Error('CONTRACT_NOT_FOUND');
      }

      if (contract.isLocked) {
        throw new Error('CONTRACT_LOCKED');
      }

      // Check if shipment would exceed threshold
      const newTotal = contract.batteriesShipped + batteriesShipped;
      const wouldExceed = newTotal > contract.threshold;

      let shipmentStatus = 'APPROVED';
      let blockReason = null;

      if (wouldExceed) {
        shipmentStatus = 'BLOCKED';
        blockReason = `Shipment would exceed threshold (${newTotal}/${contract.threshold})`;
        
        // Lock the contract
        contract.isLocked = true;
        await contract.save({ session });
      } else {
        // Update contract atomically
        const updatedContract = await contract.shipBatteries(batteriesShipped, session);
        
        if (!updatedContract) {
          throw new Error('ATOMIC_UPDATE_FAILED');
        }
      }

      // Create shipment record
      const shipment = new Shipment({
        contractId,
        contract: contract._id,
        batteriesShipped,
        status: shipmentStatus,
        initiatedBy: req.user.username,
        userId: req.userId,
        notes,
        blockReason
      });

      await shipment.save({ session });

      await session.commitTransaction();
      await releaseLock(redisClient, lockKey);

      // Populate shipment for response
      await shipment.populate('userId contract', 'username fullName contractId deviceCount threshold isLocked');

      // Send email notification if blocked
      if (shipmentStatus === 'BLOCKED') {
        await contract.addNotification(
          req.user.email,
          `⚠ PBR Battery Shipment Limit Reached (Contract: ${contractId})`,
          'THRESHOLD_EXCEEDED'
        );

        try {
          await sendShipmentNotification({
            type: 'SHIPMENT_BLOCKED',
            contractId,
            shipmentId: shipment.shipmentId,
            batteriesShipped,
            totalShipped: newTotal,
            threshold: contract.threshold,
            deviceCount: contract.deviceCount,
            userEmail: req.user.email,
            userName: req.user.username
          });
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
        }
      }

      // Emit real-time update
      const io = req.app.get('io');
      io.emit('shipment:created', {
        shipment,
        contract: {
          contractId: contract.contractId,
          batteriesShipped: contract.batteriesShipped,
          threshold: contract.threshold,
          isLocked: contract.isLocked
        }
      });

      if (shipmentStatus === 'BLOCKED') {
        io.emit('contract:threshold_exceeded', {
          contractId,
          batteriesShipped: newTotal,
          threshold: contract.threshold
        });
      }

      res.status(201).json({
        message: `Shipment ${shipmentStatus.toLowerCase()} successfully`,
        shipment,
        warning: shipmentStatus === 'BLOCKED' ? 'Shipment blocked due to threshold exceeded' : null
      });

    } finally {
      await releaseLock(redisClient, lockKey);
    }

  } catch (error) {
    await session.abortTransaction();
    console.error('Create shipment error:', error);

    if (error.message === 'CONTRACT_NOT_FOUND') {
      return res.status(404).json({
        error: 'Contract not found',
        code: 'CONTRACT_NOT_FOUND'
      });
    }

    if (error.message === 'CONTRACT_LOCKED') {
      return res.status(423).json({
        error: 'Contract is locked. No further shipments allowed.',
        code: 'CONTRACT_LOCKED'
      });
    }

    res.status(500).json({
      error: 'Failed to create shipment',
      code: 'CREATE_ERROR'
    });
  } finally {
    await session.endSession();
  }
});

// Get shipment statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { days = 30, contractId } = req.query;
    const dateFilter = {
      timestamp: {
        $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
      }
    };

    if (contractId) {
      dateFilter.contractId = contractId;
    }

    const stats = await Shipment.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBatteries: { $sum: '$batteriesShipped' }
        }
      },
      {
        $group: {
          _id: null,
          statistics: {
            $push: {
              status: '$_id',
              count: '$count',
              totalBatteries: '$totalBatteries'
            }
          },
          totalShipments: { $sum: '$count' },
          totalBatteriesShipped: { $sum: '$totalBatteries' }
        }
      }
    ]);

    res.json({
      statistics: stats[0] || {
        statistics: [],
        totalShipments: 0,
        totalBatteriesShipped: 0
      },
      period: `${days} days`,
      contractId: contractId || 'all'
    });

  } catch (error) {
    console.error('Get shipment stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch shipment statistics',
      code: 'STATS_ERROR'
    });
  }
});

module.exports = router;
