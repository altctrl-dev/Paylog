/**
 * Dashboard Test Fixtures
 *
 * Test Fixtures: Dashboard Mock Data
 *
 * Mock data for dashboard KPIs, charts, and activity feed
 * Sprint 12, Phase 4: Testing
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  DashboardKPIs,
  StatusBreakdownItem,
  PaymentTrendItem,
  VendorSpendingItem,
  InvoiceVolumeItem,
  RecentActivityItem,
  ACTIVITY_TYPE,
  DATE_RANGE,
} from '@/types/dashboard';
import { INVOICE_STATUS } from '@/types/invoice';
import { PAYMENT_STATUS } from '@/types/payment';

/**
 * Mock KPI Data
 */
export const mockKPIs: DashboardKPIs = {
  totalInvoices: 150,
  pendingApprovals: 12,
  totalUnpaid: 45000.5,
  totalPaidCurrentMonth: 78500.75,
  overdueInvoices: 8,
  onHoldInvoices: 3,
};

export const mockEmptyKPIs: DashboardKPIs = {
  totalInvoices: 0,
  pendingApprovals: 0,
  totalUnpaid: 0,
  totalPaidCurrentMonth: 0,
  overdueInvoices: 0,
  onHoldInvoices: 0,
};

/**
 * Mock Invoice Status Breakdown
 */
export const mockStatusBreakdown: StatusBreakdownItem[] = [
  { status: INVOICE_STATUS.PAID, count: 85, value: 120000 },
  { status: INVOICE_STATUS.UNPAID, count: 40, value: 35000 },
  { status: INVOICE_STATUS.PARTIAL, count: 10, value: 10000.5 },
  { status: INVOICE_STATUS.PENDING_APPROVAL, count: 12, value: 18000 },
  { status: INVOICE_STATUS.ON_HOLD, count: 3, value: 5000 },
];

export const mockEmptyStatusBreakdown: StatusBreakdownItem[] = [];

/**
 * Mock Payment Trends
 */
export const mockPaymentTrends: PaymentTrendItem[] = [
  { date: '2024-07', amount: 45000, count: 12 },
  { date: '2024-08', amount: 52000, count: 15 },
  { date: '2024-09', amount: 48000, count: 14 },
  { date: '2024-10', amount: 61000, count: 18 },
];

export const mockEmptyPaymentTrends: PaymentTrendItem[] = [];

/**
 * Mock Top Vendors by Spending
 */
export const mockTopVendors: VendorSpendingItem[] = [
  { vendor_name: 'Acme Corp', total_amount: 45000, invoice_count: 15 },
  { vendor_name: 'TechSupply Inc', total_amount: 38000, invoice_count: 12 },
  { vendor_name: 'Office Depot', total_amount: 28000, invoice_count: 20 },
  { vendor_name: 'CloudServices Ltd', total_amount: 22000, invoice_count: 8 },
  { vendor_name: 'Marketing Agency', total_amount: 18000, invoice_count: 6 },
  { vendor_name: 'Legal Services', total_amount: 15000, invoice_count: 4 },
  { vendor_name: 'Consulting Firm', total_amount: 12000, invoice_count: 5 },
  { vendor_name: 'Utilities Co', total_amount: 9000, invoice_count: 10 },
  { vendor_name: 'Insurance Provider', total_amount: 7500, invoice_count: 3 },
  { vendor_name: 'Travel Agency', total_amount: 6000, invoice_count: 8 },
];

export const mockFewVendors: VendorSpendingItem[] = [
  { vendor_name: 'Acme Corp', total_amount: 45000, invoice_count: 15 },
  { vendor_name: 'TechSupply Inc', total_amount: 38000, invoice_count: 12 },
];

/**
 * Mock Invoice Volume
 */
export const mockInvoiceVolume: InvoiceVolumeItem[] = [
  { date: '2024-07', count: 32 },
  { date: '2024-08', count: 38 },
  { date: '2024-09', count: 35 },
  { date: '2024-10', count: 45 },
];

export const mockEmptyInvoiceVolume: InvoiceVolumeItem[] = [];

/**
 * Mock Recent Activities
 */
export const mockActivities: RecentActivityItem[] = [
  {
    id: '1',
    type: ACTIVITY_TYPE.CREATED,
    invoice_id: 101,
    invoice_number: 'INV-2024-101',
    description: 'Invoice INV-2024-101 was created',
    user_name: 'John Doe',
    timestamp: new Date('2024-10-30T10:30:00Z'),
  },
  {
    id: '2',
    type: ACTIVITY_TYPE.PAID,
    invoice_id: 98,
    invoice_number: 'INV-2024-098',
    description: 'Invoice INV-2024-098 was marked as paid',
    user_name: 'Jane Smith',
    timestamp: new Date('2024-10-30T09:15:00Z'),
  },
  {
    id: '3',
    type: ACTIVITY_TYPE.STATUS_CHANGE,
    invoice_id: 95,
    invoice_number: 'INV-2024-095',
    description: 'Invoice INV-2024-095 status changed to pending_approval',
    user_name: 'Bob Johnson',
    timestamp: new Date('2024-10-30T08:45:00Z'),
  },
  {
    id: '4',
    type: ACTIVITY_TYPE.REJECTED,
    invoice_id: 92,
    invoice_number: 'INV-2024-092',
    description: 'Invoice INV-2024-092 was rejected',
    user_name: 'Admin User',
    timestamp: new Date('2024-10-30T07:20:00Z'),
  },
  {
    id: '5',
    type: ACTIVITY_TYPE.PAID,
    invoice_id: 90,
    invoice_number: 'INV-2024-090',
    description: 'Invoice INV-2024-090 was marked as paid',
    user_name: 'Jane Smith',
    timestamp: new Date('2024-10-29T16:30:00Z'),
  },
];

export const mockEmptyActivities: RecentActivityItem[] = [];

/**
 * Mock Invoices for Database Queries
 */
export const mockInvoices = {
  standard: {
    id: 1,
    invoice_number: 'INV-2024-001',
    vendor_id: 1,
    invoice_date: new Date('2024-10-01'),
    due_date: new Date('2024-11-01'),
    invoice_amount: 1000,
    status: INVOICE_STATUS.UNPAID,
    created_by: 1, // Associate user
    is_hidden: false,
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-10-01'),
  },
  paid: {
    id: 2,
    invoice_number: 'INV-2024-002',
    vendor_id: 2,
    invoice_date: new Date('2024-09-15'),
    due_date: new Date('2024-10-15'),
    invoice_amount: 2500,
    status: INVOICE_STATUS.PAID,
    created_by: 1,
    is_hidden: false,
    created_at: new Date('2024-09-15'),
    updated_at: new Date('2024-09-20'),
  },
  overdue: {
    id: 3,
    invoice_number: 'INV-2024-003',
    vendor_id: 1,
    invoice_date: new Date('2024-08-01'),
    due_date: new Date('2024-09-01'), // Past due
    invoice_amount: 3000,
    status: INVOICE_STATUS.UNPAID,
    created_by: 1,
    is_hidden: false,
    created_at: new Date('2024-08-01'),
    updated_at: new Date('2024-08-01'),
  },
  pendingApproval: {
    id: 4,
    invoice_number: 'INV-2024-004',
    vendor_id: 3,
    invoice_date: new Date('2024-10-20'),
    due_date: new Date('2024-11-20'),
    invoice_amount: 1500,
    status: INVOICE_STATUS.PENDING_APPROVAL,
    created_by: 1,
    is_hidden: false,
    created_at: new Date('2024-10-20'),
    updated_at: new Date('2024-10-20'),
  },
  onHold: {
    id: 5,
    invoice_number: 'INV-2024-005',
    vendor_id: 2,
    invoice_date: new Date('2024-10-15'),
    due_date: new Date('2024-11-15'),
    invoice_amount: 800,
    status: INVOICE_STATUS.ON_HOLD,
    created_by: 2, // Different user
    is_hidden: false,
    created_at: new Date('2024-10-15'),
    updated_at: new Date('2024-10-18'),
  },
  hidden: {
    id: 6,
    invoice_number: 'INV-2024-006',
    vendor_id: 1,
    invoice_date: new Date('2024-10-01'),
    due_date: new Date('2024-11-01'),
    invoice_amount: 500,
    status: INVOICE_STATUS.UNPAID,
    created_by: 1,
    is_hidden: true, // Should be excluded
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-10-01'),
  },
};

/**
 * Mock Payments
 */
export const mockPayments = {
  approved: {
    id: 1,
    invoice_id: 2,
    amount_paid: 2500,
    payment_date: new Date('2024-10-15'),
    payment_method: 'check',
    status: PAYMENT_STATUS.APPROVED,
    created_by: 2,
    created_at: new Date('2024-10-15'),
    updated_at: new Date('2024-10-15'),
  },
  pending: {
    id: 2,
    invoice_id: 1,
    amount_paid: 500,
    payment_date: new Date('2024-10-20'),
    payment_method: 'check',
    status: PAYMENT_STATUS.PENDING,
    created_by: 1,
    created_at: new Date('2024-10-20'),
    updated_at: new Date('2024-10-20'),
  },
};

/**
 * Mock Vendors
 */
export const mockVendors = {
  acmeCorp: {
    id: 1,
    name: 'Acme Corp',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  techSupply: {
    id: 2,
    name: 'TechSupply Inc',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  cloudServices: {
    id: 3,
    name: 'CloudServices Ltd',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
};

/**
 * Mock Activity Logs
 */
export const mockActivityLogs = [
  {
    id: '1',
    action: 'invoice_created',
    invoice_id: 1,
    user_id: 1,
    created_at: new Date('2024-10-30T10:30:00Z'),
    invoice: {
      invoice_number: 'INV-2024-001',
      status: INVOICE_STATUS.UNPAID,
      is_hidden: false,
      created_by: 1,
    },
    user: {
      full_name: 'John Doe',
    },
  },
  {
    id: '2',
    action: 'payment_approved',
    invoice_id: 2,
    user_id: 2,
    created_at: new Date('2024-10-30T09:15:00Z'),
    invoice: {
      invoice_number: 'INV-2024-002',
      status: INVOICE_STATUS.PAID,
      is_hidden: false,
      created_by: 1,
    },
    user: {
      full_name: 'Jane Smith',
    },
  },
  {
    id: '3',
    action: 'invoice_status_changed',
    invoice_id: 4,
    user_id: 1,
    created_at: new Date('2024-10-30T08:45:00Z'),
    invoice: {
      invoice_number: 'INV-2024-004',
      status: INVOICE_STATUS.PENDING_APPROVAL,
      is_hidden: false,
      created_by: 1,
    },
    user: {
      full_name: 'Bob Johnson',
    },
  },
];

/**
 * Mock User Sessions
 */
export const mockSessions = {
  associate: {
    user: { id: '1', role: 'associate', email: 'associate@test.com' },
  },
  manager: {
    user: { id: '2', role: 'manager', email: 'manager@test.com' },
  },
  admin: {
    user: { id: '3', role: 'admin', email: 'admin@test.com' },
  },
  superAdmin: {
    user: { id: '4', role: 'super_admin', email: 'superadmin@test.com' },
  },
};
