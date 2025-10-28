/**
 * Server Actions: Master Data Requests
 *
 * Handles user-created master data requests with admin approval workflow.
 * Supports: Vendor, Category, InvoiceProfile, PaymentType
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { emailService, sendEmailAsync } from '@/lib/email';

// ============================================================================
// TYPES
// ============================================================================

export type MasterDataEntityType = 'vendor' | 'category' | 'invoice_profile' | 'payment_type';
export type MasterDataRequestStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export interface VendorRequestData {
  name: string;
  address?: string | null;
  gst_exemption?: boolean;
  bank_details?: string | null;
  is_active?: boolean;
}

export interface CategoryRequestData {
  name: string;
  is_active?: boolean;
}

export interface InvoiceProfileRequestData {
  name: string;
  description?: string;
  visible_to_all?: boolean;
}

export interface PaymentTypeRequestData {
  name: string;
  description?: string;
  requires_reference?: boolean;
  is_active?: boolean;
}

export type RequestData =
  | VendorRequestData
  | CategoryRequestData
  | InvoiceProfileRequestData
  | PaymentTypeRequestData;

export interface MasterDataRequestWithDetails {
  id: number;
  entity_type: MasterDataEntityType;
  status: MasterDataRequestStatus;
  requester_id: number;
  request_data: RequestData;
  reviewer_id: number | null;
  reviewed_at: Date | null;
  rejection_reason: string | null;
  admin_edits: Record<string, unknown> | null;
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

export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current authenticated user
 */
async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized: You must be logged in');
  }

  return {
    id: parseInt(session.user.id),
    email: session.user.email!,
    role: session.user.role as string,
  };
}

/**
 * Validate entity-specific request data
 */
function validateRequestData(entityType: MasterDataEntityType, data: unknown): RequestData {
  switch (entityType) {
    case 'vendor':
      return vendorRequestSchema.parse(data);
    case 'category':
      return categoryRequestSchema.parse(data);
    case 'invoice_profile':
      return invoiceProfileRequestSchema.parse(data);
    case 'payment_type':
      return paymentTypeRequestSchema.parse(data);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const vendorRequestSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(255, 'Name too long'),
  address: z.string().max(500, 'Address too long').optional().nullable(),
  gst_exemption: z.boolean().default(false),
  bank_details: z.string().max(1000, 'Bank details too long').optional().nullable(),
  is_active: z.boolean().default(true),
});

const categoryRequestSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(255, 'Name too long'),
  is_active: z.boolean().default(true),
});

const invoiceProfileRequestSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  visible_to_all: z.boolean().default(true),
});

const paymentTypeRequestSchema = z.object({
  name: z.string().min(1, 'Payment type name is required').max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  requires_reference: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

// ============================================================================
// CREATE REQUEST
// ============================================================================

/**
 * Create a new master data request
 */
export async function createRequest(
  entityType: MasterDataEntityType,
  requestData: RequestData,
  status: 'draft' | 'pending_approval' = 'draft'
): Promise<ServerActionResult<MasterDataRequestWithDetails>> {
  try {
    const user = await getCurrentUser();

    // Validate request data
    const validatedData = validateRequestData(entityType, requestData);

    // Create request
    const request = await db.masterDataRequest.create({
      data: {
        entity_type: entityType,
        status,
        requester_id: user.id,
        request_data: JSON.stringify(validatedData),
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

    // Send email notification if created with pending_approval status
    if (status === 'pending_approval') {
      sendEmailAsync(() =>
        emailService.sendNewRequestNotification({
          requestId: request.id.toString(),
          requestType: getEntityDisplayName(request.entity_type as MasterDataEntityType),
          requesterName: request.requester.full_name,
          requesterEmail: request.requester.email,
          description: (validatedData as { name?: string }).name || 'N/A',
          submittedAt: new Date(),
        })
      ).catch((error) => {
        console.error('[createRequest] Email notification error:', error);
      });

      // Small delay to ensure email async function starts before returning
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      success: true,
      data: {
        ...request,
        entity_type: request.entity_type as MasterDataEntityType,
        status: request.status as MasterDataRequestStatus,
        request_data: JSON.parse(request.request_data),
        admin_edits: request.admin_edits ? JSON.parse(request.admin_edits) : null,
      },
    };
  } catch (error) {
    console.error('createRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create request',
    };
  }
}

// ============================================================================
// GET USER REQUESTS
// ============================================================================

export interface GetUserRequestsFilters {
  entity_type?: MasterDataEntityType;
  status?: MasterDataRequestStatus;
}

/**
 * Get all requests for the current user
 */
export async function getUserRequests(
  filters?: GetUserRequestsFilters
): Promise<ServerActionResult<MasterDataRequestWithDetails[]>> {
  try {
    const user = await getCurrentUser();

    const requests = await db.masterDataRequest.findMany({
      where: {
        requester_id: user.id,
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

    return {
      success: true,
      data: requests.map((request: (typeof requests)[number]) => ({
        ...request,
        entity_type: request.entity_type as MasterDataEntityType,
        status: request.status as MasterDataRequestStatus,
        request_data: JSON.parse(request.request_data),
        admin_edits: request.admin_edits ? JSON.parse(request.admin_edits) : null,
      })),
    };
  } catch (error) {
    console.error('getUserRequests error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch requests',
    };
  }
}

// ============================================================================
// GET REQUEST BY ID
// ============================================================================

/**
 * Get a single request by ID
 */
export async function getRequestById(
  requestId: number | string
): Promise<ServerActionResult<MasterDataRequestWithDetails>> {
  try {
    // Normalize ID to integer (handles Next.js Server Action serialization)
    const id = typeof requestId === 'string' ? parseInt(requestId, 10) : requestId;

    // Validate ID
    if (!Number.isFinite(id) || id <= 0) {
      return {
        success: false,
        error: 'Invalid request ID',
      };
    }

    const user = await getCurrentUser();

    const request = await db.masterDataRequest.findUnique({
      where: { id },
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

    if (!request) {
      return {
        success: false,
        error: 'Request not found',
      };
    }

    // Check access: user must be requester or admin
    if (request.requester_id !== user.id && user.role !== 'admin' && user.role !== 'super_admin') {
      return {
        success: false,
        error: 'Unauthorized: You do not have access to this request',
      };
    }

    return {
      success: true,
      data: {
        ...request,
        entity_type: request.entity_type as MasterDataEntityType,
        status: request.status as MasterDataRequestStatus,
        request_data: JSON.parse(request.request_data),
        admin_edits: request.admin_edits ? JSON.parse(request.admin_edits) : null,
      },
    };
  } catch (error) {
    console.error('getRequestById error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch request',
    };
  }
}

// ============================================================================
// UPDATE REQUEST (Draft Only)
// ============================================================================

/**
 * Update a draft request
 */
export async function updateRequest(
  requestId: number,
  requestData: RequestData
): Promise<ServerActionResult<MasterDataRequestWithDetails>> {
  try {
    const user = await getCurrentUser();

    const existing = await db.masterDataRequest.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Request not found',
      };
    }

    // Check ownership
    if (existing.requester_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: You can only update your own requests',
      };
    }

    // Only drafts can be updated
    if (existing.status !== 'draft') {
      return {
        success: false,
        error: 'Only draft requests can be updated',
      };
    }

    // Validate request data
    const validatedData = validateRequestData(existing.entity_type as MasterDataEntityType, requestData);

    // Update request
    const request = await db.masterDataRequest.update({
      where: { id: requestId },
      data: {
        request_data: JSON.stringify(validatedData),
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

    return {
      success: true,
      data: {
        ...request,
        entity_type: request.entity_type as MasterDataEntityType,
        status: request.status as MasterDataRequestStatus,
        request_data: JSON.parse(request.request_data),
        admin_edits: request.admin_edits ? JSON.parse(request.admin_edits) : null,
      },
    };
  } catch (error) {
    console.error('updateRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update request',
    };
  }
}

// ============================================================================
// SUBMIT REQUEST
// ============================================================================

/**
 * Submit a draft request for approval
 */
export async function submitRequest(
  requestId: number
): Promise<ServerActionResult<MasterDataRequestWithDetails>> {
  try {
    const user = await getCurrentUser();

    const existing = await db.masterDataRequest.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Request not found',
      };
    }

    // Check ownership
    if (existing.requester_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: You can only submit your own requests',
      };
    }

    // Only drafts can be submitted
    if (existing.status !== 'draft') {
      return {
        success: false,
        error: 'Only draft requests can be submitted',
      };
    }

    // Submit request
    const request = await db.masterDataRequest.update({
      where: { id: requestId },
      data: {
        status: 'pending_approval',
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

    // Parse request data for response
    const parsedData = JSON.parse(request.request_data);

    // Send email notification to admins (await to ensure it starts before returning)
    // But don't block on completion - email failures won't affect the response
    sendEmailAsync(() =>
      emailService.sendNewRequestNotification({
        requestId: request.id.toString(),
        requestType: getEntityDisplayName(request.entity_type as MasterDataEntityType),
        requesterName: request.requester.full_name,
        requesterEmail: request.requester.email,
        description: (parsedData as { name?: string }).name || 'N/A',
        submittedAt: new Date(),
      })
    ).catch((error) => {
      console.error('[submitRequest] Email notification error:', error);
    });

    // Small delay to ensure email async function starts before returning
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      success: true,
      data: {
        ...request,
        entity_type: request.entity_type as MasterDataEntityType,
        status: request.status as MasterDataRequestStatus,
        request_data: parsedData,
        admin_edits: request.admin_edits ? JSON.parse(request.admin_edits) : null,
      },
    };
  } catch (error) {
    console.error('submitRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit request',
    };
  }
}

// ============================================================================
// DELETE REQUEST (Draft Only)
// ============================================================================

/**
 * Delete a draft request
 */
export async function deleteRequest(
  requestId: number
): Promise<ServerActionResult<{ id: number }>> {
  try {
    const user = await getCurrentUser();

    const existing = await db.masterDataRequest.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Request not found',
      };
    }

    // Check ownership
    if (existing.requester_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: You can only delete your own requests',
      };
    }

    // Only drafts can be deleted
    if (existing.status !== 'draft') {
      return {
        success: false,
        error: 'Only draft requests can be deleted',
      };
    }

    await db.masterDataRequest.delete({
      where: { id: requestId },
    });

    return {
      success: true,
      data: { id: requestId },
    };
  } catch (error) {
    console.error('deleteRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete request',
    };
  }
}

// ============================================================================
// RESUBMIT REQUEST
// ============================================================================

/**
 * Resubmit a rejected request with updated data
 */
export async function resubmitRequest(
  requestId: number,
  updatedData: RequestData
): Promise<ServerActionResult<MasterDataRequestWithDetails>> {
  try {
    const user = await getCurrentUser();

    const existing = await db.masterDataRequest.findUnique({
      where: { id: requestId },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Request not found',
      };
    }

    // Check ownership
    if (existing.requester_id !== user.id) {
      return {
        success: false,
        error: 'Unauthorized: You can only resubmit your own requests',
      };
    }

    // Only rejected requests can be resubmitted
    if (existing.status !== 'rejected') {
      return {
        success: false,
        error: 'Only rejected requests can be resubmitted',
      };
    }

    // Check resubmission limit (max 3 total attempts = initial + 2 resubmissions)
    if (existing.resubmission_count >= 2) {
      return {
        success: false,
        error: 'Maximum resubmission limit reached. You have used all 3 attempts (initial + 2 resubmissions)',
      };
    }

    // Validate request data
    const validatedData = validateRequestData(existing.entity_type as MasterDataEntityType, updatedData);

    // Create new request (resubmission)
    const request = await db.masterDataRequest.create({
      data: {
        entity_type: existing.entity_type,
        status: 'pending_approval',
        requester_id: user.id,
        request_data: JSON.stringify(validatedData),
        resubmission_count: existing.resubmission_count + 1,
        previous_attempt_id: requestId,
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

    // Send email notification to admins for resubmission
    sendEmailAsync(() =>
      emailService.sendNewRequestNotification({
        requestId: request.id.toString(),
        requestType: getEntityDisplayName(request.entity_type as MasterDataEntityType),
        requesterName: request.requester.full_name,
        requesterEmail: request.requester.email,
        description: (validatedData as { name?: string }).name || 'N/A',
        submittedAt: new Date(),
      })
    ).catch((error) => {
      console.error('[resubmitRequest] Email notification error:', error);
    });

    // Small delay to ensure email async function starts before returning
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      success: true,
      data: {
        ...request,
        entity_type: request.entity_type as MasterDataEntityType,
        status: request.status as MasterDataRequestStatus,
        request_data: validatedData,
        admin_edits: request.admin_edits ? JSON.parse(request.admin_edits) : null,
      },
    };
  } catch (error) {
    console.error('resubmitRequest error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resubmit request',
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
  const labels: Record<MasterDataEntityType, string> = {
    vendor: 'Vendor',
    category: 'Category',
    invoice_profile: 'Invoice Profile',
    payment_type: 'Payment Type',
  };
  return labels[entityType] || entityType;
}
