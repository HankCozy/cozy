# Cozy Backend

Authentication and community management backend for the Cozy mobile app.

## Tech Stack

- **Node.js** with **TypeScript**
- **Express** - Web framework
- **Prisma** - Database ORM
- **Supabase PostgreSQL** - Cloud database
- **bcrypt** - Password hashing
- **JWT** - Token-based authentication

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your Supabase credentials:

```bash
cp .env.example .env
```

**Get Supabase Connection String:**
1. Go to your Supabase project dashboard
2. Settings → Database → Connection string
3. Copy the **Session pooler** connection string (IPv4, port 5432)
4. Update `DATABASE_URL` and `DIRECT_URL` in `.env`

Generate a secure JWT secret:

```bash
openssl rand -base64 32
```

### 3. Initialize Database

```bash
# Run migrations to create database tables
npm run db:migrate

# Seed database with test data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3001`

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "test@example.com",
  "password": "testpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "MEMBER",
    "community": {
      "id": "community-id",
      "name": "Test Community Alpha",
      "description": "A test community for development"
    }
  }
}
```

#### POST `/api/auth/register`
Register a new user with an invitation code.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "firstName": "New",
  "lastName": "User",
  "invitationCode": "ALPHA2025"
}
```

**Response:** Same as login response

### Invitations

#### POST `/api/invitations/validate`
Validate an invitation code.

**Request:**
```json
{
  "code": "ALPHA2025"
}
```

**Response:**
```json
{
  "valid": true,
  "invitation": {
    "role": "MEMBER",
    "community": {
      "id": "community-id",
      "name": "Test Community Alpha",
      "description": "A test community for development"
    }
  }
}
```

## Test Data

After seeding, use these credentials:

**Login:**
- Email: `test@example.com`
- Password: `testpassword123`

**Invitation Codes:**
- `ALPHA2025` - Member for Test Community Alpha
- `MANAGER01` - Manager for Test Community Alpha
- `BETA2025` - Member for Test Community Beta

## Database Management

```bash
# View database in browser
npm run db:studio

# Create new migration after schema changes
npm run db:migrate

# Reset database and reseed
npm run db:migrate && npm run db:seed
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio

## Security Features

✓ **Password Hashing** - bcrypt with 12 salt rounds
✓ **JWT Tokens** - 7-day expiration
✓ **Input Validation** - Email format and password requirements
✓ **Invitation System** - Prevents unauthorized registration
✓ **Community Isolation** - Users scoped to communities
✓ **Database Transactions** - Atomic operations for data integrity

## Production Considerations

When deploying to production:

1. Use PostgreSQL instead of SQLite
2. Set strong JWT_SECRET environment variable
3. Enable HTTPS/TLS
4. Add rate limiting for auth endpoints
5. Set up proper logging and monitoring
6. Configure CORS to only allow your mobile app domains
7. Use environment-specific database connections