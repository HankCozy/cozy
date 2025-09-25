# Cozy - Community Profile Builder

A comprehensive platform for building rich community profiles through conversational interactions and visual questionnaires.

## Project Overview

**Cozy** consists of multiple interconnected applications for community profile creation:
- **Next.js Web App** (`community-profile-builder/`) - Main web interface with dashboard, gallery, and admin features
- **React Native Mobile App** (`CommunityProfileMobile/`) - Mobile companion app for profile creation
- **Shared Database** - SQLite with Drizzle ORM for profile data, responses, and sessions

## Core Philosophy

**Efficient & Simple**: Built with minimal dependencies and maximum functionality. No bloatware or unnecessary complexity.

**Small, Bite-Size Pieces**: Build incrementally in focused chunks. Only implement what's explicitly outlined - no feature creep or preemptive additions.

**Closed Community Networks**: Each community operates as an isolated, private network. Profiles are shared only within their specific closed community - never globally or across communities.

**Local-First**: Designed for intimate community spaces where members know each other and want deeper connections within their trusted circle.

## Architecture

### Core Applications
- **Web App**: Next.js 15 with App Router, Tailwind CSS, TypeScript
- **Mobile App**: Expo React Native with navigation and authentication
- **Database**: SQLite + Drizzle ORM + Prisma (hybrid approach)
- **AI Services**: OpenAI + Anthropic Claude for conversational flows
- **Authentication**: NextAuth.js + secure storage

### Key Features
- **Conversational Profile Building** - AI-powered interviews with voice recording
- **Visual Questionnaires** - Image-based questions with multiple choice options
- **Private Community Gallery** - Showcase profiles within closed community networks only
- **Session Management** - Track progress through multi-step profile creation
- **Audio Transcription** - Voice responses converted to text
- **Profile Summarization** - AI-generated summaries from conversation data
- **Community Isolation** - Each community operates independently with zero cross-pollination

## Database Schema

### Core Tables
- **profiles** - User profiles with completion status and AI-generated summaries
- **profileResponses** - Individual Q&A pairs with sentiment analysis
- **profileSessions** - Track progress through profile building process
- **visualQuestions** - Image-based questions with options and categorization

### Key Relationships
```
Profile (1) -> (N) ProfileResponses
Profile (1) -> (N) ProfileSessions
VisualQuestion -> ProfileResponses (via question field)
```

## Important Commands

### Web App (community-profile-builder/)
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Production build with Turbopack
npm run lint         # ESLint validation
npm run db:seed      # Seed database with sample data
```

### Mobile App (CommunityProfileMobile/)
```bash
npm start            # Start Expo development server
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
npm run lint         # ESLint validation
npm run lint:fix     # Auto-fix ESLint issues
```

## Key Directories

### Web App Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable UI components
- `src/db/` - Database schema and connection setup
- `src/services/` - External service integrations (OpenAI, Claude, transcription)
- `src/contexts/` - React contexts for auth and session management
- `src/lib/` - Utility functions and configurations

### Mobile App Structure
- `src/screens/` - Main application screens (Welcome, Login, Register, Home)
- `src/navigation/` - React Navigation configuration
- `src/contexts/` - Auth context and providers

## Development Patterns

### Code Conventions
- **TypeScript** everywhere with strict typing
- **Functional components** with hooks
- **Tailwind CSS** for styling (web app)
- **Drizzle ORM** for type-safe database operations
- **Route handlers** for API endpoints (Next.js App Router)
- **Minimal Dependencies** - Only essential packages, no feature bloat
- **Efficient Architecture** - Simple, direct patterns over complex abstractions

### Authentication Flow
- NextAuth.js for web authentication
- Secure storage for mobile token management
- JWT tokens for session management
- Protected routes with middleware
- **Community-Scoped Auth** - Users belong to specific communities, no cross-community access

### State Management
- React Context for global state (auth, sessions)
- Zustand available but not actively used
- Local state with useState/useReducer for components

## AI Integration

### Services Used
- **OpenAI**: Conversation generation, transcription, profile analysis
- **Claude (Anthropic)**: Alternative conversation flows, content generation
- **Custom Services**: Profile summarization, sentiment analysis, topic extraction

### Key AI Flows
1. **Conversation Generation** - Dynamic questions based on previous responses
2. **Voice Transcription** - Convert audio responses to text
3. **Profile Summarization** - Generate comprehensive profile summaries
4. **Sentiment Analysis** - Analyze emotional tone of responses

## Database Operations

### Common Queries
- Profile creation with session tracking
- Response aggregation for profile summaries
- Visual question randomization and ordering
- Session progress tracking and completion

### Migration Strategy
- Drizzle migrations for schema changes
- Seed scripts for test data
- Prisma integration for advanced queries

## Security Considerations

- **Environment Variables** for API keys and secrets
- **JWT Tokens** for stateless authentication
- **Input Validation** on all API endpoints
- **CORS Configuration** for cross-origin requests
- **Secure Storage** for sensitive mobile data

## Deployment Notes

- **Web App**: Vercel/Netlify deployment ready
- **Mobile App**: Expo managed workflow for easy deployment
- **Database**: SQLite for local development, easily migrated to hosted solutions
- **Environment**: Separate configs for dev/staging/production

## Recent Development Focus

- Enhanced conversation flows with better AI integration
- Visual question system with image support
- Mobile app development for broader accessibility
- Profile gallery and community features
- Session management and progress tracking

---

*This project emphasizes creating rich, authentic community profiles through natural conversation and thoughtful AI integration.*