/**
 * Test Fixtures: Master Data Approval Workflow
 *
 * Mock data for master data request and approval testing
 * Sprint 13, Phase 3: Testing Expansion
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock User Sessions
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
 * Mock Request Data (Valid)
 */
export const validRequestData = {
  vendor: {
    name: 'New Vendor LLC',
    address: '123 Business St',
    gst_exemption: false,
    bank_details: 'Account: 1234567890',
    is_active: true,
  },
  category: {
    name: 'IT Services',
    is_active: true,
  },
  invoiceProfile: {
    name: 'Standard IT Profile',
    description: 'Profile for IT services',
    entity_id: 1,
    vendor_id: 1,
    category_id: 1,
    currency_id: 1,
    prepaid_postpaid: 'postpaid' as const,
    tds_applicable: true,
    tds_percentage: 10,
    visible_to_all: true,
  },
  paymentType: {
    name: 'Wire Transfer',
    description: 'Bank wire transfer',
    requires_reference: true,
    is_active: true,
  },
};

/**
 * Mock Master Data Requests (Database Records)
 */
export const mockRequests = {
  vendorPending: {
    id: 1,
    entity_type: 'vendor',
    status: 'pending_approval',
    requester_id: 1,
    request_data: JSON.stringify(validRequestData.vendor),
    reviewer_id: null,
    reviewed_at: null,
    rejection_reason: null,
    admin_edits: null,
    admin_notes: null,
    resubmission_count: 0,
    previous_attempt_id: null,
    superseded_by_id: null,
    created_entity_id: null,
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-10-01'),
    requester: {
      id: 1,
      full_name: 'Test User',
      email: 'user@test.com',
    },
    reviewer: null,
  },
  categoryDraft: {
    id: 2,
    entity_type: 'category',
    status: 'draft',
    requester_id: 1,
    request_data: JSON.stringify(validRequestData.category),
    reviewer_id: null,
    reviewed_at: null,
    rejection_reason: null,
    admin_edits: null,
    admin_notes: null,
    resubmission_count: 0,
    previous_attempt_id: null,
    superseded_by_id: null,
    created_entity_id: null,
    created_at: new Date('2024-10-02'),
    updated_at: new Date('2024-10-02'),
    requester: {
      id: 1,
      full_name: 'Test User',
      email: 'user@test.com',
    },
    reviewer: null,
  },
  vendorApproved: {
    id: 3,
    entity_type: 'vendor',
    status: 'approved',
    requester_id: 1,
    request_data: JSON.stringify(validRequestData.vendor),
    reviewer_id: 2,
    reviewed_at: new Date('2024-10-03'),
    rejection_reason: null,
    admin_edits: null,
    admin_notes: 'Looks good',
    resubmission_count: 0,
    previous_attempt_id: null,
    superseded_by_id: null,
    created_entity_id: 'VEN-1',
    created_at: new Date('2024-10-01'),
    updated_at: new Date('2024-10-03'),
    requester: {
      id: 1,
      full_name: 'Test User',
      email: 'user@test.com',
    },
    reviewer: {
      id: 2,
      full_name: 'Admin User',
      email: 'admin@test.com',
    },
  },
  categoryRejected: {
    id: 4,
    entity_type: 'category',
    status: 'rejected',
    requester_id: 1,
    request_data: JSON.stringify(validRequestData.category),
    reviewer_id: 2,
    reviewed_at: new Date('2024-10-04'),
    rejection_reason: 'Category already exists with similar name',
    admin_edits: null,
    admin_notes: 'Duplicate category',
    resubmission_count: 0,
    previous_attempt_id: null,
    superseded_by_id: null,
    created_entity_id: null,
    created_at: new Date('2024-10-03'),
    updated_at: new Date('2024-10-04'),
    requester: {
      id: 1,
      full_name: 'Test User',
      email: 'user@test.com',
    },
    reviewer: {
      id: 2,
      full_name: 'Admin User',
      email: 'admin@test.com',
    },
  },
  vendorResubmission: {
    id: 5,
    entity_type: 'vendor',
    status: 'rejected',
    requester_id: 1,
    request_data: JSON.stringify(validRequestData.vendor),
    reviewer_id: 2,
    reviewed_at: new Date('2024-10-05'),
    rejection_reason: 'Missing GST details',
    admin_edits: null,
    admin_notes: 'Please add GST information',
    resubmission_count: 1,
    previous_attempt_id: null,
    superseded_by_id: null,
    created_entity_id: null,
    created_at: new Date('2024-10-04'),
    updated_at: new Date('2024-10-05'),
    requester: {
      id: 1,
      full_name: 'Test User',
      email: 'user@test.com',
    },
    reviewer: {
      id: 2,
      full_name: 'Admin User',
      email: 'admin@test.com',
    },
  },
};

/**
 * Mock Created Entities (After Approval)
 */
export const mockCreatedEntities = {
  vendor: {
    id: 1,
    name: 'New Vendor LLC',
    is_active: true,
    address: '123 Business St',
    gst_exemption: false,
    bank_details: 'Account: 1234567890',
    created_at: new Date('2024-10-03'),
    updated_at: new Date('2024-10-03'),
  },
  category: {
    id: 1,
    name: 'IT Services',
    description: 'IT Services',
    is_active: true,
    created_at: new Date('2024-10-03'),
    updated_at: new Date('2024-10-03'),
  },
  invoiceProfile: {
    id: 1,
    name: 'Standard IT Profile',
    description: 'Profile for IT services',
    entity_id: 1,
    vendor_id: 1,
    category_id: 1,
    currency_id: 1,
    prepaid_postpaid: 'postpaid',
    tds_applicable: true,
    tds_percentage: 10,
    visible_to_all: true,
    created_at: new Date('2024-10-03'),
    updated_at: new Date('2024-10-03'),
  },
  paymentType: {
    id: 1,
    name: 'Wire Transfer',
    description: 'Bank wire transfer',
    requires_reference: true,
    is_active: true,
    created_at: new Date('2024-10-03'),
    updated_at: new Date('2024-10-03'),
  },
};

/**
 * Mock First Active Records (for invoice profile defaults)
 */
export const mockFirstActiveRecords = {
  entity: {
    id: 1,
    name: 'Default Entity',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  vendor: {
    id: 1,
    name: 'Default Vendor',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  category: {
    id: 1,
    name: 'Default Category',
    description: 'Default',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  currency: {
    id: 1,
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
};
