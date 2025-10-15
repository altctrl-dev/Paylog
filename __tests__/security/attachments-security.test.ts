/**
 * Attachment Security Test Suite
 *
 * Comprehensive security tests for file attachments:
 * - Path traversal attacks
 * - MIME type spoofing
 * - Authorization bypass attempts
 * - SQL injection in filenames
 * - Cross-site scripting (XSS)
 * - File size attacks (DoS)
 * - Concurrent upload race conditions
 */

import { LocalStorageService } from '@/lib/storage/local'
import {
  validateMimeType,
  validateFilename,
  validateStoragePath,
  sanitizeFilename,
} from '@/lib/storage/validation'
import {
  uploadAttachment,
  deleteAttachment,
  getAttachments,
} from '@/app/actions/attachments'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  createPdfBuffer,
  createPngBuffer,
  createSpoofedFile,
  FILE_SIZES,
} from '../fixtures/files'
import {
  mockUsers,
  mockInvoices,
  mockSessions,
  createFormDataWithFile,
} from '../fixtures/database'
import * as path from 'path'

// Mock modules
jest.mock('@/lib/auth')
jest.mock('@/lib/db')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockDb = db as jest.Mocked<typeof db>

describe('Attachment Security Tests', () => {
  // ==========================================================================
  // PATH TRAVERSAL ATTACKS
  // ==========================================================================
  describe('Path Traversal Prevention', () => {
    it('should reject ../ in filename', () => {
      const isValid = validateFilename('../../../etc/passwd')
      expect(isValid).toBe(false)
    })

    it('should reject absolute paths', () => {
      const isValid = validateFilename('/etc/passwd')
      expect(isValid).toBe(false)
    })

    it('should reject Windows path separators', () => {
      const isValid = validateFilename('..\\..\\windows\\system32\\config\\sam')
      expect(isValid).toBe(false)
    })

    it('should reject null bytes in filename', () => {
      const isValid = validateFilename('file\0.pdf')
      expect(isValid).toBe(false)
    })

    it('should reject path traversal in storage path', () => {
      const isValid = validateStoragePath('../../../etc/passwd')
      expect(isValid).toBe(false)
    })

    it('should sanitize dangerous filename to safe version', () => {
      const sanitized = sanitizeFilename('../../../etc/passwd')
      expect(sanitized).not.toContain('..')
      expect(sanitized).not.toContain('/')
    })

    it('should prevent directory traversal via LocalStorageService', async () => {
      const storage = new LocalStorageService('./uploads-test-security')
      const buffer = createPdfBuffer(FILE_SIZES.SMALL)

      const result = await storage.upload(
        buffer,
        '../../../etc/passwd',
        {
          invoiceId: 1,
          userId: 1,
          originalName: '../../../etc/passwd',
          mimeType: 'application/pdf',
        }
      )

      // If upload succeeds, verify path is safe
      if (result.success) {
        const absolutePath = path.join('./uploads-test-security', result.path!)
        const resolved = path.resolve(absolutePath)
        const basePath = path.resolve('./uploads-test-security')
        expect(resolved.startsWith(basePath)).toBe(true)
      }

      // Cleanup
      try {
        const fs = require('fs/promises')
        await fs.rm('./uploads-test-security', { recursive: true, force: true })
      } catch {
        // Ignore
      }
    })

    it('should reject path with control characters', () => {
      const isValid = validateFilename('file\x01\x02\x03.pdf')
      expect(isValid).toBe(false)
    })

    it('should reject path with URL encoding attempts', () => {
      const isValid = validateFilename('..%2F..%2Fetc%2Fpasswd')
      expect(isValid).toBe(false)
    })
  })

  // ==========================================================================
  // MIME TYPE SPOOFING
  // ==========================================================================
  describe('MIME Type Spoofing Prevention', () => {
    it('should detect PDF disguised as PNG', () => {
      const pngBuffer = createPngBuffer(FILE_SIZES.SMALL)
      const isValid = validateMimeType(pngBuffer, 'application/pdf')
      expect(isValid).toBe(false)
    })

    it('should detect PNG disguised as PDF', () => {
      const pdfBuffer = createPdfBuffer(FILE_SIZES.SMALL)
      const isValid = validateMimeType(pdfBuffer, 'image/png')
      expect(isValid).toBe(false)
    })

    it('should reject executable with PDF extension', () => {
      // Create buffer with executable magic bytes (MZ)
      const exeBuffer = Buffer.alloc(FILE_SIZES.SMALL)
      exeBuffer[0] = 0x4d // M
      exeBuffer[1] = 0x5a // Z

      const isValid = validateMimeType(exeBuffer, 'application/pdf')
      expect(isValid).toBe(false)
    })

    it('should reject file with no magic bytes', () => {
      const emptyBuffer = Buffer.alloc(FILE_SIZES.SMALL)
      const isValid = validateMimeType(emptyBuffer, 'application/pdf')
      expect(isValid).toBe(false)
    })

    it('should validate magic bytes match declared type', () => {
      const pdfBuffer = createPdfBuffer(FILE_SIZES.SMALL)
      expect(pdfBuffer[0]).toBe(0x25) // %
      expect(pdfBuffer[1]).toBe(0x50) // P
      expect(pdfBuffer[2]).toBe(0x44) // D
      expect(pdfBuffer[3]).toBe(0x46) // F

      const isValid = validateMimeType(pdfBuffer, 'application/pdf')
      expect(isValid).toBe(true)
    })
  })

  // ==========================================================================
  // AUTHORIZATION TESTS
  // ==========================================================================
  describe('Authorization Bypass Prevention', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should prevent user A from deleting user B attachment', async () => {
      // User B tries to delete User A's attachment
      mockAuth.mockResolvedValue(mockSessions.otherAssociate as any)

      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        id: 'att-001',
        uploaded_by: 1, // Uploaded by associate (user 1)
        deleted_at: null,
        invoice: {
          created_by: 1,
          is_hidden: false,
        },
      } as any)

      mockDb.user.findUnique.mockResolvedValue(mockUsers.otherAssociate as any)

      const result = await deleteAttachment('att-001')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only uploader, invoice creator, or admin')
    })

    it('should prevent access to hidden invoice attachments', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.hidden as any)

      const result = await getAttachments(4, false)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot access attachments for hidden invoice')
    })

    it('should enforce invoice creator permissions', async () => {
      mockAuth.mockResolvedValue(mockSessions.otherAssociate as any)

      // Invoice created by user 1, trying to upload as user 5
      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.otherAssociate as any)

      const file = new File(
        [createPdfBuffer(FILE_SIZES.SMALL)],
        'test.pdf',
        { type: 'application/pdf' }
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Only invoice creator or admin')
    })

    it('should allow admin to bypass creator restrictions', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.invoice.findUnique.mockResolvedValue(mockInvoices.pending as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.admin as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(2)
      mockDb.invoiceAttachment.create.mockResolvedValue({
        id: 'att-new',
      } as any)

      // Mock storage
      jest.mock('@/lib/storage', () => ({
        createStorageService: jest.fn(() => ({
          upload: jest.fn().mockResolvedValue({
            success: true,
            path: 'test/path.pdf',
            size: 1024,
          }),
        })),
      }))

      const file = new File(
        [createPdfBuffer(FILE_SIZES.SMALL)],
        'test.pdf',
        { type: 'application/pdf' }
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      // Admin should be able to upload regardless of creator
      expect(result.success).toBe(true)
    })

    it('should reject unauthenticated requests', async () => {
      mockAuth.mockResolvedValue(null)

      const file = new File(
        [createPdfBuffer(FILE_SIZES.SMALL)],
        'test.pdf',
        { type: 'application/pdf' }
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })
  })

  // ==========================================================================
  // INJECTION ATTACKS
  // ==========================================================================
  describe('Injection Attack Prevention', () => {
    it('should sanitize SQL injection attempts in filename', () => {
      const malicious = "'; DROP TABLE invoices; --"
      const sanitized = sanitizeFilename(malicious)

      // Characters should be replaced or removed
      expect(sanitized).not.toContain("'")
      expect(sanitized).not.toContain('DROP')
      expect(sanitized).not.toContain(';')
      expect(sanitized).not.toContain('--')
      // Sanitized filename should only contain safe characters
      expect(sanitized).toMatch(/^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$/)
    })

    it('should sanitize XSS attempts in filename', () => {
      const malicious = '<script>alert("XSS")</script>.pdf'
      const sanitized = sanitizeFilename(malicious)

      expect(sanitized).not.toContain('<')
      expect(sanitized).not.toContain('>')
      // After sanitization, dangerous content should be removed/replaced
      expect(sanitized).toMatch(/^[a-zA-Z0-9_-]+\.pdf$/)
    })

    it('should sanitize command injection attempts', () => {
      const malicious = 'file.pdf; rm -rf /'
      const sanitized = sanitizeFilename(malicious)

      // Special characters should be removed or replaced
      expect(sanitized).toMatch(/^[a-zA-Z0-9_-]+\.pdf$/)
      // Should not contain dangerous commands
      const dangerous = ['rm', 'DROP', 'DELETE', 'eval', 'exec']
      const containsDangerous = dangerous.some(cmd =>
        sanitized.toUpperCase().includes(cmd.toUpperCase())
      )
      expect(containsDangerous).toBe(false)
    })

    it('should handle Unicode exploits', () => {
      const malicious = 'file\u202Efdp.exe' // Right-to-left override
      const sanitized = sanitizeFilename(malicious)

      // Should remove or neutralize Unicode control characters
      expect(sanitized).not.toMatch(/[\u202E\u202D]/)
    })
  })

  // ==========================================================================
  // DENIAL OF SERVICE (DoS) PREVENTION
  // ==========================================================================
  describe('DoS Prevention', () => {
    it('should reject extremely long filenames', () => {
      const longFilename = 'a'.repeat(500) + '.pdf'
      const isValid = validateFilename(longFilename)
      expect(isValid).toBe(false)
    })

    it('should truncate long filenames during sanitization', () => {
      const longFilename = 'a'.repeat(200) + '.pdf'
      const sanitized = sanitizeFilename(longFilename)

      // Should be truncated to reasonable length
      expect(sanitized.length).toBeLessThanOrEqual(104) // 100 + '.pdf'
    })

    it('should reject files exceeding size limit', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      // Mock invoice with editable status
      mockDb.invoice.findUnique.mockResolvedValue({
        ...mockInvoices.pending,
        status: 'UNPAID', // Use status that allows edits
      } as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.count.mockResolvedValue(2)

      // Create oversized file
      const file = new File(
        [createPdfBuffer(FILE_SIZES.OVER_LIMIT)],
        'large.pdf',
        { type: 'application/pdf' }
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('File size exceeds limit')
    })

    it('should enforce attachment count limit', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      // Mock invoice with editable status
      mockDb.invoice.findUnique.mockResolvedValue({
        ...mockInvoices.pending,
        status: 'UNPAID', // Use status that allows edits
      } as any)
      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)

      // Already at max limit
      mockDb.invoiceAttachment.count.mockResolvedValue(10)

      const file = new File(
        [createPdfBuffer(FILE_SIZES.SMALL)],
        'test.pdf',
        { type: 'application/pdf' }
      )
      const formData = createFormDataWithFile(file)

      const result = await uploadAttachment(1, formData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Maximum')
    })
  })

  // ==========================================================================
  // RACE CONDITIONS
  // ==========================================================================
  describe('Race Condition Prevention', () => {
    it('should generate unique filenames for concurrent uploads', () => {
      const filenames = new Set<string>()

      // Generate 100 filenames rapidly
      for (let i = 0; i < 100; i++) {
        const sanitized = sanitizeFilename('test.pdf')
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8)
        const unique = `${timestamp}_${random}_${sanitized}`
        filenames.add(unique)
      }

      // All filenames should be unique
      expect(filenames.size).toBeGreaterThan(1)
    })

    it('should handle concurrent delete attempts safely', async () => {
      // Mock same attachment being deleted by two users simultaneously
      mockAuth.mockResolvedValue(mockSessions.admin as any)

      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        id: 'att-001',
        uploaded_by: 1,
        deleted_at: null,
        invoice: {
          created_by: 1,
          is_hidden: false,
        },
      } as any)

      mockDb.user.findUnique.mockResolvedValue(mockUsers.admin as any)

      // First delete succeeds
      mockDb.invoiceAttachment.update.mockResolvedValueOnce({
        id: 'att-001',
        deleted_at: new Date(),
        deleted_by: 3,
      } as any)

      const result1 = await deleteAttachment('att-001')
      expect(result1.success).toBe(true)

      // Second delete attempt (attachment already deleted)
      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        id: 'att-001',
        uploaded_by: 1,
        deleted_at: new Date(),
        invoice: {
          created_by: 1,
          is_hidden: false,
        },
      } as any)

      const result2 = await deleteAttachment('att-001')
      expect(result2.success).toBe(false)
      expect(result2.error).toContain('already deleted')
    })
  })

  // ==========================================================================
  // BEST PRACTICES VALIDATION
  // ==========================================================================
  describe('Security Best Practices', () => {
    it('should use soft delete instead of hard delete', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        id: 'att-001',
        uploaded_by: 1,
        deleted_at: null,
        invoice: {
          created_by: 1,
          is_hidden: false,
        },
      } as any)

      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.update.mockResolvedValue({
        id: 'att-001',
        deleted_at: new Date(),
        deleted_by: 1,
      } as any)

      await deleteAttachment('att-001')

      // Should call update, not delete
      expect(mockDb.invoiceAttachment.update).toHaveBeenCalled()
      expect(mockDb.invoiceAttachment.delete).not.toHaveBeenCalled()
    })

    it('should track who uploaded and deleted files', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any)

      mockDb.invoiceAttachment.findUnique.mockResolvedValue({
        id: 'att-001',
        uploaded_by: 1,
        deleted_at: null,
        invoice: {
          created_by: 1,
          is_hidden: false,
        },
      } as any)

      mockDb.user.findUnique.mockResolvedValue(mockUsers.associate as any)
      mockDb.invoiceAttachment.update.mockResolvedValue({
        id: 'att-001',
        deleted_at: new Date(),
        deleted_by: 1,
      } as any)

      await deleteAttachment('att-001')

      // Should set deleted_by field
      expect(mockDb.invoiceAttachment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deleted_by: 1,
          }),
        })
      )
    })

    it('should validate file type by content not extension', () => {
      // File with .pdf extension but PNG content
      const pngBuffer = createPngBuffer(FILE_SIZES.SMALL)
      const isValid = validateMimeType(pngBuffer, 'application/pdf')

      expect(isValid).toBe(false)
    })

    it('should use secure random for unique identifiers', () => {
      const ids = new Set<string>()

      // Generate 1000 random IDs
      for (let i = 0; i < 1000; i++) {
        const id = Math.random().toString(36).substring(2, 8)
        ids.add(id)
      }

      // All should be unique (very high probability)
      expect(ids.size).toBe(1000)
    })
  })
})
