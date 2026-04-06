# Cozy Circle

A React Native app for iOS and Android that builds real-world connections inside closed communities.

## Project Overview

**Cozy Circle** helps communities foster engagement and satisfaction by identifying shared interests and connecting people across otherwise siloed groups. The experience is built around three pillars:

1. **AI Profile Generation** — Voice-record answers to a few questions; Claude turns them into a rich profile. As simple as ordering a pizza.
2. **Circles** — See all your shared interest groups (pickleball, baking, hiking, etc.) visualized as overlapping bubbles with community members.
3. **Matching** — A Tinder-like experience that surfaces cross-interest matches, designed to fight clique formation and promote cross-pollination across disparate groups.

The app operates in closed, invitation-only communities. Users belong to specific communities and profiles are shared only within them.

## Terminology

- **Circles** = interest/affinity groups (user-facing). Internal code still uses "community" for DB/API consistency.
- **"Your Circles"** = the Circles tab in bottom navigation (routes to `CommunityScreen`)
- **Profile** = AI-generated bio built from voice answers
- **Matches** = cross-interest or affinity-based pairings surfaced by the matching experience

## Profile Completion & Eligibility

**A "complete profile" is defined as: answering 4 or more questions.** No AI bio generation, no publish step, no sharing toggle required.

- The 4-answer gate unlocks the app experience for the current user (they can see Circles and Kindred tabs).
- A user is **eligible** (appears in other users' circles and matching) only when they have a complete profile (`profilePublished: true` in DB, which is set after AI bio generation — this is the backend proxy for "complete").
- **Minimum eligible user count for circles/matching: 5.** Below this threshold, circles and Kindred matches are not displayed. A "community is still growing" message is shown instead.
- Future: low-community-size notifications to help set expectations and encourage invitations.

## Design System

### Color Palette

**Only use these colors unless explicitly directed otherwise. On net new content, always pull from this palette. Do not rework existing colors unless given specific direction.**

| Name | Hex | Usage |
|---|---|---|
| Pink | `#FFA0A6` | Tags, accents, nudge banners |
| Orange | `#FE6627` | Tags, accents, invalid/error states |
| Green | `#00934E` | Primary brand color — profile names, labels, quote cards, buttons |
| Blue | `#0277BB` | Buttons, icebreaker cards, Circles screen bubbles |
| Yellow | `#FAC63D` | Tags, accents |
| Warm White | `#FFF7E6` | Screen backgrounds, input backgrounds |
| Black | `#545454` | Primary body text, icons |
| White | `#FFFFFF` | Card backgrounds |
| Inactive Gray | `#BE9B51` | Disabled states, inactive toggles, placeholder text |
| Darker Warm White | `#E7E0D3` | Secondary backgrounds, tag fills, input borders |

### Tag Color Priority
For interest/affinity tags, use in this order: Green → Pink → Yellow → Orange → Darker Warm White. Blue is reserved for buttons and Circles screen elements.

### Typography

**Primary font: Futura** — used for all headings, labels, buttons, and body text.

| Role | Size | Weight | Color |
|---|---|---|---|
| Screen title | 28px | bold (700) | `#00934E` |
| Section label / input label | 15px | 600 | `#545454` |
| Body / subtitle | 16px | 400 | `#545454` |
| Button text | 16–17px | 700 | `#FFFFFF` |
| Footer / link text | 14px | 600 | `#00934E` |
| Requirement / hint text | 12px | 400 | `#BE9B51` |

- Always set `fontFamily: 'Futura'` explicitly — do not rely on system default
- Valid states use `#00934E`; invalid/error states use `#FE6627`

### Component Patterns

**Inputs**
- Border: 1px `#E7E0D3`, border radius: 20
- Background: `#FFF7E6`, text color: `#545454`
- Placeholder text color: `#BE9B51`
- Padding: 14px

**Buttons (primary)**
- Background: `#00934E`, border radius: 20, padding: 16px vertical
- Text: `#FFFFFF`, 16–17px, weight 700, Futura
- Disabled: `opacity: 0.6`

**Cards**
- Background: `#FFFFFF`, border radius: 20, padding: 24px
- No drop shadow — flat style, no `shadowColor`/`elevation`

**Screen containers**
- Background: `#FFF7E6`
- Horizontal padding: 24px

**Validation / feedback messages**
- Background: `#E7E0D3`, border radius: 10
- Valid text: `#00934E` / Invalid text: `#FE6627`

### Icon Library

**All icons use Feather Icons** from `@expo/vector-icons` for consistency:
- Import: `import { Feather } from '@expo/vector-icons';`
- Usage: `<Feather name="icon-name" size={24} color="#00934E" />`
- **Do NOT mix icon libraries** — always use Feather for all icons in the app

**Common Icons Used:**
- `user` - Profile/person icon
- `radio` - Concentric circles (used for Circles/Community tab)
- `chevron-right` / `chevron-left` - Navigation arrows
- `check-circle` - Success/completion indicator
- `lock` - Locked/restricted content
- `heart` - Relationships section
- `coffee` - Lifestyle section
- `users` - Community section

## Core Philosophy

**⚠️ CRITICAL: Small, Bite-Size Pieces - NO EXCEPTIONS**

This is the #1 rule. When building features:
- ✅ **DO**: Implement ONE screen at a time
- ✅ **DO**: Make ONE change per task
- ✅ **DO**: Ask clarifying questions before building
- ❌ **DON'T**: Plan massive multi-phase implementations
- ❌ **DON'T**: Build multiple screens/features at once
- ❌ **DON'T**: Anticipate future needs or add "nice to have" features
- ❌ **DON'T**: Create elaborate plans with phases and scopes

**Example of CORRECT approach:**
- User: "Add a home screen"
- Assistant: Builds ONE home screen, nothing else

**Example of WRONG approach:**
- User: "Add a home screen"
- Assistant: Plans home screen + navigation system + 5 other screens + backend changes + database migrations
- ❌ This is irresponsible and dangerous

**⚠️ CRITICAL: NEVER Create Unrequested Visual Assets**

**ABSOLUTE RULE:** Do NOT create graphics, SVGs, illustrations, or visual components unless EXPLICITLY requested:
- ❌ **NEVER** generate custom SVG graphics, illustrations, or animated components
- ❌ **NEVER** create visual assets when an image would suffice
- ❌ **NEVER** assume you should build a graphic when the user hasn't asked for one
- ✅ **ALWAYS** ask for the actual image file if visual content is needed
- ✅ **ALWAYS** use provided assets exactly as given
- ✅ **IF** you absolutely must create something visual, ASK FIRST

**Example of CORRECT approach:**
- User: "Add a graphic to the onboarding screen"
- Assistant: "Could you provide the image file for the onboarding graphic?"

**Example of WRONG approach:**
- User: "Add a graphic to the onboarding screen"
- Assistant: Creates 140 lines of custom SVG code with animations
- ❌ This wastes time, money, and creates unwanted code

**Efficient & Simple**: Built with minimal dependencies and maximum functionality. No bloatware or unnecessary complexity.

**Closed Community Networks**: Each community operates as an isolated, private network. Users belong to specific communities with invitation-based registration.

## Visual Architecture Diagrams

📊 **Detailed technical diagrams and schematics are available:**
- **[Architecture Documentation](docs/architecture.md)** - Detailed tech stack, data flows, and component diagrams
- **[System Schematic](docs/system-schematic.md)** - Simple visual overview of all systems and providers

These diagrams show how the mobile app, backend API, and external services (Supabase, AssemblyAI, Claude AI) work together.

## Architecture

### Technology Stack

**Frontend:**
- **React Native**: Expo framework for iOS and Android development
- **Expo SDK**: Version 54.0.10 (with React 19.1.0 and React Native 0.81.4)
- **TypeScript**: Type-safe development with strict mode enabled
- **React Navigation**: Screen navigation and routing
- **AsyncStorage**: Local token storage for authentication
- **Development Build**: Native iOS/Android builds for optimal development experience

**Backend:**
- **Node.js + Express**: RESTful API server
- **Railway**: Cloud hosting platform with automatic deployments
- **Prisma ORM**: Type-safe database queries and migrations
- **Supabase PostgreSQL**: Cloud-hosted database with automatic backups
- **bcrypt**: Password hashing (12 salt rounds)
- **JWT**: Token-based authentication (7-day expiration)
- **TypeScript**: End-to-end type safety

**AI & External Services:**
- **AssemblyAI**: Audio transcription service (speech-to-text)
- **Claude AI (Haiku)**: Profile generation from Q&A transcripts
- **Supabase**: Cloud PostgreSQL database with built-in authentication

### Key Features
- **User Authentication** - Login and registration with email/password
- **Closed Community Networks** - Invitation-only access; users scoped to a single community
- **Role Management** - MEMBER and MANAGER roles
- **Secure Token Storage** - JWT tokens in SecureStore
- **Voice Profile Building** - Record audio answers; as simple as ordering a pizza
- **AI Transcription** - Automatic speech-to-text via AssemblyAI
- **AI Profile Generation** - Claude AI creates personalized third-person bios + icebreaker questions
- **Interest Tags** - AI-extracted keywords displayed as colored pills on the profile
- **Circles Visualization** - Overlapping bubble chart of shared interest groups with community members
- **Tinder-style Matching** - Cross-interest matches designed to fight clique formation and encourage cross-pollination
- **Profile Visibility Controls** - Per-section ENABLED/DISABLED toggles for Circles and contact info

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
- `src/screens/` - Application screens (Login, Register, Profile, Circles, Questions, Matching, etc.)
- `src/components/` - Reusable components (ProfileBadge, CircleBubbleChart, ProfileNudge, ResponseCard, etc.)
- `src/navigation/` - React Navigation configuration
- `src/contexts/` - Auth context and providers
- `src/services/` - API calls (api.ts)
- `src/utils/` - Helpers (imageCompression, resetOnboarding, profileStrength)

### Screen Inventory

**Auth / Onboarding**
- `SplashScreen` — Landing screen with logo, tagline, Login / Create Account CTAs
- `LoginScreen` — Email + password login
- `RegisterScreen` — Invitation code + account creation
- `NameScreen` — Capture first/last name post-registration
- `OnboardingScreen` — Intro flow shown after first login
- `QuestionFlowScreen` — Full-screen onboarding question flow (no tab bar)
- `AnswerQuestionScreen` — Individual voice/text answer recording
- `SectionQuestionsScreen` — Section-level question list

**Main App (tab bar)**
- `ProfileScreen` — Current user's profile — answers, AI bio, tags, publish controls
- `CommunityScreen` — "Your Circles" — bubble chart of interest groups + members
- `SpotlightScreen` — Kindred / matching — Tinder-style cross-interest match cards
- `SearchScreen` — Search members within a community

**Detail / Secondary**
- `MemberProfileScreen` — View another user's full profile
- `CircleDetailScreen` — Drill into a specific circle and its members
- `AccountScreen` — Account settings, logout

**Manager / Admin**
- `ManagerDashboardScreen` — Community manager tools
- `AdminDashboardScreen` — Super-admin overview
- `AdminCreateCommunityScreen` — Create a new community
- `AdminEditCommunityScreen` — Edit existing community settings

**Misc**
- `PrivacyPolicyScreen` — Privacy policy viewer

### Key Files
- `App.tsx` - Main app entry point
- `app.json` - Expo configuration
- `package.json` - Dependencies and scripts
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/navigation/AppNavigator.tsx` - Navigation flow

### Known Bugs / Tech Debt
- **AsyncStorage user isolation** (`src/contexts/AuthContext.tsx`): `logout()` clears SecureStore but does NOT clear AsyncStorage. Answer keys (`answer_*`, `profile_*`) persist across user sessions on the same device. Fix: filter and `multiRemove` those keys in both `logout()` and `login()`. Low urgency — only affects shared devices.

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

### Navigation Rules
- **No dead-ends** — every screen must have a way out: bottom tab bar, back button, or explicit close action
- **Prefer tab navigation** — use `navigation.navigate('Questions')` (tab switch) over `navigation.navigate('QuestionFlowStack')` (rootstack modal) unless the flow explicitly requires a full-screen takeover with no tab bar
- **`QuestionFlowStack` is for onboarding only** — do not send users there from in-app nudges or contextual CTAs; it has no tab bar and no back button
- **CTA actions navigate to tabs**, not standalone stacks

### State Management
- React Context for authentication state
- AsyncStorage for persistent token storage
- Local component state for UI interactions

## Security Features

### Authentication Security
- **Password Hashing**: bcrypt with 12 salt rounds (industry standard)
- **JWT Tokens**: 7-day expiration, signed with secret key
- **Minimum Password Length**: 12 characters enforced
- **Email Validation**: Regex-based format checking
- **Secure Storage**: JWT tokens stored in AsyncStorage on device

### Database Security
- **Supabase PostgreSQL**: Cloud-hosted with encryption at rest
- **Connection Pooling**: Session pooler for secure, scalable connections
- **Environment Variables**: Credentials never committed to git
- **Prepared Statements**: SQL injection protection via Prisma ORM
- **Database Transactions**: Atomic operations for data integrity

### Access Control
- **Invitation-Only Registration**: Prevents unauthorized signups
- **Community Isolation**: Users scoped to specific communities
- **Role-Based Access**: MEMBER and MANAGER roles
- **Invitation Code Tracking**: Usage limits and expiration dates

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

The project includes a production-ready Node.js backend with Prisma ORM and Supabase PostgreSQL for cloud database storage.

### Architecture Overview

```
Mobile App (React Native)
    ↓
Express API Server (Railway - Production)
    ↓
Prisma ORM (type-safe queries)
    ↓
Supabase PostgreSQL (cloud database)
```

**Production Deployment:**
- **Backend URL**: Deployed on Railway (cloud hosting)
- **Database**: Supabase PostgreSQL (cloud-hosted)
- **Mobile App**: Connects to Railway backend via API_URL in app configuration

### Railway Deployment

The backend is deployed and running on Railway:
- Automatic deployments from main branch
- Environment variables configured in Railway dashboard
- Health check available at `/health` endpoint
- No local backend server needed for mobile app testing

**Test Credentials (works with Railway deployment):**
- Email: `test@example.com`
- Password: `testpassword123`

### Local Development Setup (Optional)

If you want to run the backend locally for development:

**1. Create Supabase Project**
- Go to https://supabase.com and create a new project
- Wait 2-3 minutes for provisioning
- Go to Settings → Database → Connection string
- Copy the **Session pooler** connection string (IPv4, port 5432)

**2. Install Backend Dependencies**
```bash
cd backend
npm install
```

**3. Configure Environment**
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your Supabase connection strings:
# - DATABASE_URL (Session pooler for runtime)
# - DIRECT_URL (Direct connection for migrations)
# - Generate JWT secret: openssl rand -base64 32
```

**4. Initialize Database**
```bash
npm run db:migrate    # Create tables in Supabase
npm run db:seed       # Add test data
```

**5. Start Backend Server**
```bash
npm run dev           # Runs at http://localhost:3001
```

### Verify Local Setup

Test the local API endpoints:
```bash
# Health check
curl http://localhost:3001/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword123"}'
```

Local backend runs at `http://localhost:3001`

**Invitation Codes (available in Railway deployment):**
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

### Database Schema

The backend uses three main tables:

**Community**
- `id` (UUID) - Primary key
- `name` - Community name
- `description` - Optional description
- `createdAt`, `updatedAt` - Timestamps

**User**
- `id` (UUID) - Primary key
- `email` (unique) - User email address
- `passwordHash` - bcrypt hashed password
- `firstName`, `lastName` - Optional user names
- `role` - MEMBER or MANAGER
- `communityId` - Foreign key to Community
- `createdAt`, `updatedAt` - Timestamps

**Invitation**
- `id` (UUID) - Primary key
- `code` (unique) - Invitation code (e.g., ALPHA2025)
- `communityId` - Foreign key to Community
- `role` - MEMBER or MANAGER (assigned to new users)
- `maxUses` - Maximum number of times code can be used
- `usedCount` - Current usage count
- `expiresAt` - Optional expiration date
- `active` - Boolean flag to enable/disable
- `createdAt`, `updatedAt` - Timestamps

### API Endpoints

**Authentication**
- `POST /api/auth/login` - User login with email/password
- `POST /api/auth/register` - Register new user with invitation code
- `POST /api/invitations/validate` - Validate invitation code before registration

**Health Check**
- `GET /health` - Server health status

See `backend/README.md` for detailed API documentation with request/response examples.

### View Database Data

**Supabase Dashboard** (Recommended)
1. Go to your Supabase project
2. Click **Table Editor** in sidebar
3. View and edit Communities, Users, and Invitations

**Prisma Studio** (Local GUI)
```bash
cd backend
npm run db:studio
# Opens at http://localhost:5555
```

## Deployment

- **Mobile App**: Expo EAS Build for iOS and Android (production APK/IPA builds)
- **Backend**: Deployed on Railway with automatic deployments from main branch
- **Database**: Supabase PostgreSQL with automatic backups and scaling
- **API**: Railway backend connected to Supabase database
- **Environment**: Production environment configured via Railway dashboard

---

*This project provides simple, secure authentication for closed community networks on mobile devices.*