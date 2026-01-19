import { renderHook, act } from '@testing-library/react';
import { useBookmarks, BookmarksProvider } from '@voc/hooks/useBookmarks';

// Mock storage module completely to avoid uuid issues
jest.mock('@/lib/storage', () => ({
  getBookmarks: jest.fn(() => []),
  deleteBookmarks: jest.fn(() => true),
  deleteBookmark: jest.fn(() => true),
  addBookmark: jest.fn(() => ({ id: '1', url: 'https://test.com', title: 'Test', tags: [], createdAt: new Date().toISOString() })),
  updateBookmark: jest.fn(() => true),
  setBookmarks: jest.fn(() => true),
  searchBookmarks: jest.fn(() => []),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useBookmarks - bulkDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createWrapper = () => {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <BookmarksProvider>{children}</BookmarksProvider>;
    };
  };

  it('should have bulkDelete method', () => {
    const { result } = renderHook(() => useBookmarks(), {
      wrapper: createWrapper(),
    });

    expect(result.current.bulkDelete).toBeDefined();
    expect(typeof result.current.bulkDelete).toBe('function');
  });

  it('should handle empty array gracefully', async () => {
    const { result } = renderHook(() => useBookmarks(), {
      wrapper: createWrapper(),
    });

    const response = await act(async () => {
      return await result.current.bulkDelete([]);
    });

    expect(response).toEqual({ success: true });
  });

  it('should return success response for valid IDs', async () => {
    const { deleteBookmarks } = require('@/lib/storage');
    const { result } = renderHook(() => useBookmarks(), {
      wrapper: createWrapper(),
    });

    const ids = ['bookmark-1', 'bookmark-2', 'bookmark-3'];

    const response = await act(async () => {
      return await result.current.bulkDelete(ids);
    });

    expect(response.success).toBe(true);
    expect(deleteBookmarks).toHaveBeenCalledWith(ids);
  });

  it('should remove from pendingDeletes after successful deletion', async () => {
    const { result } = renderHook(() => useBookmarks(), {
      wrapper: createWrapper(),
    });

    const ids = ['bookmark-1'];

    await act(async () => {
      await result.current.bulkDelete(ids);
    });

    expect(result.current.pendingDeletes.has('bookmark-1')).toBe(false);
  });
});
