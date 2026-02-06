'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function PaginationControl({
  currentPage,
  totalPages,
  onPageChange,
  isLoading
}: PaginationControlProps) {
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // e.g., 1 2 3 4 5

    if (totalPages <= maxVisible) {
      // Show all
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart truncation
      if (currentPage <= 3) {
        // Start: 1 2 3 ... 10
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // End: 1 ... 8 9 10
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Middle: 1 ... 4 5 6 ... 10
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((p, idx) => {
      if (p === '...') {
        return (
          <span key={`dots-${idx}`} className="px-2 text-neutral-500">
            <MoreHorizontal className="w-4 h-4" />
          </span>
        );
      }
      return (
        <Button
          key={p}
          variant={currentPage === p ? "default" : "ghost"}
          size="sm"
          onClick={() => onPageChange(p as number)}
          disabled={isLoading}
          className={`w-8 h-8 p-0 ${currentPage === p ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        >
          {p}
        </Button>
      );
    });
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-8 py-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className="w-8 h-8 border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex items-center gap-1">
        {renderPageNumbers()}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isLoading}
        className="w-8 h-8 border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
