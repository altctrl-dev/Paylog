/**
 * FileUpload Component Test Suite
 *
 * Tests for drag-and-drop file upload component:
 * - Rendering
 * - File validation
 * - Drag and drop events
 * - Click to upload
 * - Progress tracking
 * - Error handling
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUpload } from '@/components/attachments/file-upload'
import { uploadAttachment } from '@/app/actions/attachments'
import { createTestFile, FILE_SIZES, TEST_FILENAMES } from '../../fixtures/files'

// Mock dependencies
jest.mock('@/app/actions/attachments')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

const mockUploadAttachment = uploadAttachment as jest.MockedFunction<typeof uploadAttachment>

describe('FileUpload Component', () => {
  const defaultProps = {
    invoiceId: 1,
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024, // 10MB
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================
  describe('rendering', () => {
    it('should render drop zone', () => {
      render(<FileUpload {...defaultProps} />)

      expect(screen.getByText(/Drop files here or click to browse/i)).toBeInTheDocument()
      expect(screen.getByText(/Supported formats/i)).toBeInTheDocument()
      expect(screen.getByText(/Maximum file size/i)).toBeInTheDocument()
    })

    it('should render hidden file input', () => {
      render(<FileUpload {...defaultProps} />)

      const input = document.querySelector('input[type="file"]')
      expect(input).toBeInTheDocument()
      expect(input).toHaveClass('hidden')
    })

    it('should accept multiple files', () => {
      render(<FileUpload {...defaultProps} />)

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(input).toHaveAttribute('multiple')
    })
  })

  // ==========================================================================
  // FILE VALIDATION TESTS
  // ==========================================================================
  describe('file validation', () => {
    it('should accept valid PDF file', async () => {
      mockUploadAttachment.mockResolvedValue({
        success: true,
        data: { attachmentId: 'att-001' },
      })

      render(<FileUpload {...defaultProps} />)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(mockUploadAttachment).toHaveBeenCalled()
      })
    })

    it('should reject invalid file type', async () => {
      const onError = jest.fn()
      render(<FileUpload {...defaultProps} onError={onError} />)

      const file = createTestFile(
        TEST_FILENAMES.INVALID_EXE,
        FILE_SIZES.SMALL,
        'application/x-executable'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      // Manually trigger file change with invalid file
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(input)

      // Should not call upload action
      await waitFor(() => {
        expect(mockUploadAttachment).not.toHaveBeenCalled()
      })
    })

    it('should reject oversized file', async () => {
      const onError = jest.fn()
      render(<FileUpload {...defaultProps} onError={onError} />)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.OVER_LIMIT,
        'application/pdf'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })
      fireEvent.change(input)

      await waitFor(() => {
        expect(mockUploadAttachment).not.toHaveBeenCalled()
      })
    })

    it('should enforce max files limit', async () => {
      const onError = jest.fn()
      render(<FileUpload {...defaultProps} maxFiles={2} onError={onError} />)

      // Create 3 files
      const files = [
        createTestFile('file1.pdf', FILE_SIZES.SMALL, 'application/pdf'),
        createTestFile('file2.pdf', FILE_SIZES.SMALL, 'application/pdf'),
        createTestFile('file3.pdf', FILE_SIZES.SMALL, 'application/pdf'),
      ]

      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(input, 'files', {
        value: files,
        writable: false,
      })
      fireEvent.change(input)

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('Maximum'))
      })
    })
  })

  // ==========================================================================
  // DRAG AND DROP TESTS
  // ==========================================================================
  describe('drag and drop', () => {
    it('should handle drag over event', () => {
      render(<FileUpload {...defaultProps} />)

      const dropZone = screen.getByText(/Drop files here/i).closest('div')!

      fireEvent.dragOver(dropZone)

      // Should add dragging styles
      expect(dropZone).toHaveClass('border-primary')
    })

    it('should handle drag leave event', () => {
      render(<FileUpload {...defaultProps} />)

      const dropZone = screen.getByText(/Drop files here/i).closest('div')!

      fireEvent.dragOver(dropZone)
      fireEvent.dragLeave(dropZone)

      // Should remove dragging styles
      expect(dropZone).not.toHaveClass('border-primary')
    })

    it('should handle file drop', async () => {
      mockUploadAttachment.mockResolvedValue({
        success: true,
        data: { attachmentId: 'att-001' },
      })

      render(<FileUpload {...defaultProps} />)

      const dropZone = screen.getByText(/Drop files here/i).closest('div')!

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )

      const dataTransfer = {
        files: [file],
      }

      fireEvent.drop(dropZone, { dataTransfer })

      await waitFor(() => {
        expect(mockUploadAttachment).toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // CLICK TO UPLOAD TESTS
  // ==========================================================================
  describe('click to upload', () => {
    it('should open file dialog on click', () => {
      render(<FileUpload {...defaultProps} />)

      const dropZone = screen.getByText(/Drop files here/i).closest('div')!
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      const clickSpy = jest.spyOn(input, 'click')

      fireEvent.click(dropZone)

      expect(clickSpy).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // UPLOAD PROGRESS TESTS
  // ==========================================================================
  describe('upload progress', () => {
    it('should show progress bar during upload', async () => {
      // Mock slow upload
      mockUploadAttachment.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                success: true,
                data: { attachmentId: 'att-001' },
              })
            }, 500)
          })
      )

      render(<FileUpload {...defaultProps} />)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      // Should show file name
      await waitFor(() => {
        expect(screen.getByText(TEST_FILENAMES.VALID_PDF)).toBeInTheDocument()
      })

      // Should show progress bar
      await waitFor(() => {
        const progressBar = document.querySelector('.bg-blue-600')
        expect(progressBar).toBeInTheDocument()
      })
    })

    it('should remove file from list after successful upload', async () => {
      mockUploadAttachment.mockResolvedValue({
        success: true,
        data: { attachmentId: 'att-001' },
      })

      render(<FileUpload {...defaultProps} />)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      // File should appear temporarily
      await waitFor(() => {
        expect(screen.getByText(TEST_FILENAMES.VALID_PDF)).toBeInTheDocument()
      })

      // File should be removed after upload (with timeout)
      await waitFor(
        () => {
          expect(screen.queryByText(TEST_FILENAMES.VALID_PDF)).not.toBeInTheDocument()
        },
        { timeout: 2000 }
      )
    })
  })

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================
  describe('error handling', () => {
    it('should display error message on upload failure', async () => {
      mockUploadAttachment.mockResolvedValue({
        success: false,
        error: 'Upload failed: Insufficient disk space',
      })

      const onError = jest.fn()
      render(<FileUpload {...defaultProps} onError={onError} />)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      // Should show error message
      await waitFor(() => {
        expect(
          screen.getByText(/Upload failed: Insufficient disk space/i)
        ).toBeInTheDocument()
      })

      // Should call error callback
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient disk space')
      )
    })

    it('should allow removing failed upload', async () => {
      mockUploadAttachment.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      })

      render(<FileUpload {...defaultProps} />)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument()
      })

      // Click remove button
      const removeButton = screen.getByRole('button')
      fireEvent.click(removeButton)

      // File should be removed
      await waitFor(() => {
        expect(screen.queryByText(TEST_FILENAMES.VALID_PDF)).not.toBeInTheDocument()
      })
    })

    it('should handle unexpected errors gracefully', async () => {
      mockUploadAttachment.mockRejectedValue(new Error('Network error'))

      render(<FileUpload {...defaultProps} />)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      // Should show generic error message
      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument()
      })
    })
  })

  // ==========================================================================
  // CALLBACK TESTS
  // ==========================================================================
  describe('callbacks', () => {
    it('should call onUploadComplete on successful upload', async () => {
      mockUploadAttachment.mockResolvedValue({
        success: true,
        data: { attachmentId: 'att-001' },
      })

      const onUploadComplete = jest.fn()
      render(<FileUpload {...defaultProps} onUploadComplete={onUploadComplete} />)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalledWith('att-001')
      })
    })

    it('should call onError on upload failure', async () => {
      mockUploadAttachment.mockResolvedValue({
        success: false,
        error: 'Upload failed',
      })

      const onError = jest.fn()
      render(<FileUpload {...defaultProps} onError={onError} />)

      const file = createTestFile(
        TEST_FILENAMES.VALID_PDF,
        FILE_SIZES.SMALL,
        'application/pdf'
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Upload failed')
      })
    })
  })
})
