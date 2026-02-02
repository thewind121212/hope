"use client";

import { useState } from "react";
import { BOOKMARK_COLORS } from "@/lib/types";
import BookmarkFormField from "@/components/BookmarkFormField";
import BookmarkFormSelect from "@/components/BookmarkFormSelect";
import TagInput from "@/components/bookmarks/TagInput";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Sparkles, Loader2, Edit3 } from "lucide-react";
import type {
  BookmarkFormErrors,
  BookmarkFormState,
} from "@/hooks/useBookmarkForm";
import type { TagWithCount } from "@/lib/tagsStorage";

interface BookmarkFormFieldsProps {
  form: BookmarkFormState;
  errors: BookmarkFormErrors;
  onChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  titleInputRef?: React.Ref<HTMLInputElement>;
  registerField?: (fieldName: keyof BookmarkFormState, element: HTMLInputElement | null) => void;
  spaceOptions: { value: string; label: string }[];
  tagSuggestions: TagWithCount[];
  onGenerateDescription?: (modificationInstructions?: string) => Promise<void>;
  isGeneratingDescription?: boolean;
}

const colorOptions = BOOKMARK_COLORS.map((color) => ({
  value: color,
  label: color.charAt(0).toUpperCase() + color.slice(1),
}));

export default function BookmarkFormFields({
  form,
  errors,
  onChange,
  titleInputRef,
  registerField,
  spaceOptions,
  tagSuggestions,
  onGenerateDescription,
  isGeneratingDescription = false,
}: BookmarkFormFieldsProps) {
  const [showChangeInput, setShowChangeInput] = useState(false);
  const [changeInstructions, setChangeInstructions] = useState("");

  const handleChangeRequest = async () => {
    if (!changeInstructions.trim() || !onGenerateDescription) return;
    await onGenerateDescription(changeInstructions);
    setShowChangeInput(false);
    setChangeInstructions("");
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <BookmarkFormField
        id="title"
        name="title"
        label="Title"
        required
        value={form.title}
        onChange={onChange}
        error={errors.title}
        placeholder="Enter bookmark title"
        inputRef={titleInputRef}
        registerField={registerField}
        containerClassName="sm:col-span-2"
      />

      <BookmarkFormField
        id="url"
        name="url"
        label="URL"
        required
        value={form.url}
        onChange={onChange}
        error={errors.url}
        placeholder="https://example.com"
        registerField={registerField}
        containerClassName="sm:col-span-2"
      />

      <BookmarkFormSelect
        id="spaceId"
        name="spaceId"
        label="Space"
        value={form.spaceId}
        onChange={onChange}
        options={spaceOptions}
        error={errors.spaceId}
        placeholder="Select space"
        containerClassName="sm:col-span-1"
      />

      <TagInput
        id="tags"
        name="tags"
        label="Tags"
        value={form.tags}
        onChangeValue={(next) =>
          onChange({
            target: { name: "tags", value: next },
          } as unknown as React.ChangeEvent<HTMLInputElement>)
        }
        error={errors.tags}
        suggestions={tagSuggestions}
        registerField={registerField}
        containerClassName="sm:col-span-1"
      />

      {/* Description with AI generation - 3 actions: Generate/Regenerate, Change, Manual Edit */}
      <div className="sm:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="description" className="text-sm font-medium text-slate-800 dark:text-slate-100">
            Description
          </label>
          {onGenerateDescription && (
            <div className="flex items-center gap-2">
              {/* Action 1 & 2: Generate/Regenerate button */}
              <Button
                type="button"
                onClick={() => onGenerateDescription()}
                disabled={!form.url.trim() || isGeneratingDescription}
                variant="secondary"
                className="text-xs px-2 py-1 h-auto gap-1"
              >
                {isGeneratingDescription ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    {form.description ? "Regenerate" : "Generate"}
                  </>
                )}
              </Button>

              {/* Action 2: Change button (only show if description exists) */}
              {form.description && !isGeneratingDescription && (
                <Button
                  type="button"
                  onClick={() => setShowChangeInput(!showChangeInput)}
                  disabled={!form.url.trim()}
                  variant="secondary"
                  className="text-xs px-2 py-1 h-auto gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  Change...
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Change instructions input (collapsible) */}
        {showChangeInput && form.description && (
          <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            <Input
              type="text"
              placeholder='e.g., "make it shorter", "focus on technical details"'
              value={changeInstructions}
              onChange={(e) => setChangeInstructions(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleChangeRequest();
                }
                if (e.key === "Escape") {
                  setShowChangeInput(false);
                  setChangeInstructions("");
                }
              }}
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                onClick={handleChangeRequest}
                disabled={!changeInstructions.trim() || isGeneratingDescription}
                variant="primary"
                className="text-xs px-2 py-1 h-auto"
              >
                Apply Changes
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowChangeInput(false);
                  setChangeInstructions("");
                }}
                variant="secondary"
                className="text-xs px-2 py-1 h-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action 3: Manual Edit - always available via textarea */}
        <BookmarkFormField
          id="description"
          name="description"
          as="textarea"
          value={form.description}
          onChange={onChange}
          error={errors.description}
          placeholder={isGeneratingDescription ? "Generating description..." : "Optional description (or use AI to generate)"}
          registerField={registerField}
          disabled={isGeneratingDescription}
          rows={2}
          autoResize
        />
      </div>

      <BookmarkFormSelect
        id="color"
        name="color"
        label="Color Label"
        value={form.color}
        onChange={onChange}
        options={colorOptions}
        error={errors.color}
        placeholder="No color"
        containerClassName="sm:col-span-2"
      />
    </div>
  );
}
