"use client";

import { useEffect } from "react";
import BookmarkFormFields from "@/components/BookmarkFormFields";
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
  } = useBookmarkForm({ onBookmarkAdded });

  useEffect(() => {
    clearFormRef.current = clearForm;
    return () => {
      clearFormRef.current = null;
    };
  }, [clearForm, clearFormRef]);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-md p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold text-gray-900">Add Bookmark</h2>

      <BookmarkFormFields
        form={form}
        errors={errors}
        onChange={handleChange}
        titleInputRef={titleInputRef}
      />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : "Add Bookmark"}
      </button>

      {errorMessage && (
        <p className="text-sm text-red-600 text-center">{errorMessage}</p>
      )}

      {showSuccess && (
        <p className="text-sm text-green-600 text-center">
          Bookmark added successfully!
        </p>
      )}
    </form>
  );
}
