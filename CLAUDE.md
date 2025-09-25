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
- **TypeScript**: Type-safe development
- **React Navigation**: Screen navigation and routing
- **AsyncStorage**: Local token storage for authentication

### Key Features
- **User Authentication** - Login and registration with email/password
- **Community System** - Users belong to specific communities
- **Invitation-based Registration** - New users must have valid invitation codes
- **Role Management** - MEMBER and MANAGER user roles
- **Secure Token Storage** - JWT tokens stored securely on device

## Important Commands

```bash
npm start            # Start Expo development server
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm run lint         # ESLint validation
npm run lint:fix     # Auto-fix ESLint issues
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

## Deployment

- **Mobile App**: Expo managed workflow for easy deployment to App Store and Google Play
- **Environment**: Separate configs for development and production

---

*This project provides simple, secure authentication for closed community networks on mobile devices.*