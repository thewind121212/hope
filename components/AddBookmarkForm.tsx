"use client";

import { useEffect, useMemo } from "react";
import BookmarkFormFields from "@/components/BookmarkFormFields";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useBookmarkForm } from "@/hooks/useBookmarkForm";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getUniqueTags } from "@/lib/bookmarks";
import { getSpaces, PERSONAL_SPACE_ID } from "@/lib/spacesStorage";
import type { CreateBookmarkInput } from "@/lib/validation";

interface AddBookmarkFormProps {
  titleInputRef: React.Ref<HTMLInputElement>;
  clearFormRef: React.MutableRefObject<(() => void) | null>;
  onBookmarkAdded?: (bookmark: CreateBookmarkInput) => void;
}

export default function AddBookmarkForm({
  titleInputRef,
  clearFormRef,
  onBookmarkAdded,
}: AddBookmarkFormProps) {
  const {
    form,
    errors,
    isLoading,
    showSuccess,
    errorMessage,
    clearForm,
    handleChange,
    handleSubmit,
  } = useBookmarkForm({ onSuccess: onBookmarkAdded });

  useEffect(() => {
    clearFormRef.current = clearForm;
    return () => {
      clearFormRef.current = null;
    };
  }, [clearForm, clearFormRef]);

  const { allBookmarks } = useBookmarks();

  const spaceOptions = useMemo(() => {
    const spaces = getSpaces();
    if (spaces.length > 0) {
      return spaces.map((space) => ({ value: space.id, label: space.name }));
    }
    return [{ value: PERSONAL_SPACE_ID, label: "Personal" }];
  }, []);

  const tagSuggestions = useMemo(() => getUniqueTags(allBookmarks), [allBookmarks]);

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Add Bookmark
        </h2>

        <BookmarkFormFields
          form={form}
          errors={errors}
          onChange={handleChange}
          titleInputRef={titleInputRef}
          spaceOptions={spaceOptions}
          tagSuggestions={tagSuggestions}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Saving..." : "Add Bookmark"}
        </Button>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

        {showSuccess && (
          <p className="text-sm text-emerald-600">Bookmark added successfully!</p>
        )}
      </form>
    </Card>
  );
}
