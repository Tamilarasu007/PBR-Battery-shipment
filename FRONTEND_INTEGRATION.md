# Frontend-Backend Integration

## 🎯 Overview

This document outlines the complete frontend integration with the PBR Battery Shipment backend system, implementing Redux Toolkit, RTK Query, and real-time WebSocket connections.

## ✨ Features Implemented

### 🏪 **State Management (Redux Toolkit)**
- **Centralized Store**: Complete Redux store with multiple slices
- **RTK Query**: Efficient API state management with caching
- **Real-time Updates**: WebSocket integration with Redux actions
- **Persistent Auth**: Token management with localStorage
- **UI State**: Theme, modals, notifications, and alerts

### 🔌 **API Integration (RTK Query)**
- **Authentication API**: Login, register, profile management
- **Contracts API**: CRUD operations with filtering and pagination
- **Shipments API**: Atomic shipment creation with real-time updates
- **Automatic Caching**: Intelligent cache invalidation and updates
- **Error Handling**: Comprehensive error states and retry logic

### ⚡ **Real-time Features (WebSocket)**
- **Live Updates**: Instant contract and shipment updates
- **Threshold Alerts**: Real-time notifications when limits exceeded
- **Connection Management**: Auto-reconnection with exponential backoff
- **Room Management**: Contract-specific and role-based rooms
- **Event Broadcasting**: System-wide notifications and alerts

### 🔐 **Authentication & Security**
- **JWT Integration**: Secure token-based authentication
- **Auto-refresh**: Automatic token refresh on expiration
- **Route Protection**: AuthGuard component for protected routes
- **Role-based UI**: Different interfaces for user/manager/admin
- **Secure Storage**: Token persistence with localStorage

## 🏗️ Architecture

```
src/
├── store/                    # Redux store configuration
│   ├── index.js             # Store setup with middleware
│   ├── api/                 # RTK Query API slices
│   │   ├── apiSlice.js      # Base API configuration
│   │   ├── authApi.js       # Authentication endpoints
│   │   ├── contractsApi.js  # Contract management
│   │   └── shipmentsApi.js  # Shipment processing
│   └── slices/              # Redux slices
│       ├── authSlice.js     # Authentication state
│       ├── contractsSlice.js # Contract management
│       ├── shipmentsSlice.js # Shipment tracking
│       └── uiSlice.js       # UI state management
├── services/                # External services
│   └── socketService.js     # WebSocket management
├── components/              # React components
│   └── AuthGuard.jsx        # Authentication wrapper
└── App.tsx                  # Main application with providers
```

## 🔄 Data Flow

### Authentication Flow
1. **Login/Register** → RTK Query mutation
2. **Token Storage** → Redux state + localStorage
3. **WebSocket Connect** → Authenticated connection
4. **Route Protection** → AuthGuard validation

### Real-time Updates Flow
1. **Backend Event** → WebSocket emission
2. **Frontend Listener** → Socket service handler
3. **Redux Action** → State update
4. **UI Update** → Component re-render
5. **Notification** → User alert/toast

### API Request Flow
1. **Component Action** → RTK Query hook
2. **Token Injection** → Automatic auth headers
3. **Cache Check** → Return cached data if valid
4. **API Request** → Backend endpoint
5. **State Update** → Redux store + component

## 📋 API Endpoints Integration

### Authentication
```javascript
// Login
const [login] = useLoginMutation();
await login({ identifier: 'admin', password: 'admin123' });

// Register
const [register] = useRegisterMutation();
await register({ username, email, password });

// Profile
const { data: profile } = useGetProfileQuery();
```

### Contracts
```javascript
// List contracts with filtering
const { data: contracts } = useGetContractsQuery({
  page: 1,
  limit: 10,
  status: 'ACTIVE',
  search: 'PBR-2024'
});

// Create contract
const [createContract] = useCreateContractMutation();
await createContract({
  contractId: 'PBR-2024-001',
  deviceCount: 100,
  threshold: 120
});

// Toggle lock (Admin only)
const [toggleLock] = useToggleContractLockMutation();
await toggleLock({ contractId, isLocked: true, reason: 'Manual review' });
```

### Shipments
```javascript
// Create shipment (Atomic operation)
const [createShipment] = useCreateShipmentMutation();
await createShipment({
  contractId: 'PBR-2024-001',
  batteriesShipped: 10,
  notes: 'Regular shipment'
});

// Get shipment statistics
const { data: stats } = useGetShipmentStatsQuery({ days: 30 });
```

## 🔌 WebSocket Events

### Contract Events
- `contract:created` - New contract added
- `contract:updated` - Contract modified
- `contract:lock_changed` - Lock status changed
- `contract:deleted` - Contract removed

### Shipment Events
- `shipment:created` - New shipment processed
- `shipment:status_changed` - Status updated
- `shipment:processing` - Real-time processing feedback
- `contract:threshold_exceeded` - Limit reached

### System Events
- `system:notification` - System-wide alerts
- `admin:action_performed` - Admin actions broadcast

## 🎨 UI State Management

### Theme & Layout
```javascript
const theme = useSelector(selectTheme);
const sidebarOpen = useSelector(selectSidebarOpen);

dispatch(toggleTheme());
dispatch(setSidebarOpen(false));
```

### Notifications & Alerts
```javascript
// Add notification
dispatch(addNotification({
  type: 'success',
  title: 'Shipment Created',
  message: 'Shipment SHP-001 has been approved'
}));

// Add alert
dispatch(addAlert({
  type: 'error',
  title: 'Threshold Exceeded',
  message: 'Contract PBR-2024-001 has reached its limit',
  autoClose: false
}));
```

### Modal Management
```javascript
const modals = useSelector(selectModals);

dispatch(openModal('createContract'));
dispatch(closeModal('createContract'));
```

## 🚀 Getting Started

### 1. Environment Setup
```bash
# Copy environment template
cp .env.local.example .env.local

# Configure API endpoints
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

### 2. Install Dependencies
```bash
npm install @reduxjs/toolkit react-redux socket.io-client
```

### 3. Start Development
```bash
# Start backend server
npm run server:dev

# Start frontend (in another terminal)
npm run dev

# Or start both together
npm run dev:full
```

### 4. Test Authentication
- Navigate to `http://localhost:5173`
- Use demo credentials: `admin` / `admin123`
- Verify WebSocket connection in browser console

## 🧪 Testing Integration

### API Health Check
```javascript
const { data: health } = useGetHealthQuery();
console.log('Backend status:', health?.status);
```

### WebSocket Connection
```javascript
import socketService from './services/socketService';

console.log('Connected:', socketService.connected);
console.log('Socket ID:', socketService.id);
```

### Redux DevTools
- Install Redux DevTools browser extension
- Monitor state changes and actions
- Time-travel debugging available

## 🔧 Configuration

### Redux Store
- **Middleware**: RTK Query + custom middleware
- **DevTools**: Enabled in development
- **Persistence**: Auth state in localStorage

### WebSocket Service
- **Auto-reconnect**: 5 attempts with exponential backoff
- **Room Management**: Automatic contract/role rooms
- **Error Handling**: Comprehensive error states

### API Configuration
- **Base URL**: Environment-based configuration
- **Auth Headers**: Automatic token injection
- **Retry Logic**: Built-in retry for failed requests

## 🎯 Next Steps

This integration provides:
✅ **Complete State Management** with Redux Toolkit  
✅ **Real-time Updates** via WebSocket  
✅ **Secure Authentication** with JWT  
✅ **Efficient API Calls** with RTK Query  
✅ **Production-ready Architecture**  

Ready for full PBR Battery Shipment System deployment! 🚀
