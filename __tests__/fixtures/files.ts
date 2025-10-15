/**
 * Test Fixtures: File Creation Utilities
 *
 * Helper functions to create test files with proper magic bytes
 */

/**
 * Create a test File object
 *
 * @param name - Filename
 * @param size - File size in bytes
 * @param type - MIME type
 * @returns File object for testing
 */
export function createTestFile(
  name: string,
  size: number,
  type: string
): File {
  const buffer = createBufferForType(type, size)
  const blob = new Blob([buffer], { type })
  return new File([blob], name, { type })
}

/**
 * Create a PDF Buffer with correct magic bytes
 *
 * @param size - Total buffer size (default 1024 bytes)
 * @returns Buffer with PDF signature
 */
export function createPdfBuffer(size: number = 1024): Buffer {
  const buffer = Buffer.alloc(size)
  // PDF magic bytes: %PDF
  buffer[0] = 0x25
  buffer[1] = 0x50
  buffer[2] = 0x44
  buffer[3] = 0x46
  // Fill rest with dummy data
  buffer.fill(0x20, 4)
  return buffer
}

/**
 * Create a PNG Buffer with correct magic bytes
 *
 * @param size - Total buffer size (default 1024 bytes)
 * @returns Buffer with PNG signature
 */
export function createPngBuffer(size: number = 1024): Buffer {
  const buffer = Buffer.alloc(size)
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  buffer[0] = 0x89
  buffer[1] = 0x50
  buffer[2] = 0x4e
  buffer[3] = 0x47
  buffer[4] = 0x0d
  buffer[5] = 0x0a
  buffer[6] = 0x1a
  buffer[7] = 0x0a
  // Fill rest with dummy data
  buffer.fill(0x00, 8)
  return buffer
}

/**
 * Create a JPEG Buffer with correct magic bytes
 *
 * @param size - Total buffer size (default 1024 bytes)
 * @returns Buffer with JPEG signature
 */
export function createJpegBuffer(size: number = 1024): Buffer {
  const buffer = Buffer.alloc(size)
  // JPEG magic bytes: FF D8 FF
  buffer[0] = 0xff
  buffer[1] = 0xd8
  buffer[2] = 0xff
  buffer[3] = 0xe0 // JFIF marker
  // Fill rest with dummy data
  buffer.fill(0x00, 4)
  return buffer
}

/**
 * Create a GIF Buffer with correct magic bytes
 *
 * @param size - Total buffer size (default 1024 bytes)
 * @returns Buffer with GIF signature
 */
export function createGifBuffer(size: number = 1024): Buffer {
  const buffer = Buffer.alloc(size)
  // GIF magic bytes: 47 49 46 38
  buffer[0] = 0x47
  buffer[1] = 0x49
  buffer[2] = 0x46
  buffer[3] = 0x38
  buffer[4] = 0x39 // GIF89a
  buffer[5] = 0x61
  // Fill rest with dummy data
  buffer.fill(0x00, 6)
  return buffer
}

/**
 * Create a DOCX/XLSX Buffer (ZIP format) with correct magic bytes
 *
 * @param size - Total buffer size (default 1024 bytes)
 * @returns Buffer with ZIP signature
 */
export function createZipBuffer(size: number = 1024): Buffer {
  const buffer = Buffer.alloc(size)
  // ZIP magic bytes: 50 4B 03 04
  buffer[0] = 0x50
  buffer[1] = 0x4b
  buffer[2] = 0x03
  buffer[3] = 0x04
  // Fill rest with dummy data
  buffer.fill(0x00, 4)
  return buffer
}

/**
 * Create a buffer with invalid magic bytes (for negative tests)
 *
 * @param size - Total buffer size (default 1024 bytes)
 * @returns Buffer with no valid signature
 */
export function createInvalidBuffer(size: number = 1024): Buffer {
  const buffer = Buffer.alloc(size)
  // Random bytes that don't match any known signature
  buffer.fill(0xab)
  return buffer
}

/**
 * Helper: Create buffer for specific MIME type
 */
function createBufferForType(type: string, size: number): Buffer {
  switch (type) {
    case 'application/pdf':
      return createPdfBuffer(size)
    case 'image/png':
      return createPngBuffer(size)
    case 'image/jpeg':
      return createJpegBuffer(size)
    case 'image/gif':
      return createGifBuffer(size)
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/zip':
      return createZipBuffer(size)
    default:
      return createInvalidBuffer(size)
  }
}

/**
 * Create a File object with spoofed MIME type
 * (e.g., PDF extension but PNG content)
 *
 * @param filename - Filename with extension
 * @param actualType - Actual MIME type of content
 * @param declaredType - Declared MIME type
 * @param size - File size
 * @returns File with mismatched type
 */
export function createSpoofedFile(
  filename: string,
  actualType: string,
  declaredType: string,
  size: number = 1024
): File {
  const buffer = createBufferForType(actualType, size)
  const blob = new Blob([buffer], { type: declaredType })
  return new File([blob], filename, { type: declaredType })
}

/**
 * Common test file sizes
 */
export const FILE_SIZES = {
  EMPTY: 0,
  SMALL: 1024, // 1KB
  MEDIUM: 1024 * 1024, // 1MB
  LARGE: 5 * 1024 * 1024, // 5MB
  MAX_VALID: 10 * 1024 * 1024, // 10MB
  OVER_LIMIT: 11 * 1024 * 1024, // 11MB
}

/**
 * Common test filenames
 */
export const TEST_FILENAMES = {
  VALID_PDF: 'invoice.pdf',
  VALID_PNG: 'receipt.png',
  VALID_JPEG: 'photo.jpg',
  INVALID_EXE: 'malware.exe',
  PATH_TRAVERSAL: '../../../etc/passwd',
  SPECIAL_CHARS: 'file<>:"|?*.pdf',
  LONG_NAME: 'a'.repeat(300) + '.pdf',
  NULL_BYTE: 'file\0.pdf',
  SPACES: 'my invoice file.pdf',
}
