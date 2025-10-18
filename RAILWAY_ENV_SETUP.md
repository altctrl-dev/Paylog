# Railway Environment Variables Setup

## 🚨 Critical Error Fix

**Error**: `TypeError: Cannot read properties of undefined (reading 'name')` + `500 Internal Server Error`

**Cause**: Your application is failing because **NEXTAUTH_SECRET** is missing in Railway.

**Status**: The latest deployment now has better error messages that will show exactly what's missing.

## Required Environment Variables

Set these in Railway Dashboard → Your Service → Variables:

### 1. NEXTAUTH_SECRET (CRITICAL - Missing!)
```bash
# Generate a new secret:
openssl rand -base64 32
```
Copy the output and add it as `NEXTAUTH_SECRET` in Railway.

Example value: `6Nz9fBmHOeUKIaeMIT6Ev6Zu7+nlloC5cDjvlBzfGIw=`

### 2. NEXTAUTH_URL
```
NEXTAUTH_URL=https://paylog-production.up.railway.app
```

### 3. DATABASE_URL
Already automatically set by Railway when you added PostgreSQL.

### 4. NODE_ENV
```
NODE_ENV=production
```

## Optional but Recommended

### Email Configuration (if using email features)
```
EMAIL_ENABLED=true
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=notifications@servsys.com
ADMIN_EMAILS=althaf@servsys.com
EMAIL_PREVIEW=false
```

### Storage Configuration
```
STORAGE_PROVIDER=local
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
MAX_FILES_PER_INVOICE=10
ALLOWED_FILE_TYPES=pdf,png,jpg,jpeg,docx,xlsx,csv,txt
```

## Steps to Fix (MUST DO THIS NOW)

### Method 1: Railway Dashboard UI (Recommended)

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select** your `paylog-production` service
3. **Click** the **Variables** tab
4. **Add each variable** by clicking **+ New Variable**:

   **Variable 1:**
   ```
   Name: NEXTAUTH_SECRET
   Value: su50w2TxNUYhn3EvO7MMNw/c7CtRg1Sok3kdVZ+lY6I=
   ```
   (Or generate your own: `openssl rand -base64 32`)

   **Variable 2:**
   ```
   Name: NEXTAUTH_URL
   Value: https://paylog-production.up.railway.app
   ```

   **Variable 3:**
   ```
   Name: NODE_ENV
   Value: production
   ```

5. **Click Deploy** or wait for automatic redeploy (happens within 30 seconds)
6. **Wait 2-3 minutes** for the build to complete
7. **Hard refresh** your browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Method 2: Railway CLI (Alternative)

```bash
# Install Railway CLI if not already installed
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Set the variables
railway variables set NEXTAUTH_SECRET="su50w2TxNUYhn3EvO7MMNw/c7CtRg1Sok3kdVZ+lY6I="
railway variables set NEXTAUTH_URL="https://paylog-production.up.railway.app"
railway variables set NODE_ENV="production"

# Trigger redeploy
railway up
```

## After Setting Variables

1. **Wait for Deployment**: Railway will automatically redeploy (check Deployments tab)
2. **Monitor Logs**: Click on your service → **Deployments** → Latest deployment → **View Logs**
3. **Look for Success**: You should see "Server listening on port 3000" (or similar)
4. **Test the Application**:
   - Visit: https://paylog-production.up.railway.app/dashboard
   - Expected: Redirect to `/login` (this means auth is working!)
   - Previous Error: `TypeError: Cannot read properties of undefined` - GONE ✅

## Troubleshooting

### Still Getting Errors After Adding Variables?

1. **Check Variables Are Set**:
   - Railway Dashboard → Your Service → Variables
   - Verify all 3 variables show with correct values
   - Click on each to confirm (values might be hidden with `***`)

2. **Check Deployment Status**:
   - Railway Dashboard → Your Service → Deployments
   - Latest deployment should show "Active" or "Success"
   - If "Failed", click on it to view build logs

3. **View Runtime Logs**:
   - Railway Dashboard → Your Service → Latest Deployment → **View Logs**
   - Look for the new error message:
     ```
     Error: NEXTAUTH_SECRET is not set. Please add it to your environment variables.
     ```
   - If you see this, the variable didn't get picked up - try removing and re-adding it

4. **Force Redeploy**:
   - Railway Dashboard → Your Service → Settings
   - Scroll to bottom → **Redeploy** button
   - This forces a fresh build with the new variables

5. **Hard Refresh Browser**:
   - Clear cache: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or use Incognito/Private mode

6. **Check Railway Region**:
   - Ensure your database and service are in the same region
   - Railway Dashboard → Service Settings → Region

### Expected Behavior After Fix

✅ **No more 500 errors**
✅ **No more "Cannot read properties of undefined" errors**
✅ **Redirects to `/login` page** (because you're not logged in yet)
✅ **Login page loads without errors**

### Next Step: Create a User

Once the app loads correctly, you need to create a user in the database (see section below).

## Test Credentials

If you need to create a test user, run this in Railway's database:

```sql
-- Generate password hash for "testpassword123"
INSERT INTO "User" (email, full_name, role, password_hash, is_active, created_at, updated_at)
VALUES (
  'admin@paylog.com',
  'Admin User',
  'admin',
  '$2b$10$yourhashhere', -- Replace with actual bcrypt hash
  true,
  NOW(),
  NOW()
);
```

Or use the Railway CLI:
```bash
railway run npx ts-node -e "
import { hashPassword } from './lib/crypto';
hashPassword('yourpassword').then(console.log);
"
```
