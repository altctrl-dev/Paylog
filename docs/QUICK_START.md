# Quick Start Guide - PayLog Development

## Current Project Status

**Sprint**: 9A of 13 (In Progress - 3/10 phases complete)
**Story Points**: 130/183 (71.0% complete)
**Last Session**: October 23, 2025 - Sprint 9A Database Migration

---

## Start Development Server

```bash
cd /Users/althaf/Projects/paylog-3
npm run dev
```

Server runs at: **http://localhost:3000**

---

## Login Credentials

```
Email: admin@paylog.com
Password: admin123
Role: super_admin
```

---

## Project Architecture

### Tech Stack
- **Framework**: Next.js 14.2.33 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 17 (local) / PostgreSQL (Railway production) - Prisma ORM
- **Auth**: NextAuth v5 (credentials provider)
- **UI**: Tailwind CSS + Shadcn/ui
- **Email**: Resend (transactional emails)
- **State**: Zustand (panel system), React Query (server state)

### Key Features Completed
1. ✅ Authentication & RBAC (3 roles)
2. ✅ Stacked panel system (3 levels, Microsoft 365 style)
3. ✅ Invoice CRUD (12 fields, comprehensive)
4. ✅ Payment tracking & workflow transitions
5. ✅ Search, filters, sorting, reporting with charts
6. ✅ Email notifications (Resend integration)
7. ✅ User-created master data requests
8. ✅ Admin approval workflow
9. ✅ File attachments (drag-drop upload, secure storage)
10. ✅ Multi-currency support foundation (50 ISO 4217 currencies)
11. ✅ Enhanced master data (Entity with address/country, Vendor with address/GST/bank details)
12. ✅ PostgreSQL 17 migration (local + Railway production)

---

## Important File Locations

### Configuration
- `.env` - Environment variables (not in git)
- `.env.example` - Template for environment setup
- `prisma/schema.prisma` - Database schema

### Documentation
- `docs/SPRINTS.md` - Sprint plan and progress tracker
- `docs/SESSION_HANDOFF_OCT15.md` - Latest session details
- `docs/QUICK_START.md` - This file

### Email System
- `lib/email/service.ts` - Email service (396 lines)
- `lib/email/config.ts` - Email configuration
- `lib/email/types.ts` - TypeScript types

### Server Actions
- `app/actions/invoices.ts` - Invoice operations
- `app/actions/master-data-requests.ts` - User request operations
- `app/actions/admin/master-data-approval.ts` - Admin approval operations

### UI Components
- `components/panels/` - Panel system components
- `components/master-data/` - Master data forms and lists
- `app/(dashboard)/` - Main application pages

---

## Current Email Configuration

### Environment Variables
```env
EMAIL_ENABLED=true
RESEND_API_KEY=re_cJ73o2EC_N2Xc1p3xLznWCjwFm2JXgdYP
EMAIL_FROM=onboarding@resend.dev
ADMIN_EMAILS=althaf@servsys.com,admin2@servsys.com
EMAIL_PREVIEW=false
```

### Status
✅ **Working** - Emails successfully delivered using Resend testing domain

### Testing Email Notifications
1. Go to http://localhost:3000/settings
2. Click "Request Vendor" (or any entity type)
3. Fill in form
4. Click "Submit for Approval"
5. Check email inbox at `althaf@servsys.com`

### For Production
To use custom domain `notifications@servsys.com`:
1. Add domain at https://resend.com/domains
2. Add DNS records (DKIM, SPF, MX) to DNS provider
3. Wait for verification (5-30 minutes)
4. Update `.env`: `EMAIL_FROM=notifications@servsys.com`
5. Restart server

---

## Sprint 9A Database Changes (October 23, 2025)

### New Prisma Models

**Currency** (Multi-currency support):
- Fields: code, name, symbol, is_active
- 50 ISO 4217 currencies seeded (all inactive by default)
- Used in: Invoice, InvoiceProfile

**Entity** (NEW table, coexists with SubEntity):
- Fields: name, code, address, country, is_active
- Migrated 3 entities from SubEntity
- Country stored as ISO 3166-1 alpha-2 codes (US, IN, GB)
- Used in: Invoice, InvoiceProfile

### Enhanced Models

**Vendor**:
- NEW: address (string, optional)
- NEW: gst_exemption (boolean, required, default false)
- NEW: bank_details (text, optional)

**Category**:
- UPDATED: description (required, was optional)
- Backfilled with "No description provided"

**Invoice**:
- NEW: currency_id (foreign key to Currency, nullable)
- NEW: entity_id (foreign key to Entity, nullable)

### Removed Models

**ArchiveRequest**:
- DROPPED (0 pending requests confirmed)
- Admin direct archive/unarchive via trash icon instead

### Post-Migration Admin Tasks

After implementing UI in remaining phases:
1. Activate currencies: `UPDATE currencies SET is_active = true WHERE code IN ('USD', 'INR');`
2. Update entity addresses: Replace "Migration: Address pending" with real addresses
3. Update entity countries: Replace default 'US' with correct ISO alpha-2 codes
4. Update vendor fields: Add addresses, GST exemption, bank details via admin UI

---

## PostgreSQL Setup (Local Development)

### Initial Setup (Already Done)
PostgreSQL 17 is installed and running locally. If you need to set it up again:

```bash
# Install PostgreSQL 17
brew install postgresql@17

# Start PostgreSQL service (runs on login)
brew services start postgresql@17

# Create database
/opt/homebrew/opt/postgresql@17/bin/createdb paylog_dev

# Apply schema
npx prisma db push

# Seed with initial data
npx prisma db seed
```

### Database Connection
Local: `postgresql://althaf@localhost:5432/paylog_dev`
Production: Set in Railway environment variables

### PostgreSQL Service Management
```bash
# Check if running
brew services list | grep postgresql@17

# Stop PostgreSQL
brew services stop postgresql@17

# Start PostgreSQL
brew services start postgresql@17

# Restart PostgreSQL
brew services restart postgresql@17
```

---

## Common Development Tasks

### Reset Database
```bash
npx prisma db push --force-reset
npx prisma db seed
```

### Restart Server After .env Changes
```bash
lsof -ti:3000 | xargs kill -9
npm run dev
```

### View Database in Prisma Studio
```bash
npx prisma studio
```
Opens at: http://localhost:5555

### Check TypeScript Errors
```bash
npm run typecheck
```

### Run Linter
```bash
npm run lint
```

---

## File Attachments (Sprint 6) ✅

### Uploading Files

1. Open an invoice for editing
2. Scroll to "Attachments" section at bottom of form
3. Drag files onto the drop zone OR click "Browse files"
4. Supported file types:
   - PDF documents (.pdf)
   - Images (.png, .jpg, .jpeg)
   - Word documents (.docx)
5. File size limit: 10MB per file
6. Maximum 10 files per invoice
7. Upload progress shown with percentage
8. Success notification appears when complete

### Downloading Attachments

1. Click the download button on any attachment card
2. File opens in a new browser tab
3. Use browser's save function to save to your computer

### Deleting Attachments

1. Click the delete button (trash icon) on attachment card
2. Confirm deletion in dialog
3. File is soft-deleted (recoverable by admin if needed)

### Permissions

**Who can upload?**
- Invoice creator (owner)
- Admins
- Super admins

**Who can delete?**
- File uploader
- Invoice creator (owner)
- Admins
- Super admins

**Restrictions**:
- Cannot upload to paid invoices
- Cannot upload to rejected invoices
- Cannot upload to hidden invoices

### Storage Configuration

**.env Settings**:
```env
# Storage Provider
STORAGE_PROVIDER=local

# Local filesystem (default for MVP)
UPLOAD_DIR=./uploads

# File upload limits
MAX_FILE_SIZE=10485760              # 10MB in bytes
MAX_FILES_PER_INVOICE=10

# Allowed file types
ALLOWED_FILE_TYPES=.pdf,.png,.jpg,.jpeg,.docx
```

### Troubleshooting

**Upload fails with "Invalid file type"**:
- Check file extension is one of: .pdf, .png, .jpg, .jpeg, .docx
- Ensure file is not corrupted
- Try exporting/saving file again from original application

**Upload fails with "File size exceeds maximum"**:
- File is larger than 10MB
- Compress PDF or resize image
- Split into multiple smaller files

**"Permission denied" error**:
- Verify you are the invoice creator or an admin
- Check invoice status (cannot upload to paid/rejected/hidden invoices)

**Files not showing after upload**:
- Refresh the page
- Check browser console for errors
- Verify you have permission to view the invoice

**Download doesn't work**:
- Check file still exists in system
- Verify you have permission to view the invoice
- Try right-click → "Open in new tab"

### Security Features

The file attachment system includes comprehensive security:

- **MIME type validation**: Magic bytes check prevents file spoofing (e.g., .exe renamed to .pdf)
- **Path traversal prevention**: Filenames sanitized to prevent directory traversal attacks
- **File size limits**: 10MB per file prevents disk space exhaustion
- **File count limits**: 10 files per invoice prevents abuse
- **Authorization checks**: Permission verified before every upload/download/delete
- **Soft delete**: Files preserved for audit trail and recovery

See [docs/ATTACHMENTS.md](./ATTACHMENTS.md) for technical details.

---

## Next Sprint: Sprint 7 (Advanced Invoice Features)

### Goal
Implement Phase 1 advanced features

### Key Deliverables
- [ ] Hidden invoice feature (admin only)
- [ ] Invoice profiles (visibility rules)
- [ ] Submission counter display
- [ ] Bulk operations (approve, reject, export)
- [ ] Invoice duplication

### Estimated Story Points
14 SP

---

## Troubleshooting

### Emails Not Sending
1. Check EmailService initialization logs on startup
2. Look for `[Email Preview]` logs (if EMAIL_PREVIEW=true)
3. Check error logs for `[Email] Attempt X/3 failed`
4. Verify RESEND_API_KEY is set correctly
5. Restart server after .env changes

### Server Won't Start
1. Kill existing process: `lsof -ti:3000 | xargs kill -9`
2. Clear cache: `rm -rf .next node_modules/.cache`
3. Reinstall: `npm install`
4. Check for syntax errors: `npm run typecheck`

### Database Issues
1. Check database file exists: `ls -la prisma/dev.db`
2. Reset database: `npx prisma db push --force-reset`
3. Re-seed: `npx prisma db seed`
4. Check Prisma logs: Enable with `DEBUG=prisma:*`

### Panel System Not Working
1. Check z-index conflicts (panel range: 10000-10003)
2. Verify PanelContainer is rendered in layout
3. Check Zustand store state: `usePanelStore.getState()`
4. Look for console errors related to Framer Motion

---

## Useful Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Check TypeScript errors
```

### Database
```bash
npx prisma studio                    # Open Prisma Studio
npx prisma db push                   # Push schema to database
npx prisma db seed                   # Seed database
npx prisma migrate dev --name X      # Create migration
npx prisma generate                  # Regenerate Prisma Client
```

### Git
```bash
git status                           # Check status
git add .                            # Stage all changes
git commit -m "message"              # Commit changes
git log --oneline -10                # View recent commits
```

---

## Project Structure

```
paylog-3/
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── invoices/         # Invoice management
│   │   ├── reports/          # Reporting & analytics
│   │   ├── settings/         # User settings
│   │   └── admin/            # Admin panel & master data
│   ├── actions/              # Server Actions
│   │   ├── invoices.ts
│   │   ├── master-data-requests.ts
│   │   └── admin/
│   └── api/                  # API routes (NextAuth)
├── components/               # React components
│   ├── panels/               # Panel system
│   ├── master-data/          # Master data forms
│   └── ui/                   # Shadcn components
├── lib/                      # Utility libraries
│   ├── auth.ts               # NextAuth config
│   ├── db.ts                 # Prisma client
│   └── email/                # Email service
├── prisma/                   # Database
│   ├── schema.prisma         # Schema definition
│   ├── dev.db                # SQLite database
│   └── seed.ts               # Seed script
├── docs/                     # Documentation
│   ├── SPRINTS.md            # Sprint plan
│   ├── SESSION_HANDOFF_OCT15.md
│   └── QUICK_START.md        # This file
└── .env                      # Environment variables
```

---

## Key Concepts

### Panel System
- **Level 1** (350px): Read-only detail views
- **Level 2** (700px): Edit forms
- **Level 3** (500px): Confirmation dialogs
- **Z-Index**: 10000-10003 (isolated from main app)
- **Animation**: GPU-accelerated translateX
- **State**: Zustand store (`usePanelStore`)

### Invoice Workflow
1. **Pending** - Awaiting admin approval
2. **Approved** - Approved by admin, now unpaid
3. **Unpaid** - No payments received
4. **Partial** - Some payments received
5. **Paid** - Fully paid
6. **Rejected** - Rejected by admin (can resubmit)
7. **On Hold** - Admin placed on hold

### Master Data Request Workflow
1. **Draft** - User creating request
2. **Pending Approval** - Submitted to admins (email sent)
3. **Approved** - Admin approved (entity created, email sent)
4. **Rejected** - Admin rejected (email sent, can resubmit)

### RBAC (Role-Based Access Control)
- **Standard User**: Create invoices, make payments, request master data
- **Admin**: Approve invoices, approve/reject master data requests
- **Super Admin**: All admin privileges + user management

---

## Documentation References

### Session Handoffs
- **SESSION_HANDOFF_OCT15.md** - Complete debugging session for email notifications

### Architecture Docs
- **SPRINTS.md** - Sprint plan with technical details for each sprint

### External Docs
- **Next.js 14**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **NextAuth v5**: https://authjs.dev
- **Shadcn/ui**: https://ui.shadcn.com
- **Resend**: https://resend.com/docs

---

## Contact & Support

### Resend Dashboard
- **Domains**: https://resend.com/domains
- **Logs**: https://resend.com/logs
- **Docs**: https://resend.com/docs

### Prisma Studio
```bash
npx prisma studio
# Opens at http://localhost:5555
```

### Development Server
```bash
npm run dev
# Opens at http://localhost:3000
```

---

**Last Updated**: October 15, 2025
**Version**: 1.0
**Status**: Current
