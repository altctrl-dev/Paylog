# PayLog - Invoice Management System

Internal invoice tracking and payment management system built with Next.js 14.

**Version**: 0.2.3 | **Sprint Progress**: 2/12 (20.7% complete)

---

## Features

### Sprint 1 (Complete)
- User authentication and authorization (NextAuth v5)
- Role-based access control (standard_user, admin, super_admin)
- Dashboard with KPIs
- Responsive layout with sidebar navigation

### Sprint 2 (Complete)
- **Stacked Panel System**: Microsoft 365-style slide-out panels (3 levels)
  - Level 2 forms now 700px wide for better field visibility
- **Invoice CRUD**: Full create, read, update, delete operations
  - 12-field invoice form with comprehensive data capture
  - Invoice period tracking (start/end dates)
  - TDS (Tax Deducted at Source) flag
  - Sub entity tracking (divisions/departments)
  - Internal notes field
  - Vendor now required for all invoices
  - All fields mandatory except Notes (with visual asterisk indicators)
  - Real-time validation with immediate feedback
  - Proper form submission with disabled state on errors
- React Query integration with optimistic updates
- Zod validation schemas with custom refinements
- Server Actions for data mutations

### Planned Features
- Payment tracking and workflows (Sprint 3)
- Search, filters, and reporting (Sprint 4)
- Email notifications & user-created master data (Sprint 5)
- File attachments (Sprint 6)
- Advanced invoice features (Sprint 7)
- Master data management - admin tools (Sprint 8)
- Archive request workflow (Sprint 9)
- User management (Sprint 10)
- Dashboard & analytics (Sprint 11)
- Production polish & testing (Sprint 12)

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14.2.15 (App Router)
- **Language**: TypeScript 5.x (Strict Mode)
- **UI**: Shadcn/ui + Tailwind CSS 3.4.1
- **Animations**: Framer Motion 11.9.0
- **State Management**:
  - Client State: Zustand 4.5.5 (panel system)
  - Server State: TanStack Query 5.56.2 (data fetching)

### Backend
- **Runtime**: Node.js 18+
- **Database**: SQLite (development), PostgreSQL (production-ready)
- **ORM**: Prisma 5.20.0
- **Authentication**: NextAuth.js v5 (beta.22)
- **Forms**: React Hook Form 7.64.0 + Zod 3.23.8

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm/pnpm package manager
- Git

### Installation

1. **Clone and install**:
```bash
git clone <repository-url>
cd paylog-3
npm install
```

2. **Set up environment**:
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with-openssl>"
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

3. **Initialize database**:
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

4. **Start development server**:
```bash
npm run dev
```

5. **Open browser**:

Visit [http://localhost:3000](http://localhost:3000)

### Default Login Credentials

The seed script creates a super admin user:

```
Email: admin@paylog.com
Password: admin123
```

---

## Project Structure

```
paylog-3/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (login)
│   │   ├── layout.tsx            # Centered layout
│   │   └── login/page.tsx        # Login page
│   ├── (dashboard)/              # Protected route group
│   │   ├── layout.tsx            # Dashboard layout (sidebar + header)
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── invoices/page.tsx     # Invoice list
│   │   ├── admin/page.tsx        # Admin panel
│   │   ├── settings/page.tsx     # Settings
│   │   └── reports/page.tsx      # Reports
│   ├── actions/                  # Server Actions
│   │   └── invoices.ts           # Invoice CRUD
│   ├── api/                      # API Routes
│   │   └── auth/[...nextauth]/   # NextAuth
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Root redirect
│   └── globals.css               # Global styles
│
├── components/                   # React components
│   ├── ui/                       # Shadcn/ui components
│   ├── layout/                   # Sidebar, header
│   ├── panels/                   # Stacked panel system
│   ├── invoices/                 # Invoice components
│   ├── auth/                     # Login form
│   └── providers/                # React Query provider
│
├── hooks/                        # Custom React hooks
│   ├── use-panel.ts              # Panel operations
│   ├── use-panel-stack.ts        # Panel state
│   └── use-toast.ts              # Toast notifications
│
├── lib/                          # Utility libraries
│   ├── auth.ts                   # NextAuth config
│   ├── db.ts                     # Prisma client
│   ├── utils.ts                  # Helper functions
│   ├── store/                    # Zustand stores
│   │   └── panel-store.ts        # Panel state
│   └── validations/              # Zod schemas
│       ├── auth.ts               # Login validation
│       └── invoice.ts            # Invoice validation
│
├── types/                        # TypeScript definitions
│   ├── panel.ts                  # Panel types
│   ├── invoice.ts                # Invoice types
│   └── next-auth.d.ts            # NextAuth augmentation
│
├── prisma/                       # Prisma ORM
│   └── seed.ts                   # Database seed
│
├── docs/                         # Documentation
│   ├── API.md                    # API documentation
│   ├── ARCHITECTURE.md           # System architecture
│   ├── CHANGELOG.md              # Version history
│   ├── CONTRIBUTING.md           # Development guidelines
│   ├── PANEL_SYSTEM.md           # Panel system guide
│   ├── SETUP.md                  # Setup instructions
│   └── SPRINTS.md                # Sprint plan
│
├── schema.prisma                 # Database schema (root)
├── middleware.ts                 # Route protection
├── .env                          # Environment variables
├── README.md                     # This file
└── package.json                  # Dependencies
```

---

## Database Schema

PayLog uses 17 models implementing Phase 1 & Sprint 2 features:

### Core Models
- **User**: User accounts with role-based access
- **Invoice**: Invoice tracking with comprehensive fields
- **Vendor**: Vendor directory (required for invoices)
- **Category**: Invoice categorization
- **Payment**: Payment tracking
- **PaymentType**: Payment method types
- **SubEntity**: Divisions/departments/branches (NEW)

### Advanced Features
- **InvoiceProfile**: Profile-based visibility control
- **UserProfileVisibility**: User access to private profiles
- **ArchiveRequest**: Soft delete approval workflow
- **MasterDataRequest**: User-created master data with admin approval

### Phase 1 Features
- **On Hold Workflow**: Place invoices on hold with reason
- **Resubmission Counter**: Track submission attempts (max 3)
- **Super Admin Protection**: Cannot deactivate last super admin
- **Hidden Invoices**: Hide invoices from default views
- **Profile Visibility**: Control who can see specific invoice profiles

### Sprint 5 Features (Planned)
- **User-Created Master Data**: Request vendors, categories, invoice profiles, payment types
- **Admin Approval Workflow**: Approve/reject with inline editing
- **Resubmission Logic**: Up to 3 attempts with rejection reasons
- **Email Notifications**: Lifecycle notifications for invoices and master data requests

See `schema.prisma` for complete schema details.

---

## Stacked Panel System

### Overview

Microsoft 365-style slide-out panels with 3 levels:

| Level | Width | Use Case |
|-------|-------|----------|
| Level 1 | 350px | Detail views (read-only) |
| Level 2 | 700px | Edit forms (comprehensive data entry) |
| Level 3 | 500px | Confirmation dialogs |

### Features
- Smooth spring animations (Framer Motion)
- Keyboard navigation (ESC to close)
- Responsive (full-screen on mobile)
- GPU-accelerated transforms
- Portal rendering (no z-index conflicts)
- Accessibility (ARIA roles, focus management)

### Usage

```typescript
'use client';

import { usePanel } from '@/hooks/use-panel';

function MyComponent() {
  const { openPanel } = usePanel();

  return (
    <Button onClick={() => openPanel('invoice-detail', { invoiceId: 123 })}>
      View Invoice
    </Button>
  );
}
```

See [docs/PANEL_SYSTEM.md](docs/PANEL_SYSTEM.md) for complete documentation.

---

## Available Scripts

### Development
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to DB (no migration)
npm run db:migrate   # Create and run migration
npm run db:studio    # Open Prisma Studio GUI
npm run db:seed      # Seed database with sample data
```

---

## Authentication & Authorization

### Roles

| Role | Permissions |
|------|-------------|
| **standard_user** | Create invoices, view own invoices |
| **admin** | Approve/reject invoices, manage vendors/categories |
| **super_admin** | Full system access, user management |

### Protected Routes

All routes under `/dashboard/*` require authentication. Middleware automatically redirects unauthenticated users to `/login`.

### Role-Based Access

Example RBAC check in Server Action:

```typescript
'use server';

import { auth } from '@/lib/auth';

export async function approveInvoice(invoiceId: number) {
  const session = await auth();

  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  if (!['admin', 'super_admin'].includes(session.user.role)) {
    return { error: 'Forbidden: Admin access required' };
  }

  // Proceed with approval...
}
```

---

## API Documentation

PayLog uses **Next.js Server Actions** for all data mutations. See [docs/API.md](docs/API.md) for complete API documentation.

### Invoice Actions

- `getInvoices()` - Fetch all invoices
- `getInvoiceById({ id })` - Fetch single invoice
- `createInvoice(data)` - Create new invoice
- `updateInvoice(data)` - Update invoice
- `deleteInvoice({ id })` - Delete invoice
- `placeInvoiceOnHold({ id, hold_reason })` - Place on hold (admin)
- `releaseInvoiceFromHold({ id })` - Release from hold
- `hideInvoice({ id, hidden_reason })` - Hide invoice (admin)
- `unhideInvoice({ id })` - Unhide invoice

### Example Usage

```typescript
import { createInvoice } from '@/app/actions/invoices';

const result = await createInvoice({
  invoice_number: 'INV-001',
  invoice_amount: 1500.00,
  vendor_id: 1,
  category_id: 2,
});

if (result.error) {
  toast.error(result.error);
} else {
  toast.success('Invoice created!');
}
```

---

## Sprint Progress

| Sprint | Status | Description |
|--------|--------|-------------|
| Sprint 1 | ✅ Complete | Foundation Setup (13 SP) |
| Sprint 2 | ✅ Complete | Panels + Invoice CRUD (24 SP) |
| Sprint 3 | 🔲 Planned | Payments & Workflows (16 SP) |
| Sprint 4 | 🔲 Planned | Search & Reporting (15 SP) |
| Sprint 5 | 🔲 Planned | Email & Master Data Requests (26 SP) |
| Sprint 6 | 🔲 Planned | File Attachments (12 SP) |
| Sprint 7 | 🔲 Planned | Advanced Features (14 SP) |
| Sprint 8 | 🔲 Planned | Master Data Management (13 SP) |
| Sprint 9 | 🔲 Planned | Archive Requests (11 SP) |
| Sprint 10 | 🔲 Planned | User Management (12 SP) |
| Sprint 11 | 🔲 Planned | Dashboard & Analytics (14 SP) |
| Sprint 12 | 🔲 Planned | Polish & Testing (9 SP) |

**Total**: 179 Story Points | **Complete**: 37 SP (20.7%)

See [docs/SPRINTS.md](docs/SPRINTS.md) for detailed sprint breakdown.

---

## Documentation

All documentation is organized in the `docs/` folder:

- [README.md](README.md) - This file (project overview)
- [docs/SETUP.md](docs/SETUP.md) - Detailed setup instructions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture and design patterns
- [docs/API.md](docs/API.md) - API documentation (Server Actions)
- [docs/SPRINTS.md](docs/SPRINTS.md) - Complete sprint plan
- [docs/CHANGELOG.md](docs/CHANGELOG.md) - Version history
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) - Development guidelines
- [docs/PANEL_SYSTEM.md](docs/PANEL_SYSTEM.md) - Panel system guide

---

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Functional components with hooks
- Server Components by default

### Commit Conventions
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(invoices): add bulk approve functionality
fix(auth): resolve login redirect loop
docs: update API documentation
```

### Branch Naming
```bash
feat/invoice-export
fix/login-redirect
docs/api-documentation
```

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for complete guidelines.

---

## Deployment

### Environment Variables (Production)

```env
DATABASE_URL="postgresql://user:password@host:5432/paylog"
NEXTAUTH_URL="https://paylog.example.com"
NEXTAUTH_SECRET="<secure-random-string>"
NODE_ENV="production"
```

### Build Process

```bash
npm install
npm run db:generate
npm run db:migrate
npm run build
npm start
```

### Recommended Platforms

- **Railway**: Automatic PostgreSQL provisioning
- **Vercel**: Edge functions, global CDN
- **Docker**: Full control, self-hosted

---

## Technology Versions

- Next.js: 14.2.15
- React: 18.3.1
- TypeScript: 5.x
- Prisma: 5.20.0
- NextAuth: 5.0.0-beta.22
- Tailwind CSS: 3.4.1
- Framer Motion: 11.9.0
- Node.js: 18+ required

---

## Troubleshooting

### Database Connection Issues

**Problem**: `PrismaClient` errors or migrations fail

**Solution**:
```bash
# Regenerate Prisma Client
npm run db:generate

# Reset database (caution: data loss)
rm dev.db
npm run db:migrate
npm run db:seed
```

### Authentication Errors

**Problem**: NextAuth session errors

**Solution**:
1. Verify `NEXTAUTH_SECRET` is set in `.env`
2. Verify `NEXTAUTH_URL` matches your domain
3. Clear browser cookies and try again

### Panel Not Opening

**Problem**: Panel doesn't appear when clicked

**Solution**:
1. Ensure `PanelProvider` is added to layout
2. Check browser console for errors
3. Verify panel type is registered in `panel-provider.tsx`

### Build Errors

**Problem**: TypeScript or ESLint errors during build

**Solution**:
```bash
# Check for type errors
npx tsc --noEmit

# Fix linting issues
npm run lint

# Check for missing dependencies
npm install
```

---

## Support

For questions or issues:

1. Check [docs/SETUP.md](docs/SETUP.md) for setup help
2. Review [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details
3. See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for development guidelines
4. Contact the development team

---

## License

Internal use only. Not for public distribution.

---

## Changelog

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for version history.

**Current Version**: 0.2.3 (Sprint 2 - Critical Form Fixes & Validation)
**Next Version**: 0.3.0 (Sprint 3 - Payments & Workflows)
**Future Version**: 0.5.0 (Sprint 5 - Email & Master Data Requests)
