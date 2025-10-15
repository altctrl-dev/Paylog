/**
 * Attachment Server Actions Test Suite
 *
 * Tests for Server Actions:
 * - uploadAttachment (permissions, validation, limits)
 * - deleteAttachment (soft delete, permissions)
 * - getAttachments (filtering, relations)
 * - canUploadToInvoice (permission checks)
 * - Security (authorization, hidden invoices)
 */

import {
  uploadAttachment,
  deleteAttachment,
  getAttachments,
  getAttachment,
  canUploadToInvoice,
} from '@/app/actions/attachments'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createStorageService } from '@/lib/storage'
import {
  mockUsers,
  mockInvoices,
  mockAttachments,
  mockSessions,
  createFormDataWithFile,
  createAttachmentWithRelations,
} from '../../fixtures/database'
import {
  createTestFile,
  createPdfBuffer,
  createPngBuffer,
  FILE_SIZES,
  TEST_FILENAMES,
  createSpoofedFile,
} from '../../fixtures/files'

// Mock modules
jest.mock('@/lib/auth')
jest.mock('@/lib/db')
jest.mock('@/lib/storage')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = db as jest.Mocked<typeof db>
const mockCreateStorageService = createStorageService as jest.MockedFunction<
  typeof createStorageService
>

describe('Attachment Server Actions', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
  })

  // ==========================================================================
  // UPLOAD ATTACHMENT TESTS
  // ==========================================================================
  describe('uploadAttachment', () => {
    it('should upload file successfully', async () => {
      // Mock auth
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      // Mock database calls
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(2)
      mockDb.invoiceAttachment.create.mockResolvedValue({
        ...mockAttachments.pdf1,
        id: 'new-attachment-id',
      } as any)

      // Mock storage service
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          success: true,
          path: 'invoices/2024/10/1/file.pdf',
          size: 1024,
        }),
      }
      mockCreateStorageService.mockReturnValue(mockStorage as any)

      // Create test file
      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )
      const formData = createFormDataWithFile(file)

      // Upload
      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(true)
      expect(result.data?.attachmentId).toBe('new-attachment-id')
      expect(mockDb.invoiceAttachment.create).toHaveBeenCalled()
    })

    it('should reject unauthenticated user', async () => {
      // Mock no session
      mockAuth.mockResolvedValue(null)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should reject unauthorized user (not creator or admin)', async () => {
      // Mock different user
      mockAuth.mockResolvedValue(mockSessions.otherAssociate as any)

      // Mock invoice created by different user
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.otherAssociate as any)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only invoice creator or admin')
    })

    it('should allow admin to upload to any invoice', async () => {
      // Mock admin session
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      // Mock invoice created by different user
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.admin as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(2)
      mockDb.invoiceAttachment.create.mockResolvedValue(
        mockAttachments.pdf1 as any
      )

      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          success: true,
          path: 'invoices/2024/10/1/file.pdf',
          size: 1024,
        }),
      }
      mockCreateStorageService.mockReturnValue(mockStorage as any)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(true)
    })

    it('should reject invalid file type', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(2)

      // Create .exe file
      const file = createTestFile(
        TEST_FILENAMES.INVALID_EXE,
        FILE_SIZES.SMALL,
        'application/x-executable'
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('File type not allowed')
    })

    it('should reject oversized file', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(2)

      // Create file over limit
      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.OVER_LIMIT,
        'application/pdf'
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('File size exceeds limit')
    })

    it('should enforce attachment limit per invoice', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)

      // Mock 10 attachments already exist
      mockDb.invoiceAttachment.count.mockResolvedValue(10)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Maximum')
      expect(result.error).toContain('attachments per invoice')
    })

    it('should reject upload to paid invoice', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      // Mock paid invoice
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.paid as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(3, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot upload to invoice with status')
    })

    it('should reject upload to hidden invoice', async () => {
      mockAuth.mockResolvedValue(mockSessions.manager as any)

      // Mock hidden invoice
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.hidden as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.manager as any)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(4, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot upload to hidden invoice')
    })

    it('should reject MIME type spoofing', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(2)

      // Create spoofed file: PNG content with PDF extension
      const file = createSpoofedFile(
        'fake.pdf',
        'image/png',
        'application/pdf',
        FILE_SIZES.SMALL
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('File type mismatch')
    })

    it('should handle storage upload failure', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(2)

      // Mock storage failure
      const mockStorage = {
        upload: jest.fn().mockResolvedValue({
          success: false,
          error: 'Insufficient disk space',
        }),
      }
      mockCreateStorageService.mockReturnValue(mockStorage as any)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Insufficient disk space')
    })
  })

  // ==========================================================================
  // DELETE ATTACHMENT TESTS
  // ==========================================================================
  describe('deleteAttachment', () => {
    it('should soft delete attachment successfully', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      // Mock attachment owned by user
      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        ...mockAttachments.pdf1,
        invoice: mockInvoices.pending,
      } as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.update.mockResolvedValue({
        ...mockAttachments.pdf1,
        deleted_at: new Date(),
        deleted_by: 1,
      } as any)

      const result = await deleteAttachment('att-001')

      expect(result.success).toBe(true)
      expect(mockDb.invoiceAttachment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'att-001' },
          data: expect.objectContaining({
            deleted_at: expect.any(Date),
            deleted_by: 1,
          }),
        })
      )
    })

    it('should reject unauthorized delete', async () => {
      mockAuth.mockResolvedValue(mockSessions.otherAssociate as any)

      // Mock attachment owned by different user
      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        ...mockAttachments.pdf1,
        invoice: mockInvoices.pending,
      } as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.otherAssociate as any)

      const result = await deleteAttachment('att-001')

      expect(result.success).toBe(false)
      expect(result.error).toContain(
        'Only uploader, invoice creator, or admin'
      )
    })

    it('should allow admin to delete any attachment', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        ...mockAttachments.pdf1,
        invoice: mockInvoices.pending,
      } as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.admin as any)
      mockDb.invoiceAttachment.update.mockResolvedValue({
        ...mockAttachments.pdf1,
        deleted_at: new Date(),
        deleted_by: 3,
      } as any)

      const result = await deleteAttachment('att-001')

      expect(result.success).toBe(true)
    })

    it('should reject already deleted attachment', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      // Mock already deleted attachment
      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        ...mockAttachments.deleted,
        invoice: mockInvoices.pending,
      } as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)

      const result = await deleteAttachment('att-003')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Attachment already deleted')
    })

    it('should reject delete from hidden invoice', async () => {
      mockAuth.mockResolvedValue(mockSessions.manager as any)

      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        ...mockAttachments.pdf1,
        invoice: mockInvoices.hidden,
      } as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.manager as any)

      const result = await deleteAttachment('att-001')

      expect(result.success).toBe(false)
      expect(result.error).toContain(
        'Cannot delete attachment from hidden invoice'
      )
    })

    it('should handle non-existent attachment', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.invoiceAttachment.findUnique.mockResolvedValue(null)

      const result = await deleteAttachment('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Attachment not found')
    })
  })

  // ==========================================================================
  // GET ATTACHMENTS TESTS
  // ==========================================================================
  describe('getAttachments', () => {
    it('should return attachments for invoice', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)

      const attachmentsList = [
        createAttachmentWithRelations(
          mockAttachments.pdf1,
          mockInvoices.pending,
          mockUsers.associate
        ),
        createAttachmentWithRelations(
          mockAttachments.png1,
          mockInvoices.pending,
          mockUsers.associate
        ),
      ]

      mockDb.invoiceAttachment.findMany.mockResolvedValue(
        attachmentsList as any
      )

      const result = await getAttachments(1, false)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].original_name).toBe('invoice.pdf')
    })

    it('should exclude soft-deleted by default', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.invoiceAttachment.findMany.mockResolvedValue([] as any)

      await getAttachments(1, false)

      expect(mockDb.invoiceAttachment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted_at: null,
          }),
        })
      )
    })

    it('should include soft-deleted when requested', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.invoiceAttachment.findMany.mockResolvedValue([] as any)

      await getAttachments(1, true)

      expect(mockDb.invoiceAttachment.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({
          where: expect.objectContaining({
            deleted_at: null,
          }),
        })
      )
    })

    it('should reject access to hidden invoice attachments', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.hidden as any)

      const result = await getAttachments(4, false)

      expect(result.success).toBe(false)
      expect(result.error).toContain(
        'Cannot access attachments for hidden invoice'
      )
    })
  })

  // ==========================================================================
  // CAN UPLOAD TO INVOICE TESTS
  // ==========================================================================
  describe('canUploadToInvoice', () => {
    it('should return true for invoice creator', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(2)

      const result = await canUploadToInvoice(1)

      expect(result.success).toBe(true)
      expect(result.data?.canUpload).toBe(true)
      expect(result.data?.currentCount).toBe(2)
    })

    it('should return false when limit reached', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(10)

      const result = await canUploadToInvoice(1)

      expect(result.success).toBe(true)
      expect(result.data?.canUpload).toBe(false)
      expect(result.data?.reason).toContain('Maximum')
    })

    it('should return false for unauthorized user', async () => {
      mockAuth.mockResolvedValue(mockSessions.otherAssociate as any)
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.otherAssociate as any)

      const result = await canUploadToInvoice(1)

      expect(result.success).toBe(true)
      expect(result.data?.canUpload).toBe(false)
      expect(result.data?.reason).toContain('Only invoice creator or admin')
    })
  })
})
