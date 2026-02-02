"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getTags, type TagWithCount } from "@/lib/tagsStorage";

interface RenameTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tag: TagWithCount | null;
  onRename: (oldName: string, newName: string) => void;
}

export function RenameTagModal({
  isOpen,
  onClose,
  tag,
  onRename,
}: RenameTagModalProps) {
  const initialName = useMemo(() => tag?.name ?? "", [tag?.name]);

  const [newName, setNewName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isOpen) return;
    setNewName(initialName);
    setError(undefined);
  }, [isOpen, initialName]);

  const existingTags = useMemo(() => getTags(), []);
  const newNameTrimmed = newName.trim();

  useEffect(() => {
    if (!newNameTrimmed) {
      setError("Name is required");
      return;
    }

    if (newNameTrimmed.length > 50) {
      setError("Name must be 50 characters or less");
      return;
    }

    const duplicate = existingTags.find(
      (t) => t.name.toLowerCase() === newNameTrimmed.toLowerCase() && t.name !== initialName
    );
    if (duplicate) {
      setError(`Tag "${duplicate.name}" already exists`);
      return;
    }

    setError(undefined);
  }, [newNameTrimmed, existingTags, initialName]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (error || !newNameTrimmed || !tag) return;
    onRename(tag.name, newNameTrimmed);
    onClose();
  };

  if (!tag) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rename Tag">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Rename <strong>{tag.name}</strong> to a new name.
        </div>

        <Input
          label="New name"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            if (error) setError(undefined);
          }}
          error={error}
          placeholder="e.g. reactjs → react"
          autoFocus
        />

        {tag.count > 0 && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {tag.count} bookmark{tag.count !== 1 ? "s" : ""} will be updated.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!!error || !newNameTrimmed}>
            Rename
          </Button>
        </div>
      </form>
    </Modal>
  );
}
