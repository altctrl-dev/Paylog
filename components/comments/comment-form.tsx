/**
 * Comment Form Component
 *
 * Form for creating and editing comments with Markdown toolbar.
 * Sprint 7 Phase 6: Comments Feature
 *
 * Features:
 * - Markdown toolbar (bold, italic, list, link)
 * - Character counter (max 2000)
 * - Preview mode toggle
 * - Submit/Cancel actions
 * - Edit mode support
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bold, Italic, List, Link as LinkIcon, Eye, EyeOff } from 'lucide-react';
import { MAX_COMMENT_LENGTH } from '@/types/comment';
import type { InvoiceCommentWithRelations } from '@/types/comment';

interface CommentFormProps {
  invoiceId: number;
  existingComment?: InvoiceCommentWithRelations;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

/**
 * Insert Markdown syntax at cursor position
 */
function insertMarkdown(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = ''
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);

  const newText =
    text.substring(0, start) + before + selectedText + after + text.substring(end);

  textarea.value = newText;
  textarea.focus();

  // Set cursor position after inserted text
  const newCursorPos = start + before.length + selectedText.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);

  // Trigger React state update
  const event = new Event('input', { bubbles: true });
  textarea.dispatchEvent(event);
}

export function CommentForm({
  existingComment,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CommentFormProps) {
  const [content, setContent] = React.useState(existingComment?.content || '');
  const [showPreview, setShowPreview] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const remainingChars = MAX_COMMENT_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;
  const isValid = content.trim().length > 0 && !isOverLimit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    onSubmit(content.trim());

    // Clear form if creating new comment (not editing)
    if (!existingComment) {
      setContent('');
    }
  };

  const handleBold = () => {
    if (textareaRef.current) {
      insertMarkdown(textareaRef.current, '**', '**');
    }
  };

  const handleItalic = () => {
    if (textareaRef.current) {
      insertMarkdown(textareaRef.current, '*', '*');
    }
  };

  const handleList = () => {
    if (textareaRef.current) {
      insertMarkdown(textareaRef.current, '\n- ');
    }
  };

  const handleLink = () => {
    if (textareaRef.current) {
      insertMarkdown(textareaRef.current, '[', '](url)');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        {/* Markdown Toolbar */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBold}
              disabled={isSubmitting}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleItalic}
              disabled={isSubmitting}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleList}
              disabled={isSubmitting}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLink}
              disabled={isSubmitting}
              title="Insert Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            disabled={isSubmitting || content.trim().length === 0}
          >
            {showPreview ? (
              <>
                <EyeOff className="mr-1 h-4 w-4" />
                Edit
              </>
            ) : (
              <>
                <Eye className="mr-1 h-4 w-4" />
                Preview
              </>
            )}
          </Button>
        </div>

        {/* Textarea or Preview */}
        {showPreview ? (
          <Card className="min-h-[120px] p-3">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div
                className="whitespace-pre-wrap break-words text-sm"
                dangerouslySetInnerHTML={{
                  __html: content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/\n- /g, '\n• ')
                    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary underline">$1</a>'),
                }}
              />
            </div>
          </Card>
        ) : (
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment... (Markdown supported: **bold**, *italic*, - list, [link](url))"
            className="min-h-[120px] resize-y"
            disabled={isSubmitting}
            maxLength={MAX_COMMENT_LENGTH + 100} // Allow typing slightly over to show error
          />
        )}

        {/* Character Counter */}
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Markdown supported: **bold**, *italic*, - list, [link](url)
          </span>
          <Badge
            variant={isOverLimit ? 'destructive' : remainingChars < 100 ? 'warning' : 'outline'}
            className="text-xs"
          >
            {remainingChars} chars remaining
          </Badge>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={!isValid || isSubmitting}>
          {isSubmitting
            ? existingComment
              ? 'Saving...'
              : 'Posting...'
            : existingComment
              ? 'Save Changes'
              : 'Post Comment'}
        </Button>
      </div>
    </form>
  );
}
