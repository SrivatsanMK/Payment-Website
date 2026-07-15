import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/db';

// Import Middlewares
import { errorHandler, notFound } from './middleware/errorMiddleware';

// Import Routes
import authRoutes from './routes/authRoutes';
import customerRoutes from './routes/customerRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import paymentRoutes from './routes/paymentRoutes';
import reportRoutes from './routes/reportRoutes';
import settingRoutes from './routes/settingRoutes';
import notificationRoutes from './routes/notificationRoutes';
import expenseRoutes from './routes/expenseRoutes';

// Load Env variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // allows serving static local images to external react app
}));

// CORS Configuration
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};
app.use(cors(corsOptions));

// Create HTTP server & configure Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});
app.set('io', io);

// Handle Socket connections
io.on('connection', (socket) => {
  console.log('New client connected via Socket.io:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serving file uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// General API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 100000, // high limit in development/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Stricter Rate Limiting for Auth login/verification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 100000, // high limit in development/testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.'
  }
});

// Apply rate limiter
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/expenses', expenseRoutes);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Dealer Payment Management API is active' });
});

// Catch 404 Route
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
