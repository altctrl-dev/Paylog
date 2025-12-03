/**
 * Server Actions: Invoice V2 CRUD Operations (Sprint 13)
 *
 * Production-ready server actions for the new invoice workflow system.
 * Supports both recurring and non-recurring invoice creation with inline payment tracking.
 */

'use server';

import { auth, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { createActivityLog } from '@/app/actions/activity-log';
import { ACTIVITY_ACTION } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';
import { INVOICE_STATUS } from '@/types/invoice';
import {
  recurringInvoiceSerializedSchema,
  nonRecurringInvoiceSerializedSchema,
  updateRecurringInvoiceSerializedSchema,
  updateNonRecurringInvoiceSerializedSchema,
  type RecurringInvoiceSerializedData,
  type NonRecurringInvoiceSerializedData,
  type UpdateRecurringInvoiceSerializedData,
  type UpdateNonRecurringInvoiceSerializedData,
} from '@/lib/validations/invoice-v2';
import { uploadInvoiceFile } from '@/lib/file-upload-v2';
import type { ServerActionResult } from '@/types/attachment';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Prisma errors to user-friendly messages
 */
function getPrismaErrorMessage(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (error.code === 'P2002') {
      const target = error.meta?.target as string[] | undefined;
      if (target?.includes('invoice_number') && target?.includes('vendor_id')) {
        return 'An invoice with this number already exists for this vendor. Please use a different invoice number.';
      }
      if (target?.includes('invoice_number')) {
        return 'An invoice with this number already exists. Please use a different invoice number.';
      }
      return 'A record with these details already exists.';
    }
    // P2003: Foreign key constraint violation
    if (error.code === 'P2003') {
      return 'Referenced record does not exist. Please refresh and try again.';
    }
    // P2025: Record not found
    if (error.code === 'P2025') {
      return 'Record not found. It may have been deleted.';
    }
  }
  return null;
}

/**
 * File-like class for converting base64 data to File API-compatible object
 */
class Base64File implements File {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly lastModified: number;
  readonly webkitRelativePath: string = '';
  private buffer: Buffer;

  constructor(base64Data: string, name: string, type: string, size: number) {
    this.name = name;
    this.type = type;
    this.size = size;
    this.lastModified = Date.now();
    this.buffer = Buffer.from(base64Data, 'base64');
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.buffer.buffer.slice(
      this.buffer.byteOffset,
      this.buffer.byteOffset + this.buffer.byteLength
    ) as ArrayBuffer;
  }

  async text(): Promise<string> {
    return this.buffer.toString('utf-8');
  }

  async bytes(): Promise<Uint8Array<ArrayBuffer>> {
    return new Uint8Array(await this.arrayBuffer()) as Uint8Array<ArrayBuffer>;
  }

  stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    throw new Error('stream() not implemented');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  slice(_start?: number, _end?: number, _contentType?: string): Blob {
    throw new Error('slice() not implemented');
  }
}

/**
 * Convert serialized file data (base64) to File-like object
 *
 * @param fileData - Serialized file with base64 data
 * @returns File-like object compatible with uploadInvoiceFile
 */
function deserializeFile(fileData: { name: string; type: string; size: number; data: string }): File {
  return new Base64File(fileData.data, fileData.name, fileData.type, fileData.size) as File;
}

/**
 * Get current authenticated user
 * Throws error if not authenticated
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
 * Determine initial invoice status based on user role
 */
function getInitialStatus(userRole: string): string {
  if (userRole === 'admin' || userRole === 'super_admin') {
    return INVOICE_STATUS.UNPAID; // Admins skip approval
  }
  return INVOICE_STATUS.PENDING_APPROVAL; // Standard users need approval
}

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create recurring invoice from invoice profile
 *
 * @param data - Serialized invoice data with base64-encoded file
 * @returns Success with invoice ID and optional custom message, or error
 */
export async function createRecurringInvoice(
  data: RecurringInvoiceSerializedData
): Promise<ServerActionResult<{ invoiceId: number; successMessage?: string }>> {
  console.log('[createRecurringInvoice] Server Action called');
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    console.log('[createRecurringInvoice] User authenticated:', user.id);

    // 2. Validate serialized data
    console.log('[createRecurringInvoice] Validating data...');
    const validated = recurringInvoiceSerializedSchema.parse(data);
    console.log('[createRecurringInvoice] Data validated successfully');

    // 3. Convert base64 file to File object
    console.log('[createRecurringInvoice] Deserializing file...');
    const file = deserializeFile(validated.file);
    console.log('[createRecurringInvoice] File deserialized:', file.name, file.size);

    // 4. Parse ISO date strings to Date objects
    const invoiceDate = new Date(validated.invoice_date);
    const dueDate = new Date(validated.due_date);
    const periodStart = new Date(validated.period_start);
    const periodEnd = new Date(validated.period_end);
    const invoiceReceivedDate = validated.invoice_received_date ? new Date(validated.invoice_received_date) : null; // Bug fix: Parse invoice_received_date
    const paidDate = validated.is_paid && validated.paid_date ? new Date(validated.paid_date) : null;

    // 5. Get invoice profile with relations (need vendor_id for duplicate check)
    console.log('[createRecurringInvoice] Fetching invoice profile...');
    const profile = await db.invoiceProfile.findUnique({
      where: { id: validated.invoice_profile_id },
      include: {
        vendor: true,
        entity: true,
        category: true,
        currency: true,
      },
    });

    if (!profile) {
      return {
        success: false,
        error: 'Selected invoice profile not found',
      };
    }

    // 6. Check for duplicate invoice number (profile-specific)
    // For recurring invoices: same invoice_number + vendor_id + profile_id = duplicate
    console.log('[createRecurringInvoice] Checking for duplicate invoice...');
    const existing = await db.invoice.findFirst({
      where: {
        invoice_number: validated.invoice_number,
        vendor_id: profile.vendor_id,
        profile_id: validated.invoice_profile_id,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Invoice with number "${validated.invoice_number}" already exists for this profile`,
      };
    }

    // 7. Validate payment type if paid
    if (validated.is_paid && validated.payment_type_id) {
      console.log('[createRecurringInvoice] Validating payment type...');
      const paymentType = await db.paymentType.findUnique({
        where: { id: validated.payment_type_id },
      });

      if (!paymentType || !paymentType.is_active) {
        return {
          success: false,
          error: 'Selected payment type is invalid',
        };
      }
    }

    // 8. Determine initial status (paid invoices skip approval, go straight to PAID)
    const initialStatus = validated.is_paid
      ? INVOICE_STATUS.PAID
      : getInitialStatus(user.role);
    console.log('[createRecurringInvoice] Initial status:', initialStatus, 'is_paid:', validated.is_paid);

    // 9. Create invoice in transaction
    console.log('[createRecurringInvoice] Creating invoice record...');
    const invoice = await db.$transaction(async (tx) => {
      // Create invoice record
      const newInvoice = await tx.invoice.create({
        data: {
          // Core fields
          invoice_number: validated.invoice_number,
          vendor_id: profile.vendor_id,
          entity_id: profile.entity_id,
          category_id: profile.category_id,
          currency_id: validated.currency_id,

          // Invoice details
          invoice_amount: validated.invoice_amount,
          invoice_date: invoiceDate,
          due_date: dueDate,
          period_start: periodStart,
          period_end: periodEnd,
          invoice_received_date: invoiceReceivedDate, // Bug fix: Save invoice_received_date to database

          // Description
          description: validated.brief_description || null,

          // TDS
          tds_applicable: validated.tds_applicable,
          tds_percentage: validated.tds_percentage || null,

          // Recurring invoice fields
          is_recurring: true,
          profile_id: validated.invoice_profile_id,
          invoice_profile_id: validated.invoice_profile_id,

          // Inline payment fields
          is_paid: validated.is_paid,
          paid_date: paidDate,
          paid_amount: validated.paid_amount || null,
          paid_currency: validated.paid_currency || null,
          payment_type_id: validated.payment_type_id || null,
          payment_reference: validated.payment_reference || null,

          // Status and metadata
          status: initialStatus,
          created_by: user.id,
        },
      });

      console.log('[createRecurringInvoice] Invoice created, ID:', newInvoice.id);

      // Upload file attachment (pass transaction context for transactional integrity)
      try {
        console.log('[createRecurringInvoice] Uploading file...');
        await uploadInvoiceFile(file, newInvoice.id, user.id, tx);
        console.log('[createRecurringInvoice] File uploaded successfully');
      } catch (uploadError) {
        console.error('[createRecurringInvoice] File upload failed:', uploadError);
        // Rollback transaction by throwing error
        throw new Error(
          `Failed to upload invoice file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
        );
      }

      return newInvoice;
    });

    console.log('[createRecurringInvoice] Transaction completed successfully');

    // 10. Log activity (non-blocking)
    await createActivityLog({
      invoice_id: invoice.id,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_CREATED,
      new_data: {
        invoice_number: invoice.invoice_number,
        vendor_id: invoice.vendor_id,
        invoice_amount: invoice.invoice_amount,
        status: invoice.status,
        is_recurring: true,
        profile_id: invoice.profile_id,
      },
    }).catch((err) => {
      console.error('[createRecurringInvoice] Failed to create activity log:', err);
    });

    // 11. Revalidate cache
    revalidatePath('/invoices');

    // 12. Check vendor status and customize success message
    const vendor = await db.vendor.findUnique({
      where: { id: invoice.vendor_id },
      select: { status: true, name: true },
    });

    const successMessage = vendor?.status === 'PENDING_APPROVAL'
      ? `Invoice submitted for approval. Vendor "${vendor.name}" is pending admin approval.`
      : undefined;

    console.log('[createRecurringInvoice] Success! Invoice ID:', invoice.id);
    return {
      success: true,
      data: {
        invoiceId: invoice.id,
        successMessage,
      },
    };
  } catch (error) {
    console.error('[createRecurringInvoice] Error:', error);
    const prismaError = getPrismaErrorMessage(error);
    return {
      success: false,
      error: prismaError || (error instanceof Error ? error.message : 'Failed to create recurring invoice'),
    };
  }
}

/**
 * Create non-recurring invoice (one-off)
 *
 * @param data - Serialized invoice data with optional base64-encoded file
 * @returns Success with invoice ID and optional custom message, or error
 */
export async function createNonRecurringInvoice(
  data: NonRecurringInvoiceSerializedData
): Promise<ServerActionResult<{ invoiceId: number; successMessage?: string }>> {
  console.log('[createNonRecurringInvoice] Server Action called');
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    console.log('[createNonRecurringInvoice] User authenticated:', user.id);

    // 2. Validate serialized data
    console.log('[createNonRecurringInvoice] Validating data...');
    const validated = nonRecurringInvoiceSerializedSchema.parse(data);
    console.log('[createNonRecurringInvoice] Data validated successfully');

    // 3. Convert base64 file to File object (if provided)
    let file: File | null = null;
    if (validated.file) {
      console.log('[createNonRecurringInvoice] Deserializing file...');
      file = deserializeFile(validated.file);
      console.log('[createNonRecurringInvoice] File deserialized:', file.name, file.size);
    } else {
      console.log('[createNonRecurringInvoice] No file provided');
    }

    // 4. Parse ISO date strings to Date objects
    const invoiceDate = new Date(validated.invoice_date);
    const dueDate = validated.due_date ? new Date(validated.due_date) : null;
    const invoiceReceivedDate = validated.invoice_received_date ? new Date(validated.invoice_received_date) : null; // Bug fix: Parse invoice_received_date
    const paidDate = validated.is_paid && validated.paid_date ? new Date(validated.paid_date) : null;

    // 5. Check for duplicate invoice number (vendor-specific)
    // For non-recurring invoices: same invoice_number + vendor_id + invoice_name = duplicate
    console.log('[createNonRecurringInvoice] Checking for duplicate invoice...');
    const existing = await db.invoice.findFirst({
      where: {
        invoice_number: validated.invoice_number,
        vendor_id: validated.vendor_id,
        description: validated.invoice_name, // invoice_name stored as description
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Invoice "${validated.invoice_name}" with number "${validated.invoice_number}" already exists for this vendor`,
      };
    }

    // 6. Validate vendor exists
    console.log('[createNonRecurringInvoice] Validating vendor...');
    const vendor = await db.vendor.findUnique({
      where: { id: validated.vendor_id },
    });

    if (!vendor || !vendor.is_active) {
      return {
        success: false,
        error: 'Selected vendor does not exist or is inactive',
      };
    }

    // 7. Validate entity exists
    console.log('[createNonRecurringInvoice] Validating entity...');
    const entity = await db.entity.findUnique({
      where: { id: validated.entity_id },
    });

    if (!entity || !entity.is_active) {
      return {
        success: false,
        error: 'Selected entity does not exist or is inactive',
      };
    }

    // 8. Validate category exists
    console.log('[createNonRecurringInvoice] Validating category...');
    const category = await db.category.findUnique({
      where: { id: validated.category_id },
    });

    if (!category || !category.is_active) {
      return {
        success: false,
        error: 'Selected category does not exist or is inactive',
      };
    }

    // 9. Validate payment type if paid
    if (validated.is_paid && validated.payment_type_id) {
      console.log('[createNonRecurringInvoice] Validating payment type...');
      const paymentType = await db.paymentType.findUnique({
        where: { id: validated.payment_type_id },
      });

      if (!paymentType || !paymentType.is_active) {
        return {
          success: false,
          error: 'Selected payment type is invalid',
        };
      }
    }

    // 10. Determine initial status (paid invoices skip approval, go straight to PAID)
    const initialStatus = validated.is_paid
      ? INVOICE_STATUS.PAID
      : getInitialStatus(user.role);
    console.log('[createNonRecurringInvoice] Initial status:', initialStatus, 'is_paid:', validated.is_paid);

    // 11. Create invoice in transaction
    console.log('[createNonRecurringInvoice] Creating invoice record...');
    const invoice = await db.$transaction(async (tx) => {
      // Create invoice record
      const newInvoice = await tx.invoice.create({
        data: {
          // Core fields
          invoice_number: validated.invoice_number,
          vendor_id: validated.vendor_id,
          entity_id: validated.entity_id,
          category_id: validated.category_id,
          currency_id: validated.currency_id,

          // Invoice details
          invoice_amount: validated.invoice_amount,
          invoice_date: invoiceDate,
          due_date: dueDate,
          invoice_received_date: invoiceReceivedDate, // Bug fix: Save invoice_received_date to database

          // Description (use invoice_name as description for non-recurring)
          description: validated.brief_description || validated.invoice_name,

          // TDS
          tds_applicable: validated.tds_applicable,
          tds_percentage: validated.tds_percentage || null,

          // Non-recurring invoice fields
          is_recurring: false,
          profile_id: null,

          // Inline payment fields
          is_paid: validated.is_paid,
          paid_date: paidDate,
          paid_amount: validated.paid_amount || null,
          paid_currency: validated.paid_currency || null,
          payment_type_id: validated.payment_type_id || null,
          payment_reference: validated.payment_reference || null,

          // Status and metadata
          status: initialStatus,
          created_by: user.id,
        },
      });

      console.log('[createNonRecurringInvoice] Invoice created, ID:', newInvoice.id);

      // Upload file attachment (if provided, pass transaction context for transactional integrity)
      if (file && file.size > 0) {
        try {
          console.log('[createNonRecurringInvoice] Uploading file...');
          await uploadInvoiceFile(file, newInvoice.id, user.id, tx);
          console.log('[createNonRecurringInvoice] File uploaded successfully');
        } catch (uploadError) {
          console.error('[createNonRecurringInvoice] File upload failed:', uploadError);
          // Rollback transaction by throwing error
          throw new Error(
            `Failed to upload invoice file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
          );
        }
      }

      return newInvoice;
    });

    console.log('[createNonRecurringInvoice] Transaction completed successfully');

    // 12. Log activity (non-blocking)
    await createActivityLog({
      invoice_id: invoice.id,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_CREATED,
      new_data: {
        invoice_number: invoice.invoice_number,
        vendor_id: invoice.vendor_id,
        invoice_amount: invoice.invoice_amount,
        status: invoice.status,
        is_recurring: false,
      },
    }).catch((err) => {
      console.error('[createNonRecurringInvoice] Failed to create activity log:', err);
    });

    // 13. Revalidate cache
    revalidatePath('/invoices');

    // 14. Check vendor status and customize success message
    const vendorForMessage = await db.vendor.findUnique({
      where: { id: invoice.vendor_id },
      select: { status: true, name: true },
    });

    const successMessage = vendorForMessage?.status === 'PENDING_APPROVAL'
      ? `Invoice submitted for approval. Vendor "${vendorForMessage.name}" is pending admin approval.`
      : undefined;

    console.log('[createNonRecurringInvoice] Success! Invoice ID:', invoice.id);
    return {
      success: true,
      data: {
        invoiceId: invoice.id,
        successMessage,
      },
    };
  } catch (error) {
    console.error('[createNonRecurringInvoice] Error:', error);
    const prismaError = getPrismaErrorMessage(error);
    return {
      success: false,
      error: prismaError || (error instanceof Error ? error.message : 'Failed to create non-recurring invoice'),
    };
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update recurring invoice
 *
 * @param invoiceId - Invoice ID to update
 * @param data - Serialized invoice data with optional base64-encoded file
 * @returns Success with invoice ID, or error
 */
export async function updateRecurringInvoice(
  invoiceId: number,
  data: UpdateRecurringInvoiceSerializedData
): Promise<ServerActionResult<{ invoiceId: number }>> {
  console.log('[updateRecurringInvoice] Server Action called for invoice:', invoiceId);
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    console.log('[updateRecurringInvoice] User authenticated:', user.id);

    // 2. Validate serialized data
    console.log('[updateRecurringInvoice] Validating data...');
    const validated = updateRecurringInvoiceSerializedSchema.parse(data);
    console.log('[updateRecurringInvoice] Data validated successfully');

    // 3. Fetch existing invoice with updated_at for optimistic locking
    console.log('[updateRecurringInvoice] Fetching existing invoice...');
    const existing = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        created_by: true,
        updated_at: true,
        is_recurring: true,
        invoice_profile_id: true,
        profile_id: true, // Legacy field fallback
        vendor_id: true,
        invoice_number: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    // 4. Verify this is a recurring invoice (check both new and legacy profile fields)
    const hasProfileId = existing.invoice_profile_id || existing.profile_id;
    if (!existing.is_recurring || !hasProfileId) {
      console.log('[updateRecurringInvoice] Validation failed:', {
        is_recurring: existing.is_recurring,
        invoice_profile_id: existing.invoice_profile_id,
        profile_id: existing.profile_id,
      });
      return {
        success: false,
        error: 'This is not a recurring invoice',
      };
    }

    // 5. Authorization checks
    const isAdminUser = await isAdmin();

    if (!isAdminUser) {
      // Standard users: can only edit own invoices
      if (existing.created_by !== user.id) {
        return {
          success: false,
          error: 'Unauthorized: You can only edit your own invoices',
        };
      }

      // Standard users: cannot edit while status = pending_approval
      if (existing.status === INVOICE_STATUS.PENDING_APPROVAL) {
        return {
          success: false,
          error: 'Cannot edit invoice while it is pending approval',
        };
      }
    }

    // 6. Determine new status based on role
    let newStatus = existing.status; // Default: keep status

    if (!isAdminUser) {
      // Standard user edit → always goes to pending_approval
      newStatus = INVOICE_STATUS.PENDING_APPROVAL;
    }
    // Admin edit → status unchanged

    console.log('[updateRecurringInvoice] Status transition:', existing.status, '→', newStatus);

    // 7. Convert base64 file to File object (if provided)
    let file: File | null = null;
    if (validated.file) {
      console.log('[updateRecurringInvoice] Deserializing file...');
      file = deserializeFile(validated.file);
      console.log('[updateRecurringInvoice] File deserialized:', file.name, file.size);
    }

    // 8. Parse ISO date strings to Date objects
    const invoiceDate = new Date(validated.invoice_date);
    const dueDate = new Date(validated.due_date);
    const periodStart = new Date(validated.period_start);
    const periodEnd = new Date(validated.period_end);
    const invoiceReceivedDate = validated.invoice_received_date
      ? new Date(validated.invoice_received_date)
      : null;
    const paidDate = validated.is_paid && validated.paid_date ? new Date(validated.paid_date) : null;

    // 9. Check for duplicate invoice number (exclude current invoice)
    console.log('[updateRecurringInvoice] Checking for duplicate invoice...');
    const duplicate = await db.invoice.findFirst({
      where: {
        invoice_number: validated.invoice_number,
        vendor_id: existing.vendor_id,
        profile_id: validated.invoice_profile_id,
        id: { not: invoiceId }, // Exclude current invoice
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Invoice with number "${validated.invoice_number}" already exists for this profile`,
      };
    }

    // 10. Validate payment type if paid
    if (validated.is_paid && validated.payment_type_id) {
      console.log('[updateRecurringInvoice] Validating payment type...');
      const paymentType = await db.paymentType.findUnique({
        where: { id: validated.payment_type_id },
      });

      if (!paymentType || !paymentType.is_active) {
        return {
          success: false,
          error: 'Selected payment type is invalid',
        };
      }
    }

    // 11. Update invoice in transaction
    console.log('[updateRecurringInvoice] Updating invoice record...');
    await db.$transaction(async (tx) => {
      // Update invoice record
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          // Invoice details
          invoice_number: validated.invoice_number,
          invoice_amount: validated.invoice_amount,
          invoice_date: invoiceDate,
          due_date: dueDate,
          period_start: periodStart,
          period_end: periodEnd,
          invoice_received_date: invoiceReceivedDate,

          // Description
          description: validated.brief_description || null,

          // TDS
          tds_applicable: validated.tds_applicable,
          tds_percentage: validated.tds_percentage || null,

          // Inline payment fields
          is_paid: validated.is_paid,
          paid_date: paidDate,
          paid_amount: validated.paid_amount || null,
          paid_currency: validated.paid_currency || null,
          payment_type_id: validated.payment_type_id || null,
          payment_reference: validated.payment_reference || null,

          // Status (may change for standard users)
          status: newStatus,

          // Update timestamp
          updated_at: new Date(),
        },
      });

      console.log('[updateRecurringInvoice] Invoice updated successfully');

      // Upload new file attachment if provided (pass transaction context)
      if (file && file.size > 0) {
        try {
          console.log('[updateRecurringInvoice] Uploading new file...');
          await uploadInvoiceFile(file, invoiceId, user.id, tx);
          console.log('[updateRecurringInvoice] File uploaded successfully');
        } catch (uploadError) {
          console.error('[updateRecurringInvoice] File upload failed:', uploadError);
          throw new Error(
            `Failed to upload invoice file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
          );
        }
      }
    });

    console.log('[updateRecurringInvoice] Transaction completed successfully');

    // 12. Log activity (non-blocking)
    await createActivityLog({
      invoice_id: invoiceId,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_UPDATED,
      old_data: {
        status: existing.status,
      },
      new_data: {
        invoice_number: validated.invoice_number,
        invoice_amount: validated.invoice_amount,
        status: newStatus,
      },
    }).catch((err) => {
      console.error('[updateRecurringInvoice] Failed to create activity log:', err);
    });

    // 13. Revalidate cache
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);

    console.log('[updateRecurringInvoice] Success! Invoice updated:', invoiceId);
    return {
      success: true,
      data: { invoiceId },
    };
  } catch (error) {
    console.error('[updateRecurringInvoice] Error:', error);
    const prismaError = getPrismaErrorMessage(error);
    return {
      success: false,
      error: prismaError || (error instanceof Error ? error.message : 'Failed to update recurring invoice'),
    };
  }
}

/**
 * Update non-recurring invoice
 *
 * @param invoiceId - Invoice ID to update
 * @param data - Serialized invoice data with optional base64-encoded file
 * @returns Success with invoice ID, or error
 */
export async function updateNonRecurringInvoice(
  invoiceId: number,
  data: UpdateNonRecurringInvoiceSerializedData
): Promise<ServerActionResult<{ invoiceId: number }>> {
  console.log('[updateNonRecurringInvoice] Server Action called for invoice:', invoiceId);
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    console.log('[updateNonRecurringInvoice] User authenticated:', user.id);

    // 2. Validate serialized data
    console.log('[updateNonRecurringInvoice] Validating data...');
    const validated = updateNonRecurringInvoiceSerializedSchema.parse(data);
    console.log('[updateNonRecurringInvoice] Data validated successfully');

    // 3. Fetch existing invoice
    console.log('[updateNonRecurringInvoice] Fetching existing invoice...');
    const existing = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        created_by: true,
        updated_at: true,
        is_recurring: true,
        vendor_id: true,
        invoice_number: true,
        description: true,
      },
    });

    if (!existing) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    // 4. Verify this is a non-recurring invoice
    if (existing.is_recurring) {
      return {
        success: false,
        error: 'This is not a non-recurring invoice',
      };
    }

    // 5. Authorization checks
    const isAdminUser = await isAdmin();

    if (!isAdminUser) {
      // Standard users: can only edit own invoices
      if (existing.created_by !== user.id) {
        return {
          success: false,
          error: 'Unauthorized: You can only edit your own invoices',
        };
      }

      // Standard users: cannot edit while status = pending_approval
      if (existing.status === INVOICE_STATUS.PENDING_APPROVAL) {
        return {
          success: false,
          error: 'Cannot edit invoice while it is pending approval',
        };
      }
    }

    // 6. Determine new status based on role
    let newStatus = existing.status; // Default: keep status

    if (!isAdminUser) {
      // Standard user edit → always goes to pending_approval
      newStatus = INVOICE_STATUS.PENDING_APPROVAL;
    }
    // Admin edit → status unchanged

    console.log('[updateNonRecurringInvoice] Status transition:', existing.status, '→', newStatus);

    // 7. Convert base64 file to File object (if provided)
    let file: File | null = null;
    if (validated.file) {
      console.log('[updateNonRecurringInvoice] Deserializing file...');
      file = deserializeFile(validated.file);
      console.log('[updateNonRecurringInvoice] File deserialized:', file.name, file.size);
    }

    // 8. Parse ISO date strings to Date objects
    const invoiceDate = new Date(validated.invoice_date);
    const dueDate = validated.due_date ? new Date(validated.due_date) : null;
    const invoiceReceivedDate = validated.invoice_received_date
      ? new Date(validated.invoice_received_date)
      : null;
    const paidDate = validated.is_paid && validated.paid_date ? new Date(validated.paid_date) : null;

    // 9. Check for duplicate invoice number (exclude current invoice)
    console.log('[updateNonRecurringInvoice] Checking for duplicate invoice...');
    const duplicate = await db.invoice.findFirst({
      where: {
        invoice_number: validated.invoice_number,
        vendor_id: validated.vendor_id,
        description: validated.invoice_name,
        id: { not: invoiceId }, // Exclude current invoice
      },
    });

    if (duplicate) {
      return {
        success: false,
        error: `Invoice "${validated.invoice_name}" with number "${validated.invoice_number}" already exists for this vendor`,
      };
    }

    // 10. Validate vendor exists
    console.log('[updateNonRecurringInvoice] Validating vendor...');
    const vendor = await db.vendor.findUnique({
      where: { id: validated.vendor_id },
    });

    if (!vendor || !vendor.is_active) {
      return {
        success: false,
        error: 'Selected vendor does not exist or is inactive',
      };
    }

    // 11. Validate entity exists
    console.log('[updateNonRecurringInvoice] Validating entity...');
    const entity = await db.entity.findUnique({
      where: { id: validated.entity_id },
    });

    if (!entity || !entity.is_active) {
      return {
        success: false,
        error: 'Selected entity does not exist or is inactive',
      };
    }

    // 12. Validate category exists
    console.log('[updateNonRecurringInvoice] Validating category...');
    const category = await db.category.findUnique({
      where: { id: validated.category_id },
    });

    if (!category || !category.is_active) {
      return {
        success: false,
        error: 'Selected category does not exist or is inactive',
      };
    }

    // 13. Validate payment type if paid
    if (validated.is_paid && validated.payment_type_id) {
      console.log('[updateNonRecurringInvoice] Validating payment type...');
      const paymentType = await db.paymentType.findUnique({
        where: { id: validated.payment_type_id },
      });

      if (!paymentType || !paymentType.is_active) {
        return {
          success: false,
          error: 'Selected payment type is invalid',
        };
      }
    }

    // 14. Update invoice in transaction
    console.log('[updateNonRecurringInvoice] Updating invoice record...');
    await db.$transaction(async (tx) => {
      // Update invoice record
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          // Core fields
          invoice_number: validated.invoice_number,
          vendor_id: validated.vendor_id,
          entity_id: validated.entity_id,
          category_id: validated.category_id,
          currency_id: validated.currency_id,

          // Invoice details
          invoice_amount: validated.invoice_amount,
          invoice_date: invoiceDate,
          due_date: dueDate,
          invoice_received_date: invoiceReceivedDate,

          // Description (use invoice_name as description)
          description: validated.brief_description || validated.invoice_name,

          // TDS
          tds_applicable: validated.tds_applicable,
          tds_percentage: validated.tds_percentage || null,

          // Inline payment fields
          is_paid: validated.is_paid,
          paid_date: paidDate,
          paid_amount: validated.paid_amount || null,
          paid_currency: validated.paid_currency || null,
          payment_type_id: validated.payment_type_id || null,
          payment_reference: validated.payment_reference || null,

          // Status (may change for standard users)
          status: newStatus,

          // Update timestamp
          updated_at: new Date(),
        },
      });

      console.log('[updateNonRecurringInvoice] Invoice updated successfully');

      // Upload new file attachment if provided (pass transaction context)
      if (file && file.size > 0) {
        try {
          console.log('[updateNonRecurringInvoice] Uploading new file...');
          await uploadInvoiceFile(file, invoiceId, user.id, tx);
          console.log('[updateNonRecurringInvoice] File uploaded successfully');
        } catch (uploadError) {
          console.error('[updateNonRecurringInvoice] File upload failed:', uploadError);
          throw new Error(
            `Failed to upload invoice file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
          );
        }
      }
    });

    console.log('[updateNonRecurringInvoice] Transaction completed successfully');

    // 15. Log activity (non-blocking)
    await createActivityLog({
      invoice_id: invoiceId,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_UPDATED,
      old_data: {
        status: existing.status,
      },
      new_data: {
        invoice_number: validated.invoice_number,
        vendor_id: validated.vendor_id,
        invoice_amount: validated.invoice_amount,
        status: newStatus,
      },
    }).catch((err) => {
      console.error('[updateNonRecurringInvoice] Failed to create activity log:', err);
    });

    // 16. Revalidate cache
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);

    console.log('[updateNonRecurringInvoice] Success! Invoice updated:', invoiceId);
    return {
      success: true,
      data: { invoiceId },
    };
  } catch (error) {
    console.error('[updateNonRecurringInvoice] Error:', error);
    const prismaError = getPrismaErrorMessage(error);
    return {
      success: false,
      error: prismaError || (error instanceof Error ? error.message : 'Failed to update non-recurring invoice'),
    };
  }
}

// ============================================================================
// DATA FETCHING OPERATIONS
// ============================================================================

/**
 * Get single Invoice V2 by ID with all relations
 * Includes RBAC filtering
 *
 * @param id - Invoice ID
 * @returns Invoice with relations or error
 */
export async function getInvoiceV2(
  id: number
): Promise<ServerActionResult<Prisma.InvoiceGetPayload<{
  include: {
    vendor: { select: { id: true; name: true; status: true } };
    category: { select: { id: true; name: true } };
    entity: { select: { id: true; name: true } };
    currency: { select: { id: true; code: true; symbol: true } };
    invoice_profile: { select: { id: true; name: true; description: true } };
    profile: { select: { id: true; name: true; description: true } };
    payment_type: { select: { id: true; name: true } };
    creator: { select: { id: true; full_name: true; email: true } };
    attachments: {
      select: {
        id: true;
        file_name: true;
        original_name: true;
        file_size: true;
        mime_type: true;
        uploaded_at: true;
      };
    };
  };
}>>> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    console.log('[getInvoiceV2] Fetching invoice:', id, 'for user:', user.id);

    // 2. Fetch invoice with all relations
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
          },
        },
        currency: {
          select: {
            id: true,
            code: true,
            symbol: true,
          },
        },
        invoice_profile: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        profile: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        payment_type: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        attachments: {
          where: {
            deleted_at: null, // Only active attachments
          },
          select: {
            id: true,
            file_name: true,
            original_name: true,
            file_size: true,
            mime_type: true,
            uploaded_at: true,
          },
          orderBy: {
            uploaded_at: 'desc',
          },
        },
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    // 3. RBAC: Check if user has access to this invoice
    const isAdminUser = await isAdmin();

    // Admins have access to all invoices
    // Standard users can VIEW all invoices in their organization
    // (Edit permission is checked separately in the update actions)
    if (!isAdminUser) {
      // For recurring invoices: check profile visibility
      if (invoice.is_recurring && invoice.profile_id) {
        const profile = await db.invoiceProfile.findUnique({
          where: { id: invoice.profile_id },
          include: {
            visibilities: {
              where: {
                user_id: user.id,
              },
            },
          },
        });

        if (!profile) {
          return {
            success: false,
            error: 'Associated invoice profile not found',
          };
        }

        // Check if user has access (either visible_to_all or explicit visibility)
        const hasAccess = profile.visible_to_all || profile.visibilities.length > 0;

        if (!hasAccess) {
          return {
            success: false,
            error: 'You do not have permission to view this invoice',
          };
        }
      }
      // For non-recurring invoices: all users can view (no restriction)
      // Edit permission is enforced in updateNonRecurringInvoice action
    }

    console.log('[getInvoiceV2] Successfully fetched invoice:', invoice.id);

    return {
      success: true,
      data: invoice,
    };
  } catch (error) {
    console.error('[getInvoiceV2] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice',
    };
  }
}

/**
 * Get all active invoice profiles with relations
 * Filtered by user permissions (RBAC)
 *
 * @returns List of invoice profiles
 */
export async function getInvoiceProfiles(): Promise<
  ServerActionResult<
    Array<{
      id: number;
      name: string;
      description: string | null;
      billing_frequency: string | null;
      tds_applicable: boolean;
      tds_percentage: number | null;
      vendor: { id: number; name: string };
      entity: { id: number; name: string };
      category: { id: number; name: string };
      currency: { id: number; code: string; symbol: string };
    }>
  >
> {
  try {
    const user = await getCurrentUser();
    const isAdminUser = await isAdmin();

    // Build where clause with RBAC filtering
    const where: Prisma.InvoiceProfileWhereInput = {};

    if (!isAdminUser) {
      // Standard users: only profiles they have access to
      where.OR = [
        { visible_to_all: true },
        {
          visibilities: {
            some: {
              user_id: user.id,
            },
          },
        },
      ];
    }

    const profiles = await db.invoiceProfile.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        billing_frequency: true,
        tds_applicable: true,
        tds_percentage: true,
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        currency: {
          select: {
            id: true,
            code: true,
            symbol: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: profiles,
    };
  } catch (error) {
    console.error('[invoices-v2] getInvoiceProfiles error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice profiles',
    };
  }
}

/**
 * Get all active entities
 *
 * @returns List of entities
 */
export async function getEntities(): Promise<
  ServerActionResult<Array<{ id: number; name: string }>>
> {
  try {
    await getCurrentUser();

    const entities = await db.entity.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: entities,
    };
  } catch (error) {
    console.error('[invoices-v2] getEntities error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch entities',
    };
  }
}

/**
 * Get all active categories
 *
 * @returns List of categories
 */
export async function getCategories(): Promise<
  ServerActionResult<Array<{ id: number; name: string; description: string }>>
> {
  try {
    await getCurrentUser();

    const categories = await db.category.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error('[invoices-v2] getCategories error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch categories',
    };
  }
}

/**
 * Get all active currencies
 *
 * @returns List of currencies
 */
export async function getCurrencies(): Promise<
  ServerActionResult<
    Array<{ id: number; code: string; name: string; symbol: string }>
  >
> {
  try {
    await getCurrentUser();

    const currencies = await db.currency.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        symbol: true,
      },
      orderBy: {
        code: 'asc',
      },
    });

    return {
      success: true,
      data: currencies,
    };
  } catch (error) {
    console.error('[invoices-v2] getCurrencies error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch currencies',
    };
  }
}

/**
 * Get all active payment types
 *
 * @returns List of payment types
 */
export async function getPaymentTypes(): Promise<
  ServerActionResult<
    Array<{ id: number; name: string; requires_reference: boolean }>
  >
> {
  try {
    await getCurrentUser();

    const paymentTypes = await db.paymentType.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        requires_reference: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: paymentTypes,
    };
  } catch (error) {
    console.error('[invoices-v2] getPaymentTypes error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch payment types',
    };
  }
}

// ============================================================================
// APPROVAL OPERATIONS
// ============================================================================

/**
 * Approve invoice (Admin only)
 * Changes status from 'pending_approval' to 'unpaid'
 *
 * @param invoiceId - Invoice ID to approve
 * @returns Success or error
 */
export async function approveInvoiceV2(
  invoiceId: number
): Promise<ServerActionResult<{ invoiceId: number }>> {
  console.log('[approveInvoiceV2] Server Action called for invoice:', invoiceId);
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    console.log('[approveInvoiceV2] User authenticated:', user.id, 'role:', user.role);

    // 2. Check admin role
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return {
        success: false,
        error: 'Unauthorized: Only admins can approve invoices',
      };
    }

    // 3. Fetch invoice to validate status
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        invoice_number: true,
        vendor_id: true,
        invoice_amount: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    // 4. Validate invoice status
    if (invoice.status !== INVOICE_STATUS.PENDING_APPROVAL) {
      return {
        success: false,
        error: `Invoice cannot be approved. Current status: ${invoice.status}`,
      };
    }

    // 5. Update invoice status
    console.log('[approveInvoiceV2] Updating invoice status to unpaid...');
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: INVOICE_STATUS.UNPAID,
        updated_at: new Date(),
      },
    });

    // 6. Log activity (non-blocking)
    await createActivityLog({
      invoice_id: invoiceId,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_APPROVED,
      old_data: {
        status: invoice.status,
      },
      new_data: {
        status: INVOICE_STATUS.UNPAID,
      },
    }).catch((err) => {
      console.error('[approveInvoiceV2] Failed to create activity log:', err);
    });

    // 7. Revalidate cache
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);

    console.log('[approveInvoiceV2] Success! Invoice approved:', invoiceId);
    return {
      success: true,
      data: { invoiceId },
    };
  } catch (error) {
    console.error('[approveInvoiceV2] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve invoice',
    };
  }
}

/**
 * Reject invoice (Admin only)
 * Changes status from 'pending_approval' to 'rejected'
 *
 * @param invoiceId - Invoice ID to reject
 * @param reason - Rejection reason (required, min 10 chars)
 * @returns Success or error
 */
export async function rejectInvoiceV2(
  invoiceId: number,
  reason: string
): Promise<ServerActionResult<{ invoiceId: number }>> {
  console.log('[rejectInvoiceV2] Server Action called for invoice:', invoiceId);
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    console.log('[rejectInvoiceV2] User authenticated:', user.id, 'role:', user.role);

    // 2. Check admin role
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return {
        success: false,
        error: 'Unauthorized: Only admins can reject invoices',
      };
    }

    // 3. Validate rejection reason
    if (!reason || reason.trim().length < 10) {
      return {
        success: false,
        error: 'Rejection reason must be at least 10 characters',
      };
    }

    // 4. Fetch invoice to validate status
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        status: true,
        invoice_number: true,
        vendor_id: true,
        invoice_amount: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    // 5. Validate invoice status
    if (invoice.status !== INVOICE_STATUS.PENDING_APPROVAL) {
      return {
        success: false,
        error: `Invoice cannot be rejected. Current status: ${invoice.status}`,
      };
    }

    // 6. Update invoice status
    console.log('[rejectInvoiceV2] Updating invoice status to rejected...');
    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: INVOICE_STATUS.REJECTED,
        updated_at: new Date(),
      },
    });

    // 7. Log activity with rejection reason (non-blocking)
    await createActivityLog({
      invoice_id: invoiceId,
      user_id: user.id,
      action: ACTIVITY_ACTION.INVOICE_REJECTED,
      old_data: {
        status: invoice.status,
      },
      new_data: {
        status: INVOICE_STATUS.REJECTED,
        rejection_reason: reason.trim(),
      },
    }).catch((err) => {
      console.error('[rejectInvoiceV2] Failed to create activity log:', err);
    });

    // 8. Revalidate cache
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);

    console.log('[rejectInvoiceV2] Success! Invoice rejected:', invoiceId);
    return {
      success: true,
      data: { invoiceId },
    };
  } catch (error) {
    console.error('[rejectInvoiceV2] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject invoice',
    };
  }
}
