# PBR Battery Shipment Backend

This is the Node.js backend for the PBR Battery Shipment Monitoring & Control System.

## Features

- **Atomic Shipment Validation**: Prevents race conditions using MongoDB transactions and Redis locks
- **Real-time Updates**: WebSocket support with Socket.IO for live dashboard updates
- **JWT Authentication**: Secure authentication with role-based access control
- **Email Notifications**: Automated alerts using Nodemailer with AWS SES support
- **MongoDB Integration**: Robust data modeling with Mongoose
- **Redis Caching**: Distributed locking and caching support
- **Role-based Authorization**: User, Manager, and Admin roles with different permissions

## Architecture

```
server/
├── index.js              # Main server entry point
├── models/               # MongoDB schemas
│   ├── Contract.js       # PBR contract model
│   ├── User.js          # User authentication model
│   └── Shipment.js      # Shipment log model
├── routes/              # API endpoints
│   ├── auth.js          # Authentication routes
│   ├── contracts.js     # Contract management
│   └── shipments.js     # Shipment processing
├── middleware/          # Express middleware
│   └── auth.js          # JWT authentication
├── services/            # Business logic services
│   ├── emailService.js  # Email notifications
│   └── lockService.js   # Redis distributed locking
└── socket/              # WebSocket handlers
    └── handlers.js      # Socket.IO event handlers
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout user

### Contracts
- `GET /api/contracts` - List contracts with filtering
- `GET /api/contracts/:contractId` - Get contract details
- `POST /api/contracts` - Create new contract (Manager/Admin)
- `PUT /api/contracts/:contractId` - Update contract (Manager/Admin)
- `PATCH /api/contracts/:contractId/lock` - Lock/unlock contract (Admin only)

### Shipments
- `GET /api/shipments` - List shipments with filtering
- `GET /api/shipments/:shipmentId` - Get shipment details
- `POST /api/shipments` - Create new shipment (with atomic validation)
- `PATCH /api/shipments/:shipmentId/status` - Update shipment status

## Data Models

### Contract Schema
```javascript
{
  contractId: String,        // Unique contract identifier
  deviceCount: Number,       // Total devices under contract
  batteriesShipped: Number,  // Current batteries shipped
  threshold: Number,         // Maximum allowed shipments
  isLocked: Boolean,         // Auto-lock when threshold exceeded
  lastUpdated: Date,
  notificationsSent: [...]   // Email notification history
}
```

### Shipment Schema
```javascript
{
  shipmentId: String,        // Auto-generated shipment ID
  contractId: String,        // Reference to contract
  batteriesShipped: Number,  // Quantity in this shipment
  status: String,            // APPROVED | BLOCKED | PENDING
  timestamp: Date,
  initiatedBy: String,       // User who initiated
  blockReason: String        // Reason if blocked
}
```

## Business Logic

### Atomic Shipment Validation
1. Acquire Redis lock for contract
2. Start MongoDB transaction
3. Check contract threshold
4. Update contract atomically if valid
5. Create shipment record
6. Send notifications if blocked
7. Commit transaction and release lock

### Real-time Features
- Live shipment status updates
- Contract threshold alerts
- Admin lock/unlock notifications
- System health monitoring

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Services**
   ```bash
   # Start MongoDB (local)
   mongod
   
   # Start Redis (local)
   redis-server
   
   # Start backend server
   npm run server:dev
   
   # Or start full stack
   npm run dev:full
   ```

## Environment Variables

See `.env.example` for all required environment variables including:
- Database connections (MongoDB, Redis)
- JWT secrets
- Email service configuration
- AWS credentials for production

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Account lockout after failed attempts
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS protection

## Production Deployment

The backend is designed to be deployed on cloud platforms with:
- MongoDB Atlas for database
- Redis Cloud for caching
- AWS SES for email delivery
- Environment-based configuration
- Health check endpoints
- Graceful shutdown handling
