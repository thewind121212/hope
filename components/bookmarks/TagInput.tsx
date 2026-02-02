"use client";

import { useMemo, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { BookmarkFormState } from "@/hooks/useBookmarkForm";
import type { TagWithCount } from "@/lib/tagsStorage";
import { sortByMatchQuality } from "@/lib/fuzzyMatch";

function normalizeTag(raw: string): string {
  return raw.trim();
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => normalizeTag(t))
    .filter(Boolean);
}

function stringifyTags(tags: string[]): string {
  return tags.join(", ");
}

interface TagInputProps {
  id: string;
  label: string;
  name: keyof BookmarkFormState;
  value: string;
  onChangeValue: (nextValue: string) => void;
  error?: string;
  suggestions: TagWithCount[];
  containerClassName?: string;
  registerField?: (fieldName: keyof BookmarkFormState, element: HTMLInputElement | null) => void;
}

export default function TagInput({
  id,
  label,
  name,
  value,
  onChangeValue,
  error,
  suggestions,
  containerClassName,
  registerField,
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const tags = useMemo(() => parseTags(value), [value]);
  const normalizedSet = useMemo(
    () => new Set(tags.map((t) => t.toLowerCase())),
    [tags]
  );

  const filteredSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();

    // Exclude already-added tags
    const available = suggestions.filter(
      (s) => !normalizedSet.has(s.name.toLowerCase())
    );

    // Empty query: show all by count (max 8)
    if (!q) {
      return [...available]
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    }

    // 1 char: substring match only (no fuzzy)
    if (q.length === 1) {
      return available
        .filter((s) => s.name.toLowerCase().includes(q))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    }

    // 2+ chars: fuzzy match + sort by quality
    return sortByMatchQuality(available, q).slice(0, 8);
  }, [draft, suggestions, normalizedSet]);

  const showDropdown = isFocused && filteredSuggestions.length > 0;

  const commitDraft = (raw: string) => {
    const nextTag = normalizeTag(raw);
    if (!nextTag) return;

    if (normalizedSet.has(nextTag.toLowerCase())) {
      setDraft("");
      return;
    }

    const next = [...tags, nextTag];
    onChangeValue(stringifyTags(next));
    setDraft("");
  };

  const removeTag = (tag: string) => {
    const next = tags.filter((t) => t !== tag);
    onChangeValue(stringifyTags(next));
  };

  const handleAddClick = () => {
    commitDraft(draft);
    inputRef.current?.focus();
  };

  return (
    <div className={cn("space-y-1", containerClassName)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>
      <div className="relative">
        <div className="flex gap-2">
          <input
            id={id}
            name={name}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={tags.length ? "Add tag…" : "Type a tag and press +"}
            ref={(el) => {
              inputRef.current = el;
              registerField?.(name, el);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setIsFocused(false), 150);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitDraft(draft);
                return;
              }
              if (e.key === "Backspace" && !draft) {
                const last = tags[tags.length - 1];
                if (last) removeTag(last);
              }
            }}
            className={cn(
              "flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500",
              "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              error && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          <button
            type="button"
            onClick={handleAddClick}
            disabled={!draft.trim()}
            className={cn(
              "flex items-center justify-center rounded-lg px-3 py-2 transition-colors",
              "bg-rose-500 text-white hover:bg-rose-600",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rose-500",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            )}
            aria-label="Add tag"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showDropdown && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            {filteredSuggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => {
                  commitDraft(s.name);
                  inputRef.current?.focus();
                }}
              >
                <span>{s.name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  ({s.count})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="text-left"
            >
              <Badge tone="neutral">{tag} ✕</Badge>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
