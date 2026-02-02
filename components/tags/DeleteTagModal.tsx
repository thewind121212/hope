"use client";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import type { TagWithCount } from "@/lib/tagsStorage";

interface DeleteTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: TagWithCount | null;
  onDelete: (name: string) => void;
}

export function DeleteTagModal({
  isOpen,
  onClose,
  tag,
  onDelete,
}: DeleteTagModalProps) {
  if (!tag) return null;

  const handleConfirm = () => {
    onDelete(tag.name);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Tag">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Delete tag <strong>{tag.name}</strong>?
            {tag.count > 0 ? (
              <span className="block mt-1">
                It will be removed from {tag.count} bookmark{tag.count !== 1 ? "s" : ""}.
              </span>
            ) : (
              <span className="block mt-1">This tag is not used by any bookmarks.</span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
