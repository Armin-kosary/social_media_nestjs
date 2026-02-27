# JWT Refresh Token Implementation Guide

## Overview

JWT refresh token functionality has been successfully implemented in your NestJS social project. This allows users to get long-lived sessions with automatic token refreshing without requiring them to login repeatedly.

## Features Implemented

### 1. **Access & Refresh Token System**

- Short-lived access tokens (default: 15 minutes)
- Long-lived refresh tokens (default: 7 days)
- Tokens stored securely in the database

### 2. **New Endpoints**

#### `POST /auth/login`

Login endpoint now returns both access and refresh tokens:

**Request:**

```json
{
  "username": "user123",
  "password": "password123"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "900"
}
```

#### `POST /auth/refresh`

Refresh both access and refresh tokens:

**Request:**

```
Header: Authorization: Bearer <refreshToken>
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "900"
}
```

#### `POST /auth/logout`

Logout from current device:

**Request:**

```
Header: Authorization: Bearer <refreshToken>
```

**Response:**

```json
{
  "message": "Successfully logged out"
}
```

#### `POST /auth/logout-all`

Logout from all devices (invalidates all refresh tokens):

**Request:**

```
Header: Authorization: Bearer <refreshToken>
```

**Response:**

```json
{
  "message": "Successfully logged out"
}
```

## Environment Variables Required

Add these to your `.env` file:

```
# JWT Configuration
JWT_SECRET_KEY=your_super_secret_access_token_key_here
JWT_REFRESH_SECRET_KEY=your_super_secret_refresh_token_key_here
JWT_EXPIRE_IN=900        # 15 minutes (in seconds)
JWT_REFRESH_EXPIRE_IN=604800    # 7 days (in seconds)

# Database (existing)
DATABASE_URL=mysql://user:password@localhost:3306/social
```

## Database Changes

A new `RefreshToken` table has been added to your Prisma schema:

```prisma
model RefreshToken {
  id        Int     @default(autoincrement()) @id
  token     String  @unique
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    Int
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

## How to Deploy

1. **Install dotenv if needed:**

   ```bash
   npm install dotenv
   ```

2. **Run the database migration:**

   ```bash
   npx prisma migrate dev --name add_refresh_token
   ```

3. **Update your `.env` file** with the configuration above

4. **Restart your server:**
   ```bash
   npm run start:dev
   ```

## Files Modified/Created

### New Files:

- `src/auth/dto/refresh-token.dto.ts` - DTO for refresh token requests
- `src/auth/strategies/refresh-token.strategy.ts` - JWT refresh token strategy
- `src/auth/guards/refresh-token.guard.ts` - Guard for refresh token routes

### Modified Files:

- `src/auth/auth.service.ts` - Added refresh token logic
- `src/auth/auth.controller.ts` - Added refresh/logout endpoints
- `src/auth/auth.module.ts` - Imported RefreshTokenStrategy
- `prisma/schema.prisma` - Added RefreshToken model

## Usage Flow

1. User logs in → receives `accessToken` and `refreshToken`
2. User uses `accessToken` to access protected routes
3. When `accessToken` expires → use `refreshToken` to get a new `accessToken`
4. `RefreshToken` is stored in DB and validated on each refresh
5. Old `refreshToken` is invalidated when user logs out

## Security Considerations

✅ Refresh tokens are stored in database and validated
✅ Expired tokens are automatically deleted from database
✅ Logout invalidates all refresh tokens for the user
✅ Different secrets for access and refresh tokens
✅ Proper expiration handling

## Notes

- Access tokens should be stored in memory or secure storage (not localStorage)
- Refresh tokens can be stored in HTTPOnly cookies (recommended) or secure storage
- The implementation validates token existence in the database
- Cascade delete on User deletion will clean up all refresh tokens automatically
