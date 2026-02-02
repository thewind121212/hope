"use client";

import { useState } from "react";
import { useIncomingSync } from "@/hooks/useIncomingSync";
import { useTags } from "@/hooks/useTags";
import { TagManagement, RenameTagModal, DeleteTagModal } from "@/components/tags";
import { renameTag, deleteTag } from "@/lib/tagsStorage";
import { batchSyncBookmarks } from "@/lib/tagsBatchSync";
import { useSyncSettingsStore } from "@/stores/sync-settings-store";
import { useVaultStore } from "@/stores/vault-store";
import { toast } from "sonner";
import type { TagWithCount } from "@/lib/tagsStorage";

export default function TagSettingsPage() {
  useIncomingSync();

  const { tags, refresh, isLoading } = useTags();
  const syncMode = useSyncSettingsStore((s) => s.syncMode);
  const vaultKey = useVaultStore((s) => s.vaultKey);

  const [renameModalTag, setRenameModalTag] = useState<TagWithCount | null>(null);
  const [deleteModalTag, setDeleteModalTag] = useState<TagWithCount | null>(null);

  const handleRename = (tag: TagWithCount) => {
    setRenameModalTag(tag);
  };

  const handleRenameConfirm = async (oldName: string, newName: string) => {
    const result = renameTag(oldName, newName);
    if (result.success) {
      toast.success(`Renamed "${oldName}" to "${newName}"`);
      refresh();

      // Batch sync affected bookmarks if sync is enabled
      if (syncMode !== 'off' && result.affectedBookmarks.length > 0) {
        const syncResult = await batchSyncBookmarks(result.affectedBookmarks, {
          syncMode,
          vaultKey,
        });
        if (syncResult.success && syncResult.synced > 0) {
          toast.success(`Synced ${syncResult.synced} bookmark${syncResult.synced !== 1 ? 's' : ''}`);
        } else if (!syncResult.success) {
          toast.error(`Sync failed: ${syncResult.error}`);
        }
      }
    } else {
      toast.error("Failed to rename tag");
    }
  };

  const handleDelete = (tag: TagWithCount) => {
    setDeleteModalTag(tag);
  };

  const handleDeleteConfirm = async (name: string) => {
    const result = deleteTag(name);
    if (result.success) {
      toast.success(`Deleted "${name}"`);
      refresh();

      // Batch sync affected bookmarks if sync is enabled
      if (syncMode !== 'off' && result.affectedBookmarks.length > 0) {
        const syncResult = await batchSyncBookmarks(result.affectedBookmarks, {
          syncMode,
          vaultKey,
        });
        if (syncResult.success && syncResult.synced > 0) {
          toast.success(`Synced ${syncResult.synced} bookmark${syncResult.synced !== 1 ? 's' : ''}`);
        } else if (!syncResult.success) {
          toast.error(`Sync failed: ${syncResult.error}`);
        }
      }
    } else {
      toast.error("Failed to delete tag");
    }
  };

  return (
    <>
      <div className="pt-24">
        <div className="mx-auto max-w-2xl p-4">
          <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Tag Management</h1>
          <TagManagement
            tags={tags}
            isLoading={isLoading}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <RenameTagModal
        isOpen={!!renameModalTag}
        onClose={() => setRenameModalTag(null)}
        tag={renameModalTag}
        onRename={handleRenameConfirm}
      />

      <DeleteTagModal
        isOpen={!!deleteModalTag}
        onClose={() => setDeleteModalTag(null)}
        tag={deleteModalTag}
        onDelete={handleDeleteConfirm}
      />
    </>
  );
}
