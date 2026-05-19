# Google OAuth Implementation - Quick Setup Checklist

**Start Time**: _____ | **Completion Time**: _____

---

## PRE-REQUISITES ✓
- [ ] Google Client ID and Secret already in `server/.env` (already verified ✅)
- [ ] PostgreSQL database running and accessible
- [ ] Node.js installed (v14+)
- [ ] npm available in terminal

---

## PHASE 1: BACKEND SETUP (5-10 min)

### Step 1: Install Dependencies
```bash
cd server
npm install
```
- [ ] Command completes without errors
- [ ] Check: `npm list google-auth-library` shows version 9.0.0+

### Step 2: Run Database Migration
```bash
psql -U postgres -d todo_app -f migrations/009_add_google_oauth.sql
```
Or run manually in PostgreSQL:
```sql
ALTER TABLE users
ADD COLUMN google_id VARCHAR(255),
ADD COLUMN oauth_provider VARCHAR(50),
ADD COLUMN profile_picture_url TEXT;

ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
ADD CONSTRAINT unique_google_id UNIQUE (google_id);

CREATE INDEX idx_google_id ON users(google_id);
CREATE INDEX idx_oauth_provider ON users(oauth_provider);
```
- [ ] Migration runs without errors
- [ ] Verify new columns exist: `SELECT google_id FROM users LIMIT 1;`

### Step 3: Verify Backend Files
Check these files exist/are updated:
- [ ] `server/utils/googleAuth.js` - exists and has `verifyGoogleToken()` function
- [ ] `server/controllers/googleAuthController.js` - exists and has `googleAuth()` function
- [ ] `server/models/authModel.js` - has `findOrCreateGoogleUser()` function at line ~40
- [ ] `server/routes/authRoutes.js` - has import: `import { googleAuth }` at top
- [ ] `server/routes/authRoutes.js` - has route: `router.post("/google", authLimiter, googleAuth);`
- [ ] `server/package.json` - dependencies include `"google-auth-library": "^9.0.0"`

### Step 4: Start Backend Server
```bash
npm run dev
```
- [ ] No TypeScript/syntax errors
- [ ] See: `Server running on port 5000`
- [ ] See: `Connected to PostgreSQL`

✅ **BACKEND COMPLETE**

---

## PHASE 2: FRONTEND SETUP (5-10 min)

### Step 1: Install Dependencies
```bash
cd client
npm install
```
- [ ] Command completes without errors
- [ ] Check: `npm list @react-oauth/google` shows version 0.12.1+

### Step 2: Verify Environment File
Check `client/.env`:
```env
REACT_APP_GOOGLE_CLIENT_ID=372568009481-i01po11r9e73tvu12v14q849gqnte58j.apps.googleusercontent.com
```
- [ ] `.env` file exists in `client/` root (not in `src/`)
- [ ] Contains `REACT_APP_GOOGLE_CLIENT_ID` (note: must start with `REACT_APP_`)

### Step 3: Verify Frontend Files
- [ ] `client/src/App.js` - has import: `import { GoogleOAuthProvider }`
- [ ] `client/src/App.js` - return wrapped in: `<GoogleOAuthProvider clientId={...}>`
- [ ] `client/src/services/authService.js` - has `googleLogin()` function
- [ ] `client/src/components/common/LoginForm.jsx` - has imports for `GoogleLogin`
- [ ] `client/src/components/common/LoginForm.jsx` - has `handleGoogleSuccess()` and `handleGoogleError()`
- [ ] `client/src/components/common/LoginForm.jsx` - has `<GoogleLogin>` component in JSX
- [ ] `client/package.json` - dependencies include `"@react-oauth/google": "^0.12.1"`

### Step 4: Start Frontend
```bash
npm start
```
- [ ] React dev server starts: `Compiled successfully!`
- [ ] Browser opens to `http://localhost:3000`
- [ ] No console errors related to GoogleOAuthProvider or REACT_APP_GOOGLE_CLIENT_ID

✅ **FRONTEND COMPLETE**

---

## PHASE 3: INTEGRATION TESTING

### Test 1: Login Page Loads
- [ ] Navigate to `http://localhost:3000/login`
- [ ] See login form with email/password fields
- [ ] See "Log In" button
- [ ] See "Create Account" button
- [ ] See divider with "or" text
- [ ] See "Sign in with Google" button (Google branding visible)

### Test 2: Google OAuth Dialog
- [ ] Click "Sign in with Google" button
- [ ] Google OAuth popup/dialog appears
- [ ] Can select a Google account
- [ ] Dialog closes after selection
- [ ] Shows loading state on login button

### Test 3: Successful Authentication
After clicking Google button and selecting account:
- [ ] Redirected to `/main-page`
- [ ] Dashboard loads
- [ ] User name displays in header/profile
- [ ] Toast message: "Google login successful!"
- [ ] No 401/403 errors in console

### Test 4: Token Storage
Open browser DevTools → Application → LocalStorage:
- [ ] `token` key exists
- [ ] Token value starts with `eyJ` (JWT format)
- [ ] Can decode at [jwt.io](https://jwt.io)
- [ ] Decoded token has: `userId`, `email`, `role`

### Test 5: Database Verification
```sql
SELECT id, email, google_id, oauth_provider FROM users 
WHERE oauth_provider = 'google' 
ORDER BY id DESC LIMIT 1;
```
- [ ] New row exists with OAuth user
- [ ] `google_id` is NOT NULL
- [ ] `oauth_provider` = 'google'

### Test 6: Protected Routes
- [ ] Click on "Dashboard" link in sidebar
- [ ] Page loads without 401 errors
- [ ] Click on "Projects" - loads successfully
- [ ] Click on "Kanban" - loads successfully
- [ ] All protected routes work with OAuth token

### Test 7: Logout & Re-login
- [ ] Click "Logout" / "Sign Out" button
- [ ] Redirected to `/login`
- [ ] Token removed from localStorage
- [ ] Can login with Google again successfully
- [ ] Gets new token in localStorage

✅ **INTEGRATION TESTING COMPLETE**

---

## PHASE 4: ADVANCED TESTING (OPTIONAL)

### Account Linking Test
- [ ] Create email account: `testuser@email.com` / `password123`
- [ ] Logout
- [ ] Login with Google using same email: `testuser@email.com`
- [ ] Check database:
  ```sql
  SELECT email, password_hash IS NOT NULL, google_id IS NOT NULL FROM users 
  WHERE email = 'testuser@email.com';
  ```
- [ ] Both values should be NOT NULL (linked)

### New Email Test
- [ ] Login with Google using NEW email (not registered before)
- [ ] Check database - new user created with only `google_id` (no password)
- [ ] Can access dashboard immediately

### Error Handling
- [ ] Clear token from localStorage manually
- [ ] Refresh page - should redirect to /login
- [ ] Try to access protected route directly - should redirect to /login
- [ ] Google error handling works (try closing dialog)

✅ **ADVANCED TESTING COMPLETE**

---

## TROUBLESHOOTING QUICK REFERENCE

| Issue | Solution |
|-------|----------|
| "REACT_APP_GOOGLE_CLIENT_ID is undefined" | Restart `npm start` after creating `.env` file |
| Google button doesn't appear | Check App.js has `<GoogleOAuthProvider>` wrapper |
| "Invalid Google token" error | Verify CLIENT_ID/CLIENT_SECRET in server/.env |
| CORS error from Google | Ensure frontend running on localhost:3000 |
| "Column google_id does not exist" | Run database migration (Step 1.2) |
| Token not stored in localStorage | Check browser's DevTools → Application → Cookies (CORS) |
| Can't click Google button | Check `loading` state isn't stuck true |

---

## FILE VERIFICATION CHECKLIST

### Backend Files
```
server/
├── migrations/009_add_google_oauth.sql          [✓] Created
├── utils/googleAuth.js                          [✓] Created
├── controllers/googleAuthController.js          [✓] Created
├── models/authModel.js                          [✓] Updated - has findOrCreateGoogleUser()
├── routes/authRoutes.js                         [✓] Updated - has /google route
└── package.json                                 [✓] Updated - has google-auth-library
```

### Frontend Files
```
client/
├── .env                                         [✓] Created - has REACT_APP_GOOGLE_CLIENT_ID
├── src/App.js                                   [✓] Updated - has GoogleOAuthProvider
├── src/services/authService.js                  [✓] Updated - has googleLogin()
├── src/components/common/LoginForm.jsx          [✓] Updated - has GoogleLogin button
└── package.json                                 [✓] Updated - has @react-oauth/google
```

---

## DOCUMENTATION LINKS

📄 Full Implementation Guide: [GOOGLE_OAUTH_IMPLEMENTATION.md](GOOGLE_OAUTH_IMPLEMENTATION.md)
📄 Project Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
📄 API Reference: [API_REFERENCE.md](API_REFERENCE.md)
📚 JWT/RBAC Guide: [JWT_RBAC_TUTORIAL.md](JWT_RBAC_TUTORIAL.md)

---

## FINAL VERIFICATION

Run this command to verify everything is set up:

**Backend Check:**
```bash
cd server && npm list google-auth-library && npm run dev
```
Expected output includes version number and "Server running on port 5000"

**Frontend Check:**
```bash
cd client && npm list @react-oauth/google && npm start
```
Expected output includes version number and React compiled successfully

---

**Status**: 🟢 Ready for Production Testing

**Last Updated**: May 18, 2026

**Estimated Time to Complete**: 20-30 minutes
