/**
 * Comment List Component
 *
 * Display paginated list of comments for an invoice.
 * Sprint 7 Phase 6: Comments Feature
 *
 * Features:
 * - Paginated comment list
 * - Empty state
 * - Loading skeleton
 * - Pagination controls
 * - New comment form
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { CommentCard } from './comment-card';
import { CommentForm } from './comment-form';
import { useComments, useCreateComment } from '@/hooks/use-comments';

interface CommentListProps {
  invoiceId: number;
  currentUserId: number;
  currentUserRole: string;
}

/**
 * Loading skeleton for comments
 */
function CommentSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-3/4 bg-muted rounded" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Empty state when no comments exist
 */
function EmptyState() {
  return (
    <Card className="p-8 text-center">
      <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 font-semibold text-sm">No comments yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Be the first to comment on this invoice.
      </p>
    </Card>
  );
}

export function CommentList({
  invoiceId,
  currentUserId,
  currentUserRole,
}: CommentListProps) {
  const [page, setPage] = React.useState(1);
  const { data, isLoading, error } = useComments(invoiceId, page);
  const createMutation = useCreateComment(invoiceId);

  const handleCreateComment = (content: string) => {
    createMutation.mutate(content, {
      onSuccess: () => {
        // Reset to page 1 to see new comment
        if (page !== 1) {
          setPage(1);
        }
      },
    });
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (data && page < data.pagination.totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* New Comment Form */}
      <Card className="p-4">
        <h3 className="mb-3 font-semibold text-sm">Add Comment</h3>
        <CommentForm
          invoiceId={invoiceId}
          onSubmit={handleCreateComment}
          isSubmitting={createMutation.isPending}
        />
      </Card>

      {/* Comments List */}
      <div>
        <h3 className="mb-3 font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comments
          {data && data.pagination.total > 0 && (
            <span className="text-muted-foreground font-normal">
              ({data.pagination.total})
            </span>
          )}
        </h3>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            <CommentSkeleton />
            <CommentSkeleton />
            <CommentSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-4 text-center text-destructive">
            <p className="text-sm">Failed to load comments: {error.message}</p>
          </Card>
        )}

        {/* Empty State */}
        {data && data.comments.length === 0 && !isLoading && <EmptyState />}

        {/* Comments */}
        {data && data.comments.length > 0 && (
          <div className="space-y-3">
            {data.comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {data && data.pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page === data.pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
