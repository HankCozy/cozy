# Cozy - Simple System Schematic

## High-Level Architecture

```mermaid
graph TB
    subgraph "👤 User Device"
        Mobile["📱 Cozy Mobile App<br/>(React Native + Expo)"]
    end

    subgraph "☁️ Your Infrastructure"
        Backend["🖥️ Express API Server<br/>(Node.js)"]
    end

    subgraph "🔌 External Providers"
        Supabase["🗄️ Supabase<br/>(PostgreSQL Database)"]
        Assembly["🎤 AssemblyAI<br/>(Speech-to-Text)"]
        Claude["🤖 Claude AI<br/>(Profile Generation)"]
    end

    Mobile -->|"REST API Calls"| Backend
    Backend -->|"Store Users & Auth"| Supabase
    Backend -->|"Transcribe Audio"| Assembly
    Backend -->|"Generate Summaries"| Claude

    style Mobile fill:#61dafb,stroke:#000,stroke-width:3px
    style Backend fill:#68a063,stroke:#000,stroke-width:3px
    style Supabase fill:#3ecf8e,stroke:#000,stroke-width:2px
    style Assembly fill:#ff6b6b,stroke:#000,stroke-width:2px
    style Claude fill:#cc785c,stroke:#000,stroke-width:2px
```

## System Components

```mermaid
graph LR
    subgraph Input["📥 INPUT"]
        User[User Voice<br/>Recordings]
    end

    subgraph Processing["⚙️ PROCESSING"]
        App[Mobile App]
        API[API Server]
        AI1[AssemblyAI]
        AI2[Claude AI]
    end

    subgraph Storage["💾 STORAGE"]
        Local[Local Storage<br/>AsyncStorage]
        Cloud[Cloud Database<br/>Supabase]
    end

    subgraph Output["📤 OUTPUT"]
        Profile[AI Profile<br/>Summary]
    end

    User --> App
    App --> Local
    App --> API
    API --> AI1
    AI1 --> API
    API --> AI2
    AI2 --> API
    API --> Cloud
    API --> App
    App --> Profile

    style Input fill:#e3f2fd
    style Processing fill:#fff3e0
    style Storage fill:#f3e5f5
    style Output fill:#e8f5e9
```

## Data Flow (Simplified)

```mermaid
flowchart TD
    A[👤 User opens app] --> B[🔐 Login via API]
    B --> C[📝 Answer questions<br/>record audio]
    C --> D[🎤 Send audio to API]
    D --> E[📝 AssemblyAI<br/>transcribes to text]
    E --> F[💾 Save transcript<br/>locally]
    F --> G{More questions?}
    G -->|Yes| C
    G -->|No| H[🤖 Generate Profile<br/>via Claude AI]
    H --> I[✨ Display AI Summary]
    I --> J[✏️ User can edit<br/>or regenerate]

    style A fill:#e3f2fd
    style B fill:#fff3e0
    style C fill:#fff3e0
    style D fill:#ffe0b2
    style E fill:#ff6b6b,color:#fff
    style F fill:#f3e5f5
    style H fill:#cc785c,color:#fff
    style I fill:#e8f5e9
    style J fill:#e8f5e9
```

## Provider Responsibilities

```mermaid
graph TB
    subgraph "🗄️ Supabase PostgreSQL"
        SP1[User Accounts]
        SP2[Communities]
        SP3[Invitation Codes]
        SP4[Authentication Data]
    end

    subgraph "🎤 AssemblyAI"
        AA1[Audio File Upload]
        AA2[Speech Recognition]
        AA3[Text Transcription]
    end

    subgraph "🤖 Claude AI - Haiku"
        CL1[Read Q&A Transcripts]
        CL2[Analyze Responses]
        CL3[Generate Profile Text]
        CL4[Match Writing Style]
    end

    style SP1 fill:#3ecf8e
    style SP2 fill:#3ecf8e
    style SP3 fill:#3ecf8e
    style SP4 fill:#3ecf8e
    style AA1 fill:#ff6b6b,color:#fff
    style AA2 fill:#ff6b6b,color:#fff
    style AA3 fill:#ff6b6b,color:#fff
    style CL1 fill:#cc785c,color:#fff
    style CL2 fill:#cc785c,color:#fff
    style CL3 fill:#cc785c,color:#fff
    style CL4 fill:#cc785c,color:#fff
```

## Network Diagram

```mermaid
graph TD
    subgraph Internet["🌐 Internet"]

        subgraph Client["📱 CLIENT SIDE"]
            iOS[iOS Device]
            Android[Android Device]
        end

        subgraph Server["🖥️ SERVER SIDE"]
            Express[Express API<br/>Port 3001]
        end

        subgraph Cloud["☁️ CLOUD PROVIDERS"]
            SB[(Supabase)]
            AA[AssemblyAI]
            CL[Claude AI]
        end
    end

    iOS -.HTTP.-> Express
    Android -.HTTP.-> Express
    Express -.SQL.-> SB
    Express -.REST.-> AA
    Express -.REST.-> CL

    style iOS fill:#61dafb
    style Android fill:#3ddc84
    style Express fill:#68a063
    style SB fill:#3ecf8e
    style AA fill:#ff6b6b
    style CL fill:#cc785c
```

## Cost Structure

```mermaid
graph TB
    subgraph Free["🆓 FREE TIER / SELF-HOSTED"]
        F1[React Native App]
        F2[Express Server]
        F3[Supabase Free Tier]
    end

    subgraph Paid["💰 PAY-PER-USE"]
        P1[AssemblyAI<br/>~$0.00025/sec audio]
        P2[Claude AI Haiku<br/>~$0.25/1M input tokens<br/>~$1.25/1M output tokens]
    end

    style F1 fill:#c8e6c9
    style F2 fill:#c8e6c9
    style F3 fill:#c8e6c9
    style P1 fill:#ffccbc
    style P2 fill:#ffccbc
```

## 3-Tier Architecture

```
┌─────────────────────────────────────────┐
│         PRESENTATION TIER               │
│                                         │
│   📱 React Native Mobile App            │
│   • User Interface                      │
│   • Local Storage (AsyncStorage)        │
│   • Audio Recording                     │
└─────────────────────────────────────────┘
                    ↕ HTTP/REST
┌─────────────────────────────────────────┐
│         APPLICATION TIER                │
│                                         │
│   🖥️ Express API Server (Node.js)      │
│   • Business Logic                      │
│   • Authentication (JWT)                │
│   • API Endpoints                       │
│   • Integration Layer                   │
└─────────────────────────────────────────┘
                    ↕
        ┌───────────┼───────────┐
        ↓           ↓           ↓
┌──────────┐  ┌──────────┐  ┌──────────┐
│   DATA   │  │   AI     │  │   AI     │
│   TIER   │  │  SPEECH  │  │   TEXT   │
│          │  │          │  │          │
│ 🗄️ Supa  │  │ 🎤 Asm   │  │ 🤖 Claude│
│   base   │  │   blyAI  │  │   AI     │
└──────────┘  └──────────┘  └──────────┘
```

## Request Flow Example

**User records answer to "What do you do for fun?"**

```
1. 📱 App → Records audio → Saves locally
                ↓
2. 📱 App → POST /api/transcribe → 🖥️ API
                ↓
3. 🖥️ API → Upload audio → 🎤 AssemblyAI
                ↓
4. 🎤 AssemblyAI → Transcribes → "I love hiking and playing guitar"
                ↓
5. 🖥️ API → Returns transcript → 📱 App
                ↓
6. 📱 App → Saves transcript locally
                ↓
           [User answers more questions]
                ↓
7. 📱 App → POST /api/profile/generate → 🖥️ API
                ↓
8. 🖥️ API → Sends all Q&A → 🤖 Claude AI
                ↓
9. 🤖 Claude → Generates profile → "John is an outdoorsy music lover..."
                ↓
10. 🖥️ API → Returns summary → 📱 App
                ↓
11. 📱 App → Displays editable profile ✨
```

---

**🔑 Key Takeaway:** Simple 3-component system
1. **Mobile App** (user interface)
2. **Your API Server** (orchestrator)
3. **3 Cloud Providers** (Supabase, AssemblyAI, Claude)
