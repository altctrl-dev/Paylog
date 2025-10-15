/**
 * AttachmentCard Component
 *
 * Display card for single attachment with actions (download, delete).
 * Shows thumbnail for images, icon for other file types.
 */

'use client';

import * as React from 'react';
import Image from 'next/image';
import { Download, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileIcon } from './file-icon';
import { formatFileSize, formatDate, truncateText } from '@/lib/utils/format';
import type { AttachmentWithRelations } from '@/types/attachment';
import { cn } from '@/lib/utils';

interface AttachmentCardProps {
  attachment: AttachmentWithRelations;
  canDelete: boolean;
  onDelete: () => void;
  onDownload: () => void;
}

export function AttachmentCard({
  attachment,
  canDelete,
  onDelete,
  onDownload,
}: AttachmentCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const isImage = attachment.mime_type.startsWith('image/');

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        'border border-border bg-card'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4 space-y-3">
        {/* File Preview/Icon */}
        <div className="flex items-center justify-center h-24 bg-muted rounded-md relative">
          {isImage ? (
            <Image
              src={`/api/attachments/${attachment.id}`}
              alt={attachment.original_name}
              fill
              className="object-contain p-2"
              unoptimized
            />
          ) : (
            <FileIcon mimeType={attachment.mime_type} className="w-12 h-12" />
          )}
        </div>

        {/* File Info */}
        <div className="space-y-1">
          <p
            className="text-sm font-medium truncate"
            title={attachment.original_name}
          >
            {truncateText(attachment.original_name, 30)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.file_size)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(attachment.uploaded_at, true)}
          </p>
          <p className="text-xs text-muted-foreground">
            By {attachment.uploader.full_name}
          </p>
        </div>

        {/* Actions */}
        <div
          className={cn(
            'flex gap-2 transition-opacity duration-200',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
          {canDelete && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-800 hover:bg-red-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Scan Status Badge (if applicable) */}
      {attachment.scan_status === 'infected' && (
        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
          Infected
        </div>
      )}
      {attachment.scan_status === 'error' && (
        <div className="absolute top-2 right-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
          Scan Error
        </div>
      )}
    </Card>
  );
}
