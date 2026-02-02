"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { TagWithCount } from "@/lib/tagsStorage";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface TagManagementProps {
  tags: TagWithCount[];
  onRename: (tag: TagWithCount) => void;
  onDelete: (tag: TagWithCount) => void;
  isLoading?: boolean;
}

export function TagManagement({ tags, onRename, onDelete, isLoading }: TagManagementProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">
          Loading tags...
        </p>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">
          No tags yet. Add tags to bookmarks first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tags.map((tag) => (
        <div
          key={tag.name}
          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {tag.name}
            </span>
            <Badge tone="neutral">{tag.count}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRename(tag)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                "hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              aria-label={`Rename tag ${tag.name}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(tag)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
                "hover:bg-red-50 dark:hover:bg-red-900/20"
              )}
              aria-label={`Delete tag ${tag.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
