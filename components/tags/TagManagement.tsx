"use client";

import { Pencil, Trash2, Tag, Hash } from "lucide-react";
import type { TagWithCount } from "@/lib/tagsStorage";
import { cn } from "@/lib/utils";

interface TagManagementProps {
  tags: TagWithCount[];
  onRename: (tag: TagWithCount) => void;
  onDelete: (tag: TagWithCount) => void;
}

export function TagManagement({ tags, onRename, onDelete }: TagManagementProps) {
  if (tags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
          <Tag className="h-8 w-8 text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          No tags yet
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add tags to your bookmarks to organize them better.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tags.map((tag) => (
        <div
          key={tag.name}
          className={cn(
            "group flex items-center justify-between gap-3 rounded-xl p-4",
            "bg-white border border-slate-200 shadow-sm",
            "dark:bg-slate-900 dark:border-slate-800",
            "transition-shadow hover:shadow-md"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <Hash className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="min-w-0">
              <span className="block truncate font-medium text-slate-900 dark:text-slate-100">
                {tag.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {tag.count} bookmark{tag.count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onRename(tag)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                "hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              aria-label={`Rename tag ${tag.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(tag)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400",
                "hover:bg-red-50 dark:hover:bg-red-900/20"
              )}
              aria-label={`Delete tag ${tag.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
