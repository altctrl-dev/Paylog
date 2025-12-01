import * as React from "react";
import { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (perPage: number) => void;
  showFirstLast?: boolean;
  showItemsPerPage?: boolean;
  itemsPerPageOptions?: number[];
  className?: string;
}

/**
 * Calculate visible page numbers with ellipsis logic.
 * Always shows first and last page, with 2 pages around current page.
 */
function getVisiblePages(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];
  const showLeftEllipsis = currentPage > 4;
  const showRightEllipsis = currentPage < totalPages - 3;

  // Always show first page
  pages.push(1);

  if (showLeftEllipsis) {
    pages.push("ellipsis");
  }

  // Calculate range around current page
  const rangeStart = showLeftEllipsis ? Math.max(currentPage - 1, 2) : 2;
  const rangeEnd = showRightEllipsis
    ? Math.min(currentPage + 1, totalPages - 1)
    : totalPages - 1;

  for (let i = rangeStart; i <= rangeEnd; i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }

  if (showRightEllipsis) {
    pages.push("ellipsis");
  }

  // Always show last page
  if (!pages.includes(totalPages)) {
    pages.push(totalPages);
  }

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 20,
  onItemsPerPageChange,
  showFirstLast = false,
  showItemsPerPage = false,
  itemsPerPageOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const visiblePages = useMemo(
    () => getVisiblePages(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  // Calculate display range
  const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = totalItems
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : null;

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newPerPage = parseInt(e.target.value, 10);
    onItemsPerPageChange?.(newPerPage);
  };

  if (totalPages <= 1 && !showItemsPerPage) {
    return null;
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-4", className)}
    >
      <div className="flex items-center gap-1">
        {/* First page button */}
        {showFirstLast && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={isFirstPage}
            aria-label="Go to first page"
            className="h-9 w-9 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Previous button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label="Go to previous page"
          className="h-9 gap-1 px-2.5"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            if (page === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
                  aria-hidden="true"
                >
                  ...
                </span>
              );
            }

            const isCurrentPage = page === currentPage;

            return (
              <Button
                key={page}
                variant={isCurrentPage ? "default" : "ghost"}
                size="sm"
                onClick={() => onPageChange(page)}
                aria-label={`Go to page ${page}`}
                aria-current={isCurrentPage ? "page" : undefined}
                className={cn(
                  "h-9 w-9 p-0 transition-colors",
                  isCurrentPage &&
                    "bg-primary text-primary-foreground pointer-events-none"
                )}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Next button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          aria-label="Go to next page"
          className="h-9 gap-1 px-2.5"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        {showFirstLast && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={isLastPage}
            aria-label="Go to last page"
            className="h-9 w-9 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Right side: items per page and total count */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {/* Items per page selector */}
        {showItemsPerPage && onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page:</span>
            <Select
              value={itemsPerPage.toString()}
              onChange={handleItemsPerPageChange}
              aria-label="Select rows per page"
              className="h-9 w-[70px]"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Total items display */}
        {totalItems !== undefined && startItem !== null && endItem !== null && (
          <span className="whitespace-nowrap">
            Showing {startItem}-{endItem} of {totalItems}
          </span>
        )}
      </div>
    </nav>
  );
}
