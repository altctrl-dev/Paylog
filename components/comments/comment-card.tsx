/**
 * Comment Card Component
 *
 * Display individual comment with author info, timestamp, and actions.
 * Sprint 7 Phase 6: Comments Feature
 *
 * Features:
 * - Markdown rendering
 * - Edit/Delete actions (conditional on ownership + role)
 * - Inline edit mode
 * - "Edited" badge for modified comments
 * - Formatted timestamps
 */

'use client';

import * as React from 'react';
import DOMPurify from 'dompurify';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import { CommentForm } from './comment-form';
import { useUpdateComment, useDeleteComment } from '@/hooks/use-comments';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import type { InvoiceCommentWithRelations } from '@/types/comment';

interface CommentCardProps {
  comment: InvoiceCommentWithRelations;
  currentUserId: number;
  currentUserRole: string;
}

/**
 * Format date for display (relative time)
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: new Date(date).getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(new Date(date));
  }

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * Render Markdown content as HTML
 * Simple implementation - supports bold, italic, lists, links
 * Security: Sanitizes HTML with DOMPurify to prevent XSS attacks
 */
function renderMarkdown(content: string): string {
  const html = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)$/gm, '• $1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, '<br />');

  // Sanitize HTML to prevent XSS attacks
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
}

export function CommentCard({
  comment,
  currentUserId,
  currentUserRole,
}: CommentCardProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const updateMutation = useUpdateComment();
  const deleteMutation = useDeleteComment();

  // Check permissions
  const isAuthor = comment.user_id === currentUserId;
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin';
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = (content: string) => {
    updateMutation.mutate(
      {
        commentId: comment.id,
        content,
        invoiceId: comment.invoice_id,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(
      {
        commentId: comment.id,
        invoiceId: comment.invoice_id,
      },
      {
        onSuccess: () => {
          setShowDeleteDialog(false);
        },
      }
    );
  };

  return (
    <Card className="p-4">
      {/* Header: Author and Timestamp */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium text-sm">{comment.author.full_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTimeAgo(comment.created_at)}</span>
              {comment.is_edited && (
                <Badge variant="outline" className="text-xs">
                  Edited
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                disabled={updateMutation.isPending || deleteMutation.isPending}
                title="Edit comment"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={updateMutation.isPending || deleteMutation.isPending}
                title="Delete comment"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content: Display or Edit Mode */}
      {isEditing ? (
        <div className="mt-3">
          <CommentForm
            invoiceId={comment.invoice_id}
            existingComment={comment}
            onSubmit={handleSaveEdit}
            onCancel={handleCancelEdit}
            isSubmitting={updateMutation.isPending}
          />
        </div>
      ) : (
        <div
          className="prose prose-sm max-w-none whitespace-pre-wrap break-words text-sm dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.content) }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        variant="destructive"
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </Card>
  );
}
