"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal } from "@/components/ui";
import BookmarkFormFields from "@/components/BookmarkFormFields";
import { useBookmarkForm } from "@/hooks/useBookmarkForm";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getUniqueTags } from "@/lib/bookmarks";
import { getSpaces, PERSONAL_SPACE_ID } from "@/lib/spacesStorage";
import { Bookmark } from "@/lib/types";
import { useUiStore } from "@/stores/useUiStore";

interface BookmarkFormModalProps {
  titleInputRef?: React.Ref<HTMLInputElement>;
}

export default function BookmarkFormModal({
  titleInputRef,
}: BookmarkFormModalProps) {
  // Read from store
  const isOpen = useUiStore((s) => s.isFormOpen);
  const editingBookmark = useUiStore((s) => s.editingBookmark);
  const selectedSpaceId = useUiStore((s) => s.selectedSpaceId);
  const closeForm = useUiStore((s) => s.closeForm);

  const mode = editingBookmark ? "edit" : "create";
  const initialBookmark = editingBookmark;

  const {
    form,
    errors,
    isLoading,
    errorMessage,
    isValid,
    resetForm,
    handleChange,
    handleSubmit,
    registerField,
  } = useBookmarkForm({
    mode,
    initialBookmark,
    defaultSpaceId: selectedSpaceId,
    onSuccess: closeForm,
  });

  const { allBookmarks } = useBookmarks();
  const [spaceOptions, setSpaceOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      resetForm(initialBookmark ?? null);
      const spaces = getSpaces();

      // When in a specific space (not "all"), only show that space in dropdown
      // unless editing an existing bookmark (which may be in a different space)
      if (selectedSpaceId && selectedSpaceId !== "all" && !editingBookmark) {
        const currentSpace = spaces.find((s) => s.id === selectedSpaceId);
        if (currentSpace) {
          setSpaceOptions([{ value: currentSpace.id, label: currentSpace.name }]);
          return;
        }
      }

      setSpaceOptions(
        spaces.map((space) => ({ value: space.id, label: space.name }))
      );
    }
  }, [isOpen, editingBookmark, resetForm, selectedSpaceId]);

  const safeSpaceOptions = useMemo(() => {
    if (spaceOptions.length > 0) return spaceOptions;
    return [{ value: PERSONAL_SPACE_ID, label: "Personal" }];
  }, [spaceOptions]);

  const tagSuggestions = useMemo(() => getUniqueTags(allBookmarks), [allBookmarks]);

  const title = mode === "edit" ? "Edit Bookmark" : "Add Bookmark";
  const submitLabel = mode === "edit" ? "Save changes" : "Add Bookmark";

  // Check if form has any errors
  const hasErrors = Object.keys(errors).some((key) => errors[key as keyof typeof errors]);

  return (
    <Modal isOpen={isOpen} onClose={closeForm} title={title}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <BookmarkFormFields
          form={form}
          errors={errors}
          onChange={handleChange}
          titleInputRef={titleInputRef}
          registerField={registerField}
          spaceOptions={safeSpaceOptions}
          tagSuggestions={tagSuggestions}
        />
        {errorMessage && (
          <p className="text-sm text-red-600" role="alert">{errorMessage}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={closeForm}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || hasErrors || !isValid}
            aria-describedby={hasErrors ? "form-errors" : undefined}
          >
            {isLoading ? "Saving..." : submitLabel}
          </Button>
        </div>
        {hasErrors && (
          <p id="form-errors" className="text-xs text-slate-500 text-center">
            Please fix the errors above to save
          </p>
        )}
      </form>
    </Modal>
  );
}
