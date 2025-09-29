# Cozy - Community Authentication App

A simple React Native app for iOS and Android providing basic community authentication functionality.

## Project Overview

**Cozy** is a React Native mobile application that provides basic login and authentication for community-based user management.

## Core Philosophy

**Efficient & Simple**: Built with minimal dependencies and maximum functionality. No bloatware or unnecessary complexity.

**Small, Bite-Size Pieces**: Build incrementally in focused chunks. Only implement what's explicitly outlined - no feature creep or preemptive additions.

**Closed Community Networks**: Each community operates as an isolated, private network. Users belong to specific communities with invitation-based registration.

## Architecture

### Technology Stack
- **React Native**: Expo framework for iOS and Android development
- **Expo SDK**: Version 54.0.10 (with React 19.1.0 and React Native 0.81.4)
- **TypeScript**: Type-safe development with strict mode enabled
- **React Navigation**: Screen navigation and routing
- **AsyncStorage**: Local token storage for authentication
- **Development Build**: Native iOS/Android builds for optimal development experience

### Key Features
- **User Authentication** - Login and registration with email/password
- **Community System** - Users belong to specific communities
- **Invitation-based Registration** - New users must have valid invitation codes
- **Role Management** - MEMBER and MANAGER user roles
- **Secure Token Storage** - JWT tokens stored securely on device

## Important Commands

```bash
# Development Server
npm start            # Start Expo development server
npm run ios          # Development build - iOS simulator (recommended)
npm run android      # Development build - Android emulator
npm run lint         # ESLint validation
npm run lint:fix     # Auto-fix ESLint issues

# Expo Go Alternative (for testing only)
npx expo start --ios   # Opens in Expo Go app (may have version conflicts)
npx expo start --web   # Web browser testing
```

## App Structure

### Core Directories
- `src/screens/` - Application screens (Login, Register, Success)
- `src/navigation/` - React Navigation configuration
- `src/contexts/` - Auth context and providers

### Key Files
- `App.tsx` - Main app entry point
- `app.json` - Expo configuration
- `package.json` - Dependencies and scripts
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/navigation/AppNavigator.tsx` - Navigation flow

## Development Patterns

### Code Conventions
- **TypeScript** everywhere with strict typing
- **Functional components** with React hooks
- **React Navigation** for screen management
- **Context API** for authentication state
- **Minimal Dependencies** - Only essential packages
- **Efficient Architecture** - Simple, direct patterns

### Authentication Flow
- Email/password login and registration
- JWT token-based authentication
- Invitation code validation for new users
- Community-scoped user accounts
- Role-based access (MEMBER/MANAGER)

### State Management
- React Context for authentication state
- AsyncStorage for persistent token storage
- Local component state for UI interactions

## Security Considerations

- **JWT Tokens** for stateless authentication
- **AsyncStorage** for secure token persistence
- **Input Validation** on all forms
- **Invitation System** prevents unauthorized registrations

## Development Environment

### Simulator Setup
- **Preferred Method**: Development builds using `npm run ios` or `npm run android`
- **Bundle Identifier**: `com.anonymous.CommunityProfileMobile`
- **Target Device**: iPhone 16 Plus simulator (or any iOS 13+ device)
- **Metro Bundler**: Serves at `http://localhost:8081`

### Development Build Advantages
- **No Version Conflicts**: Independent of Expo Go app versions
- **Native Performance**: Full access to native iOS/Android features
- **Debugging Tools**: Complete access to React Native debugging
- **Hot Reload**: Fast refresh and live reloading during development

### Troubleshooting Guide

#### Metro Bundler Issues
If Metro bundler hangs or fails to start:

```bash
# Complete reset procedure
# 1. Kill all processes
pkill -f "expo start" && pkill -f "Metro"

# 2. Clear all caches
rm -rf ~/.expo/native-modules-cache ~/.expo/template-cache ~/.expo/versions-cache
rm -rf .expo node_modules/.cache

# 3. Reset Watchman
watchman shutdown-server
watchman watch-project .

# 4. Fresh install
rm -rf node_modules
npm install --legacy-peer-deps

# 5. Start with clear cache
npm start
```

#### Common Issues
- **Cache Corruption**: After git repository changes, clear all caches
- **Watchman Recrawl**: Normal warnings, can be ignored or fixed with watchman reset
- **Version Mismatches**: Use `npx expo install --fix` to align dependencies
- **TypeScript Errors**: Ensure all imports and contexts are properly typed

### Version Compatibility
- **Expo SDK**: 54.0.10
- **React**: 19.1.0
- **React Native**: 0.81.4
- **Node.js**: 18+ recommended
- **iOS**: 13.0+ required for simulator
- **Android**: API 21+ (Android 5.0+)

## GitHub Workflow

### Automated PR Creation
The project uses GitHub CLI for streamlined development workflow:

```bash
# Standard development flow
git checkout -b feature/feature-name
# Make changes...
git add .
git commit -m "Feature description"
git push -u origin feature/feature-name
gh pr create --title "Feature Name" --body "Description"

# Quick PR merge
gh pr merge --merge  # or --squash or --rebase
```

### Branch Strategy
- **main**: Production-ready code
- **feature/**: New features and bug fixes
- All changes go through pull requests
- GitHub CLI handles automation

## Backend Setup

The project includes a Node.js backend with Prisma ORM and Supabase PostgreSQL for cloud database storage.

### First Time Setup

```bash
cd backend
npm install

# Configure .env with Supabase connection strings
# Get from: Supabase Dashboard → Settings → Database → Connection string (Session pooler)

npm run db:migrate    # Create database tables in Supabase
npm run db:seed       # Add test data
npm run dev           # Start backend server
```

Backend runs at `http://localhost:3001`

### Test Credentials

After seeding, use these for testing:

**Login:**
- Email: `test@example.com`
- Password: `testpassword123`

**Invitation Codes:**
- `ALPHA2025` - Member for Test Community Alpha
- `MANAGER01` - Manager for Test Community Alpha
- `BETA2025` - Member for Test Community Beta

### Backend Commands

```bash
npm run dev         # Start development server with hot reload
npm run db:migrate  # Run database migrations
npm run db:seed     # Seed database with test data
npm run db:studio   # Open Prisma Studio (database GUI)
```

### API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - New user registration
- `POST /api/invitations/validate` - Validate invitation code

See `backend/README.md` for detailed API documentation.

## Deployment

- **Mobile App**: Expo managed workflow for easy deployment to App Store and Google Play
- **Backend**: Node.js + Prisma + Supabase PostgreSQL (cloud-hosted)
- **Database**: Supabase PostgreSQL with automatic backups and scaling
- **Development Builds**: Native builds for testing and development
- **Environment**: Separate configs for development and production

---

*This project provides simple, secure authentication for closed community networks on mobile devices.*