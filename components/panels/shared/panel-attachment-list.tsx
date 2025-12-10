'use client';

/**
 * Panel Attachment List Component
 *
 * Displays a list of file attachments with view/download actions.
 * Supports various file types with appropriate icons based on mime type.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  File,
  FileText,
  Image,
  FileSpreadsheet,
  Eye,
  Download,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface Attachment {
  id: string;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date | string;
}

export interface PanelAttachmentListProps {
  /** List of attachments to display */
  attachments: Attachment[];

  /** Callback when view action is triggered */
  onView?: (attachment: Attachment) => void;

  /** Callback when download action is triggered */
  onDownload?: (attachment: Attachment) => void;

  /** Message to show when there are no attachments */
  emptyMessage?: string;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get the appropriate icon component based on mime type
 */
function getFileIcon(mimeType: string): React.ElementType {
  if (mimeType === 'application/pdf') {
    return FileText;
  }
  if (mimeType.startsWith('image/')) {
    return Image;
  }
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/csv'
  ) {
    return FileSpreadsheet;
  }
  return File;
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

interface AttachmentItemProps {
  attachment: Attachment;
  onView?: (attachment: Attachment) => void;
  onDownload?: (attachment: Attachment) => void;
}

function AttachmentItem({ attachment, onView, onDownload }: AttachmentItemProps) {
  const IconComponent = getFileIcon(attachment.mime_type);

  return (
    <div className="flex items-center gap-3 py-3">
      {/* File Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <IconComponent className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {attachment.original_name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)} &middot; {formatDate(attachment.uploaded_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(attachment)}
            className="h-8 w-8 p-0"
            title="View file"
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">View</span>
          </Button>
        )}
        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDownload(attachment)}
            className="h-8 w-8 p-0"
            title="Download file"
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PanelAttachmentList({
  attachments,
  onView,
  onDownload,
  emptyMessage = 'No attachments',
  className,
}: PanelAttachmentListProps) {
  if (attachments.length === 0) {
    return (
      <div className={cn('py-6 text-center', className)}>
        <File className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('divide-y divide-border', className)}>
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          onView={onView}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}

export default PanelAttachmentList;
