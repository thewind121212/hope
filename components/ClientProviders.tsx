"use client";

/**
 * ClientProviders
 * 
 * Wraps all client-side providers that need to be at the app root level.
 * This includes vault initialization, sync, spaces, pinned views, etc.
 */

import { VaultInitializer } from '@/components/vault/VaultInitializer';
import { SyncProvider } from '@/hooks/useSyncProvider';
import { SpacesProvider } from '@/hooks/useSpaces';
import { PinnedViewsProvider } from '@/hooks/usePinnedViews';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <VaultInitializer>
      <SyncProvider>
        <SpacesProvider>
          <PinnedViewsProvider>
            {children}
          </PinnedViewsProvider>
        </SpacesProvider>
      </SyncProvider>
    </VaultInitializer>
  );
}
