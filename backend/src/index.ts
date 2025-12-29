import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import invitationRoutes from './routes/invitations';
import transcribeRoutes from './routes/transcribe';
import profileRoutes from './routes/profile';
import usersRoutes from './routes/users';
import communityRoutes from './routes/community';
import adminRoutes from './routes/admin';
import managerRoutes from './routes/manager';

dotenv.config();

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// ===== PRODUCTION SECURITY =====

// HTTPS enforcement - redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request is already HTTPS (via reverse proxy headers)
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// ===== SECURITY MIDDLEWARE =====

// 1. Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Not needed for API-only server
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS - Restrict origins
const allowedOrigins = [
  'http://localhost:8081',   // Metro bundler
  'http://localhost:19000',  // Expo dev server
  'http://localhost:19006',  // Expo web
  // Add production URLs when deploying
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Body parser
app.use(express.json());

// 4. Rate limiting - General API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. Rate limiting - Strict for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes
  message: { error: 'Too many login attempts, please try again later' },
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Apply general rate limit to all API routes
app.use('/api/', apiLimiter);

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
// Apply strict rate limiting to auth endpoints BEFORE the route handler
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/manager', managerRoutes);

// Health check - pings database to keep Supabase active
app.get('/health', async (_req, res) => {
  try {
    // Ping database to prevent Supabase free tier from pausing
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});