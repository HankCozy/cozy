# Cozy

A simple React Native authentication app for iOS and Android with secure backend.

## Features
- User login and registration
- Community-based authentication
- Invitation-only registration
- Secure password hashing (bcrypt)
- JWT token authentication
- Role-based access (Member/Manager)

## Quick Start

### 1. Setup Backend

```bash
cd backend
npm install
npm run db:migrate    # Create database
npm run db:seed       # Add test data
npm run dev           # Start backend (port 3001)
```

### 2. Setup Mobile App

In a new terminal:

```bash
npm install
npm start
```

Then choose your platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator

### 3. Test Login

Use these credentials in the app:
- Email: `test@example.com`
- Password: `testpassword123`

Or register with invitation code: `ALPHA2025`

## Tech Stack

### Frontend
- React Native (Expo)
- TypeScript
- React Navigation
- AsyncStorage

### Backend
- Node.js + Express
- Prisma ORM
- Supabase PostgreSQL (cloud database)
- bcrypt + JWT
- TypeScript

## Project Structure

```
Cozy/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── routes/   # API endpoints
│   │   ├── index.ts  # Express app
│   │   └── seed.ts   # Test data
│   └── prisma/       # Database schema
├── src/
│   ├── screens/      # App screens
│   ├── contexts/     # Auth context
│   └── navigation/   # Navigation config
└── App.tsx
```

## Documentation

See `CLAUDE.md` for detailed development guide and `backend/README.md` for API documentation.
