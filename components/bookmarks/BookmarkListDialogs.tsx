"use client";

import BookmarkFormModal from "@/components/bookmarks/BookmarkFormModal";
import DeleteConfirmSheet from "@/components/bookmarks/DeleteConfirmSheet";
import { Bookmark } from "@/lib/types";

interface BookmarkListDialogsProps {
  editTarget: Bookmark | null;
  deleteTarget: Bookmark | null;
  onCloseEdit: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
}

export default function BookmarkListDialogs({
  editTarget,
  deleteTarget,
  onCloseEdit,
  onCloseDelete,
  onConfirmDelete,
}: BookmarkListDialogsProps) {
  return (
    <>
      <BookmarkFormModal
        isOpen={Boolean(editTarget)}
        mode="edit"
        initialBookmark={editTarget}
        onClose={onCloseEdit}
      />
      <DeleteConfirmSheet
        isOpen={Boolean(deleteTarget)}
        title={deleteTarget?.title ?? ""}
        onCancel={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
