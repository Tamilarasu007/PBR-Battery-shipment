const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const setupSocketHandlers = (io, redisClient) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.username = user.username;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.username} connected (${socket.id})`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);
    
    // Join role-based rooms
    socket.join(`role:${socket.userRole}`);
    
    // Join admin room if user is admin
    if (socket.userRole === 'admin') {
      socket.join('admin');
    }

    // Handle joining contract-specific rooms
    socket.on('join:contract', (contractId) => {
      if (contractId) {
        socket.join(`contract:${contractId}`);
        console.log(`User ${socket.username} joined contract room: ${contractId}`);
      }
    });

    // Handle leaving contract-specific rooms
    socket.on('leave:contract', (contractId) => {
      if (contractId) {
        socket.leave(`contract:${contractId}`);
        console.log(`User ${socket.username} left contract room: ${contractId}`);
      }
    });

    // Handle real-time shipment requests
    socket.on('shipment:request', async (data) => {
      try {
        // Validate the shipment request data
        const { contractId, batteriesShipped } = data;
        
        if (!contractId || !batteriesShipped || batteriesShipped <= 0) {
          socket.emit('shipment:error', {
            error: 'Invalid shipment data',
            code: 'INVALID_DATA'
          });
          return;
        }

        // Emit to contract room that a shipment is being processed
        socket.to(`contract:${contractId}`).emit('shipment:processing', {
          contractId,
          batteriesShipped,
          initiatedBy: socket.username,
          timestamp: new Date()
        });

        console.log(`Shipment request from ${socket.username}: ${batteriesShipped} batteries for contract ${contractId}`);
        
      } catch (error) {
        console.error('Shipment request error:', error);
        socket.emit('shipment:error', {
          error: 'Failed to process shipment request',
          code: 'PROCESSING_ERROR'
        });
      }
    });

    // Handle contract monitoring subscription
    socket.on('monitor:contracts', () => {
      socket.join('contract:monitor');
      console.log(`User ${socket.username} subscribed to contract monitoring`);
    });

    // Handle shipment monitoring subscription
    socket.on('monitor:shipments', () => {
      socket.join('shipment:monitor');
      console.log(`User ${socket.username} subscribed to shipment monitoring`);
    });

    // Handle admin actions
    socket.on('admin:action', (data) => {
      if (socket.userRole !== 'admin') {
        socket.emit('error', {
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED'
        });
        return;
      }

      // Broadcast admin actions to other admins
      socket.to('admin').emit('admin:action_performed', {
        action: data.action,
        performedBy: socket.username,
        timestamp: new Date(),
        details: data
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.username} disconnected (${socket.id}): ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.username}:`, error);
    });
  });

  // Broadcast system-wide notifications
  const broadcastSystemNotification = (type, data) => {
    io.emit('system:notification', {
      type,
      data,
      timestamp: new Date()
    });
  };

  // Broadcast to specific contract watchers
  const broadcastToContract = (contractId, event, data) => {
    io.to(`contract:${contractId}`).emit(event, {
      contractId,
      ...data,
      timestamp: new Date()
    });
  };

  // Broadcast to role-based groups
  const broadcastToRole = (role, event, data) => {
    io.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  };

  // Broadcast to admins only
  const broadcastToAdmins = (event, data) => {
    io.to('admin').emit(event, {
      ...data,
      timestamp: new Date()
    });
  };

  // Export broadcast functions for use in other modules
  io.broadcastSystemNotification = broadcastSystemNotification;
  io.broadcastToContract = broadcastToContract;
  io.broadcastToRole = broadcastToRole;
  io.broadcastToAdmins = broadcastToAdmins;

  console.log('Socket.IO handlers setup complete');
};

module.exports = { setupSocketHandlers };
