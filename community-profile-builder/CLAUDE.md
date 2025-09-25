# Community Profile Builder - AI Assistant Guide

## Database Architecture

### Production Database: Neon PostgreSQL
- **Database Host:** Neon (neon.tech)
- **Database Type:** PostgreSQL
- **Connection:** `postgresql://neondb_owner:npg_EFQ9mU5cyMGf@ep-plain-paper-aewjit1t-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require`
- **Purpose:** Primary database for all user authentication, profiles, and application data
- **Management:** Prisma ORM for type-safe database operations

### Key Database Tables
- `users` - User accounts and authentication (MEMBER/MANAGER roles)
- `communities` - Community organizations
- `community_profiles` - User profile data and voice responses
- `invitations` - Invitation codes for user registration

### Authentication System
- **Login Credentials (Test Accounts):**
  - Member: `member@test.com` / `member123456`
  - Manager: `manager@test.com` / `password123456`
- **Registration:** Requires valid invitation codes
- **Password Requirements:** Minimum 12 characters

## Project Structure

### Voice Question Flow (Primary Feature)
- **Target Users:** MEMBER role only (not managers)
- **Components:**
  - `QuestionCard.tsx` - Matches wireframe UI design
  - `ConversationFlow.tsx` - Manages question progression
  - `ControllableVoiceRecorder.tsx` - Voice recording functionality
- **Services:**
  - AssemblyAI for voice transcription
  - OpenAI for question generation and response analysis

### Development Commands
- `npm run dev` - Start development server
- `npm run db:seed` - Seed database with test accounts
- `npx prisma studio` - View database contents at localhost:5555
- `npx prisma generate` - Regenerate Prisma client
- `npx prisma migrate dev` - Create/apply migrations

### Environment Configuration
```
DATABASE_URL="postgresql://[connection-string]"
NEXTAUTH_SECRET="your-secret-key"
JWT_SECRET="your-jwt-secret"
NEXT_PUBLIC_OPENAI_API_KEY="your-openai-key"
NEXT_PUBLIC_ASSEMBLYAI_API_KEY="your-assemblyai-key"
```

## AI Assistant Approach

### Database-First Approach
1. **Always verify database state first** - Check Neon PostgreSQL for user accounts and data
2. **Use Prisma Studio** for database inspection (localhost:5555)
3. **Test queries directly** when debugging authentication issues
4. **Seed database** when fresh data is needed

### Authentication Debugging
1. Check database for user existence
2. Verify password hashing/verification
3. Test API endpoints directly
4. Check browser console and server logs
5. Use Prisma Studio to inspect data

### Voice Flow Development
- Focus on MEMBER role users
- Ensure voice recording and transcription work properly
- Match UI/UX to provided wireframes
- Store responses in `community_profiles` JSON fields

### Code Standards
- Use TypeScript for type safety
- Follow existing component patterns
- Maintain Prisma schema integrity
- Test with real database data (not mocks)

## Current Status
- ✅ Neon PostgreSQL database configured and connected
- ✅ User authentication system working
- ✅ Voice question flow UI components built
- ✅ Test accounts seeded and available
- 🔄 Ready for voice flow testing and refinement