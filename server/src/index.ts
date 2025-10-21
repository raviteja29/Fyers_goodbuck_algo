import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST before any other imports
// The .env file is in the server root directory, not the src directory
// Updated to use port 3002
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

console.log('Environment check:', {
  cwd: process.cwd(),
  __dirname,
  envPath,
  FYERS_APP_ID: process.env.FYERS_APP_ID ? 'SET' : 'MISSING',
  FYERS_SECRET_KEY: process.env.FYERS_SECRET_KEY ? 'SET' : 'MISSING'
});

import express, { Request, Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

// Import routes after environment variables are loaded
let fyersAuthRouter: any;
let fyersDataRouter: any;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  const rawOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
  const fallbackOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
  const allowedSet = new Set<string>([fallbackOrigin, ...rawOrigins]);
  // Normalize: if one form of localhost is present, consider adding the other for transition
  const hasLocalhost = Array.from(allowedSet).some(o => o.includes('://localhost:'));
  const has127 = Array.from(allowedSet).some(o => o.includes('://127.0.0.1:'));
  if (hasLocalhost && !has127) {
    for (const o of Array.from(allowedSet)) {
      if (o.includes('://localhost:')) {
        allowedSet.add(o.replace('://localhost', '://127.0.0.1'));
      }
    }
  } else if (has127 && !hasLocalhost) {
    for (const o of Array.from(allowedSet)) {
      if (o.includes('://127.0.0.1:')) {
        allowedSet.add(o.replace('://127.0.0.1', '://localhost'));
      }
    }
  }
  const allowedOrigins = Array.from(allowedSet);
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser requests
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn('CORS blocked origin:', origin, 'Allowed:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
  }));
  console.log('CORS allowed origins:', allowedOrigins);
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  // Basic rate limiting (adjust per needs)
  const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 120, // 120 requests per minute
    standardHeaders: 'draft-7',
    legacyHeaders: false
  });
  app.use('/api/', limiter);
  app.use(express.json());
  app.use(cookieParser());

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // localhost over http; set true only behind HTTPS
      httpOnly: true,
      sameSite: 'lax',
      // domain removed: letting browser set host-only cookie avoids mismatch between localhost and 127.0.0.1
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Auth request diagnostic logger (after session so sessionID is available)
  app.use('/api/auth', (req, _res, next) => {
    const sid = (req as any).sessionID ? String((req as any).sessionID).substring(0, 8) : 'no-session';
    console.log('[AUTH-TRACE]', req.method, req.path, {
      sid,
      cookieHeader: req.headers.cookie,
      hasSessionAccessToken: !!(req as any).session?.accessToken
    });
    next();
  });

  // Routes - import after environment is loaded
  try {
    console.log('Loading auth routes...');
    const authModule = await import('./routes/auth.js');
    console.log('Loading data routes...');
    const dataModule = await import('./routes/data.js');
    fyersAuthRouter = authModule.fyersAuthRouter;
    fyersDataRouter = dataModule.fyersDataRouter;
    console.log('Routes loaded successfully');
  } catch (error) {
    console.error('Failed to load routes:', error);
    process.exit(1);
  }

  app.use('/api/auth', fyersAuthRouter);
  app.use('/api/data', fyersDataRouter);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });

  const portNum = Number(PORT);
  console.log(`About to bind to port ${portNum} on 0.0.0.0...`);
  
  const server = app.listen(portNum, (error?: Error) => {
    if (error) {
      console.error('Listen error:', error);
      return;
    }
    console.log(`🚀 Server running on http://localhost:${portNum}`);
    console.log(`🌐 Also accessible via http://127.0.0.1:${portNum}`);
    console.log(`📊 Frontend URL: ${process.env.FRONTEND_URL}`);
    
    // Test if we can actually reach ourselves
    setTimeout(() => {
      console.log('Testing server connectivity...');
      fetch(`http://localhost:${portNum}/health`)
        .then(r => console.log('Self-test SUCCESS:', r.status))
        .catch(e => console.log('Self-test FAILED:', e.message));
    }, 1000);
  });

  server.on('error', (error: any) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${portNum} is already in use`);
    }
  });

  server.on('listening', () => {
    console.log('Server listening event fired');
  });
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});