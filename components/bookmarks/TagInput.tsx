"use client";

import { useMemo, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { BookmarkFormState } from "@/hooks/useBookmarkForm";

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
  suggestions: string[];
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const tags = useMemo(() => parseTags(value), [value]);
  const normalizedSet = useMemo(
    () => new Set(tags.map((t) => t.toLowerCase())),
    [tags]
  );

  const filteredSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    if (!q) return [];
    return suggestions
      .filter((s) => !normalizedSet.has(s.toLowerCase()))
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 6);
  }, [draft, suggestions, normalizedSet]);

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

  return (
    <div className={cn("space-y-1", containerClassName)}>
      <div className="relative">
        <Input
          id={id}
          label={label}
          name={name}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          error={error}
          placeholder={tags.length ? "Add tag…" : "Add tags (Enter / comma)"}
          ref={(el) => {
            inputRef.current = el;
            registerField?.(name, el);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft(draft);
              return;
            }
            if (e.key === "Backspace" && !draft) {
              const last = tags[tags.length - 1];
              if (last) removeTag(last);
            }
          }}
        />

        {filteredSuggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-zinc-100 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => {
                  commitDraft(s);
                  // keep focus for fast tagging
                  inputRef.current?.focus();
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
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
    </div>
  );
}
