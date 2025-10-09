# PayLog Setup Guide

Complete setup instructions for the PayLog Invoice Management System.

**Version**: 0.2.0 | **Last Updated**: October 8, 2025

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Testing the Setup](#testing-the-setup)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | Runtime environment |
| npm or pnpm | Latest | Package manager |
| Git | Latest | Version control |

### Recommended Tools

- **Code Editor**: VS Code with extensions:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense
- **Database GUI**: Prisma Studio (included)
- **Browser**: Chrome, Firefox, Safari, or Edge

### System Requirements

- **OS**: macOS, Linux, or Windows (WSL2 recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 500MB for dependencies

---

## Quick Start

For experienced developers, here's the fastest setup:

```bash
# Clone and install
git clone <repository-url>
cd paylog-3
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Initialize database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and login with:
- **Email**: admin@paylog.com
- **Password**: admin123

---

## Detailed Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd paylog-3

# Verify files
ls -la
```

You should see:
- `package.json`
- `schema.prisma`
- `app/` directory
- `components/` directory
- `.env.example`

### Step 2: Install Dependencies

**Using npm**:
```bash
npm install
```

**Using pnpm** (faster):
```bash
# Install pnpm if not installed
npm install -g pnpm

# Install dependencies
pnpm install
```

This will install:
- Next.js 14.2.15
- React 18.3.1
- Prisma 5.20.0
- NextAuth v5
- TanStack Query
- Zustand
- Framer Motion
- Shadcn/ui dependencies
- All dev dependencies (TypeScript, ESLint, Prettier)

**Expected time**: 2-5 minutes depending on internet speed.

### Step 3: Environment Configuration

Create your environment file:

```bash
cp .env.example .env
```

Edit `.env` with your preferred editor:

```bash
nano .env
# or
code .env
```

**Required environment variables**:

```env
# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with-command-below>"

# Optional: Node Environment
NODE_ENV="development"
```

**Generate NEXTAUTH_SECRET**:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the value for `NEXTAUTH_SECRET`.

**Example `.env` file**:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="6Nz9fBmHOeUKIaeMIT6Ev6Zu7+nlloC5cDjvlBzfGIw="
NODE_ENV="development"
```

### Step 4: Database Setup

PayLog uses SQLite for development (no external database needed).

**Generate Prisma Client**:
```bash
npm run db:generate
```

This generates TypeScript types from your schema.

**Run Migrations**:
```bash
npm run db:migrate
```

This creates the database file (`dev.db`) and all tables.

**Seed Database**:
```bash
npm run db:seed
```

This creates:
- 1 super admin user (admin@paylog.com / admin123)
- 3 sample vendors
- 4 sample categories
- 1 invoice profile

**Expected output**:
```
Seeding database...
✅ Created Super Admin: admin@paylog.com
✅ Created 3 vendors
✅ Created 4 categories
✅ Created invoice profile: Standard Invoice

✨ Database seeded successfully!

Login credentials:
Email: admin@paylog.com
Password: admin123
```

### Step 5: Verify Installation

**Check database file exists**:
```bash
ls -lh dev.db
```

You should see a file around 140KB.

**Open Prisma Studio** (optional):
```bash
npm run db:studio
```

This opens a GUI at http://localhost:5555 to inspect your database.

---

## Database Setup

### SQLite (Development)

PayLog uses SQLite for development:
- **Pros**: No external database, easy setup, fast
- **Cons**: Single-file database, limited concurrent writes

**Location**: `dev.db` in project root

**Reset database** (if needed):
```bash
rm dev.db
npm run db:migrate
npm run db:seed
```

### PostgreSQL (Production)

For production, use PostgreSQL:

1. **Update `.env`**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/paylog"
```

2. **Update `schema.prisma`**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. **Run migrations**:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

---

## Environment Configuration

### Development Environment

**File**: `.env`

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<your-generated-secret>"

# Node Environment
NODE_ENV="development"
```

### Production Environment

**File**: `.env.production`

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/paylog"

# NextAuth
NEXTAUTH_URL="https://paylog.example.com"
NEXTAUTH_SECRET="<secure-random-string>"

# Node Environment
NODE_ENV="production"
```

**Generate production secret**:
```bash
openssl rand -base64 32
```

---

## Running the Application

### Development Server

Start the development server:

```bash
npm run dev
```

**Output**:
```
▲ Next.js 14.2.15
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000

✓ Ready in 2.5s
```

**Features**:
- Hot reload (changes appear instantly)
- Fast Refresh (preserves component state)
- Error overlay (shows errors in browser)
- TypeScript checking in real-time

### Production Build

Build for production:

```bash
npm run build
```

**Output**:
```
▲ Next.js 14.2.15

✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (12/12)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                   137 B          87.1 kB
├ ○ /login                              2.1 kB         89.2 kB
├ ○ /dashboard                          5.4 kB         92.5 kB
└ ○ /invoices                           3.8 kB         90.9 kB

○  (Static)  automatically rendered as static HTML
```

Start production server:

```bash
npm start
```

---

## Testing the Setup

### 1. Access Application

Open your browser and navigate to:

```
http://localhost:3000
```

You should be redirected to `/login`.

### 2. Login

Use the default super admin credentials:

```
Email: admin@paylog.com
Password: admin123
```

Click "Sign In".

### 3. Verify Dashboard

After login, you should see:
- Dashboard page with KPI cards
- Sidebar navigation on the left
- Header with user info and logout button

### 4. Test Navigation

Click through the sidebar links:
- **Dashboard**: KPI overview
- **Invoices**: Invoice list (empty initially)
- **Settings**: User settings
- **Admin**: Admin panel (super admin only)
- **Reports**: Reports page

### 5. Test Panel System

1. Go to **Invoices** page
2. Click "Create Invoice" button (if available)
3. A panel should slide in from the right
4. Press ESC to close the panel

### 6. Run Linter

```bash
npm run lint
```

Should output: `✓ No ESLint warnings or errors`

### 7. Check TypeScript

```bash
npx tsc --noEmit
```

Should complete with no errors.

### 8. Test Build

```bash
npm run build
```

Should complete successfully with no errors.

---

## Troubleshooting

### Issue: Port 3000 Already in Use

**Error**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:

1. Find process using port 3000:
```bash
# macOS/Linux
lsof -ti:3000

# Windows
netstat -ano | findstr :3000
```

2. Kill the process:
```bash
# macOS/Linux
kill -9 $(lsof -ti:3000)

# Windows
taskkill /PID <PID> /F
```

3. Or use a different port:
```bash
PORT=3001 npm run dev
```

### Issue: Database Connection Error

**Error**:
```
PrismaClient is unable to connect to the database
```

**Solution**:

1. Verify `.env` file exists:
```bash
cat .env
```

2. Regenerate Prisma Client:
```bash
npm run db:generate
```

3. Reset database:
```bash
rm dev.db
npm run db:migrate
npm run db:seed
```

### Issue: NextAuth Session Error

**Error**:
```
[next-auth][error][JWT_SESSION_ERROR]
```

**Solution**:

1. Verify `NEXTAUTH_SECRET` is set:
```bash
grep NEXTAUTH_SECRET .env
```

2. Generate new secret:
```bash
openssl rand -base64 32
```

3. Update `.env` with new secret

4. Clear browser cookies:
   - Chrome: Settings → Privacy → Clear browsing data
   - Firefox: Settings → Privacy → Clear Data

5. Restart dev server:
```bash
npm run dev
```

### Issue: Module Not Found

**Error**:
```
Module not found: Can't resolve '@/components/...'
```

**Solution**:

1. Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Verify `tsconfig.json` has path alias:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

3. Restart TypeScript server (VS Code):
   - Cmd/Ctrl + Shift + P
   - "TypeScript: Restart TS Server"

### Issue: Prisma Client Not Generated

**Error**:
```
Cannot find module '@prisma/client'
```

**Solution**:

```bash
npm run db:generate
```

If that fails:
```bash
npm install @prisma/client
npm run db:generate
```

### Issue: Login Redirect Loop

**Problem**: Redirects between /login and /dashboard infinitely

**Solution**:

1. Verify `NEXTAUTH_URL` matches your domain:
```env
NEXTAUTH_URL="http://localhost:3000"
```

2. Clear all cookies for localhost

3. Restart dev server

4. Try login in incognito/private window

### Issue: Panel Not Opening

**Problem**: Click "Create Invoice" but panel doesn't appear

**Solution**:

1. Check browser console for errors (F12)

2. Verify `PanelProvider` is in layout:
```tsx
// app/(dashboard)/layout.tsx
import { PanelProvider } from '@/components/panels';

export default function DashboardLayout({ children }) {
  return (
    <>
      {children}
      <PanelProvider />
    </>
  );
}
```

3. Verify panel type is registered in `components/panels/panel-provider.tsx`

4. Clear browser cache and reload

---

## Next Steps

### Explore the Application

1. **Create an Invoice**:
   - Go to Invoices page
   - Click "Create Invoice"
   - Fill out the form
   - Submit and see it in the list

2. **Test Panel System**:
   - Click on an invoice to view details (Level 1 panel)
   - Click "Edit" to open edit form (Level 2 panel)
   - Press ESC to close panels

3. **Inspect Database**:
   - Run `npm run db:studio`
   - Browse tables and records
   - See seeded data

### Development Workflow

1. **Make Code Changes**:
   - Edit files in `app/`, `components/`, etc.
   - Changes appear instantly (hot reload)

2. **Run Linter**:
```bash
npm run lint
```

3. **Check Types**:
```bash
npx tsc --noEmit
```

4. **Test Build**:
```bash
npm run build
```

### Read Documentation

- [README.md](README.md) - Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [API.md](API.md) - Server Actions API
- [SPRINTS.md](SPRINTS.md) - Sprint plan
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
- [docs/PANEL_SYSTEM.md](docs/PANEL_SYSTEM.md) - Panel system guide

### Join Development

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Sprint Progress

**Completed**:
- ✅ Sprint 1: Foundation Setup (13 SP)
- ✅ Sprint 2: Panels + Invoice CRUD (22 SP)

**Next**:
- 🔲 Sprint 3: Payments & Workflows (16 SP)

See [SPRINTS.md](SPRINTS.md) for full sprint plan.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema to DB (no migration) |
| `npm run db:migrate` | Create and run migration |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed database with sample data |

---

## Default Credentials

**Super Admin**:
```
Email: admin@paylog.com
Password: admin123
Role: super_admin
```

**Change password after first login** (Sprint 10 feature).

---

## Support

For help:

1. Check [Troubleshooting](#troubleshooting) section
2. Review [ARCHITECTURE.md](ARCHITECTURE.md)
3. See [CONTRIBUTING.md](CONTRIBUTING.md)
4. Contact development team

---

## Checklist

Use this checklist to verify your setup:

- [ ] Node.js 18+ installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created and configured
- [ ] `NEXTAUTH_SECRET` generated
- [ ] Prisma Client generated (`npm run db:generate`)
- [ ] Database migrated (`npm run db:migrate`)
- [ ] Database seeded (`npm run db:seed`)
- [ ] Dev server started (`npm run dev`)
- [ ] Application opens at http://localhost:3000
- [ ] Login successful with admin@paylog.com / admin123
- [ ] Dashboard loads correctly
- [ ] Sidebar navigation works
- [ ] No console errors
- [ ] Linter passes (`npm run lint`)
- [ ] TypeScript check passes (`npx tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)

**All checked? You're ready to develop!**

---

## Version History

| Version | Date | Notes |
|---------|------|-------|
| 0.2.0 | 2025-10-08 | Added Sprint 2 features (panels, invoice CRUD) |
| 0.1.0 | 2025-10-08 | Initial setup guide |

---

## License

Internal use only. Not for public distribution.
