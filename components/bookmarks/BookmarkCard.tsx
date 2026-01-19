"use client";
import Card from "@/components/ui/Card";
import BookmarkTags from "@/components/bookmarks/BookmarkTags";
import DropdownMenu, { DropdownMenuItem } from "@/components/ui/DropdownMenu";
import MarqueeText from "@/components/ui/MarqueeText";
import { cn } from "@/lib/utils";
import { Bookmark, BookmarkColor } from "@/lib/types";
import { toast } from "sonner";

const colorClasses: Record<BookmarkColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
};

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
  isPendingAdd: boolean;
  isPendingDelete: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function BookmarkCard({
  bookmark,
  onDelete,
  onEdit,
  isPendingAdd,
  isPendingDelete,
  isSelected = false,
  onToggleSelect,
}: BookmarkCardProps) {
  const isPending = isPendingAdd || isPendingDelete;
  const statusText = isPendingDelete ? "Deleting..." : isPendingAdd ? "Saving..." : null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(bookmark.url);
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleCardClick = (event: React.MouseEvent) => {
    // Don't toggle selection when clicking buttons or links
    if (
      event.target instanceof HTMLElement &&
      (event.target.closest("button") || event.target.closest("a"))
    ) {
      return;
    }
    onToggleSelect?.();
  };

  return (
    <Card
      data-bookmark-card="true"
      aria-busy={isPending}
      className={cn(
        "space-y-3 relative",
        isSelected && "ring-2 ring-rose-500",
        isPending && "opacity-70"
      )}
      onClick={handleCardClick}
    >
      {/* Header row: checkbox - title - 3-dot menu */}
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-500 cursor-pointer flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Title with color dot */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {bookmark.color && (
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full flex-shrink-0",
                colorClasses[bookmark.color]
              )}
              aria-hidden="true"
            />
          )}
          <MarqueeText className="truncate">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-semibold text-slate-900 hover:underline dark:text-slate-100"
            >
              {bookmark.title}
            </a>
          </MarqueeText>
        </div>

        {/* Actions dropdown menu */}
        <div className="flex-shrink-0">
          <DropdownMenu
            trigger={
              <button
                type="button"
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Actions"
              >
                <svg
                  className="w-5 h-5 text-slate-600 dark:text-slate-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            }
          >
            <DropdownMenuItem onClick={handleCopyUrl} disabled={isPending}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(bookmark)} disabled={isPending}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(bookmark)}
              disabled={isPending}
              variant="danger"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      {/* Status text */}
      {statusText && <p className="text-xs text-slate-500">{statusText}</p>}

      {/* URL */}
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "block truncate text-sm",
          isPending ? "text-slate-400" : "text-rose-600 hover:text-rose-700"
        )}
      >
        {bookmark.url}
      </a>

      {/* Description */}
      {bookmark.description && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {bookmark.description}
        </p>
      )}

      {/* Tags */}
      <BookmarkTags tags={bookmark.tags} />
    </Card>
  );
}
