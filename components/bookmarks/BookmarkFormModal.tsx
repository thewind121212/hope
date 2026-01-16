"use client";

import { useEffect } from "react";
import { Button, Modal } from "@/components/ui";
import BookmarkFormFields from "@/components/BookmarkFormFields";
import { useBookmarkForm } from "@/hooks/useBookmarkForm";
import { Bookmark } from "@/lib/types";

interface BookmarkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "create" | "edit";
  initialBookmark?: Bookmark | null;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function BookmarkFormModal({
  isOpen,
  onClose,
  mode = "create",
  initialBookmark,
  titleInputRef,
}: BookmarkFormModalProps) {
  const {
    form,
    errors,
    isLoading,
    errorMessage,
    resetForm,
    handleChange,
    handleSubmit,
  } = useBookmarkForm({
    mode,
    initialBookmark,
    onSuccess: onClose,
  });

  useEffect(() => {
    if (isOpen) {
      resetForm(initialBookmark ?? null);
    }
  }, [isOpen, initialBookmark, resetForm]);

  const title = mode === "edit" ? "Edit Bookmark" : "Add Bookmark";
  const submitLabel = mode === "edit" ? "Save changes" : "Add Bookmark";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <BookmarkFormFields
          form={form}
          errors={errors}
          onChange={handleChange}
          titleInputRef={titleInputRef}
        />
        {errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
