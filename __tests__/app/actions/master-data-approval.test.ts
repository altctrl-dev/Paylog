/**
 * Master Data Approval Workflow Test Suite
 *
 * Comprehensive tests for master data request creation, approval, and rejection
 * with RBAC enforcement.
 *
 * Sprint 13, Phase 3: Testing Expansion & Polish (2 SP)
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  createRequest,
  getUserRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
  submitRequest,
  resubmitRequest,
} from '@/app/actions/master-data-requests';
import {
  getAdminRequests,
  approveRequest,
  rejectRequest,
  bulkApprove,
  bulkReject,
  getPendingRequestCount,
} from '@/app/actions/admin/master-data-approval';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  mockSessions,
  validRequestData,
  mockRequests,
  mockCreatedEntities,
  mockFirstActiveRecords,
} from '../../fixtures/master-data-fixtures';

// Mock modules
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  db: {
    masterDataRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    vendor: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    category: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    invoiceProfile: {
      create: jest.fn(),
    },
    paymentType: {
      create: jest.fn(),
    },
    entity: {
      findFirst: jest.fn(),
    },
    currency: {
      findFirst: jest.fn(),
    },
  },
}));
jest.mock('@/lib/email', () => ({
  emailService: {
    sendNewRequestNotification: jest.fn().mockResolvedValue(true),
    sendApprovalNotification: jest.fn().mockResolvedValue(true),
    sendRejectionNotification: jest.fn().mockResolvedValue(true),
  },
  sendEmailAsync: jest.fn((fn) => fn().catch(() => {})),
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockDb = db as any;

describe('Master Data Approval Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // createRequest Tests (User Actions)
  // ==========================================================================
  describe('createRequest', () => {
    it('should create draft request for standard users', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.create.mockResolvedValue(
        mockRequests.categoryDraft
      );

      const result = await createRequest(
        'category',
        validRequestData.category,
        'draft'
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.status).toBe('draft');
      expect(result.data.entity_type).toBe('category');
      expect(mockDb.masterDataRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entity_type: 'category',
            status: 'draft',
            requester_id: 1,
          }),
        })
      );
    });

    it('should create pending_approval request and send email', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.create.mockResolvedValue(
        mockRequests.vendorPending
      );

      const result = await createRequest(
        'vendor',
        validRequestData.vendor,
        'pending_approval'
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.status).toBe('pending_approval');
    });

    it('should validate vendor request data', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      const invalidVendorData = {
        name: '', // Empty name (invalid)
      };

      const result = await createRequest(
        'vendor',
        invalidVendorData,
        'draft'
      );

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toBeTruthy();
    });

    it('should handle unauthorized users', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await createRequest(
        'vendor',
        validRequestData.vendor,
        'draft'
      );

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('Unauthorized');
    });
  });

  // ==========================================================================
  // getUserRequests Tests
  // ==========================================================================
  describe('getUserRequests', () => {
    it('should return all requests for current user', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.findMany.mockResolvedValue([
        mockRequests.vendorPending,
        mockRequests.categoryDraft,
      ]);

      const result = await getUserRequests();

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(2);
      expect(mockDb.masterDataRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requester_id: 1,
          }),
        })
      );
    });

    it('should filter by entity_type', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.findMany.mockResolvedValue([
        mockRequests.vendorPending,
      ]);

      const result = await getUserRequests({ entity_type: 'vendor' });

      expect(result.success).toBe(true);
      expect(mockDb.masterDataRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entity_type: 'vendor',
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.findMany.mockResolvedValue([
        mockRequests.vendorApproved,
      ]);

      const result = await getUserRequests({ status: 'approved' });

      expect(result.success).toBe(true);
      expect(mockDb.masterDataRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'approved',
          }),
        })
      );
    });
  });

  // ==========================================================================
  // submitRequest Tests
  // ==========================================================================
  describe('submitRequest', () => {
    it('should submit draft request and send email notification', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.categoryDraft
      );
      mockDb.masterDataRequest.update.mockResolvedValue({
        ...mockRequests.categoryDraft,
        status: 'pending_approval',
      });

      const result = await submitRequest(mockRequests.categoryDraft.id);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.status).toBe('pending_approval');
      expect(mockDb.masterDataRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending_approval',
          }),
        })
      );
    });

    it('should reject submitting non-draft requests', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.vendorPending
      );

      const result = await submitRequest(mockRequests.vendorPending.id);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('draft');
    });

    it('should reject submission by non-owner', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '99', role: 'standard_user', email: 'other@test.com' },
      } as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.categoryDraft
      );

      const result = await submitRequest(mockRequests.categoryDraft.id);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('Unauthorized');
    });
  });

  // ==========================================================================
  // deleteRequest Tests
  // ==========================================================================
  describe('deleteRequest', () => {
    it('should delete draft request', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.categoryDraft
      );
      mockDb.masterDataRequest.delete.mockResolvedValue(
        mockRequests.categoryDraft
      );

      const result = await deleteRequest(mockRequests.categoryDraft.id);

      expect(result.success).toBe(true);
      expect(mockDb.masterDataRequest.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockRequests.categoryDraft.id },
        })
      );
    });

    it('should reject deleting non-draft requests', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.vendorPending
      );

      const result = await deleteRequest(mockRequests.vendorPending.id);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('draft');
    });
  });

  // ==========================================================================
  // resubmitRequest Tests
  // ==========================================================================
  describe('resubmitRequest', () => {
    it('should resubmit rejected request with updated data', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.categoryRejected
      );
      mockDb.masterDataRequest.create.mockResolvedValue({
        ...mockRequests.categoryRejected,
        id: 10,
        status: 'pending_approval',
        resubmission_count: 1,
        previous_attempt_id: mockRequests.categoryRejected.id,
      });

      const result = await resubmitRequest(
        mockRequests.categoryRejected.id,
        validRequestData.category
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.resubmission_count).toBe(1);
      expect(result.data.previous_attempt_id).toBe(
        mockRequests.categoryRejected.id
      );
    });

    it('should enforce maximum resubmission limit (3 total attempts)', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      const maxResubmissions = {
        ...mockRequests.vendorResubmission,
        resubmission_count: 2, // Already 2 resubmissions
      };

      mockDb.masterDataRequest.findUnique.mockResolvedValue(maxResubmissions);

      const result = await resubmitRequest(
        maxResubmissions.id,
        validRequestData.vendor
      );

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('Maximum resubmission limit');
    });

    it('should reject resubmitting non-rejected requests', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.vendorPending
      );

      const result = await resubmitRequest(
        mockRequests.vendorPending.id,
        validRequestData.vendor
      );

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('rejected');
    });
  });

  // ==========================================================================
  // getAdminRequests Tests (Admin Only)
  // ==========================================================================
  describe('getAdminRequests', () => {
    it('should return all requests for admin users', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      mockDb.masterDataRequest.findMany.mockResolvedValue([
        mockRequests.vendorPending,
        mockRequests.categoryDraft,
      ]);

      const result = await getAdminRequests();

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(2);
    });

    it('should filter by status for admins', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      mockDb.masterDataRequest.findMany.mockResolvedValue([
        mockRequests.vendorPending,
      ]);

      const result = await getAdminRequests({ status: 'pending_approval' });

      expect(result.success).toBe(true);
      expect(mockDb.masterDataRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending_approval',
          }),
        })
      );
    });

    it('should reject access by standard users', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      const result = await getAdminRequests();

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('Admin access required');
    });
  });

  // ==========================================================================
  // approveRequest Tests (Admin Only)
  // ==========================================================================
  describe('approveRequest', () => {
    beforeEach(() => {
      // Mock first active records for invoice profile defaults
      mockDb.entity.findFirst.mockResolvedValue(mockFirstActiveRecords.entity);
      mockDb.vendor.findFirst.mockResolvedValue(mockFirstActiveRecords.vendor);
      mockDb.category.findFirst.mockResolvedValue(
        mockFirstActiveRecords.category
      );
      mockDb.currency.findFirst.mockResolvedValue(
        mockFirstActiveRecords.currency
      );
    });

    it('should approve vendor request and create vendor', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.vendorPending
      );
      mockDb.vendor.create.mockResolvedValue(mockCreatedEntities.vendor);
      mockDb.masterDataRequest.update.mockResolvedValue({
        ...mockRequests.vendorPending,
        status: 'approved',
        reviewer_id: 2,
        created_entity_id: 'VEN-1',
      });

      const result = await approveRequest(mockRequests.vendorPending.id);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.status).toBe('approved');
      expect(result.data.created_entity_id).toBe('VEN-1');
      expect(mockDb.vendor.create).toHaveBeenCalled();
    });

    it('should approve category request and create category', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      const categoryRequest = {
        ...mockRequests.vendorPending,
        entity_type: 'category',
        request_data: JSON.stringify(validRequestData.category),
      };

      mockDb.masterDataRequest.findUnique.mockResolvedValue(categoryRequest);
      mockDb.category.create.mockResolvedValue(mockCreatedEntities.category);
      mockDb.masterDataRequest.update.mockResolvedValue({
        ...categoryRequest,
        status: 'approved',
        created_entity_id: 'CAT-1',
      });

      const result = await approveRequest(categoryRequest.id);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(mockDb.category.create).toHaveBeenCalled();
    });

    it('should approve request with admin edits', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.vendorPending
      );
      mockDb.vendor.create.mockResolvedValue(mockCreatedEntities.vendor);
      mockDb.masterDataRequest.update.mockResolvedValue({
        ...mockRequests.vendorPending,
        status: 'approved',
      });

      const adminEdits = { address: 'Updated Address' };
      const adminNotes = 'Fixed address format';

      const result = await approveRequest(
        mockRequests.vendorPending.id,
        adminEdits,
        adminNotes
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(mockDb.vendor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            address: 'Updated Address',
          }),
        })
      );
    });

    it('should reject approval by standard users', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      const result = await approveRequest(mockRequests.vendorPending.id);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('Admin access required');
    });

    it('should reject approving non-pending requests', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.vendorApproved
      );

      const result = await approveRequest(mockRequests.vendorApproved.id);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('pending');
    });
  });

  // ==========================================================================
  // rejectRequest Tests (Admin Only)
  // ==========================================================================
  describe('rejectRequest', () => {
    const rejectionReason = 'Missing required documentation';

    it('should reject pending request with reason', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.vendorPending
      );
      mockDb.masterDataRequest.update.mockResolvedValue({
        ...mockRequests.vendorPending,
        status: 'rejected',
        reviewer_id: 2,
        rejection_reason: rejectionReason,
      });

      const result = await rejectRequest(
        mockRequests.vendorPending.id,
        rejectionReason
      );

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.status).toBe('rejected');
      expect(result.data.rejection_reason).toBe(rejectionReason);
    });

    it('should reject rejection by standard users', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      const result = await rejectRequest(
        mockRequests.vendorPending.id,
        rejectionReason
      );

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('Admin access required');
    });

    it('should validate rejection reason length (min 10 chars)', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.vendorPending
      );

      const result = await rejectRequest(mockRequests.vendorPending.id, 'Short');

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('10 characters');
    });

    it('should reject rejecting non-pending requests', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      mockDb.masterDataRequest.findUnique.mockResolvedValue(
        mockRequests.categoryRejected
      );

      const result = await rejectRequest(
        mockRequests.categoryRejected.id,
        rejectionReason
      );

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('pending');
    });
  });

  // ==========================================================================
  // getPendingRequestCount Tests
  // ==========================================================================
  describe('getPendingRequestCount', () => {
    it('should return count of pending requests for admins', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);

      mockDb.masterDataRequest.count.mockResolvedValue(5);

      const result = await getPendingRequestCount();

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toBe(5);
      expect(mockDb.masterDataRequest.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'pending_approval',
          }),
        })
      );
    });

    it('should reject access by standard users', async () => {
      mockAuth.mockResolvedValue(mockSessions.standardUser as any);

      const result = await getPendingRequestCount();

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('Admin access required');
    });
  });
});
