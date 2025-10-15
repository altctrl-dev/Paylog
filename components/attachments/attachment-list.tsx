/**
 * AttachmentList Component
 *
 * Display list of attachments in responsive grid layout.
 * Supports download and delete actions with confirmation.
 */

'use client';

import * as React from 'react';
import { AttachmentCard } from './attachment-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getAttachments, deleteAttachment } from '@/app/actions/attachments';
import type { AttachmentWithRelations } from '@/types/attachment';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AttachmentListProps {
  invoiceId: number;
  canDelete?: boolean;
  canUpload?: boolean;
  refreshKey?: number;
  onAttachmentDeleted?: () => void;
}

export function AttachmentList({
  invoiceId,
  canDelete = false,
  refreshKey = 0,
  onAttachmentDeleted,
}: AttachmentListProps) {
  const [attachments, setAttachments] = React.useState<AttachmentWithRelations[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();

  // Fetch attachments on mount and when invoiceId changes
  const fetchAttachments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAttachments(invoiceId, false);

      if (result.success) {
        setAttachments(result.data || []);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch attachments',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch attachments',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  React.useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments, refreshKey]);

  // Handle delete attachment
  const handleDeleteClick = (attachmentId: string) => {
    setAttachmentToDelete(attachmentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!attachmentToDelete) return;

    setIsDeleting(true);

    try {
      const result = await deleteAttachment(attachmentToDelete);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Attachment deleted successfully',
        });

        // Remove from local state
        setAttachments((prev) =>
          prev.filter((a) => a.id !== attachmentToDelete)
        );

        // Notify parent
        onAttachmentDeleted?.();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete attachment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete attachment',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAttachmentToDelete(null);
    }
  };

  // Handle download attachment
  const handleDownload = (attachmentId: string, fileName: string) => {
    // Open attachment in new tab (API route will handle secure download)
    window.open(`/api/attachments/${attachmentId}`, '_blank');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading attachments...
        </span>
      </div>
    );
  }

  // Empty state
  if (attachments.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-border rounded-lg">
        <p className="text-sm text-muted-foreground">No attachments yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Upload files to attach them to this invoice
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Grid of Attachments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {attachments.map((attachment) => (
          <AttachmentCard
            key={attachment.id}
            attachment={attachment}
            canDelete={canDelete}
            onDelete={() => handleDeleteClick(attachment.id)}
            onDownload={() => handleDownload(attachment.id, attachment.original_name)}
          />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={isDeleting ? undefined : confirmDelete}>
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
