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
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
  }));
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
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Routes - import after environment is loaded
  const authModule = await import('./routes/auth.js');
  const dataModule = await import('./routes/data.js');
  fyersAuthRouter = authModule.fyersAuthRouter;
  fyersDataRouter = dataModule.fyersDataRouter;

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

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Frontend URL: ${process.env.FRONTEND_URL}`);
  });
}

// Start the server
startServer().catch(console.error);