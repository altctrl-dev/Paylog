'use client';

/**
 * Attachments Tab Component
 *
 * Displays invoice attachments with view and download capabilities
 * using the shared PanelAttachmentList component.
 */

import { PanelAttachmentList, type Attachment } from '@/components/panels/shared';

// ============================================================================
// Types
// ============================================================================

export interface AttachmentsTabProps {
  attachments: Array<{
    id: string;
    file_name: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    uploaded_at: Date;
  }>;
}

// ============================================================================
// Component
// ============================================================================

export function AttachmentsTab({ attachments }: AttachmentsTabProps) {
  const handleView = (attachment: Attachment) => {
    window.open(`/api/attachments/${attachment.id}`, '_blank');
  };

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = `/api/attachments/${attachment.id}?download=true`;
    link.download = attachment.original_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PanelAttachmentList
      attachments={attachments}
      onView={handleView}
      onDownload={handleDownload}
      emptyMessage="No attachments uploaded"
    />
  );
}

export default AttachmentsTab;
