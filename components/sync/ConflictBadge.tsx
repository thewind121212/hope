'use client';

import { AlertTriangle } from 'lucide-react';

interface ConflictBadgeProps {
  variant?: 'default' | 'warning' | 'error';
  className?: string;
}

export function ConflictBadge({ variant = 'warning', className = '' }: ConflictBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${variant === 'error' ? 'bg-red-100 text-red-700' : ''}
        ${variant === 'warning' ? 'bg-amber-100 text-amber-700' : ''}
        ${variant === 'default' ? 'bg-gray-100 text-gray-700' : ''}
        ${className}
      `}
    >
      <AlertTriangle className="w-3 h-3" />
      Conflict
    </span>
  );
}
