/**
 * FileIcon Component
 *
 * Displays appropriate icon for file type based on MIME type.
 * Supports PDF, images, Word docs, Excel sheets, and generic files.
 */

import * as React from 'react';
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileIconProps {
  mimeType: string;
  className?: string;
}

/**
 * Map MIME types to icon components and colors
 */
function getIconForMimeType(mimeType: string): {
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
} {
  // PDF files
  if (mimeType === 'application/pdf') {
    return {
      Icon: FileText,
      color: 'text-red-600',
    };
  }

  // Image files
  if (mimeType.startsWith('image/')) {
    return {
      Icon: Image,
      color: 'text-blue-600',
    };
  }

  // Excel files
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/csv'
  ) {
    return {
      Icon: FileSpreadsheet,
      color: 'text-green-600',
    };
  }

  // Word files
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return {
      Icon: FileText,
      color: 'text-blue-700',
    };
  }

  // Text files
  if (mimeType === 'text/plain') {
    return {
      Icon: FileText,
      color: 'text-gray-600',
    };
  }

  // Default fallback
  return {
    Icon: File,
    color: 'text-gray-500',
  };
}

export function FileIcon({ mimeType, className }: FileIconProps) {
  const { Icon, color } = getIconForMimeType(mimeType);

  return <Icon className={cn(color, 'w-5 h-5', className)} />;
}
