# Fullstack Setup

## 1. Frontend Env
Copy `.env.example` to `.env` and edit:
```
VITE_API_URL=http://localhost:3001/api
VITE_FYERS_APP_ID=YOUR_APP_ID   # optional for UI display ONLY
VITE_FYERS_REDIRECT_URI=http://localhost:5173
```

## 2. Backend Env (`server/.env`)
```
# Core Fyers credentials (server side only)
FYERS_APP_ID=
FYERS_APP_SECRET=
FYERS_REDIRECT_URI=http://localhost:3001/api/auth/callback

# Server config
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
```

## 3. Install Dependencies
```
# root
npm install
# server
cd server
npm install
```

## 4. Development
From root after adding scripts:
```
npm run dev:all
```
Frontend: http://localhost:5173
Backend: http://localhost:3001

## 5. Build (future)
Add backend build and deployment steps as needed.
