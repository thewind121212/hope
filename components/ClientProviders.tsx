"use client";

/**
 * ClientProviders
 *
 * Wraps all client-side providers that need to be at the app root level.
 * This includes vault initialization, sync, spaces, pinned views, etc.
 *
 * IMPORTANT: BookmarksProvider is here (not in Home page) so that components
 * outside the main page (like AuthHeader in SiteHeader) can access bookmark state
 * and dispatch the RESET_ALL_DATA action on logout.
 */

import { BookmarksProvider } from '@/hooks/useBookmarks';
import { VaultInitializer } from '@/components/vault/VaultInitializer';
import { SyncProvider } from '@/hooks/useSyncProvider';
import { SpacesProvider } from '@/hooks/useSpaces';
import { PinnedViewsProvider } from '@/hooks/usePinnedViews';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <BookmarksProvider>
      <VaultInitializer>
        <SyncProvider>
          <SpacesProvider>
            <PinnedViewsProvider>
              {children}
            </PinnedViewsProvider>
          </SpacesProvider>
        </SyncProvider>
      </VaultInitializer>
    </BookmarksProvider>
  );
}
