# Railway Deployment Checklist

## Current Status
- ✅ Code pushed to GitHub (commit 0b124dc)
- ⏳ Railway will auto-deploy in ~2-3 minutes
- ⏳ Waiting for environment variables to be applied

## ✅ Critical Fix Applied
1. **Next.js Config**: Added Railway domain to allowed origins
2. **Auth Validation**: Added startup checks for NEXTAUTH_SECRET
3. **Environment Variables**: Configured public NEXTAUTH_URL

## 📋 Step-by-Step Verification

### Step 1: Verify Environment Variables in Railway

Go to Railway Dashboard → Your Service → **Variables** tab

**Required Variables** (must all be present):

| Variable Name | Expected Value | Status |
|---------------|----------------|--------|
| `NEXTAUTH_SECRET` | `su50w2TxNUYhn3EvO7MMNw/c7CtRg1Sok3kdVZ+lY6I=` | ❓ |
| `NEXTAUTH_URL` | `https://paylog-production.up.railway.app` | ❓ |
| `NODE_ENV` | `production` | ❓ |
| `DATABASE_URL` | (Auto-set by Railway Postgres) | ❓ |

**How to verify:**
1. Click on **Variables** tab
2. You should see all 4 variables listed
3. Click "Show" on each to verify the value (if hidden)

### Step 2: Check Latest Deployment

Go to Railway Dashboard → Your Service → **Deployments** tab

**Expected:**
- ✅ Latest deployment shows commit: "fix: configure Next.js for Railway deployment"
- ✅ Deployment status: **Active** or **Success** (green)
- ✅ Build time: ~2-3 minutes
- ❌ If "Failed" (red), click to view logs

**How to check:**
1. Look for the newest deployment at the top
2. Status should be green with "Active" badge
3. Commit message should match: "fix: configure Next.js for Railway deployment"

### Step 3: View Runtime Logs

Click on the latest deployment → **View Logs** button

**What to look for:**

✅ **Good signs:**
```
Server listening on port 3000
✓ Compiled successfully
Ready in XXXms
```

❌ **Bad signs (should NOT see these):**
```
Error: NEXTAUTH_SECRET is not set
TypeError: Cannot read properties of undefined
500 Internal Server Error
```

### Step 4: Test the Application

1. **Open**: https://paylog-production.up.railway.app/dashboard
2. **Expected Behavior**:
   - ✅ **Redirects to** `/login` (this is CORRECT - you're not logged in)
   - ✅ Login page loads without errors
   - ❌ **Should NOT see**: "Application error: a client-side exception has occurred"
   - ❌ **Should NOT see**: "TypeError: Cannot read properties of undefined"

3. **Hard Refresh Browser**:
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - This clears any cached errors

4. **Check Browser Console** (F12):
   - ✅ Should NOT have any red errors
   - ⚠️ Yellow warnings about preload are OK (not critical)

### Step 5: Verify Authentication Setup

Once the login page loads correctly:

1. **You don't have a user yet** - That's normal!
2. See "Test User Creation" section below

## 🚨 Troubleshooting

### Problem: Still seeing "Cannot read properties of undefined"

**Solution 1: Force Redeploy**
1. Railway Dashboard → Your Service → **Settings**
2. Scroll to bottom → Click **Redeploy**
3. Wait 2-3 minutes

**Solution 2: Verify Variables Applied**
1. Railway Dashboard → **Variables** tab
2. Check each variable is present
3. Try **removing** and **re-adding** NEXTAUTH_SECRET
4. Railway will auto-redeploy

**Solution 3: Check Logs for Specific Error**
1. Latest Deployment → **View Logs**
2. Look for the line:
   ```
   Error: NEXTAUTH_SECRET is not set
   ```
3. If you see this, the variable isn't being read correctly

### Problem: 500 Internal Server Error

**Check these:**
1. **DATABASE_URL** is set correctly (auto-set by Railway Postgres)
2. Database is in the same project/region as the service
3. View logs for specific database connection errors

### Problem: Environment variables not taking effect

**Try this:**
1. Remove **all** variables in Railway
2. Re-add them one by one:
   - First: `DATABASE_URL` (should already exist)
   - Second: `NEXTAUTH_SECRET`
   - Third: `NEXTAUTH_URL`
   - Fourth: `NODE_ENV`
3. Wait for automatic redeploy after each one

## ✅ Success Criteria

You know it's working when:

1. ✅ No 500 errors
2. ✅ No "Cannot read properties of undefined" errors
3. ✅ `/dashboard` redirects to `/login`
4. ✅ Login page loads cleanly
5. ✅ Browser console has no red errors
6. ✅ Railway logs show "Server listening on port 3000"

## 📝 Next Step: Create Test User

Once authentication is working (login page loads), you need to create a user in the database.

### Option 1: Railway Database Console

1. Railway Dashboard → Your Postgres Service → **Data** tab
2. Click **Query** button
3. Run this SQL (replace with your desired credentials):

```sql
-- First, you need to hash your password
-- Use this Node.js script locally to get the hash:
-- node -e "require('bcryptjs').hash('yourpassword', 10).then(console.log)"

INSERT INTO "User" (
  email,
  full_name,
  role,
  password_hash,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'admin@paylog.com',
  'Admin User',
  'super_admin',
  '$2b$10$yourhashhere', -- Replace with actual bcrypt hash
  true,
  NOW(),
  NOW()
);
```

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link to your project
railway login
railway link

# Generate password hash
railway run node -e "require('bcryptjs').hash('yourpassword', 10).then(console.log)"

# Copy the output hash, then run:
railway run npx prisma studio
# Use Prisma Studio UI to create the user
```

### Option 3: Local Script (Recommended)

Create a script to hash passwords and insert users via Prisma.

## 🎯 Final Verification

After creating a user:

1. Visit: https://paylog-production.up.railway.app/login
2. Enter your credentials
3. Click "Sign In"
4. **Expected**: Redirects to `/dashboard` and shows the dashboard page
5. **Success!** Your PayLog app is now fully deployed on Railway! 🎉

## 📞 Need Help?

If you're still stuck after following this checklist:

1. **Check Railway Logs**: Look for specific error messages
2. **Verify All Variables**: Double-check each environment variable
3. **Hard Refresh Browser**: Clear all cached data
4. **Try Incognito Mode**: Rules out browser cache issues

## 🔗 Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Your App: https://paylog-production.up.railway.app
- GitHub Repo: https://github.com/altctrl-dev/Paylog
- Railway Docs: https://docs.railway.app
