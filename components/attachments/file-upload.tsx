/**
 * FileUpload Component
 *
 * Drag-and-drop file upload zone with validation and progress tracking.
 * Supports multiple file selection and displays upload progress.
 */

'use client';

import * as React from 'react';
import { Upload, X, FileIcon as FileIconLucide } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadAttachment } from '@/app/actions/attachments';
import { formatFileSize } from '@/lib/utils/format';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/types/attachment';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  invoiceId: number;
  maxFiles?: number;
  maxSize?: number;
  accept?: string[];
  onUploadComplete?: (attachmentId: string) => void;
  onError?: (error: string) => void;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
}

export function FileUpload({
  invoiceId,
  maxFiles = 10,
  maxSize = MAX_FILE_SIZE,
  accept = ALLOWED_MIME_TYPES as unknown as string[],
  onUploadComplete,
  onError,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Validate file before upload
  const validateFile = (file: File): string | null => {
    // Check file type
    if (!accept.includes(file.type)) {
      return `File type not allowed: ${file.type}`;
    }

    // Check file size
    if (file.size > maxSize) {
      return `File too large: ${formatFileSize(file.size)} (max: ${formatFileSize(maxSize)})`;
    }

    return null;
  };

  // Handle file upload
  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Validate file count
    if (fileArray.length + uploadingFiles.length > maxFiles) {
      const error = `Maximum ${maxFiles} files allowed`;
      onError?.(error);
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    // Validate and prepare files
    const validFiles: File[] = [];
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: 'Invalid File',
          description: `${file.name}: ${error}`,
          variant: 'destructive',
        });
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    // Add files to uploading state
    const newUploadingFiles = validFiles.map((file) => ({
      id: `${file.name}_${Date.now()}_${Math.random()}`,
      file,
      progress: 0,
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

    // Upload files sequentially
    for (const uploadingFile of newUploadingFiles) {
      try {
        // Update progress to show upload starting
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadingFile.id ? { ...f, progress: 10 } : f
          )
        );

        // Simulate progress (in production, use XMLHttpRequest for real progress)
        const progressInterval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          );
        }, 200);

        // Prepare FormData
        const formData = new FormData();
        formData.append('file', uploadingFile.file);

        // Upload file
        const result = await uploadAttachment(invoiceId, formData);

        clearInterval(progressInterval);

        if (result.success) {
          // Update progress to 100%
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id ? { ...f, progress: 100 } : f
            )
          );

          // Show success toast
          toast({
            title: 'Upload Successful',
            description: `${uploadingFile.file.name} uploaded successfully`,
          });

          // Notify parent
          if (result.data?.attachmentId) {
            onUploadComplete?.(result.data.attachmentId);
          }

          // Remove from uploading list after a short delay
          setTimeout(() => {
            setUploadingFiles((prev) =>
              prev.filter((f) => f.id !== uploadingFile.id)
            );
          }, 1000);
        } else {
          // Update with error
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id
                ? { ...f, progress: 0, error: result.error }
                : f
            )
          );

          // Show error toast
          toast({
            title: 'Upload Failed',
            description: result.error || 'Failed to upload file',
            variant: 'destructive',
          });

          onError?.(result.error || 'Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadingFile.id
              ? { ...f, progress: 0, error: 'Upload failed' }
              : f
          )
        );

        toast({
          title: 'Upload Failed',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    await handleFiles(files);
  };

  // Click to upload
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleFiles(files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Remove failed upload
  const removeUpload = (id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
          'hover:border-primary hover:bg-accent/50',
          isDragging
            ? 'border-primary bg-blue-50 dark:bg-blue-950'
            : 'border-border bg-background'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />

        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

        <p className="text-sm font-medium mb-2">
          Drop files here or click to browse
        </p>

        <p className="text-xs text-muted-foreground mb-4">
          Supported formats: PDF, PNG, JPG, DOCX, XLSX, CSV
        </p>

        <p className="text-xs text-muted-foreground">
          Maximum file size: {formatFileSize(maxSize)}
        </p>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="border border-border rounded-lg p-3 bg-card"
            >
              <div className="flex items-center gap-3">
                <FileIconLucide className="w-8 h-8 text-muted-foreground flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadingFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadingFile.file.size)}
                  </p>

                  {/* Progress Bar */}
                  {uploadingFile.progress > 0 && !uploadingFile.error && (
                    <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadingFile.error && (
                    <p className="text-xs text-red-600 mt-1">
                      {uploadingFile.error}
                    </p>
                  )}
                </div>

                {/* Remove Button */}
                {uploadingFile.error && (
                  <button
                    onClick={() => removeUpload(uploadingFile.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
