# Contributing to PayLog

Thank you for contributing to the PayLog Invoice Management System! This guide will help you understand our development workflow and coding standards.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Conventions](#commit-conventions)
- [Branch Naming](#branch-naming)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Code Review Checklist](#code-review-checklist)

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Git for version control
- Code editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd paylog-3
```

2. **Install dependencies**:
```bash
npm install
# or
pnpm install
```

3. **Set up environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize database**:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

5. **Start development server**:
```bash
npm run dev
```

6. **Verify setup**:
- Open http://localhost:3000
- Login with: admin@paylog.com / admin123
- Ensure all pages load correctly

---

## Development Workflow

### 1. Create a New Branch

Always create a feature branch from `main`:

```bash
git checkout main
git pull origin main
git checkout -b feat/invoice-export
```

See [Branch Naming](#branch-naming) for naming conventions.

### 2. Make Your Changes

- Write clean, maintainable code
- Follow [Coding Standards](#coding-standards)
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Run type checker
npx tsc --noEmit

# Run tests (when available)
npm test

# Test build
npm run build
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add invoice export functionality"
```

See [Commit Conventions](#commit-conventions) for message format.

### 5. Push and Create PR

```bash
git push origin feat/invoice-export
```

Then create a Pull Request on GitHub/GitLab.

---

## Coding Standards

### TypeScript

**Always use strict types**:

```typescript
// Good
function calculateTotal(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + inv.invoice_amount, 0);
}

// Bad
function calculateTotal(invoices: any) {
  return invoices.reduce((sum, inv) => sum + inv.invoice_amount, 0);
}
```

**Avoid `any` type**:
- Use `unknown` if type is truly unknown
- Use specific types or generics
- Use `never` for impossible cases

**Use type inference when obvious**:

```typescript
// Good (type inferred)
const invoiceCount = 10;

// Unnecessary
const invoiceCount: number = 10;
```

### React Components

**Use functional components with hooks**:

```typescript
// Good
function InvoiceList({ status }: { status: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  return <div>{/* ... */}</div>;
}

// Bad (class component)
class InvoiceList extends React.Component {
  // ...
}
```

**Use `'use client'` only when necessary**:

```typescript
// Only use for components with:
// - useState, useEffect, event handlers
// - Browser APIs (window, document)
// - Third-party client libraries

'use client';

import { useState } from 'react';

export function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**Server Components by default**:

```typescript
// No 'use client' needed for:
// - Data fetching
// - Static content
// - Server Actions

async function InvoiceList() {
  const invoices = await getInvoices();
  return <div>{/* ... */}</div>;
}
```

### Component Structure

**Organize components logically**:

```
components/
├── ui/              # Reusable UI primitives (Button, Input, etc.)
├── layout/          # Layout components (Sidebar, Header)
├── panels/          # Panel system components
├── invoices/        # Invoice-specific components
│   ├── invoice-list.tsx
│   ├── invoice-detail-panel.tsx
│   └── invoice-form-panel.tsx
└── [feature]/       # Feature-specific components
```

**Component file structure**:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Invoice } from '@/types/invoice';

// Types/Interfaces first
interface InvoiceCardProps {
  invoice: Invoice;
  onEdit: (id: number) => void;
}

// Component
export function InvoiceCard({ invoice, onEdit }: InvoiceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Handlers
  const handleEdit = () => {
    onEdit(invoice.id);
  };

  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Server Actions

**Follow this pattern**:

```typescript
'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createInvoiceSchema } from '@/lib/validations/invoice';
import type { Invoice } from '@prisma/client';

interface CreateInvoiceResult {
  data?: Invoice;
  error?: string;
}

export async function createInvoice(
  data: unknown
): Promise<CreateInvoiceResult> {
  // 1. Authentication
  const session = await auth();
  if (!session?.user) {
    return { error: 'Unauthorized' };
  }

  // 2. Validation
  const parsed = createInvoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Validation failed', details: parsed.error.errors };
  }

  // 3. Authorization (RBAC)
  if (session.user.role === 'standard_user' && parsed.data.status !== 'pending_approval') {
    return { error: 'Forbidden: Cannot set status' };
  }

  // 4. Database Operation
  try {
    const invoice = await prisma.invoice.create({
      data: {
        ...parsed.data,
        created_by: session.user.id,
      },
    });
    return { data: invoice };
  } catch (error) {
    console.error('Create invoice error:', error);
    return { error: 'Failed to create invoice' };
  }
}
```

**Key principles**:
- Always return `{ data?, error? }` (never throw)
- Validate input with Zod
- Check authentication and authorization
- Log errors but return user-friendly messages

### Styling

**Use Tailwind CSS utility classes**:

```typescript
// Good
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">

// Bad (inline styles)
<div style={{ display: 'flex', padding: '16px' }}>
```

**Use Shadcn/ui components**:

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Invoice Details</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="outline">Edit</Button>
  </CardContent>
</Card>
```

**Use CSS variables for theming**:

```css
/* globals.css */
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
}

.dark {
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
}
```

### Database

**Use Prisma for all database operations**:

```typescript
// Good
const invoice = await prisma.invoice.findUnique({
  where: { id: 123 },
  include: { vendor: true, payments: true },
});

// Bad (raw SQL)
const invoice = await prisma.$queryRaw`SELECT * FROM invoices WHERE id = 123`;
```

**Always use transactions for multi-step operations**:

```typescript
await prisma.$transaction(async (tx) => {
  const invoice = await tx.invoice.update({
    where: { id: 123 },
    data: { status: 'paid' },
  });

  await tx.payment.create({
    data: {
      invoice_id: invoice.id,
      amount_paid: invoice.invoice_amount,
      payment_date: new Date(),
    },
  });
});
```

**Use indexes for frequently queried fields**:

```prisma
model Invoice {
  // ...
  @@index([status], map: "idx_invoices_status")
  @@index([is_hidden], map: "idx_invoices_hidden")
}
```

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear commit messages.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(invoices): add export to CSV` |
| `fix` | Bug fix | `fix(auth): resolve login redirect loop` |
| `docs` | Documentation only | `docs: update API documentation` |
| `style` | Code style (formatting, no logic change) | `style: format invoice components` |
| `refactor` | Code refactor (no feature or bug fix) | `refactor(panels): simplify state management` |
| `perf` | Performance improvement | `perf(queries): add database indexes` |
| `test` | Add or update tests | `test(invoices): add CRUD tests` |
| `chore` | Maintenance tasks | `chore: update dependencies` |
| `build` | Build system changes | `build: configure Docker` |
| `ci` | CI/CD changes | `ci: add GitHub Actions workflow` |

### Scope (Optional)

The scope specifies what is being changed:
- `invoices` - Invoice-related changes
- `auth` - Authentication
- `panels` - Panel system
- `ui` - UI components
- `db` - Database schema
- `api` - API/Server Actions

### Examples

**Good commits**:
```bash
feat(invoices): add bulk approve functionality
fix(auth): prevent infinite redirect on logout
docs: add API documentation for Server Actions
refactor(panels): extract panel header to component
perf(queries): optimize invoice list query with indexes
test(invoices): add unit tests for createInvoice action
```

**Bad commits**:
```bash
update stuff
fix bug
WIP
changes
```

### Commit Message Body (Optional)

For complex changes, add a body explaining **why** the change was made:

```
feat(invoices): add resubmission counter

Implements Phase 1 requirement for tracking invoice resubmissions.
Automatically increments submission_count when status changes from
rejected to pending_approval. Blocks resubmission after 3 attempts.

Related to Sprint 3 deliverables.
```

---

## Branch Naming

### Format

```
<type>/<short-description>
```

### Types

- `feat/` - New feature
- `fix/` - Bug fix
- `docs/` - Documentation
- `refactor/` - Code refactor
- `perf/` - Performance improvement
- `test/` - Tests
- `chore/` - Maintenance

### Examples

**Good branch names**:
```
feat/invoice-export
feat/payment-tracking
fix/login-redirect-loop
fix/panel-z-index-conflict
docs/api-documentation
refactor/panel-state-management
perf/invoice-query-optimization
test/invoice-crud-tests
chore/update-dependencies
```

**Bad branch names**:
```
new-feature
bug-fix
updates
john-dev-branch
```

### Branch Lifecycle

1. **Create from main**:
```bash
git checkout main
git pull origin main
git checkout -b feat/invoice-export
```

2. **Keep up-to-date**:
```bash
git checkout main
git pull origin main
git checkout feat/invoice-export
git rebase main
```

3. **Delete after merge**:
```bash
git branch -d feat/invoice-export
```

---

## Pull Request Process

### 1. Before Creating PR

- [ ] Run linter: `npm run lint`
- [ ] Run type checker: `npx tsc --noEmit`
- [ ] Test build: `npm run build`
- [ ] Run tests: `npm test` (when available)
- [ ] Update documentation if needed
- [ ] Self-review your code

### 2. PR Title

Use same format as commits:

```
feat(invoices): add bulk approve functionality
```

### 3. PR Description Template

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Added invoice bulk approve functionality
- Updated invoice list UI with select checkboxes
- Added Server Action for bulk operations
- Added RBAC checks (admin only)

## Related Issues
Closes #123

## Testing
- [ ] Tested locally
- [ ] Tested bulk approve with 5 invoices
- [ ] Verified RBAC (standard user blocked)
- [ ] Verified optimistic updates

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Updated documentation
- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] Build succeeds
```

### 4. Request Review

Tag at least one reviewer.

### 5. Address Feedback

- Respond to all comments
- Make requested changes
- Push updates to same branch
- Re-request review when ready

### 6. Merge

Once approved:
- Use **Squash and Merge** for clean history
- Delete branch after merge

---

## Testing Guidelines

### Unit Tests (Sprint 12)

**Test Server Actions**:

```typescript
// __tests__/actions/invoices.test.ts
import { createInvoice } from '@/app/actions/invoices';
import { prismaMock } from '@/test/prisma-mock';

describe('createInvoice', () => {
  it('creates invoice with valid data', async () => {
    const mockInvoice = {
      id: 1,
      invoice_number: 'INV-001',
      invoice_amount: 1500.00,
      status: 'pending_approval',
      created_by: 1,
    };

    prismaMock.invoice.create.mockResolvedValue(mockInvoice);

    const result = await createInvoice({
      invoice_number: 'INV-001',
      invoice_amount: 1500.00,
    });

    expect(result.data).toEqual(mockInvoice);
    expect(result.error).toBeUndefined();
  });

  it('returns error for invalid data', async () => {
    const result = await createInvoice({
      invoice_number: '',
      invoice_amount: -100,
    });

    expect(result.error).toBe('Validation failed');
  });
});
```

### Integration Tests (Sprint 12)

**Test API routes and database**:

```typescript
// __tests__/integration/invoice-flow.test.ts
import { createInvoice, updateInvoice, deleteInvoice } from '@/app/actions/invoices';

describe('Invoice CRUD Flow', () => {
  it('creates, updates, and deletes invoice', async () => {
    // Create
    const createResult = await createInvoice({
      invoice_number: 'TEST-001',
      invoice_amount: 1000.00,
    });
    expect(createResult.data).toBeDefined();

    // Update
    const updateResult = await updateInvoice({
      id: createResult.data!.id,
      invoice_amount: 1500.00,
    });
    expect(updateResult.data?.invoice_amount).toBe(1500.00);

    // Delete
    const deleteResult = await deleteInvoice({ id: createResult.data!.id });
    expect(deleteResult.data?.success).toBe(true);
  });
});
```

### E2E Tests (Sprint 12)

**Test user flows with Playwright**:

```typescript
// e2e/invoice-creation.spec.ts
import { test, expect } from '@playwright/test';

test('create invoice flow', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'admin@paylog.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Navigate to invoices
  await page.click('a[href="/invoices"]');
  await expect(page).toHaveURL(/.*invoices/);

  // Open create panel
  await page.click('button:has-text("Create Invoice")');

  // Fill form
  await page.fill('input[name="invoice_number"]', 'TEST-001');
  await page.fill('input[name="invoice_amount"]', '1500.00');

  // Submit
  await page.click('button:has-text("Create")');

  // Verify success
  await expect(page.locator('text=Invoice created')).toBeVisible();
  await expect(page.locator('text=TEST-001')).toBeVisible();
});
```

---

## Code Review Checklist

### For Authors

Before requesting review:
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No linter/TypeScript errors
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] Self-reviewed code
- [ ] Removed console.logs and debugging code
- [ ] Added comments for complex logic

### For Reviewers

When reviewing PRs:

#### Code Quality
- [ ] Code is readable and maintainable
- [ ] No code duplication
- [ ] Functions are single-purpose
- [ ] Naming is clear and consistent
- [ ] No magic numbers or strings

#### TypeScript
- [ ] No `any` types
- [ ] Proper type annotations
- [ ] Type safety maintained
- [ ] No TypeScript errors

#### React
- [ ] Components are functional with hooks
- [ ] `'use client'` used appropriately
- [ ] No unnecessary re-renders
- [ ] Proper use of React Query
- [ ] Optimistic updates where applicable

#### Security
- [ ] Input validation on server
- [ ] RBAC checks in Server Actions
- [ ] No sensitive data exposed
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention (React escaping)

#### Performance
- [ ] No unnecessary API calls
- [ ] Proper React Query caching
- [ ] Database queries optimized
- [ ] Images optimized
- [ ] Code splitting where beneficial

#### Testing
- [ ] Tests exist for new features
- [ ] Tests cover edge cases
- [ ] Tests are readable and maintainable

#### Documentation
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Code comments for complex logic
- [ ] CHANGELOG updated

---

## Questions?

If you have questions about contributing:

1. Check existing documentation (README, ARCHITECTURE, API docs)
2. Review similar code in the codebase
3. Ask in team chat or create a discussion

---

## License

Internal use only. Not for public distribution.
