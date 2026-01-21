"use client";

import { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { 
  Cloud, 
  HardDrive, 
  Merge, 
  AlertTriangle,
  CheckCircle2,
  Loader2,
  BookmarkIcon,
  FolderIcon,
  EyeIcon,
} from 'lucide-react';
import type { MergeStrategy, DataSet } from '@/lib/merge-data';
import { countDataSet } from '@/lib/merge-data';

interface SyncConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  localData: DataSet;
  cloudData: DataSet;
  onResolve: (strategy: MergeStrategy) => Promise<void>;
}

export function SyncConflictDialog({
  isOpen,
  onClose,
  localData,
  cloudData,
  onResolve,
}: SyncConflictDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<MergeStrategy>('merge');
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResolve = async () => {
    setIsResolving(true);
    setError(null);

    try {
      await onResolve(selectedStrategy);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
    } finally {
      setIsResolving(false);
    }
  };

  const localCount = countDataSet(localData);
  const cloudCount = countDataSet(cloudData);

  return (
    <Modal isOpen={isOpen} onClose={() => {}} closeOnBackdrop={false} title="Sync Conflict Detected">
      <div className="space-y-5">
        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Changes detected in both local and cloud
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                Your local changes haven&apos;t been synced yet, but the cloud has newer data. Choose how to resolve this.
              </p>
            </div>
          </div>
        </div>

        {/* Data comparison */}
        <div className="grid grid-cols-2 gap-4">
          <DataCard
            icon={<HardDrive className="w-5 h-5" />}
            title="Local (Pending)"
            data={localData}
            count={localCount}
          />
          <DataCard
            icon={<Cloud className="w-5 h-5" />}
            title="Cloud (Newer)"
            data={cloudData}
            count={cloudCount}
          />
        </div>

        {/* Strategy options */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            How would you like to resolve this?
          </p>
          
          <StrategyOption
            id="merge"
            selected={selectedStrategy === 'merge'}
            onSelect={() => setSelectedStrategy('merge')}
            icon={<Merge className="w-4 h-4" />}
            title="Merge Both (Recommended)"
            description="Combine local and cloud data. Duplicates will be removed by URL, keeping the most recent version."
            recommended
          />

          <StrategyOption
            id="cloud-wins"
            selected={selectedStrategy === 'cloud-wins'}
            onSelect={() => setSelectedStrategy('cloud-wins')}
            icon={<Cloud className="w-4 h-4" />}
            title="Keep Cloud Only"
            description="Discard local changes and use cloud data."
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isResolving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={isResolving}
            className="flex-1 gap-2"
          >
            {isResolving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resolving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Apply Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DataCard({
  icon,
  title,
  data,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  data: DataSet;
  count: number;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 mb-3">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="space-y-2">
        <DataRow
          icon={<BookmarkIcon className="w-3.5 h-3.5" />}
          label="Bookmarks"
          count={data.bookmarks.length}
        />
        <DataRow
          icon={<FolderIcon className="w-3.5 h-3.5" />}
          label="Spaces"
          count={data.spaces.length}
        />
        <DataRow
          icon={<EyeIcon className="w-3.5 h-3.5" />}
          label="Views"
          count={data.pinnedViews.length}
        />
      </div>
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {count} items total
        </span>
      </div>
    </div>
  );
}

function DataRow({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium text-slate-700 dark:text-slate-300">{count}</span>
    </div>
  );
}

function StrategyOption({
  id,
  selected,
  onSelect,
  icon,
  title,
  description,
  recommended,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <label
      htmlFor={`sync-strategy-${id}`}
      className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
        selected
          ? 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/30'
          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
      }`}
    >
      <input
        type="radio"
        id={`sync-strategy-${id}`}
        name="sync-strategy"
        checked={selected}
        onChange={onSelect}
        className="mt-1 text-rose-500 focus:ring-rose-500"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-600 dark:text-slate-400">{icon}</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{title}</span>
          {recommended && (
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
              Recommended
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {description}
        </p>
      </div>
    </label>
  );
}
