# Fullstack Setup

## 1. Frontend Env
Copy `.env.example` to `.env` and edit:
```
VITE_API_BASE_URL=http://localhost:4000/api
VITE_FYERS_CLIENT_ID=YOUR_ID
VITE_FYERS_REDIRECT_URI=http://localhost:5173
```

## 2. Backend Env (`server/.env`)
```
FYERS_CLIENT_ID=
FYERS_CLIENT_SECRET=
FYERS_REDIRECT_URI=http://localhost:4000/auth/callback
PORT=4000
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
Backend: http://localhost:4000

## 5. Build (future)
Add backend build and deployment steps as needed.
