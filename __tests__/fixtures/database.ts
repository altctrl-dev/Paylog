/**
 * Test Fixtures: Database Mock Data
 *
 * Mock data for users, invoices, and attachments
 */

/**
 * Mock Users
 */
export const mockUsers = {
  associate: {
    id: 1,
    email: 'associate@test.com',
    full_name: 'Test Associate',
    role: 'associate',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  manager: {
    id: 2,
    email: 'manager@test.com',
    full_name: 'Test Manager',
    role: 'manager',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  admin: {
    id: 3,
    email: 'admin@test.com',
    full_name: 'Test Admin',
    role: 'admin',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  superAdmin: {
    id: 4,
    email: 'superadmin@test.com',
    full_name: 'Test Super Admin',
    role: 'super_admin',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  otherAssociate: {
    id: 5,
    email: 'other@test.com',
    full_name: 'Other Associate',
    role: 'associate',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
}

/**
 * Mock Invoices
 */
export const mockInvoices = {
  pending: {
    id: 1,
    invoice_number: 'INV-001',
    status: 'PENDING_APPROVAL',
    total_amount: 1000,
    created_by: 1,
    is_hidden: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  unpaid: {
    id: 2,
    invoice_number: 'INV-002',
    status: 'UNPAID',
    total_amount: 2000,
    created_by: 1,
    is_hidden: false,
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
  },
  paid: {
    id: 3,
    invoice_number: 'INV-003',
    status: 'PAID',
    total_amount: 3000,
    created_by: 1,
    is_hidden: false,
    created_at: new Date('2024-01-03'),
    updated_at: new Date('2024-01-03'),
  },
  hidden: {
    id: 4,
    invoice_number: 'INV-004',
    status: 'PENDING_APPROVAL',
    total_amount: 4000,
    created_by: 2,
    is_hidden: true,
    created_at: new Date('2024-01-04'),
    updated_at: new Date('2024-01-04'),
  },
  overdue: {
    id: 5,
    invoice_number: 'INV-005',
    status: 'OVERDUE',
    total_amount: 5000,
    created_by: 1,
    is_hidden: false,
    created_at: new Date('2024-01-05'),
    updated_at: new Date('2024-01-05'),
  },
}

/**
 * Mock Attachments
 */
export const mockAttachments = {
  pdf1: {
    id: 'att-001',
    invoice_id: 1,
    file_name: '1234567890_abcdef12_invoice.pdf',
    original_name: 'invoice.pdf',
    file_size: 102400,
    mime_type: 'application/pdf',
    storage_path: 'invoices/2024/01/1/1234567890_abcdef12_invoice.pdf',
    uploaded_by: 1,
    uploaded_at: new Date('2024-01-01T10:00:00'),
    deleted_at: null,
    deleted_by: null,
  },
  png1: {
    id: 'att-002',
    invoice_id: 1,
    file_name: '1234567891_abcdef13_receipt.png',
    original_name: 'receipt.png',
    file_size: 204800,
    mime_type: 'image/png',
    storage_path: 'invoices/2024/01/1/1234567891_abcdef13_receipt.png',
    uploaded_by: 1,
    uploaded_at: new Date('2024-01-01T11:00:00'),
    deleted_at: null,
    deleted_by: null,
  },
  deleted: {
    id: 'att-003',
    invoice_id: 1,
    file_name: '1234567892_abcdef14_old.pdf',
    original_name: 'old.pdf',
    file_size: 51200,
    mime_type: 'application/pdf',
    storage_path: 'invoices/2024/01/1/1234567892_abcdef14_old.pdf',
    uploaded_by: 1,
    uploaded_at: new Date('2024-01-01T09:00:00'),
    deleted_at: new Date('2024-01-01T12:00:00'),
    deleted_by: 3,
  },
}

/**
 * Mock Sessions
 */
export const mockSessions = {
  associate: {
    user: {
      id: '1',
      email: 'associate@test.com',
      role: 'associate',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  manager: {
    user: {
      id: '2',
      email: 'manager@test.com',
      role: 'manager',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  admin: {
    user: {
      id: '3',
      email: 'admin@test.com',
      role: 'admin',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  otherAssociate: {
    user: {
      id: '5',
      email: 'other@test.com',
      role: 'associate',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  noSession: null,
}

/**
 * Create FormData with file
 */
export function createFormDataWithFile(file: File): FormData {
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

/**
 * Mock attachment with relations
 */
export function createAttachmentWithRelations(
  attachment: typeof mockAttachments.pdf1,
  invoice: typeof mockInvoices.pending,
  uploader: typeof mockUsers.associate,
  deleter?: typeof mockUsers.admin | null
) {
  return {
    ...attachment,
    invoice: {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      is_hidden: invoice.is_hidden,
    },
    uploader: {
      id: uploader.id,
      full_name: uploader.full_name,
      email: uploader.email,
    },
    deleter: deleter
      ? {
          id: deleter.id,
          full_name: deleter.full_name,
          email: deleter.email,
        }
      : null,
  }
}

/**
 * Mock Currencies (Sprint 9A)
 */
export const mockCurrencies = {
  usd: {
    id: 1,
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  inr: {
    id: 2,
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  eur: {
    id: 3,
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    is_active: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
}

/**
 * Mock Entities (Sprint 9A)
 */
export const mockEntities = {
  indiaEntity: {
    id: 1,
    name: 'Acme India Pvt. Ltd.',
    description: 'India operations entity',
    address: '123 Business Park, Mumbai, Maharashtra 400001',
    country: 'IN',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  usEntity: {
    id: 2,
    name: 'Acme USA Inc.',
    description: null,
    address: '456 Tech Street, San Francisco, CA 94105',
    country: 'US',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  inactiveEntity: {
    id: 3,
    name: 'Old Entity Ltd.',
    description: 'Archived entity',
    address: '789 Old Road, London, UK',
    country: 'GB',
    is_active: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
}

/**
 * Mock Vendors with Sprint 9A enhancements
 */
export const mockVendors = {
  basicVendor: {
    id: 1,
    name: 'Basic Vendor Ltd.',
    address: null,
    gst_exemption: false,
    bank_details: null,
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  enhancedVendor: {
    id: 2,
    name: 'Enhanced Vendor Inc.',
    address: '123 Vendor Street, City, State 12345',
    gst_exemption: true,
    bank_details: 'Bank: ABC Bank\nAccount: 1234567890\nIFSC: ABCD0001234\nBranch: Main Branch',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  inactiveVendor: {
    id: 3,
    name: 'Old Vendor Corp.',
    address: null,
    gst_exemption: false,
    bank_details: null,
    is_active: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
}

/**
 * Mock Categories with Sprint 9A enhancements
 */
export const mockCategories = {
  travelCategory: {
    id: 1,
    name: 'Travel',
    description: 'Travel and transportation expenses',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  suppliesCategory: {
    id: 2,
    name: 'Office Supplies',
    description: 'Office supplies and stationery',
    is_active: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  inactiveCategory: {
    id: 3,
    name: 'Deprecated',
    description: 'No longer used category',
    is_active: false,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
}
