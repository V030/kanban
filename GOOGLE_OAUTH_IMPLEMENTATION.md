# Google OAuth Implementation - Complete Setup Guide

## ✅ Implementation Complete

All backend, frontend, and configuration files have been created and updated. Below is a detailed summary.

---

## FILES CREATED

### Backend
1. **[server/migrations/009_add_google_oauth.sql](server/migrations/009_add_google_oauth.sql)**
   - Adds `google_id`, `oauth_provider`, `profile_picture_url` columns to users table
   - Makes `password_hash` nullable for OAuth users
   - Creates indexes for fast lookups

2. **[server/utils/googleAuth.js](server/utils/googleAuth.js)**
   - `verifyGoogleToken()` - Verifies Google ID token using google-auth-library
   - Extracts user info: googleId, email, firstName, lastName, profilePicture

3. **[server/controllers/googleAuthController.js](server/controllers/googleAuthController.js)**
   - `googleAuth()` endpoint handler
   - Verifies token → finds/creates user → generates JWT → returns response

### Frontend
- **[client/.env](client/.env)** - Environment variables configuration

---

## FILES UPDATED

### Backend
1. **[server/package.json](server/package.json)**
   - Added: `google-auth-library` (v9.0.0)
   - Added: `axios` (v1.6.0)

2. **[server/models/authModel.js](server/models/authModel.js)**
   - Added: `findOrCreateGoogleUser()` function
   - Handles three scenarios: existing OAuth user, existing email user (linking), new user

3. **[server/routes/authRoutes.js](server/routes/authRoutes.js)**
   - Added import: `import { googleAuth } from "../controllers/googleAuthController.js"`
   - Added route: `router.post("/google", authLimiter, googleAuth)`

### Frontend
1. **[client/package.json](client/package.json)**
   - Added: `@react-oauth/google` (v0.12.1)

2. **[client/src/App.js](client/src/App.js)**
   - Added import: `import { GoogleOAuthProvider } from '@react-oauth/google'`
   - Wrapped entire app with `<GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>`

3. **[client/src/services/authService.js](client/src/services/authService.js)**
   - Added: `googleLogin()` function
   - Sends token to backend, receives JWT, stores in localStorage

4. **[client/src/components/common/LoginForm.jsx](client/src/components/common/LoginForm.jsx)**
   - Added imports: `googleLogin`, `GoogleLogin` component
   - Added handlers: `handleGoogleSuccess()`, `handleGoogleError()`
   - Added UI: Google Login button with divider separator

---

## ENVIRONMENT VARIABLES

### Server (.env) - Already Present ✅
```env
PORT=5000
DATABASE_URL=whoops
JWT_SECRET=whoops
JWT_EXPIRES_IN=7d

CLIENT_ID=whoops
CLIENT_SECRET=whoops

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=cafeproject030@gmail.com
SMTP_PASS=elpeualkucyewhxf
SMTP_FROM=cafeproject030@gmail.com
SMTP_SECURE=false
```


---

## DATABASE SCHEMA CHANGES

**New Users Table Structure (after migration):**

```sql
users table:
┌────┬────────────┬───────────┬──────────┬──────────────┬──────────┬────────────┬──────────────────┬─────────────────┬─────────────────────┐
│ id │ first_name │ last_name │ email    │ password_hash│ role     │ google_id  │ oauth_provider   │ profile_picture │ created_at          │
├────┼────────────┼───────────┼──────────┼──────────────┼──────────┼────────────┼──────────────────┼─────────────────┼─────────────────────┤
│ 1  │ John       │ Doe       │ john@... │ $2b$10$...  │ user     │ NULL       │ NULL             │ NULL            │ 2026-02-18 10:00:00 │
│ 2  │ Jane       │ Smith     │ jane@... │ NULL        │ user     │ 1234567890 │ google           │ https://...     │ 2026-05-18 14:30:00 │
└────┴────────────┴───────────┴──────────┴──────────────┴──────────┴────────────┴──────────────────┴─────────────────┴─────────────────────┘
```

**Key Changes:**
- `google_id`: Unique identifier from Google (nullable for email-based users)
- `oauth_provider`: Tracks OAuth provider type - "google" (extensible for future providers)
- `profile_picture_url`: Stores Google's profile picture URL
- `password_hash`: NOW NULLABLE (OAuth users may not have passwords)

---

## HOW IT WORKS - AUTHENTICATION FLOW

```
┌──────────────────────────────────────────────────────────────────┐
│ Frontend: User clicks "Login with Google"                        │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Browser: Google OAuth Dialog opens                               │
│ User authenticates with Google                                   │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Frontend: Receives credential token from Google                  │
│ Calls: POST /auth/google { token: credentialResponse.credential }│
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Backend: Receives token at /auth/google endpoint                 │
│ 1. Verifies token using google-auth-library                      │
│ 2. Extracts: googleId, email, firstName, lastName, picture      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Database Query: findOrCreateGoogleUser()                         │
│ Scenario 1: google_id exists → Return existing user             │
│ Scenario 2: email exists → Link Google to existing account      │
│ Scenario 3: New user → Create with google_id, no password       │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Backend: Generate JWT token                                      │
│ Payload: { userId, email, role }                                │
│ Signed with JWT_SECRET, expires in 7 days                       │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Frontend: Receives response                                      │
│ {                                                                 │
│   message: "Google authentication successful",                   │
│   token: "eyJhbGc...",                                          │
│   user: { id, firstName, lastName, email, role, ... }           │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Frontend: Store token in localStorage                            │
│ localStorage.setItem("token", data.token)                        │
│ Cache user in-memory (cachedUser = data.user)                    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Frontend: Navigate to /main-page                                 │
│ Show success toast: "Google login successful!"                   │
│ User is now authenticated and can access protected routes        │
└──────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTATION STEPS (IN ORDER)

### Phase 1: Backend Setup (5-10 minutes)

**Step 1: Install Dependencies**
```bash
cd server
npm install
```
This will install the new packages: `google-auth-library` and `axios`

**Step 2: Run Database Migration**
Execute the SQL migration in your PostgreSQL database:
```bash
psql -U postgres -d todo_app -f server/migrations/009_add_google_oauth.sql
```

Or connect via pgAdmin/DBeaver and run the SQL from `server/migrations/009_add_google_oauth.sql`

**Step 3: Verify Backend Files**
- ✅ `server/utils/googleAuth.js` - Created
- ✅ `server/controllers/googleAuthController.js` - Created
- ✅ `server/models/authModel.js` - Updated with `findOrCreateGoogleUser()`
- ✅ `server/routes/authRoutes.js` - Updated with Google route and import
- ✅ `server/package.json` - Updated with dependencies

**Step 4: Restart Server**
```bash
npm run dev
```
You should see: `Server running on port 5000` with no errors

---

### Phase 2: Frontend Setup (5-10 minutes)

**Step 1: Install Dependencies**
```bash
cd client
npm install
```
This will install: `@react-oauth/google`

**Step 2: Verify Environment Variables**
Check `client/.env`, it contains the client ID

**Step 3: Verify Frontend Files**
- ✅ `client/.env` - Created with REACT_APP_GOOGLE_CLIENT_ID
- ✅ `client/src/App.js` - Updated with GoogleOAuthProvider wrapper
- ✅ `client/src/services/authService.js` - Updated with `googleLogin()`
- ✅ `client/src/components/common/LoginForm.jsx` - Updated with Google Login button
- ✅ `client/package.json` - Updated with @react-oauth/google

**Step 4: Start Frontend**
```bash
npm start
```
React app should open at `http://localhost:3000`

---

## TESTING CHECKLIST

### Backend Tests
- [ ] Server starts without errors (`npm run dev`)
- [ ] No TypeScript/syntax errors in the console
- [ ] Database migration applied successfully
  - Check: `SELECT google_id, oauth_provider FROM users LIMIT 1;` should show new columns
- [ ] New dependencies installed: `npm list google-auth-library`

### Frontend Tests
- [ ] Frontend starts without errors (`npm start`)
- [ ] No console errors or warnings related to GoogleOAuthProvider
- [ ] Environment variable loaded: Check browser console - should not see undefined errors
- [ ] Login page renders with Google Login button visible
- [ ] Divider "or" text appears between password login and Google login

### Integration Tests
- [ ] Click "Login with Google" button
- [ ] Google OAuth dialog opens
- [ ] Select a Google account to authenticate
- [ ] After authentication, redirected to `/main-page`
- [ ] Check `localStorage.getItem("token")` - should have JWT token
- [ ] Check dashboard loads without authentication errors
- [ ] User info displays correctly (name, email)

### Account Linking Test (Advanced)
- [ ] Create account with email/password: `test1@example.com / password123`
- [ ] Logout
- [ ] Login with Google using same email: `test1@example.com`
- [ ] Check database: User should have both `password_hash` and `google_id` set
- [ ] User can now login with either method

### Edge Cases
- [ ] Google login with new email (not previously registered) → New user created
- [ ] Close Google dialog → Should not error
- [ ] Rapid clicks on Google button → Should not submit multiple times (loading state)
- [ ] Clear localStorage → Logging in again works normally

---

## API ENDPOINT DETAILS

### POST /auth/google

**Request:**
```json
{
  "token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJzd..."
}
```

**Success Response (200):**
```json
{
  "message": "Google authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiam9obkBnbWFpbC5jb20iLCJyb2xlIjoidXNlciJ9.9xYZ...",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@gmail.com",
    "role": "user",
    "profileImageBase64": "https://lh3.googleusercontent.com/..."
  }
}
```

**Error Response (401):**
```json
{
  "message": "Invalid Google token"
}
```

---

## DATABASE QUERIES

### View OAuth Users
```sql
SELECT id, first_name, last_name, email, google_id, oauth_provider, created_at
FROM users
WHERE google_id IS NOT NULL
ORDER BY created_at DESC;
```

### View Account Linkings (user with both password and google_id)
```sql
SELECT id, email, password_hash IS NOT NULL as has_password, google_id IS NOT NULL as has_google
FROM users
WHERE password_hash IS NOT NULL AND google_id IS NOT NULL;
```

### Delete OAuth user (if needed)
```sql
DELETE FROM users WHERE google_id = '1234567890';
```

---

## TROUBLESHOOTING

### "Google token verification failed"
- **Cause**: CLIENT_ID in server/.env doesn't match frontend configuration
- **Fix**: Verify `CLIENT_ID` in server/.env matches `REACT_APP_GOOGLE_CLIENT_ID` in client/.env

### "REACT_APP_GOOGLE_CLIENT_ID is undefined"
- **Cause**: Environment variables not loaded on frontend
- **Fix**: 
  1. Make sure `.env` file is in `client/` root (not in `src/`)
  2. Restart React dev server: `npm start`
  3. React caches env variables at startup

### Google OAuth button doesn't appear
- **Cause**: GoogleOAuthProvider not wrapping the component
- **Fix**: Check `client/src/App.js` - should have `<GoogleOAuthProvider>` at top level

### "Invalid Google token" error on every attempt
- **Cause**: Token verification failing at backend
- **Fix**: 
  1. Check server logs for detailed error
  2. Verify `google-auth-library` installed: `npm list google-auth-library`
  3. Verify `CLIENT_ID` is correct in .env

### "Access denied" or CORS errors
- **Cause**: Frontend and backend not communicating properly
- **Fix**:
  1. Check server CORS config: `app.use(cors())`
  2. Verify API_URL in `authService.js` is correct: `http://localhost:5000`
  3. Check Network tab in DevTools for actual error

### User not created in database
- **Cause**: Database migration not applied
- **Fix**: Run migration manually:
  ```sql
  ALTER TABLE users
  ADD COLUMN google_id VARCHAR(255),
  ADD COLUMN oauth_provider VARCHAR(50),
  ADD COLUMN profile_picture_url TEXT;
  ```

---

## SECURITY NOTES

1. **Token Validation**: Backend verifies Google token using official `google-auth-library`
2. **JWT Expiration**: Tokens expire in 7 days (configurable via JWT_EXPIRES_IN)
3. **Password Optional**: OAuth users don't have password_hash, can't use password reset
4. **Rate Limiting**: Google auth route uses `authLimiter` (same as login/register)
5. **HTTPS Required**: In production, ensure HTTPS for all OAuth flows

---

## NEXT STEPS (OPTIONAL ENHANCEMENTS)

1. **Logout functionality**: Already exists in authService.js
2. **Refresh tokens**: Consider implementing refresh token mechanism
3. **Multiple OAuth providers**: Code is extensible for GitHub, Microsoft OAuth
4. **Profile sync**: Auto-update profile picture on each login
5. **Email verification**: Optional - verify Google's email_verified flag
6. **Disconnect OAuth**: Allow users to disconnect OAuth from account settings

---

## FILE STRUCTURE SUMMARY

```
├── server/
│   ├── migrations/
│   │   └── 009_add_google_oauth.sql          ✅ NEW
│   ├── utils/
│   │   ├── googleAuth.js                     ✅ NEW
│   │   └── jwt.js                            (existing)
│   ├── controllers/
│   │   ├── googleAuthController.js           ✅ NEW
│   │   └── authController.js                 (existing)
│   ├── models/
│   │   └── authModel.js                      ✅ UPDATED
│   ├── routes/
│   │   └── authRoutes.js                     ✅ UPDATED
│   ├── package.json                          ✅ UPDATED
│   └── server.js                             (existing)
│
├── client/
│   ├── .env                                  ✅ CREATED
│   ├── src/
│   │   ├── App.js                            ✅ UPDATED
│   │   ├── services/
│   │   │   └── authService.js                ✅ UPDATED
│   │   ├── components/
│   │   │   └── common/
│   │   │       └── LoginForm.jsx             ✅ UPDATED
│   │   └── pages/
│   │       └── LoginPage.jsx                 (existing)
│   ├── package.json                          ✅ UPDATED
│   └── public/
│       └── index.html                        (existing)
```

---

## SUPPORT & DOCUMENTATION

- [Google Auth Library Docs](https://github.com/googleapis/google-auth-library-nodejs)
- [@react-oauth/google Docs](https://www.npmjs.com/package/@react-oauth/google)
- [JWT.io](https://jwt.io/) - JWT token debugger
- Your Project Docs: See PROJECT_SOURCE_OF_TRUTH.md

---

**Implementation Date**: May 18, 2026
**Status**: ✅ Complete and Ready for Testing
