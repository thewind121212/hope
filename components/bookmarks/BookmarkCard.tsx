"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Card from "@/components/ui/Card";
import BookmarkTags from "@/components/bookmarks/BookmarkTags";
import DropdownMenu, { DropdownMenuItem } from "@/components/ui/DropdownMenu";
import MarqueeText from "@/components/ui/MarqueeText";
import { cn } from "@/lib/utils";
import { Bookmark, BookmarkColor } from "@/lib/types";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

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
  onTagClick?: (tag: string) => void;
  isPendingAdd: boolean;
  isPendingDelete: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  fetchPreview?: (id: string, url: string) => Promise<{ success: boolean; preview?: NonNullable<Bookmark["preview"]>; error?: string }>;
  refreshPreview?: (id: string, url: string) => Promise<{ success: boolean; error?: string }>;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function PreviewSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-md flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
    </div>
  );
}

function PreviewError() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-2">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Preview unavailable</span>
    </div>
  );
}

export default function BookmarkCard({
  bookmark,
  onDelete,
  onEdit,
  onTagClick,
  isPendingAdd,
  isPendingDelete,
  isSelected = false,
  onToggleSelect,
  fetchPreview,
  refreshPreview,
}: BookmarkCardProps) {
  const isPending = isPendingAdd || isPendingDelete;
  const statusText = isPendingDelete ? "Deleting..." : isPendingAdd ? "Saving..." : null;

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [showDescriptionPopover, setShowDescriptionPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<"below" | "above">("below");
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Click outside to close popover
  useEffect(() => {
    if (!showDescriptionPopover) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowDescriptionPopover(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDescriptionPopover]);

  // Calculate popover position
  const handleTogglePopover = () => {
    if (!showDescriptionPopover && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const popoverHeight = 200; // approximate max height
      
      setPopoverPosition(spaceBelow < popoverHeight ? "above" : "below");
    }
    setShowDescriptionPopover(!showDescriptionPopover);
  };

  const hasPreview = !!bookmark.preview?.previewTitle || !!bookmark.preview?.ogImageUrl;
  const domain = getDomain(bookmark.url);

  const loadPreview = useCallback(async () => {
    if (!fetchPreview || hasPreview || previewLoading) return;
    setPreviewLoading(true);
    setPreviewError(false);
    const result = await fetchPreview(bookmark.id, bookmark.url);
    if (!result.success) {
      setPreviewError(true);
    }
    setPreviewLoading(false);
  }, [fetchPreview, hasPreview, previewLoading, bookmark.id, bookmark.url]);

  useEffect(() => {
    if (!hasPreview && fetchPreview) {
      const timer = setTimeout(() => {
        loadPreview();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [hasPreview, fetchPreview, loadPreview]);

  const handleRefreshPreview = async () => {
    if (!refreshPreview) return;
    setPreviewLoading(true);
    setPreviewError(false);
    const result = await refreshPreview(bookmark.id, bookmark.url);
    if (!result.success) {
      setPreviewError(true);
      toast.error("Failed to refresh preview");
    } else {
      toast.success("Preview refreshed");
    }
    setPreviewLoading(false);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(bookmark.url);
      toast.success("URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
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
    >
      <div className="flex items-center gap-3">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-gray-300 text-rose-500 focus:ring-rose-500 cursor-pointer flex-shrink-0 dark:border-slate-600 dark:bg-slate-800"
          />
        )}

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
                  aria-hidden="true"
                >
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            }
          >
            <DropdownMenuItem onClick={handleCopyUrl} disabled={isPending}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy URL
            </DropdownMenuItem>
            {fetchPreview && refreshPreview && (
              <DropdownMenuItem onClick={handleRefreshPreview} disabled={previewLoading}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {previewLoading ? "Loading..." : "Refresh Preview"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(bookmark)} disabled={isPending}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

      {statusText && <p className="text-xs text-slate-500 dark:text-slate-400">{statusText}</p>}

      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "block truncate text-sm",
          isPending ? "text-slate-400 dark:text-slate-500" : "text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
        )}
      >
        {bookmark.url}
      </a>

      <AnimatePresence mode="wait">
        {previewLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PreviewSkeleton />
          </motion.div>
        ) : previewError ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PreviewError />
          </motion.div>
        ) : hasPreview && bookmark.preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-3"
          >
            {bookmark.preview.ogImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bookmark.preview.ogImageUrl}
                alt="Preview"
                className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800"
                loading="lazy"
              />
            )}
            <div className="flex-1 min-w-0">
              {bookmark.preview.previewTitle && (
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                  {bookmark.preview.previewTitle}
                </p>
              )}
              {bookmark.preview.previewDescription && !bookmark.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                  {bookmark.preview.previewDescription}
                </p>
              )}
               <div className="flex items-center gap-1.5 mt-1.5">
                {bookmark.preview.faviconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bookmark.preview.faviconUrl}
                    alt=""
                    className="w-3.5 h-3.5 rounded-sm"
                    loading="lazy"
                  />
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {bookmark.preview.siteName || domain}
                </span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {bookmark.description && (
        <div className="relative" ref={popoverRef}>
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
            {bookmark.description}
          </p>
          {bookmark.description.length > 150 && (
            <button
              ref={triggerRef}
              type="button"
              onClick={handleTogglePopover}
              className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 mt-1 font-medium"
            >
              {showDescriptionPopover ? "Show less" : "Show more"}
            </button>
          )}

          <AnimatePresence>
            {showDescriptionPopover && (
              <motion.div
                initial={{ opacity: 0, y: popoverPosition === "below" ? -8 : 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: popoverPosition === "below" ? -8 : 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={cn(
                  "absolute left-0 right-0 z-20",
                  popoverPosition === "below" ? "mt-2" : "bottom-full mb-2"
                )}
              >
                {/* Speech bubble arrow */}
                <div
                  className={cn(
                    "absolute left-4 w-4 h-4 bg-white dark:bg-slate-800 border-zinc-200 dark:border-slate-700 transform rotate-45",
                    popoverPosition === "below"
                      ? "-top-2 border-l border-t"
                      : "-bottom-2 border-r border-b"
                  )}
                />
                
                {/* Popover content */}
                <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-zinc-200 dark:border-slate-700 shadow-lg p-4 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setShowDescriptionPopover(false)}
                    className="absolute top-2 right-2 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Close"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap pr-6">
                    {bookmark.description}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <BookmarkTags tags={bookmark.tags} onTagClick={onTagClick} />
    </Card>
  );
}
