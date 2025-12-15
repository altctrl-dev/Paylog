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
  notifyVendorApproved,
  notifyVendorRejected,
  notifyInvoiceRejected,
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
 * Get pending vendors directly from Vendor table (not MasterDataRequest)
 *
 * BUG-007 FIX: When standard users create vendors via invoice form,
 * vendors are created directly with status='PENDING_APPROVAL'.
 * This function retrieves those pending vendors for admin review.
 */
export async function getPendingVendorsDirect(
  statusFilter?: 'pending' | 'approved' | 'rejected' | 'all'
): Promise<ServerActionResult<Array<{
  id: number;
  name: string;
  address: string | null;
  status: string;
  created_by_user_id: number | null;
  created_at: Date;
  requester: { id: number; full_name: string; email: string } | null;
}>>> {
  try {
    await getAdmin(); // Verify admin access

    // Map filter to vendor status
    const statusMap: Record<string, string | undefined> = {
      pending: 'PENDING_APPROVAL',
      approved: 'APPROVED',
      rejected: 'REJECTED',
      all: undefined,
    };

    const status = statusFilter ? statusMap[statusFilter] : 'PENDING_APPROVAL';

    const vendors = await db.vendor.findMany({
      where: {
        ...(status && { status }),
        deleted_at: null,
        // Only include vendors that were created directly (not via MasterDataRequest)
        // These have created_by_user_id set
        created_by_user_id: { not: null },
      },
      include: {
        created_by: {
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

    return {
      success: true,
      data: vendors.map((v) => ({
        id: v.id,
        name: v.name,
        address: v.address,
        status: v.status ?? 'APPROVED',
        created_by_user_id: v.created_by_user_id,
        created_at: v.created_at,
        requester: v.created_by,
      })),
    };
  } catch (error) {
    console.error('getPendingVendorsDirect error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending vendors',
    };
  }
}

/**
 * Get count of pending vendors created directly (not via MasterDataRequest)
 *
 * BUG-007 FIX: Used by approval counts to include direct pending vendors
 */
export async function getPendingVendorsDirectCount(): Promise<ServerActionResult<number>> {
  try {
    await getAdmin();

    const count = await db.vendor.count({
      where: {
        status: 'PENDING_APPROVAL',
        deleted_at: null,
        created_by_user_id: { not: null },
      },
    });

    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error('getPendingVendorsDirectCount error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending vendors count',
    };
  }
}

/**
 * Approve a vendor-specific Master Data Request
 *
 * This function approves a vendor request and updates the vendor status.
 * Part of Phase 2B: Vendor Approval Workflow
 *
 * BUG-007 FIX: Now gets adminId from session internally (server action context)
 * to avoid "headers called outside request scope" error when called from client.
 */
export async function approveVendorRequest(
  vendorId: number
): Promise<ServerActionResult<{ id: number; name: string; status: string }>> {
  try {
    // Get admin from session (must be done in server action context)
    const admin = await getAdmin();

    // Update vendor status to APPROVED
    const vendor = await db.vendor.update({
      where: { id: vendorId },
      data: {
        status: 'APPROVED',
        approved_by_user_id: admin.id,
        approved_at: new Date(),
      },
    });

    // BUG-007 FIX: Notify the user who created the vendor
    if (vendor.created_by_user_id) {
      await notifyVendorApproved(vendor.created_by_user_id, vendor.id, vendor.name);
    }

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
 * Also auto-rejects all pending invoices associated with this vendor.
 * Part of Phase 2B: Vendor Approval Workflow
 *
 * BUG-007 Enhanced: Cascade vendor rejection to associated pending invoices
 */
export async function rejectVendorRequest(
  vendorId: number,
  rejectionReason: string
): Promise<ServerActionResult<{
  id: number;
  name: string;
  status: string;
  rejectedInvoicesCount: number;
}>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    const adminId = parseInt(session.user.id);

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // 1. Update vendor status to REJECTED
      const vendor = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'REJECTED',
          rejected_reason: rejectionReason,
        },
      });

      // 2. Find all pending invoices associated with this vendor
      const pendingInvoices = await tx.invoice.findMany({
        where: {
          vendor_id: vendorId,
          status: 'pending_approval',
        },
        select: {
          id: true,
          invoice_number: true,
          created_by: true,
        },
      });

      // 3. Auto-reject all pending invoices
      const vendorRejectionReason = `Associated vendor "${vendor.name}" was rejected: ${rejectionReason}`;

      if (pendingInvoices.length > 0) {
        await tx.invoice.updateMany({
          where: {
            vendor_id: vendorId,
            status: 'pending_approval',
          },
          data: {
            status: 'rejected',
            rejection_reason: vendorRejectionReason,
            rejected_by: adminId,
            rejected_at: new Date(),
          },
        });

        console.log(`[rejectVendorRequest] Auto-rejected ${pendingInvoices.length} pending invoices for vendor ${vendorId}`);
      }

      return { vendor, pendingInvoices };
    });

    const { vendor, pendingInvoices } = result;

    // 4. Send notifications (outside transaction for non-blocking)
    // Notify vendor creator about rejection
    if (vendor.created_by_user_id) {
      await notifyVendorRejected(
        vendor.created_by_user_id,
        vendor.id,
        vendor.name,
        rejectionReason
      );
    }

    // Notify each invoice creator about their invoice being rejected
    for (const invoice of pendingInvoices) {
      if (invoice.created_by) {
        await notifyInvoiceRejected(
          invoice.created_by,
          invoice.id,
          invoice.invoice_number,
          `Vendor "${vendor.name}" was rejected`
        );
      }
    }

    revalidatePath('/admin/master-data-requests');
    revalidatePath('/admin');
    revalidatePath('/settings');
    revalidatePath('/invoices');

    return {
      success: true,
      data: {
        ...vendor,
        rejectedInvoicesCount: pendingInvoices.length,
      },
    };
  } catch (error) {
    console.error('rejectVendorRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject vendor',
    };
  }
}
