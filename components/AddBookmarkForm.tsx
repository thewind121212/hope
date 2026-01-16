"use client";

import { useEffect } from "react";
import BookmarkFormFields from "@/components/BookmarkFormFields";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useBookmarkForm } from "@/hooks/useBookmarkForm";
import type { CreateBookmarkInput } from "@/lib/validation";

interface AddBookmarkFormProps {
  titleInputRef: React.RefObject<HTMLInputElement | null>;
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
