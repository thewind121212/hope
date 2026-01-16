"use client";

import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";

interface DeleteConfirmSheetProps {
  isOpen: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmSheet({
  isOpen,
  title,
  onCancel,
  onConfirm,
}: DeleteConfirmSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onCancel}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Delete bookmark?
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            This will permanently remove “{title}”.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
