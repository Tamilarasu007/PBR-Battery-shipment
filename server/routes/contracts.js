const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Contract = require('../models/Contract');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get all contracts with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, priority, search, sortBy = 'lastUpdated', sortOrder = 'desc' } = req.query;

    const filter = {};
    
    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.$or = [
        { contractId: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } }
      ];
    }

    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          thresholdPercentage: {
            $multiply: [
              { $divide: ['$batteriesShipped', '$threshold'] },
              100
            ]
          },
          status: {
            $switch: {
              branches: [
                { case: { $eq: ['$isLocked', true] }, then: 'LOCKED' },
                { 
                  case: { 
                    $gte: [
                      { $multiply: [{ $divide: ['$batteriesShipped', '$threshold'] }, 100] },
                      100
                    ]
                  }, 
                  then: 'EXCEEDED' 
                },
                { 
                  case: { 
                    $gte: [
                      { $multiply: [{ $divide: ['$batteriesShipped', '$threshold'] }, 100] },
                      80
                    ]
                  }, 
                  then: 'WARNING' 
                }
              ],
              default: 'ACTIVE'
            }
          }
        }
      }
    ];

    if (status) {
      pipeline.push({ $match: { status } });
    }

    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: { [sortBy]: sortDirection } });

    const totalPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await Contract.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    pipeline.push({ $skip: skip }, { $limit: limit });

    const contracts = await Contract.aggregate(pipeline);

    res.json({
      contracts,
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
    console.error('Get contracts error:', error);
    res.status(500).json({
      error: 'Failed to fetch contracts',
      code: 'FETCH_ERROR'
    });
  }
});

// Get single contract by ID
router.get('/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await Contract.findOne({ contractId })
      .populate('createdBy', 'username fullName')
      .populate('lastModifiedBy', 'username fullName');

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found',
        code: 'CONTRACT_NOT_FOUND'
      });
    }

    res.json({ contract });

  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({
      error: 'Failed to fetch contract',
      code: 'FETCH_ERROR'
    });
  }
});

// Create new contract
router.post('/', requirePermission('create'), [
  body('contractId').notEmpty().matches(/^[A-Z0-9-]+$/),
  body('deviceCount').isInt({ min: 1 }),
  body('threshold').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { contractId, deviceCount, threshold, clientName, priority } = req.body;

    const existingContract = await Contract.findOne({ contractId });
    if (existingContract) {
      return res.status(409).json({
        error: 'Contract with this ID already exists',
        code: 'CONTRACT_EXISTS'
      });
    }

    const contract = new Contract({
      contractId,
      deviceCount,
      threshold: threshold || Math.floor(deviceCount * 1.2),
      clientName,
      priority,
      createdBy: req.userId
    });

    await contract.save();

    const io = req.app.get('io');
    io.emit('contract:created', { contract });

    res.status(201).json({
      message: 'Contract created successfully',
      contract
    });

  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({
      error: 'Failed to create contract',
      code: 'CREATE_ERROR'
    });
  }
});

// Toggle contract lock status (Admin only)
router.patch('/:contractId/lock', requirePermission('unlock_contracts'), async (req, res) => {
  try {
    const { contractId } = req.params;
    const { isLocked, reason } = req.body;

    const contract = await Contract.findOne({ contractId });

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found',
        code: 'CONTRACT_NOT_FOUND'
      });
    }

    contract.isLocked = isLocked !== undefined ? isLocked : !contract.isLocked;
    contract.lastModifiedBy = req.userId;

    const message = contract.isLocked 
      ? `Contract manually locked by ${req.user.username}${reason ? `: ${reason}` : ''}`
      : `Contract unlocked by ${req.user.username}`;

    await contract.addNotification(
      req.user.email,
      message,
      contract.isLocked ? 'CONTRACT_LOCKED' : 'CONTRACT_UNLOCKED'
    );

    await contract.save();

    const io = req.app.get('io');
    io.emit('contract:lock_changed', {
      contractId: contract.contractId,
      isLocked: contract.isLocked,
      changedBy: req.user.username,
      reason
    });

    res.json({
      message: `Contract ${contract.isLocked ? 'locked' : 'unlocked'} successfully`,
      contract
    });

  } catch (error) {
    console.error('Toggle lock error:', error);
    res.status(500).json({
      error: 'Failed to toggle contract lock',
      code: 'LOCK_ERROR'
    });
  }
});

module.exports = router;
