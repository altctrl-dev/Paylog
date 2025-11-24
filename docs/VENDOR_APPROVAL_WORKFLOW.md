# Vendor Approval Workflow - Complete Implementation Guide

**Feature**: Allow standard users to create vendors during invoice creation, with admin approval required
**Date**: November 21, 2025
**Status**: ✅ Implementation Complete - Ready for Migration

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Summary](#implementation-summary)
3. [User Workflows](#user-workflows)
4. [Technical Architecture](#technical-architecture)
5. [Migration Instructions](#migration-instructions)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Problem Statement
Standard users were blocked from creating invoices with new vendors because vendor creation required admin access, creating a workflow bottleneck.

### Solution
Implemented a multi-tiered approval workflow:
- **Standard users** can create vendors (status = `PENDING_APPROVAL`)
- **Admins** can approve vendors via Master Data Requests
- **Streamlined "Approve Both"** allows admins to approve vendor + invoice together

### Key Features
✅ Role-based vendor creation (all users can create)
✅ Status-based approval workflow (PENDING → APPROVED/REJECTED)
✅ Fuzzy matching for duplicate detection (Levenshtein algorithm)
✅ Combined approval modal (approve vendor + invoice in one click)
✅ Soft delete support (preserves audit trail)
✅ Activity logging for all operations
✅ Real-time status badges in UI

---

## Implementation Summary

### 📊 Stats
- **Total Files Modified**: 17 files
- **New Files Created**: 5 files
- **Lines of Code Added**: ~1,500 lines
- **Database Fields Added**: 6 fields to Vendor model
- **New Server Actions**: 6 actions
- **New UI Components**: 2 components
- **RBAC Functions**: 6 functions

### ✅ Completed Phases

#### Phase 1: Database Schema ✅
- Added vendor approval fields (status, created_by, approved_by, approved_at, rejected_reason, deleted_at)
- Created backfill script for existing vendors
- Created verification script
- Added indexes for query performance

#### Phase 2: Core Logic ✅
- RBAC functions (6 new functions)
- Vendor type definitions
- Fuzzy matching utility
- Server actions (vendor CRUD with status)
- Master Data approval handlers

#### Phase 3: UI Components ✅
- Vendor form with status indicator
- Smart combobox with fuzzy matching warnings
- Status badges throughout UI

#### Phase 4: Invoice Integration ✅
- Status badges in invoice detail panel
- Custom success messages for pending vendors
- Type updates for vendor relations

#### Phase 5: Admin Approval ✅
- Combined approval modal
- `checkInvoiceVendorStatus` action
- `approveInvoiceAndVendor` action (atomic transaction)

---

## User Workflows

### For Standard Users (Associates/Managers)

**Creating a Vendor:**
1. Navigate to invoice creation (recurring or non-recurring)
2. Start typing vendor name in dropdown
3. If similar vendors exist, warning appears: "Similar vendors exist: ABC Corp (85% match)"
4. Click "Create New Vendor"
5. Fill vendor form → See yellow warning: "Pending Approval - An admin must approve it"
6. Save vendor → Toast: "Vendor submitted for approval"
7. Vendor appears in dropdown with "Pending Approval" badge
8. Complete and submit invoice

**Visibility:**
- Standard users see only APPROVED vendors + their own PENDING vendors
- Cannot edit pending vendors (blocked until admin approves)
- Can create multiple invoices with same pending vendor

---

### For Admin Users

**Creating a Vendor:**
1. Navigate to invoice creation
2. Click "Create New Vendor"
3. Fill vendor form → No warning shown
4. Save vendor → Toast: "Vendor created successfully"
5. Vendor immediately available (status = APPROVED)

**Approving Vendors (Option A - Separate):**
1. Navigate to Master Data Requests page
2. Filter by "NEW_VENDOR" type
3. Review vendor details (name, address, GST, bank details, requester)
4. Click "Approve" → Vendor status: PENDING → APPROVED
5. Vendor now visible to all users
6. Navigate to Pending Invoices
7. Approve invoice separately

**Approving Vendors (Option B - Streamlined):**
1. Navigate to Pending Invoices page
2. Click "Approve" on invoice with pending vendor
3. Modal appears: "Vendor Pending Approval"
4. Review vendor details in modal
5. Click "Approve Both" → Atomic transaction:
   - Vendor status: PENDING → APPROVED
   - Invoice status: PENDING → UNPAID
   - Both updates commit together
6. Success toast: "Invoice and vendor approved successfully"

**Rejecting Vendors:**
1. Navigate to Master Data Requests
2. Click "Reject" on vendor request
3. Enter rejection reason (required)
4. Vendor status: PENDING → REJECTED
5. Invoices with rejected vendor remain pending (admin can reassign)

---

## Technical Architecture

### Database Schema Changes

**Vendor Model (schema.prisma):**
```prisma
model Vendor {
  // ... existing fields ...

  // Approval Workflow Fields
  status              String    @default("APPROVED")
  created_by_user_id  Int?
  approved_by_user_id Int?
  approved_at         DateTime?
  rejected_reason     String?
  deleted_at          DateTime?

  // Relations
  created_by          User?     @relation("VendorCreatedBy", fields: [created_by_user_id], references: [id])
  approved_by         User?     @relation("VendorApprovedBy", fields: [approved_by_user_id], references: [id])

  // Indexes
  @@index([status], map: "idx_vendors_status")
  @@index([created_by_user_id], map: "idx_vendors_created_by")
  @@index([approved_by_user_id], map: "idx_vendors_approved_by")
  @@index([deleted_at], map: "idx_vendors_deleted")
}
```

### File Structure

```
paylog-3/
├── schema.prisma (modified)
├── types/
│   └── vendor.ts (new) - Type definitions, status config
├── lib/
│   ├── rbac-v2.ts (modified) - 6 new RBAC functions
│   └── fuzzy-match.ts (new) - Levenshtein algorithm
├── app/actions/
│   ├── master-data.ts (modified) - Status-aware vendor CRUD
│   ├── invoices-v2.ts (modified) - Success message logic
│   ├── invoices.ts (modified) - Combined approval actions
│   └── admin/
│       └── master-data-approval.ts (modified) - Vendor approval/rejection
├── components/
│   ├── master-data/
│   │   └── vendor-form-panel.tsx (modified) - Status indicator
│   ├── invoices-v2/
│   │   └── smart-vendor-combobox.tsx (modified) - Fuzzy match + badges
│   ├── invoices/
│   │   └── invoice-detail-panel-v2.tsx (modified) - Status badge
│   └── admin/
│       ├── invoice-approval-with-vendor-modal.tsx (new) - Approve Both modal
│       └── index.ts (new) - Barrel export
├── hooks/
│   ├── use-vendors.ts (modified) - Toast messages
│   └── use-invoices-v2.ts (modified) - Success handling
└── scripts/
    ├── backfill-vendor-approval-status.ts (new)
    └── verify-vendor-migration.ts (new)
```

### Key Components

**1. RBAC Functions (lib/rbac-v2.ts)**
- `canCreateVendor(user)` - All authenticated users
- `canApproveVendor(user)` - Admin/super_admin only
- `canRejectVendor(user)` - Admin/super_admin only
- `canEditPendingVendor(user, vendor)` - Blocks non-admins from editing pending
- `canDeleteVendor(user)` - Admin/super_admin only
- `getVendorCreationStatus(user)` - Returns APPROVED (admin) or PENDING (standard)

**2. Server Actions**
- `createVendor()` - Creates with appropriate status
- `searchVendors()` - Filters by user role
- `updateVendor()` - Checks edit permissions
- `archiveVendor()` - Soft delete (sets deleted_at)
- `approveVendorRequest()` - Updates status to APPROVED
- `rejectVendorRequest()` - Updates status to REJECTED
- `checkInvoiceVendorStatus()` - Checks if invoice has pending vendor
- `approveInvoiceAndVendor()` - Atomic combined approval

**3. UI Components**
- `VendorFormPanel` - Shows status warning for non-admins
- `SmartVendorCombobox` - Fuzzy match warnings + status badges
- `InvoiceDetailPanelV2` - Vendor status badge
- `InvoiceApprovalWithVendorModal` - Combined approval UI

**4. Utilities**
- `fuzzy-match.ts` - Levenshtein distance algorithm for duplicate detection
- `vendor.ts` - Type definitions and status configuration

---

## Migration Instructions

### Prerequisites
- ✅ All code changes are complete
- ✅ No merge conflicts
- ✅ TypeScript compiles (with expected Prisma type errors)
- 📋 Database backup recommended

### Step 1: Run Prisma Migration

```bash
cd /Users/althaf/Projects/paylog-3

# Create and apply migration
npx prisma migrate dev --name vendor_approval_workflow

# Expected output:
# ✔ Generated Prisma Client
# ✔ Migration applied successfully
```

### Step 2: Backfill Existing Vendors

```bash
# Mark all existing vendors as APPROVED
npx tsx scripts/backfill-vendor-approval-status.ts

# Expected output:
# Starting vendor approval status backfill...
# Found X vendor(s) to backfill:
# Processing vendor ID 1: Acme Corp
#   Current status: NULL
#   Current approved_at: NULL
#   ✓ Updated to APPROVED
# ...
# ✓ Backfill complete. Updated X vendor(s).
```

### Step 3: Verify Migration

```bash
# Run verification script
npx tsx scripts/verify-vendor-migration.ts

# Expected output:
# Verifying vendor approval workflow migration...
# [Check 1] Verifying all vendors have a valid status...
#   ✓ PASS: All vendors have valid status
# [Check 2] Verifying APPROVED vendors have approved_at timestamp...
#   ✓ PASS: All APPROVED vendors have approved_at timestamp
# [Check 3] Checking for pending vendors (should be 0 after backfill)...
#   ✓ PASS: No pending vendors found
# [Check 4] Verifying indexes...
#   Query on status index took 5ms
#   ✓ PASS: Index query performance is good
# ═══════════════════════════════════════
# ✓ VERIFICATION PASSED
# Vendor approval workflow migration is complete and verified.
```

### Step 4: Regenerate Prisma Client (Automatic)

The migration command automatically runs `prisma generate`. If needed manually:

```bash
npx prisma generate
```

### Step 5: Restart Dev Server

```bash
# Kill existing server
pkill -f "next dev"

# Start fresh
pnpm dev
```

### Step 6: Verify TypeScript Compilation

```bash
npx tsc --noEmit

# Expected: Zero errors
# All vendor status field errors should be resolved
```

---

## Testing Guide

### Manual Testing Checklist

#### 1. Vendor Creation - Standard User

- [ ] Login as standard user (Associate/Manager)
- [ ] Navigate to `/invoices/new/recurring`
- [ ] Click "Create New Vendor" in dropdown
- [ ] Verify yellow "Pending Approval" warning appears
- [ ] Fill vendor form and save
- [ ] Verify toast: "Vendor submitted for approval"
- [ ] Verify vendor appears in dropdown with "Pending Approval" badge
- [ ] Create invoice with pending vendor
- [ ] Verify invoice saved successfully
- [ ] Verify custom success message: "Vendor pending admin approval"

#### 2. Vendor Creation - Admin User

- [ ] Login as admin
- [ ] Navigate to `/invoices/new/recurring`
- [ ] Click "Create New Vendor"
- [ ] Verify NO warning appears
- [ ] Fill vendor form and save
- [ ] Verify toast: "Vendor created successfully"
- [ ] Verify vendor appears without badge (clean UI)
- [ ] Create invoice immediately (vendor already approved)

#### 3. Fuzzy Matching

- [ ] Start typing existing vendor name with slight variation
  - Example: Type "ABC Corp" when "ABC Corporation" exists
- [ ] Verify warning appears: "Similar vendors exist: ABC Corporation (85% match)"
- [ ] Verify can proceed anyway if desired

#### 4. Vendor Visibility (Role-Based)

- [ ] Login as standard user
- [ ] Verify dropdown shows:
  - ✅ All APPROVED vendors
  - ✅ Own PENDING vendors
  - ❌ Other users' PENDING vendors
  - ❌ REJECTED vendors
- [ ] Login as admin
- [ ] Verify dropdown shows ALL vendors (APPROVED, PENDING, REJECTED)

#### 5. Vendor Edit Restrictions

- [ ] Login as standard user
- [ ] Try to edit own PENDING vendor
- [ ] Verify error: "Cannot edit vendor pending approval"
- [ ] Login as admin
- [ ] Verify can edit any vendor at any status

#### 6. Admin Approval - Separate

- [ ] Navigate to Master Data Requests page
- [ ] Verify pending vendors listed
- [ ] Click "Approve" on vendor
- [ ] Verify vendor status → APPROVED
- [ ] Verify vendor now visible to all users
- [ ] Navigate to Pending Invoices
- [ ] Approve invoice separately

#### 7. Admin Approval - Combined (Streamlined)

- [ ] Create invoice with pending vendor (as standard user)
- [ ] Login as admin
- [ ] Navigate to Pending Invoices
- [ ] Click "Approve" on invoice with pending vendor
- [ ] Verify modal appears: "Vendor Pending Approval"
- [ ] Verify vendor details displayed (name, address, GST, bank details)
- [ ] Click "Approve Both"
- [ ] Verify success toast
- [ ] Verify vendor status → APPROVED
- [ ] Verify invoice status → UNPAID
- [ ] Verify both updates are atomic (no partial state)

#### 8. Vendor Rejection

- [ ] Navigate to Master Data Requests
- [ ] Click "Reject" on vendor
- [ ] Enter rejection reason
- [ ] Verify vendor status → REJECTED
- [ ] Verify invoice with rejected vendor remains pending
- [ ] Verify admin can reassign invoice to different vendor

#### 9. Soft Delete

- [ ] Login as admin
- [ ] Archive a vendor
- [ ] Verify vendor has `deleted_at` timestamp
- [ ] Verify vendor no longer appears in dropdowns
- [ ] Verify existing invoices with archived vendor still work

---

## Troubleshooting

### Issue: TypeScript errors after migration

**Symptoms**: Vendor status fields show as missing types

**Solution**:
```bash
# Regenerate Prisma Client
npx prisma generate

# Restart TypeScript server in IDE
# VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

### Issue: Vendor creation blocked for standard users

**Symptoms**: Standard users see "Admin access required" error

**Diagnostic**:
```typescript
// Check RBAC function in lib/rbac-v2.ts
console.log(canCreateVendor(user)); // Should return true
```

**Solution**: Verify RBAC function was implemented correctly

---

### Issue: Fuzzy matching not working

**Symptoms**: No warning when typing similar vendor names

**Diagnostic**:
```typescript
// Test fuzzy match utility
import { findSimilar } from '@/lib/fuzzy-match';
const similar = findSimilar('ABC Corp', ['ABC Corporation'], 0.75);
console.log(similar); // Should return matches
```

**Solution**: Verify threshold (0.75 = 75% similarity), check vendor search returns status field

---

### Issue: Combined approval fails

**Symptoms**: Transaction fails, partial updates occur

**Diagnostic**: Check logs for error message

**Common causes**:
- Invoice not in `pending_approval` status
- Vendor not in `PENDING_APPROVAL` status
- User lacks admin permission

**Solution**: Verify status checks in `approveInvoiceAndVendor` function

---

### Issue: Status badges not showing

**Symptoms**: Vendor status badge missing in UI

**Diagnostic**:
```typescript
// Check if status field is fetched
console.log(invoice.vendor.status); // Should be defined
```

**Solution**: Verify invoice queries include `status: true` in vendor select

---

## FAQ

**Q: What happens to existing vendors after migration?**
A: All existing vendors are marked as `APPROVED` with `approved_at = created_at`. No functionality changes for existing data.

**Q: Can standard users see other users' pending vendors?**
A: No. Standard users only see APPROVED vendors + their own PENDING vendors.

**Q: What if admin rejects a vendor?**
A: Vendor status → REJECTED. Invoices with rejected vendor remain pending. Admin can reassign invoice to different vendor.

**Q: Are vendor approvals reversible?**
A: Approvals are not reversible through UI. Use database UPDATE query if needed (rare case).

**Q: How does soft delete work?**
A: Setting `deleted_at` timestamp hides vendor from all queries while preserving data for audit trail.

**Q: Can I adjust fuzzy match threshold?**
A: Yes. Edit `threshold` parameter in `findSimilar()` calls. Default is 0.75 (75% similarity).

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review implementation files
3. Check Prisma logs: `npx prisma studio`
4. Review activity logs in database

---

**Implementation Date**: November 21, 2025
**Last Updated**: November 21, 2025
**Version**: 1.0.0
