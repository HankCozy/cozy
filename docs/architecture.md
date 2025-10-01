# Cozy - Architecture & Tech Stack

## System Overview

```mermaid
graph TB
    subgraph "Mobile App (React Native + Expo)"
        UI[User Interface]
        Storage[AsyncStorage]
        Navigation[React Navigation]
    end

    subgraph "Backend API (Node.js + Express)"
        API[REST API Endpoints]
        Auth[JWT Authentication]
        Prisma[Prisma ORM]
    end

    subgraph "External Services"
        Supabase[(Supabase PostgreSQL)]
        AssemblyAI[AssemblyAI API<br/>Audio Transcription]
        Claude[Claude AI API<br/>Profile Generation]
    end

    UI --> API
    Storage --> UI
    API --> Auth
    API --> Prisma
    Prisma --> Supabase
    API --> AssemblyAI
    API --> Claude

    style UI fill:#61dafb
    style API fill:#339933
    style Supabase fill:#3ecf8e
    style AssemblyAI fill:#ff6b6b
    style Claude fill:#cc785c
```

## Technology Stack

### Frontend (Mobile App)
```mermaid
graph LR
    subgraph "React Native Ecosystem"
        RN[React Native 0.81.4]
        Expo[Expo SDK 54.0.10]
        TS[TypeScript]
        Nav[React Navigation]
        AS[AsyncStorage]
    end

    RN --> Expo
    TS --> RN
    Nav --> RN
    AS --> RN

    style RN fill:#61dafb
    style Expo fill:#000020
    style TS fill:#3178c6
```

### Backend (API Server)
```mermaid
graph LR
    subgraph "Node.js Backend"
        Node[Node.js]
        Express[Express 5.1]
        PrismaORM[Prisma ORM]
        JWT[JWT Tokens]
        Bcrypt[bcrypt]
    end

    Node --> Express
    Express --> PrismaORM
    Express --> JWT
    Express --> Bcrypt

    style Node fill:#339933
    style Express fill:#000000
    style PrismaORM fill:#2d3748
```

### External Services
```mermaid
graph LR
    subgraph "Cloud Services"
        SB[(Supabase<br/>PostgreSQL)]
        AI[AssemblyAI<br/>Transcription]
        CL[Claude AI<br/>Haiku Model]
    end

    style SB fill:#3ecf8e
    style AI fill:#ff6b6b
    style CL fill:#cc785c
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant App as Mobile App
    participant API as Express API
    participant DB as Supabase DB

    User->>App: Enter email/password
    App->>API: POST /api/auth/login
    API->>DB: Query user by email
    DB-->>API: User data + hashed password
    API->>API: bcrypt.compare(password, hash)
    API->>API: Generate JWT token
    API-->>App: {token, user}
    App->>App: Store token in AsyncStorage
    App-->>User: Navigate to Profile
```

## Profile Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant App as Mobile App
    participant API as Express API
    participant Assembly as AssemblyAI
    participant Claude as Claude AI
    participant Storage as AsyncStorage

    User->>App: Record audio answer
    App->>App: Save audio to local storage
    App->>API: POST /api/transcribe (audio file)
    API->>Assembly: Upload audio + request transcription
    Assembly-->>API: Transcribed text
    API-->>App: {transcript}
    App->>Storage: Save answer + transcript

    Note over User,App: After answering questions...

    User->>App: Click "Generate AI Profile"
    App->>API: POST /api/profile/generate (all Q&A)
    API->>Claude: Send transcripts + prompt
    Claude-->>API: Generated profile summary
    API-->>App: {summary}
    App->>Storage: Save profile summary
    App-->>User: Display editable profile
```

## Data Architecture

```mermaid
graph TB
    subgraph "Mobile Local Storage"
        AS1[JWT Token]
        AS2[Audio Recordings]
        AS3[Transcripts]
        AS4[Profile Summary]
        AS5[Section Progress]
    end

    subgraph "Backend API Layer"
        Route1[/api/auth/*]
        Route2[/api/transcribe]
        Route3[/api/profile/generate]
    end

    subgraph "Database (Supabase)"
        User[(Users)]
        Community[(Communities)]
        Invitation[(Invitations)]
    end

    AS1 --> Route1
    AS2 --> Route2
    AS3 --> Route3
    AS4 --> Route3

    Route1 --> User
    Route1 --> Community
    Route1 --> Invitation

    style AS1 fill:#ffd700
    style AS2 fill:#ffd700
    style AS3 fill:#ffd700
    style AS4 fill:#ffd700
    style AS5 fill:#ffd700
```

## Key Components

### Mobile App Structure
```
src/
├── screens/          # UI Screens
│   ├── ProfileScreen.tsx        (AI summary + progress)
│   ├── QuestionFlowScreen.tsx   (Section selection)
│   ├── AnswerQuestionScreen.tsx (Audio recording)
│   └── CommunityScreen.tsx      (Community view)
├── navigation/       # React Navigation setup
├── contexts/         # Auth context
├── services/         # API calls
│   └── api.ts        (transcribe, generateProfile)
└── components/       # Reusable UI components
```

### Backend API Structure
```
backend/src/
├── routes/
│   ├── auth.ts          (Login, Register)
│   ├── transcribe.ts    (AssemblyAI integration)
│   ├── profile.ts       (Claude AI integration)
│   └── invitations.ts   (Invitation codes)
├── services/
│   ├── transcription.ts (AssemblyAI client)
│   └── claude.ts        (Claude AI client)
└── prisma/
    └── schema.prisma    (Database schema)
```

## Database Schema

```mermaid
erDiagram
    Community ||--o{ User : has
    Community ||--o{ Invitation : has

    Community {
        uuid id PK
        string name
        string description
        timestamp createdAt
        timestamp updatedAt
    }

    User {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        enum role
        uuid communityId FK
        timestamp createdAt
        timestamp updatedAt
    }

    Invitation {
        uuid id PK
        string code UK
        uuid communityId FK
        enum role
        int maxUses
        int usedCount
        timestamp expiresAt
        boolean active
        timestamp createdAt
        timestamp updatedAt
    }
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (requires invitation code)

### Audio & Transcription
- `POST /api/transcribe` - Upload audio, get transcript via AssemblyAI

### Profile Generation
- `POST /api/profile/generate` - Generate AI profile summary via Claude

### Invitations
- `POST /api/invitations/validate` - Check if invitation code is valid

## Environment Variables

### Backend (.env)
```bash
# Database
DATABASE_URL=postgresql://...              # Supabase session pooler
DIRECT_URL=postgresql://...                # Supabase direct connection

# Authentication
JWT_SECRET=your-secret-key                 # JWT signing key

# External APIs
ASSEMBLYAI_API_KEY=your-key               # Audio transcription
ANTHROPIC_API_KEY=your-key                # Claude AI (Haiku model)

# Server
PORT=3001
NODE_ENV=development
```

## Security Features

```mermaid
graph TB
    subgraph "Authentication Security"
        A1[Password Hashing<br/>bcrypt 12 rounds]
        A2[JWT Tokens<br/>7-day expiration]
        A3[AsyncStorage<br/>Secure local storage]
    end

    subgraph "Database Security"
        B1[Supabase PostgreSQL<br/>Encryption at rest]
        B2[Connection Pooling<br/>Session pooler]
        B3[Prisma ORM<br/>SQL injection protection]
    end

    subgraph "Access Control"
        C1[Invitation-Only<br/>Registration]
        C2[Community<br/>Isolation]
        C3[Role-Based<br/>Access]
    end

    style A1 fill:#4caf50
    style A2 fill:#4caf50
    style A3 fill:#4caf50
    style B1 fill:#2196f3
    style B2 fill:#2196f3
    style B3 fill:#2196f3
    style C1 fill:#ff9800
    style C2 fill:#ff9800
    style C3 fill:#ff9800
```

## Development Workflow

```mermaid
graph LR
    A[Local Development] --> B[Expo Dev Build]
    B --> C[iOS Simulator<br/>iPhone 16+]
    B --> D[Android Emulator]

    E[Backend Server] --> F[localhost:3001]
    F --> G[Supabase Cloud DB]

    H[External APIs] --> I[AssemblyAI]
    H --> J[Claude AI]

    style A fill:#61dafb
    style E fill:#339933
    style H fill:#ff6b6b
```

---

**Last Updated:** January 2025
**Framework Versions:** React Native 0.81.4, Expo SDK 54, Node.js 18+
