"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkColor } from "@/lib/types";

const colorClasses: Record<BookmarkColor, string> = {
  red: "border-l-red-500",
  blue: "border-l-blue-500",
  green: "border-l-green-500",
  yellow: "border-l-yellow-500",
  purple: "border-l-purple-500",
  orange: "border-l-orange-500",
};

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete: (id: string, title: string) => void;
  isPendingAdd: boolean;
  isPendingDelete: boolean;
}

const useRenderCounter = (label: string, enabled: boolean) => {
  const renderCount = useRef(0);
  const [isMounted, setIsMounted] = useState(false);

  renderCount.current += 1;

  useEffect(() => {
    setIsMounted(true);
    if (enabled) {
      console.debug(`[Render] ${label}: ${renderCount.current}`);
    }
  });

  return { count: renderCount.current, isMounted };
};

function BookmarkCardComponent({
  bookmark,
  onDelete,
  isPendingAdd,
  isPendingDelete,
}: BookmarkCardProps) {
  const isPending = isPendingAdd || isPendingDelete;
  const statusText = isPendingDelete ? "Deleting..." : isPendingAdd ? "Saving..." : null;
  const showDevTools = process.env.NODE_ENV !== "production";
  const renderCounter = useRenderCounter(`BookmarkCard ${bookmark.id}`, showDevTools);

  return (
    <div
      data-bookmark-card="true"
      aria-busy={isPending}
      className={`bg-white rounded-lg shadow-md p-4 border-l-4 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        isPending ? "opacity-60" : ""
      } ${bookmark.color ? colorClasses[bookmark.color] : "border-l-gray-200"}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{bookmark.title}</h3>
            {showDevTools && renderCounter.isMounted && (
              <span className="text-[10px] text-gray-400">
                Render {renderCounter.count}
              </span>
            )}
          </div>
          {statusText && <p className="text-xs text-gray-500">{statusText}</p>}
        </div>
        <button
          type="button"
          onClick={() => onDelete(bookmark.id, bookmark.title)}
          className="text-gray-400 hover:text-red-600 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Delete bookmark"
          disabled={isPending}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <title>Delete bookmark</title>
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={isPending}
        tabIndex={isPending ? -1 : undefined}
        onClick={
          isPending
            ? (event) => {
                event.preventDefault();
              }
            : undefined
        }
        className={`text-sm truncate block mb-2 ${
          isPending
            ? "text-gray-400 cursor-not-allowed"
            : "text-blue-600 hover:underline"
        }`}
      >
        {bookmark.url}
      </a>

      {bookmark.description && (
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
          {bookmark.description}
        </p>
      )}

      {bookmark.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {bookmark.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const BookmarkCard = memo(BookmarkCardComponent);

export default BookmarkCard;
