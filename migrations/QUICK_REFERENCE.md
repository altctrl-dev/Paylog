# Quick Reference - Phase 1 Schema Changes

## TL;DR - What Changed?

### New Invoice States
```sql
-- Old statuses
'pending_approval', 'unpaid', 'partial', 'paid', 'overdue'

-- New statuses (added)
'on_hold'  -- Admin places invoice on hold for clarification
```

### New User Roles
```sql
-- Old roles
'standard_user', 'admin'

-- New roles (added)
'super_admin'  -- Cannot be deactivated (protected)
```

### New Tables
1. **user_profile_visibility** - Control who sees which profiles
2. **archive_requests** - Request workflow for archiving master data

---

## Developer Cheat Sheet

### 1. Working with "On Hold" Invoices

```typescript
// Place invoice on hold
await prisma.invoice.update({
  where: { id: invoiceId },
  data: {
    status: 'on_hold',
    hold_reason: 'Missing vendor W-9 form',
    hold_by: adminUserId,
    hold_at: new Date(),
  },
});

// Release from hold (back to pending approval)
await prisma.invoice.update({
  where: { id: invoiceId },
  data: {
    status: 'pending_approval',
    hold_reason: null,
    hold_by: null,
    hold_at: null,
  },
});

// Query on-hold invoices
const onHoldInvoices = await prisma.invoice.findMany({
  where: { status: 'on_hold' },
  include: { holder: true }, // Admin who placed on hold
});
```

---

### 2. Resubmission Counter (Auto-managed by Trigger)

```typescript
// NO CODE NEEDED - Trigger handles this automatically!

// When user resubmits a rejected invoice:
await prisma.invoice.update({
  where: { id: invoiceId },
  data: { status: 'pending_approval' },
});

// Database trigger will:
// 1. Increment submission_count
// 2. Update last_submission_at
// 3. Auto-reject if submission_count > 3

// Query invoices with multiple submissions
const resubmittedInvoices = await prisma.invoice.findMany({
  where: { submission_count: { gt: 1 } },
  orderBy: { submission_count: 'desc' },
});

// Check if invoice can be resubmitted
const invoice = await prisma.invoice.findUnique({ where: { id } });
if (invoice.submission_count >= 3) {
  throw new Error('Maximum resubmission attempts (3) exceeded');
}
```

---

### 3. Super Admin Protection (Auto-managed by Trigger)

```typescript
// NO SPECIAL CODE NEEDED - Trigger prevents deactivating last super admin

// This will throw error if it's the last super admin:
try {
  await prisma.user.update({
    where: { id: superAdminId },
    data: { is_active: false },
  });
} catch (error) {
  // Error: "Cannot deactivate the last Super Admin user"
  console.error('Protected by database trigger');
}

// Query active super admins
const superAdmins = await prisma.user.findMany({
  where: {
    role: 'super_admin',
    is_active: true,
  },
});
```

---

### 4. Profile Visibility Control

```typescript
// Create a restricted profile (not visible to all)
const profile = await prisma.invoiceProfile.create({
  data: {
    name: 'Executive Travel',
    description: 'Restricted to executives only',
    visible_to_all: false, // KEY: Not visible to everyone
  },
});

// Grant specific user access to restricted profile
await prisma.userProfileVisibility.create({
  data: {
    user_id: userId,
    profile_id: profileId,
    granted_by: adminUserId,
  },
});

// Check if user can see a profile
const canSeeProfile = async (userId: number, profileId: number) => {
  const profile = await prisma.invoiceProfile.findUnique({
    where: { id: profileId },
  });

  // Public profiles - everyone can see
  if (profile.visible_to_all) return true;

  // Restricted profiles - check visibility table
  const access = await prisma.userProfileVisibility.findUnique({
    where: {
      unique_user_profile: {
        user_id: userId,
        profile_id: profileId,
      },
    },
  });

  return !!access;
};

// Get all profiles user can see
const getVisibleProfiles = async (userId: number) => {
  return await prisma.invoiceProfile.findMany({
    where: {
      OR: [
        { visible_to_all: true }, // Public profiles
        {
          visibilities: {
            some: { user_id: userId }, // Granted access
          },
        },
      ],
    },
  });
};
```

---

### 5. Hiding Invoices

```typescript
// Hide an invoice (e.g., very old overdue)
await prisma.invoice.update({
  where: { id: invoiceId },
  data: {
    is_hidden: true,
    hidden_by: adminUserId,
    hidden_at: new Date(),
    hidden_reason: 'Very old overdue (>120 days), vendor out of business',
  },
});

// Unhide an invoice
await prisma.invoice.update({
  where: { id: invoiceId },
  data: {
    is_hidden: false,
    hidden_by: null,
    hidden_at: null,
    hidden_reason: null,
  },
});

// Default query (excludes hidden)
const activeInvoices = await prisma.invoice.findMany({
  where: { is_hidden: false },
});

// Include hidden (with filter toggle)
const allInvoices = await prisma.invoice.findMany({
  where: showHidden ? {} : { is_hidden: false },
});

// Query only hidden invoices
const hiddenInvoices = await prisma.invoice.findMany({
  where: { is_hidden: true },
  include: { hider: true }, // Admin who hid it
});
```

---

### 6. Archive Requests

```typescript
// Standard user creates archive request
const request = await prisma.archiveRequest.create({
  data: {
    entity_type: 'vendor',
    entity_id: vendorId,
    requested_by: userId,
    reason: 'Vendor no longer used, last invoice was 18 months ago',
  },
});

// Admin reviews request - APPROVE
await prisma.archiveRequest.update({
  where: { id: requestId },
  data: {
    status: 'approved',
    reviewed_by: adminUserId,
    reviewed_at: new Date(),
  },
});

// Then actually archive the entity
await prisma.vendor.update({
  where: { id: vendorId },
  data: { is_active: false },
});

// Admin reviews request - REJECT
await prisma.archiveRequest.update({
  where: { id: requestId },
  data: {
    status: 'rejected',
    reviewed_by: adminUserId,
    reviewed_at: new Date(),
    rejection_reason: 'This vendor is still actively used by Finance team',
  },
});

// Query pending archive requests (admin queue)
const pendingRequests = await prisma.archiveRequest.findMany({
  where: { status: 'pending' },
  include: {
    requester: true,
  },
  orderBy: { requested_at: 'desc' },
});

// Get archive history for an entity
const entityArchiveHistory = await prisma.archiveRequest.findMany({
  where: {
    entity_type: 'vendor',
    entity_id: vendorId,
  },
  orderBy: { requested_at: 'desc' },
});
```

---

### 7. Dashboard KPIs (Updated Calculation)

```typescript
// Query dashboard KPIs view (auto-calculated)
const kpis = await prisma.$queryRaw`
  SELECT * FROM dashboard_kpis;
`;

// Returns single row:
// {
//   total_due: 125430.50,           // Outstanding + Pending Approval (excludes hidden)
//   paid_this_month: 45200.00,      // Approved payments this month
//   pending_count: 23,              // Pending approval + on hold + unpaid + partial (excludes hidden)
//   avg_processing_days: 12.5       // Average days to first payment (last 90 days)
// }

// Note: total_due NOW INCLUDES pending_approval amounts (NEW BEHAVIOR)
// Old: total_due = unpaid + partial + overdue
// New: total_due = unpaid + partial + overdue + pending_approval
```

---

## Common Queries

### Filter Invoices by New Status
```typescript
// All on-hold invoices
const onHold = await prisma.invoice.findMany({
  where: { status: 'on_hold' },
});

// Invoices awaiting action (pending, on hold, unpaid)
const needsAction = await prisma.invoice.findMany({
  where: {
    status: { in: ['pending_approval', 'on_hold', 'unpaid', 'partial'] },
    is_hidden: false,
  },
});
```

### Check User Permissions
```typescript
// Is user a super admin?
const user = await prisma.user.findUnique({ where: { id: userId } });
const isSuperAdmin = user.role === 'super_admin';

// Is user an admin (includes super admin)?
const isAdmin = user.role === 'admin' || user.role === 'super_admin';
```

### Archive Request Admin Queue
```typescript
// Get pending requests count
const pendingCount = await prisma.archiveRequest.count({
  where: { status: 'pending' },
});

// Get pending requests with entity details
const queue = await prisma.archiveRequest.findMany({
  where: { status: 'pending' },
  include: {
    requester: { select: { email: true, full_name: true } },
  },
  orderBy: { requested_at: 'asc' }, // Oldest first
});
```

---

## Database Constraints to Remember

### ❌ These Will FAIL

```typescript
// 1. Invalid invoice status
await prisma.invoice.create({
  data: { status: 'cancelled' }, // Error: constraint violation
});

// 2. Deactivating last super admin
await prisma.user.update({
  where: { id: lastSuperAdminId },
  data: { is_active: false }, // Error: trigger blocks this
});

// 3. Resubmitting after 3 rejections
// (Automatically blocked by trigger - invoice will be auto-rejected)

// 4. Duplicate user-profile visibility grant
await prisma.userProfileVisibility.create({
  data: { user_id: 1, profile_id: 1 }, // Error: unique constraint
});
```

---

## Migration Commands

### Apply Migration
```bash
# Development
psql -U postgres -d paylog_dev -f migrations/001_phase1_clarified_features.sql

# Apply seed data (dev only)
psql -U postgres -d paylog_dev -f migrations/001_phase1_seed_data.sql
```

### Rollback Migration
```bash
# If something goes wrong
psql -U postgres -d paylog_dev -f migrations/001_phase1_clarified_features_ROLLBACK.sql
```

### Prisma Sync (if using Prisma)
```bash
# After SQL migration, sync Prisma client
npx prisma db pull        # Pull schema from database
npx prisma generate       # Generate Prisma client

# Or use introspection
npx prisma db push        # Push Prisma schema to database (alternative approach)
```

---

## Testing Checklist

### Smoke Tests
- [ ] Create invoice with `status: 'on_hold'` - succeeds
- [ ] Create invoice with invalid status - fails
- [ ] Create super admin user - succeeds
- [ ] Deactivate last super admin - fails with error
- [ ] Resubmit rejected invoice 4 times - 4th auto-rejects
- [ ] Hide invoice, verify excluded from dashboard
- [ ] Create archive request, approve it, verify entity archived
- [ ] Query dashboard_kpis view, verify total_due includes pending_approval

---

## Performance Tips

### Use Indexes
```typescript
// These queries use indexes (FAST):
where({ status: 'on_hold' })           // idx_invoices_on_hold
where({ is_hidden: false })            // idx_invoices_active
where({ submission_count: { gt: 1 } }) // idx_invoices_submission_count

// Archive request queue (uses partial index)
where({ status: 'pending' })           // idx_archive_requests_pending
orderBy({ requested_at: 'desc' })
```

### Avoid N+1 Queries
```typescript
// ❌ BAD: N+1 query for holder info
const invoices = await prisma.invoice.findMany({ where: { status: 'on_hold' } });
for (const invoice of invoices) {
  const holder = await prisma.user.findUnique({ where: { id: invoice.hold_by } });
}

// ✅ GOOD: Include relation
const invoices = await prisma.invoice.findMany({
  where: { status: 'on_hold' },
  include: { holder: true },
});
```

---

## Need More Details?

- **Full Schema:** See `schema.prisma`
- **Migration Steps:** See `MIGRATION_GUIDE.md`
- **Schema Diagrams:** See `SCHEMA_DIAGRAM.md`
- **Complete Summary:** See `DBM_DELIVERABLES_SUMMARY.md`

---

**Version:** 001_phase1_clarified_features
**Last Updated:** 2025-10-08
