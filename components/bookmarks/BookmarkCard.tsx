"use client";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import BookmarkTags from "@/components/bookmarks/BookmarkTags";
import { cn } from "@/lib/utils";
import { Bookmark, BookmarkColor } from "@/lib/types";
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
}

export default function BookmarkCard({
  bookmark,
  onDelete,
  onEdit,
  isPendingAdd,
  isPendingDelete,
}: BookmarkCardProps) {
  const isPending = isPendingAdd || isPendingDelete;
  const statusText = isPendingDelete ? "Deleting..." : isPendingAdd ? "Saving..." : null;

  return (
    <Card
      data-bookmark-card="true"
      aria-busy={isPending}
      className={cn("space-y-3", isPending && "opacity-70")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            {bookmark.color && (
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  colorClasses[bookmark.color]
                )}
                aria-hidden="true"
              />
            )}
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-base font-semibold text-slate-900 hover:underline dark:text-slate-100"
            >
              {bookmark.title}
            </a>
          </div>
          {statusText && <p className="text-xs text-slate-500">{statusText}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => onEdit(bookmark)} disabled={isPending}>
            Edit
          </Button>
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700"
            onClick={() => onDelete(bookmark)}
            disabled={isPending}
          >
            Delete
          </Button>
        </div>
      </div>
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "block truncate text-sm",
          isPending
            ? "text-slate-400"
            : "text-rose-600 hover:text-rose-700"
        )}
      >
        {bookmark.url}
      </a>
      {bookmark.description && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {bookmark.description}
        </p>
      )}
      <BookmarkTags tags={bookmark.tags} />
    </Card>
  );
}
