'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { ConflictRecord } from '@/lib/sync-conflict';

interface ConflictResolverProps {
  conflict: ConflictRecord;
  onResolve: (strategy: 'keep-both' | 'local-wins' | 'remote-wins') => void;
  onCancel?: () => void;
}

export function ConflictResolver({ conflict, onResolve, onCancel }: ConflictResolverProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<'keep-both' | 'local-wins' | 'remote-wins'>('keep-both');

  return (
    <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-amber-800 dark:text-amber-200">Sync Conflict Detected</h3>
        <Badge tone="accent">Action Required</Badge>
      </div>

      <p className="text-sm text-amber-700 dark:text-amber-300">
        This record was modified both locally and on another device. Choose how to resolve:
      </p>

      <div className="space-y-2">
        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900">
          <input
            type="radio"
            name="strategy"
            checked={selectedStrategy === 'keep-both'}
            onChange={() => setSelectedStrategy('keep-both')}
            className="text-amber-600"
          />
          <div>
            <div className="font-medium">Keep Both</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Create a copy of the remote version with a new ID
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900">
          <input
            type="radio"
            name="strategy"
            checked={selectedStrategy === 'local-wins'}
            onChange={() => setSelectedStrategy('local-wins')}
            className="text-amber-600"
          />
          <div>
            <div className="font-medium">Keep Local</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Overwrite with your local version
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900">
          <input
            type="radio"
            name="strategy"
            checked={selectedStrategy === 'remote-wins'}
            onChange={() => setSelectedStrategy('remote-wins')}
            className="text-amber-600"
          />
          <div>
            <div className="font-medium">Keep Remote</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Overwrite with the version from the other device
            </div>
          </div>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button variant="primary" onClick={() => onResolve(selectedStrategy)}>
          Resolve Conflict
        </Button>
      </div>
    </div>
  );
}
