/**
 * Test Fixtures: Invoice CRUD Operations
 *
 * Mock data for invoice server actions testing
 * Sprint 13, Phase 3: Testing Expansion
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { INVOICE_STATUS } from '@/types/invoice';

/**
 * Mock User Sessions (reuse from dashboard fixtures)
 */
export const mockSessions = {
  standardUser: {
    user: { id: '1', role: 'standard_user', email: 'user@test.com' },
  },
  admin: {
    user: { id: '2', role: 'admin', email: 'admin@test.com' },
  },
  superAdmin: {
    user: { id: '3', role: 'super_admin', email: 'superadmin@test.com' },
  },
};

/**
 * Mock Vendors
 */
export const mockVendors = {
  active: {
    id: 1,
    name: 'Acme Corp',
    is_active: true,
    address: '123 Main St',
    gst_exemption: false,
    bank_details: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  inactive: {
    id: 2,
    name: 'Inactive Vendor',
    is_active: false,
    address: null,
    gst_exemption: false,
    bank_details: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
};

/**
 * Mock Categories
 */
export const mockCategories = {
  active: {
    id: 1,
    name: 'Office Supplies',
    description: 'Office supplies category',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  inactive: {
    id: 2,
    name: 'Inactive Category',
    description: 'Inactive category',
    is_active: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
};

/**
 * Mock Invoice Profiles
 */
export const mockProfiles = {
  standard: {
    id: 1,
    name: 'Standard Profile',
    description: 'Standard invoice profile',
    entity_id: 1,
    vendor_id: 1,
    category_id: 1,
    currency_id: 1,
    visible_to_all: true,
    tds_applicable: false,
    tds_percentage: null,
    prepaid_postpaid: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
};

/**
 * Mock Sub Entities
 */
export const mockSubEntities = {
  active: {
    id: 1,
    name: 'Engineering',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  inactive: {
    id: 2,
    name: 'Inactive Sub Entity',
    is_active: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
};

/**
 * Mock Invoice Form Data (Valid)
 */
export const validInvoiceData = {
  invoice_number: 'INV-2024-001',
  vendor_id: 1,
  invoice_date: new Date('2024-10-01'),
  due_date: new Date('2024-11-01'),
  invoice_amount: 1000,
  category_id: 1,
  profile_id: 1,
  sub_entity_id: 1,
  entity_id: 1,
  currency_id: 1,
  period_start: null,
  period_end: null,
  tds_applicable: false,
  tds_percentage: null,
  notes: null,
};

/**
 * Mock Invoice Form Data (Invalid)
 */
export const invalidInvoiceData = {
  missingVendor: {
    invoice_number: 'INV-2024-002',
    // vendor_id missing
    invoice_date: new Date('2024-10-01'),
    due_date: new Date('2024-11-01'),
    invoice_amount: 1000,
    category_id: 1,
    profile_id: 1,
    sub_entity_id: 1,
    entity_id: 1,
    currency_id: 1,
    period_start: null,
    period_end: null,
    tds_applicable: false,
    tds_percentage: null,
    notes: null,
  },
  negativeAmount: {
    invoice_number: 'INV-2024-003',
    vendor_id: 1,
    invoice_date: new Date('2024-10-01'),
    due_date: new Date('2024-11-01'),
    invoice_amount: -500, // Invalid negative amount
    category_id: 1,
    profile_id: 1,
    sub_entity_id: 1,
    entity_id: 1,
    currency_id: 1,
    period_start: null,
    period_end: null,
    tds_applicable: false,
    tds_percentage: null,
    notes: null,
  },
  invalidVendor: {
    invoice_number: 'INV-2024-004',
    vendor_id: 2, // Inactive vendor
    invoice_date: new Date('2024-10-01'),
    due_date: new Date('2024-11-01'),
    invoice_amount: 1000,
    category_id: 1,
    profile_id: 1,
    sub_entity_id: 1,
    entity_id: 1,
    currency_id: 1,
    period_start: null,
    period_end: null,
    tds_applicable: false,
    tds_percentage: null,
    notes: null,
  },
  invalidCategory: {
    invoice_number: 'INV-2024-005',
    vendor_id: 1,
    category_id: 2, // Inactive category
    invoice_date: new Date('2024-10-01'),
    due_date: new Date('2024-11-01'),
    invoice_amount: 1000,
    profile_id: 1,
    sub_entity_id: 1,
    entity_id: 1,
    currency_id: 1,
    period_start: null,
    period_end: null,
    tds_applicable: false,
    tds_percentage: null,
    notes: null,
  },
};

/**
 * Mock Invoices (Database Records)
 */
export const mockInvoices = {
  pendingApproval: {
    id: 1,
    invoice_number: 'INV-2024-001',
    vendor_id: 1,
    invoice_date: new Date('2024-10-01'),
    due_date: new Date('2024-11-01'),
    invoice_amount: 1000,
    status: INVOICE_STATUS.PENDING_APPROVAL,
    created_by: 1,
    is_hidden: false,
    category_id: 1,
    profile_id: 1,
    sub_entity_id: 1,
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-10-01'),
    hold_reason: null,
    hold_by: null,
    hold_at: null,
    rejection_reason: null,
    rejected_by: null,
    rejected_at: null,
    hidden_by: null,
    hidden_at: null,
    hidden_reason: null,
    vendor: mockVendors.active,
    category: mockCategories.active,
    profile: mockProfiles.standard,
    sub_entity: mockSubEntities.active,
    creator: {
      id: 1,
      full_name: 'Test User',
      email: 'user@test.com',
    },
    holder: null,
    rejector: null,
  },
  unpaid: {
    id: 2,
    invoice_number: 'INV-2024-002',
    vendor_id: 1,
    invoice_date: new Date('2024-09-15'),
    due_date: new Date('2024-10-15'),
    invoice_amount: 2500,
    status: INVOICE_STATUS.UNPAID,
    created_by: 2,
    is_hidden: false,
    category_id: 1,
    profile_id: 1,
    sub_entity_id: null,
    created_at: new Date('2024-09-15'),
    updated_at: new Date('2024-09-15'),
    hold_reason: null,
    hold_by: null,
    hold_at: null,
    rejection_reason: null,
    rejected_by: null,
    rejected_at: null,
    hidden_by: null,
    hidden_at: null,
    hidden_reason: null,
  },
  paid: {
    id: 3,
    invoice_number: 'INV-2024-003',
    vendor_id: 1,
    invoice_date: new Date('2024-08-01'),
    due_date: new Date('2024-09-01'),
    invoice_amount: 3000,
    status: INVOICE_STATUS.PAID,
    created_by: 1,
    is_hidden: false,
    category_id: 1,
    profile_id: null,
    sub_entity_id: null,
    created_at: new Date('2024-08-01'),
    updated_at: new Date('2024-08-10'),
    hold_reason: null,
    hold_by: null,
    hold_at: null,
    rejection_reason: null,
    rejected_by: null,
    rejected_at: null,
    hidden_by: null,
    hidden_at: null,
    hidden_reason: null,
  },
  hidden: {
    id: 4,
    invoice_number: 'INV-2024-004',
    vendor_id: 1,
    invoice_date: new Date('2024-07-01'),
    due_date: new Date('2024-08-01'),
    invoice_amount: 500,
    status: INVOICE_STATUS.UNPAID,
    created_by: 1,
    is_hidden: true,
    hidden_by: 2,
    hidden_at: new Date('2024-07-15'),
    hidden_reason: 'Deleted by user',
    category_id: null,
    profile_id: null,
    sub_entity_id: null,
    created_at: new Date('2024-07-01'),
    updated_at: new Date('2024-07-15'),
    hold_reason: null,
    hold_by: null,
    hold_at: null,
    rejection_reason: null,
    rejected_by: null,
    rejected_at: null,
  },
  onHold: {
    id: 5,
    invoice_number: 'INV-2024-005',
    vendor_id: 1,
    invoice_date: new Date('2024-10-15'),
    due_date: new Date('2024-11-15'),
    invoice_amount: 800,
    status: INVOICE_STATUS.ON_HOLD,
    hold_reason: 'Waiting for vendor confirmation',
    hold_by: 2,
    hold_at: new Date('2024-10-18'),
    created_by: 1,
    is_hidden: false,
    category_id: null,
    profile_id: null,
    sub_entity_id: null,
    created_at: new Date('2024-10-15'),
    updated_at: new Date('2024-10-18'),
    rejection_reason: null,
    rejected_by: null,
    rejected_at: null,
    hidden_by: null,
    hidden_at: null,
    hidden_reason: null,
  },
};

/**
 * Mock Invoice with Full Relations
 */
export const mockInvoiceWithRelations = {
  ...mockInvoices.pendingApproval,
  totalPaid: 0,
  remainingBalance: 1000,
  isOverdue: false,
  dueLabel: 'Due in 31 days',
  daysOverdue: 0,
  daysUntilDue: 31,
  isDueSoon: false,
  priorityRank: 0,
  dueStatusVariant: 'muted' as const,
};
