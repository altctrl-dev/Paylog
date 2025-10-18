# Railway Environment Variables Setup

## Critical Error Fix

Your application is failing because **NEXTAUTH_SECRET** is missing in Railway.

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

## Steps to Fix

1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select your `paylog-production` service
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add:
   - Name: `NEXTAUTH_SECRET`
   - Value: Generate using `openssl rand -base64 32`
6. Add:
   - Name: `NEXTAUTH_URL`
   - Value: `https://paylog-production.up.railway.app`
7. Add:
   - Name: `NODE_ENV`
   - Value: `production`
8. Click **Deploy** to restart with new environment variables

## After Setting Variables

The application will automatically redeploy. Wait 2-3 minutes, then visit:
https://paylog-production.up.railway.app/dashboard

The error will be fixed and you'll be redirected to the login page if not authenticated.

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
