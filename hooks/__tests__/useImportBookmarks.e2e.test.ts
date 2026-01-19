import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useImportBookmarks } from '@/hooks/useImportBookmarks';
import { Bookmark } from '@/lib/types';

// Mock bookmark data
const mockBookmarks: Bookmark[] = [
  {
    id: '1',
    title: 'GitHub',
    url: 'https://github.com',
    tags: ['dev', 'git'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    title: 'MDN',
    url: 'https://developer.mozilla.org',
    tags: ['docs'],
    createdAt: '2024-01-02T00:00:00.000Z',
  },
];

const mockImportData = {
  version: 1,
  data: [
    {
      id: '3',
      title: 'React',
      url: 'https://react.dev',
      tags: ['react', 'frontend'],
      createdAt: '2024-01-03T00:00:00.000Z',
    },
  ],
};

describe('useImportBookmarks E2E', () => {
  const mockImportBookmarks = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and validates JSON file correctly', async () => {
    const mockFile = new File([JSON.stringify(mockImportData)], 'bookmarks.json', {
      type: 'application/json',
    });

    const { result } = renderHook(() =>
      useImportBookmarks(mockBookmarks, mockImportBookmarks)
    );

    act(() => {
      const fileInput = {
        files: [mockFile],
      } as unknown as HTMLInputElement;
      result.current.fileInputRef.current = fileInput;

      // Create mock event
      const event = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      result.current.handleFileSelect(event);
    });

    await waitFor(() => {
      expect(result.current.state.totalCount).toBe(1);
      expect(result.current.state.imported.length).toBe(1);
      expect(result.current.state.invalidCount).toBe(0);
    });
  });

  it('handles invalid JSON gracefully', async () => {
    const mockFile = new File(['{invalid json}'], 'bookmarks.json', {
      type: 'application/json',
    });

    const { result } = renderHook(() =>
      useImportBookmarks(mockBookmarks, mockImportBookmarks)
    );

    act(() => {
      const event = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      result.current.handleFileSelect(event);
    });

    await waitFor(() => {
      expect(result.current.state.error).toBeTruthy();
      expect(result.current.state.error).toContain('Invalid');
    });
  });

  it('imports with merge mode correctly', async () => {
    const mockFile = new File([JSON.stringify(mockImportData)], 'bookmarks.json', {
      type: 'application/json',
    });

    mockImportBookmarks.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useImportBookmarks(mockBookmarks, mockImportBookmarks)
    );

    // Set mode to merge
    act(() => {
      result.current.setMode('merge');
    });

    // Load file
    act(() => {
      const event = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      result.current.handleFileSelect(event);
    });

    await waitFor(() => {
      expect(result.current.state.imported.length).toBe(1);
    });

    // Import
    act(() => {
      result.current.handleImport();
    });

    await waitFor(() => {
      expect(mockImportBookmarks).toHaveBeenCalled();
      // Should have merged - existing + new
      const importedData = mockImportBookmarks.mock.calls[0][0];
      expect(importedData.length).toBeGreaterThan(0);
    });
  });

  it('imports with replace mode correctly', async () => {
    const mockFile = new File([JSON.stringify(mockImportData)], 'bookmarks.json', {
      type: 'application/json',
    });

    mockImportBookmarks.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useImportBookmarks(mockBookmarks, mockImportBookmarks)
    );

    // Set mode to replace
    act(() => {
      result.current.setMode('replace');
    });

    // Load file
    act(() => {
      const event = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      result.current.handleFileSelect(event);
    });

    await waitFor(() => {
      expect(result.current.state.imported.length).toBe(1);
    });

    // Import
    act(() => {
      result.current.handleImport();
    });

    await waitFor(() => {
      expect(mockImportBookmarks).toHaveBeenCalled();
      // Should replace with new data only
      const importedData = mockImportBookmarks.mock.calls[0][0];
      expect(importedData).toEqual(mockImportData.data);
    });
  });

  it('handles duplicate strategies correctly', async () => {
    const duplicateData = {
      version: 1,
      data: [
        {
          id: '1',
          title: 'GitHub Updated',
          url: 'https://github.com',
          tags: ['dev'],
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '3',
          title: 'New Bookmark',
          url: 'https://example.com',
          tags: [],
          createdAt: '2024-01-03T00:00:00.000Z',
        },
      ],
    };

    const mockFile = new File([JSON.stringify(duplicateData)], 'bookmarks.json', {
      type: 'application/json',
    });

    mockImportBookmarks.mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useImportBookmarks(mockBookmarks, mockImportBookmarks)
    );

    act(() => {
      result.current.setMode('merge');
      result.current.setDuplicateStrategy('skip');
    });

    act(() => {
      const event = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      result.current.handleFileSelect(event);
    });

    await waitFor(() => {
      expect(result.current.state.imported.length).toBe(1); // Only new bookmark
    });
  });

  it('counts invalid bookmarks correctly', async () => {
    const invalidData = {
      version: 1,
      data: [
        { id: '1', title: 'Valid', url: 'https://example.com', tags: [], createdAt: '2024-01-01T00:00:00.000Z' },
        { id: '2', title: 'Invalid URL', url: 'not-a-url', tags: [], createdAt: '2024-01-01T00:00:00.000Z' },
        { id: '3', title: 'Missing URL', tags: [], createdAt: '2024-01-01T00:00:00.000Z' },
      ],
    };

    const mockFile = new File([JSON.stringify(invalidData)], 'bookmarks.json', {
      type: 'application/json',
    });

    const { result } = renderHook(() =>
      useImportBookmarks([], mockImportBookmarks)
    );

    act(() => {
      const event = {
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      result.current.handleFileSelect(event);
    });

    await waitFor(() => {
      expect(result.current.state.invalidCount).toBe(2);
      expect(result.current.state.imported.length).toBe(1); // Only valid one
    });
  });

  it('resets state between file selections', async () => {
    const mockFile1 = new File([JSON.stringify(mockImportData)], 'bookmarks1.json', {
      type: 'application/json',
    });
    const mockFile2 = new File([JSON.stringify({ version: 1, data: [] })], 'bookmarks2.json', {
      type: 'application/json',
    });

    const { result } = renderHook(() =>
      useImportBookmarks([], mockImportBookmarks)
    );

    // Load first file
    act(() => {
      const event = {
        target: { files: [mockFile1] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      result.current.handleFileSelect(event);
    });

    await waitFor(() => {
      expect(result.current.state.totalCount).toBe(1);
    });

    // Load second file
    act(() => {
      const event = {
        target: { files: [mockFile2] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      result.current.handleFileSelect(event);
    });

    await waitFor(() => {
      expect(result.current.state.totalCount).toBe(0);
    });
  });
});
