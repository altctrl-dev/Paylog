/**
 * Server Actions: Master Data Approval (Admin Only)
 *
 * Admin functions for reviewing and approving master data requests.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { emailService, sendEmailAsync } from '@/lib/email';
import { revalidatePath } from 'next/cache';
import type {
  MasterDataEntityType,
  MasterDataRequestWithDetails,
  ServerActionResult,
  RequestData,
  InvoiceArchiveRequestData,
} from '../master-data-requests';
import { archiveInvoice } from '../invoices';
import {
  notifyMasterDataRequestApproved,
  notifyMasterDataRequestRejected,
} from '@/app/actions/notifications';

interface RawMasterDataRequest {
  id: number;
  entity_type: string;
  status: string;
  requester_id: number;
  request_data: string;
  reviewer_id: number | null;
  reviewed_at: Date | null;
  rejection_reason: string | null;
  admin_edits: string | null;
  admin_notes: string | null;
  resubmission_count: number;
  previous_attempt_id: number | null;
  superseded_by_id: number | null;
  created_entity_id: string | null;
  created_at: Date;
  updated_at: Date;
  requester: {
    id: number;
    full_name: string;
    email: string;
  };
  reviewer: {
    id: number;
    full_name: string;
    email: string;
  } | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current authenticated admin user
 */
async function getAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized: You must be logged in');
  }

  const role = session.user.role as string;
  if (role !== 'admin' && role !== 'super_admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  return {
    id: parseInt(session.user.id),
    email: session.user.email!,
    role,
  };
}

// ============================================================================
// GET ADMIN REQUESTS
// ============================================================================

export interface GetAdminRequestsFilters {
  entity_type?: MasterDataEntityType;
  status?: 'pending_approval' | 'approved' | 'rejected';
}

/**
 * Get all pending requests for admin review
 */
export async function getAdminRequests(
  filters?: GetAdminRequestsFilters
): Promise<ServerActionResult<MasterDataRequestWithDetails[]>> {
  try {
    await getAdmin(); // Verify admin access

    const requests = await db.masterDataRequest.findMany({
      where: {
        ...(filters?.entity_type && { entity_type: filters.entity_type }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        requester: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    const formatted: MasterDataRequestWithDetails[] = (
      requests as RawMasterDataRequest[]
    ).map((request) => {
      const mapped: MasterDataRequestWithDetails = {
        id: request.id,
        entity_type: request.entity_type as MasterDataEntityType,
        status: request.status as MasterDataRequestWithDetails['status'],
        requester_id: request.requester_id,
        request_data: JSON.parse(request.request_data) as RequestData,
        reviewer_id: request.reviewer_id,
        reviewed_at: request.reviewed_at,
        rejection_reason: request.rejection_reason,
        admin_edits: request.admin_edits
          ? (JSON.parse(request.admin_edits) as Record<string, unknown>)
          : null,
        admin_notes: request.admin_notes,
        resubmission_count: request.resubmission_count,
        previous_attempt_id: request.previous_attempt_id,
        superseded_by_id: request.superseded_by_id,
        created_entity_id: request.created_entity_id,
        created_at: request.created_at,
        updated_at: request.updated_at,
        requester: request.requester!,
        reviewer: request.reviewer ?? null,
      };

      return mapped;
    });

    return {
      success: true,
      data: formatted,
    };
  } catch (error) {
    console.error('getAdminRequests error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch requests',
    };
  }
}

// ============================================================================
// APPROVE REQUEST
// ============================================================================

/**
 * Approve a request and create the entity
 */
export async function approveRequest(
  requestId: number,
  adminEdits?: Record<string, unknown>,
  adminNotes?: string
): Promise<ServerActionResult<MasterDataRequestWithDetails>> {
  try {
    const admin = await getAdmin();

    const request = await db.masterDataRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return {
        success: false,
        error: 'Request not found',
      };
    }

    // Only pending requests can be approved
    if (request.status !== 'pending_approval') {
      return {
        success: false,
        error: 'Only pending requests can be approved',
      };
    }

    const requestData = JSON.parse(request.request_data);
    const finalData = adminEdits ? { ...requestData, ...adminEdits } : requestData;

    // Create entity in respective table
    let createdEntityId: string;

    switch (request.entity_type) {
      case 'vendor': {
        const vendor = await db.vendor.create({
          data: {
            name: finalData.name,
            is_active: finalData.is_active ?? true,
          },
        });
        createdEntityId = `VEN-${vendor.id}`;
        break;
      }

      case 'category': {
        const category = await db.category.create({
          data: {
            name: finalData.name,
            description: finalData.description || '',
            is_active: finalData.is_active ?? true,
          },
        });
        createdEntityId = `CAT-${category.id}`;
        break;
      }

      case 'invoice_profile': {
        // Sprint 9B: InvoiceProfile now requires entity_id, vendor_id, category_id, currency_id
        // Get defaults from finalData or use first active records
        let entityId = finalData.entity_id;
        let vendorId = finalData.vendor_id;
        let categoryId = finalData.category_id;
        let currencyId = finalData.currency_id;

        // If not provided in request, use first active records as defaults
        if (!entityId) {
          const firstEntity = await db.entity.findFirst({
            where: { is_active: true },
            orderBy: { id: 'asc' },
          });
          if (!firstEntity) {
            throw new Error('No active entities found. Cannot create invoice profile.');
          }
          entityId = firstEntity.id;
        }

        if (!vendorId) {
          const firstVendor = await db.vendor.findFirst({
            where: { is_active: true },
            orderBy: { id: 'asc' },
          });
          if (!firstVendor) {
            throw new Error('No active vendors found. Cannot create invoice profile.');
          }
          vendorId = firstVendor.id;
        }

        if (!categoryId) {
          const firstCategory = await db.category.findFirst({
            where: { is_active: true },
            orderBy: { id: 'asc' },
          });
          if (!firstCategory) {
            throw new Error('No active categories found. Cannot create invoice profile.');
          }
          categoryId = firstCategory.id;
        }

        if (!currencyId) {
          const firstCurrency = await db.currency.findFirst({
            where: { is_active: true },
            orderBy: { id: 'asc' },
          });
          if (!firstCurrency) {
            throw new Error('No active currencies found. Cannot create invoice profile.');
          }
          currencyId = firstCurrency.id;
        }

        const profile = await db.invoiceProfile.create({
          data: {
            name: finalData.name,
            description: finalData.description,
            visible_to_all: finalData.visible_to_all ?? true,
            entity_id: entityId,
            vendor_id: vendorId,
            category_id: categoryId,
            currency_id: currencyId,
            prepaid_postpaid: finalData.prepaid_postpaid || null,
            tds_applicable: finalData.tds_applicable ?? false,
            tds_percentage: finalData.tds_percentage || null,
          },
        });
        createdEntityId = `PRF-${profile.id}`;
        break;
      }

      case 'payment_type': {
        const paymentType = await db.paymentType.create({
          data: {
            name: finalData.name,
            description: finalData.description,
            requires_reference: finalData.requires_reference ?? false,
            is_active: finalData.is_active ?? true,
          },
        });
        createdEntityId = `PMT-${paymentType.id}`;
        break;
      }

      case 'invoice_archive': {
        // Archive the invoice (move files to Archived folder)
        const archiveData = finalData as InvoiceArchiveRequestData;
        const archiveResult = await archiveInvoice(
          archiveData.invoice_id,
          archiveData.reason || 'Archived via approved request'
        );

        if (!archiveResult.success) {
          return {
            success: false,
            error: archiveResult.error || 'Failed to archive invoice',
          };
        }

        createdEntityId = `ARC-${archiveData.invoice_id}`;
        break;
      }

      default:
        return {
          success: false,
          error: `Unknown entity type: ${request.entity_type}`,
        };
    }

    // Update request status
    const updatedRequest = await db.masterDataRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewer_id: admin.id,
        reviewed_at: new Date(),
        admin_edits: adminEdits ? JSON.stringify(adminEdits) : null,
        admin_notes: adminNotes ?? null,
        created_entity_id: createdEntityId,
      },
      include: {
        requester: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // If this was a resubmission, mark the original as superseded
    if (request.previous_attempt_id) {
      await db.masterDataRequest.update({
        where: { id: request.previous_attempt_id },
        data: {
          superseded_by_id: requestId,
        },
      });
    }

    // Send approval email to requester (non-blocking)
    if (updatedRequest.requester?.email) {
      sendEmailAsync(() =>
        emailService.sendApprovalNotification(
          updatedRequest.requester.email,
          {
            requestId: updatedRequest.id.toString(),
            requestType: getEntityDisplayName(updatedRequest.entity_type as MasterDataEntityType),
            approverName: updatedRequest.reviewer?.full_name || 'Admin',
            comments: adminNotes || 'Your request has been approved.',
            approvedAt: new Date(),
          }
        )
      );
    }

    // Send in-app notification to requester
    await notifyMasterDataRequestApproved(
      updatedRequest.requester_id,
      requestId,
      updatedRequest.entity_type
    );

    return {
      success: true,
      data: {
        ...updatedRequest,
        entity_type: updatedRequest.entity_type as MasterDataEntityType,
        status: updatedRequest.status as MasterDataRequestWithDetails['status'],
        request_data: JSON.parse(updatedRequest.request_data),
        admin_edits: updatedRequest.admin_edits ? JSON.parse(updatedRequest.admin_edits) : null,
      },
    };
  } catch (error) {
    console.error('approveRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve request',
    };
  }
}

// ============================================================================
// REJECT REQUEST
// ============================================================================

/**
 * Reject a request with reason
 */
export async function rejectRequest(
  requestId: number,
  reason: string
): Promise<ServerActionResult<MasterDataRequestWithDetails>> {
  try {
    const admin = await getAdmin();

    const request = await db.masterDataRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return {
        success: false,
        error: 'Request not found',
      };
    }

    // Only pending requests can be rejected
    if (request.status !== 'pending_approval') {
      return {
        success: false,
        error: 'Only pending requests can be rejected',
      };
    }

    if (!reason || reason.trim().length < 10) {
      return {
        success: false,
        error: 'Rejection reason must be at least 10 characters',
      };
    }

    // Update request status
    const updatedRequest = await db.masterDataRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewer_id: admin.id,
        reviewed_at: new Date(),
        rejection_reason: reason,
      },
      include: {
        requester: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    // Send rejection email to requester (non-blocking)
    if (updatedRequest.requester?.email) {
      sendEmailAsync(() =>
        emailService.sendRejectionNotification(
          updatedRequest.requester.email,
          {
            requestId: updatedRequest.id.toString(),
            requestType: getEntityDisplayName(updatedRequest.entity_type as MasterDataEntityType),
            reviewerName: updatedRequest.reviewer?.full_name || 'Admin',
            reason,
            rejectedAt: new Date(),
          }
        )
      );
    }

    // Send in-app notification to requester
    await notifyMasterDataRequestRejected(
      updatedRequest.requester_id,
      requestId,
      updatedRequest.entity_type,
      reason
    );

    return {
      success: true,
      data: {
        ...updatedRequest,
        entity_type: updatedRequest.entity_type as MasterDataEntityType,
        status: updatedRequest.status as MasterDataRequestWithDetails['status'],
        request_data: JSON.parse(updatedRequest.request_data),
        admin_edits: updatedRequest.admin_edits ? JSON.parse(updatedRequest.admin_edits) : null,
      },
    };
  } catch (error) {
    console.error('rejectRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject request',
    };
  }
}

// ============================================================================
// BULK APPROVE
// ============================================================================

/**
 * Bulk approve multiple requests
 */
export async function bulkApprove(
  requestIds: number[]
): Promise<ServerActionResult<{ approved: number; failed: number }>> {
  try {
    await getAdmin(); // Verify admin access

    let approved = 0;
    let failed = 0;

    for (const requestId of requestIds) {
      const result = await approveRequest(requestId);
      if (result.success) {
        approved++;
      } else {
        failed++;
        console.error(`Failed to approve request ${requestId}:`, result.error);
      }
    }

    return {
      success: true,
      data: { approved, failed },
    };
  } catch (error) {
    console.error('bulkApprove error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk approve',
    };
  }
}

// ============================================================================
// BULK REJECT
// ============================================================================

/**
 * Bulk reject multiple requests with a single reason
 */
export async function bulkReject(
  requestIds: number[],
  reason: string
): Promise<ServerActionResult<{ rejected: number; failed: number }>> {
  try {
    await getAdmin(); // Verify admin access

    if (!reason || reason.trim().length < 10) {
      return {
        success: false,
        error: 'Rejection reason must be at least 10 characters',
      };
    }

    let rejected = 0;
    let failed = 0;

    for (const requestId of requestIds) {
      const result = await rejectRequest(requestId, reason);
      if (result.success) {
        rejected++;
      } else {
        failed++;
        console.error(`Failed to reject request ${requestId}:`, result.error);
      }
    }

    return {
      success: true,
      data: { rejected, failed },
    };
  } catch (error) {
    console.error('bulkReject error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk reject',
    };
  }
}

// ============================================================================
// GET PENDING REQUEST COUNT
// ============================================================================

/**
 * Get count of pending requests for badge display
 */
export async function getPendingRequestCount(): Promise<ServerActionResult<number>> {
  try {
    await getAdmin();

    const count = await db.masterDataRequest.count({
      where: {
        status: 'pending_approval',
      },
    });

    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error('getPendingRequestCount error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending count',
    };
  }
}

// ============================================================================
// HELPER: ENTITY DISPLAY NAME
// ============================================================================

/**
 * Get human-readable display name for entity type
 */
function getEntityDisplayName(entityType: MasterDataEntityType): string {
  const labels: Record<string, string> = {
    vendor: 'Vendor',
    category: 'Category',
    invoice_profile: 'Invoice Profile',
    payment_type: 'Payment Type',
    invoice_archive: 'Invoice Archive',
  };
  return labels[entityType] || entityType;
}

// ============================================================================
// VENDOR-SPECIFIC APPROVAL FUNCTIONS (Sprint 13)
// ============================================================================

/**
 * Approve a vendor-specific Master Data Request
 *
 * This function approves a vendor request and updates the vendor status.
 * Part of Phase 2B: Vendor Approval Workflow
 */
export async function approveVendorRequest(
  vendorId: number,
  adminId: number
): Promise<ServerActionResult<{ id: number; name: string; status: string }>> {
  try {
    // Update vendor status to APPROVED
    const vendor = await db.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'APPROVED',
        approved_by_user_id: adminId,
        approved_at: new Date(),
      },
    });

    // Note: Master Data Request status update will be handled by the caller
    // This function focuses on vendor approval only

    revalidatePath('/admin/master-data-requests');
    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: vendor,
    };
  } catch (error) {
    console.error('approveVendorRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve vendor',
    };
  }
}

/**
 * Reject a vendor-specific Master Data Request
 *
 * Rejects the vendor request and updates vendor status to REJECTED.
 * Part of Phase 2B: Vendor Approval Workflow
 */
export async function rejectVendorRequest(
  vendorId: number,
  rejectionReason: string
): Promise<ServerActionResult<{ id: number; name: string; status: string }>> {
  try {
    // Update vendor status to REJECTED
    const vendor = await db.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'REJECTED',
        rejected_reason: rejectionReason,
      },
    });

    revalidatePath('/admin/master-data-requests');
    revalidatePath('/settings');

    return {
      success: true,
      data: vendor,
    };
  } catch (error) {
    console.error('rejectVendorRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject vendor',
    };
  }
}
