# PBR Battery Shipment Backend

## 🎯 Overview

Complete Node.js backend for the PBR Battery Shipment Monitoring & Control System with atomic shipment validation, real-time monitoring, and automated blocking capabilities.

## ✨ Key Features

### 🔒 **Atomic Shipment Validation**
- MongoDB transactions for data consistency
- Redis distributed locking to prevent race conditions
- Atomic `findOneAndUpdate` operations for contract updates
- Handles concurrent shipment requests safely

### ⚡ **Real-time Updates**
- Socket.IO WebSocket integration
- Live dashboard updates for shipments and contracts
- Role-based room management
- Real-time threshold alerts

### 🔐 **Security & Authentication**
- JWT-based authentication with refresh tokens
- Role-based access control (user/manager/admin)
- Password hashing with bcrypt
- Account lockout after failed attempts
- Input validation and sanitization

### 📧 **Email Notification System**
- Automated alerts when thresholds are exceeded
- Nodemailer integration with AWS SES support
- HTML and text email templates
- Bulk notification capabilities

## 🏗️ Architecture

```
server/
├── index.js              # Express server with Socket.IO
├── models/               # MongoDB schemas
│   ├── Contract.js       # PBR contract management
│   ├── User.js          # User authentication
│   └── Shipment.js      # Shipment logging
├── routes/              # RESTful API endpoints
│   ├── auth.js          # Authentication routes
│   ├── contracts.js     # Contract CRUD operations
│   └── shipments.js     # Shipment processing
├── middleware/          # Express middleware
│   └── auth.js          # JWT authentication
├── services/            # Business logic
│   ├── emailService.js  # Email notifications
│   └── lockService.js   # Redis locking
└── socket/              # WebSocket handlers
    └── handlers.js      # Real-time events
```

## 🔄 Business Logic Flow

### Shipment Processing
1. **Lock Acquisition**: Redis lock prevents concurrent processing
2. **Transaction Start**: MongoDB transaction ensures atomicity
3. **Validation**: Check contract status and threshold
4. **Update**: Atomic contract update or blocking
5. **Logging**: Create shipment record with status
6. **Notification**: Send email alerts if blocked
7. **Real-time**: Broadcast updates via WebSocket
8. **Cleanup**: Release lock and commit/rollback transaction

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Contracts
- `GET /api/contracts` - List contracts (with filtering)
- `GET /api/contracts/:id` - Get contract details
- `POST /api/contracts` - Create contract (Manager+)
- `PATCH /api/contracts/:id/lock` - Lock/unlock (Admin only)

### Shipments
- `GET /api/shipments` - List shipments (with filtering)
- `POST /api/shipments` - Process new shipment
- `GET /api/shipments/stats/summary` - Get statistics

## 🛡️ Security Features

- **JWT Authentication**: Secure token-based auth
- **Role-based Authorization**: Granular permissions
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Express-validator integration
- **CORS Protection**: Configurable origins
- **Helmet**: Security headers
- **Password Security**: Bcrypt hashing

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Start Services**
   ```bash
   # Start MongoDB and Redis locally
   mongod
   redis-server
   
   # Start backend server
   npm run dev
   ```

## 🧪 Testing Requirements Met

✅ **Race Condition Handling**: Redis locks + MongoDB transactions  
✅ **Real-time Updates**: Socket.IO WebSocket integration  
✅ **Atomic DB Operations**: MongoDB findOneAndUpdate with conditions  
✅ **Security**: JWT + role-based access control  
✅ **Email Alerts**: Nodemailer with AWS SES support  

## 🔄 Next Steps

This backend is ready for:
1. Frontend integration with Redux Toolkit + RTK Query
2. WebSocket connection for real-time updates
3. Production deployment on cloud platforms
4. Load testing with concurrent requests
5. CI/CD pipeline setup

---

**Production Ready** 🎉

This implementation provides a bulletproof foundation for the PBR Battery Shipment system with all the challenging requirements addressed: atomic operations, race condition prevention, real-time updates, and automated blocking.
