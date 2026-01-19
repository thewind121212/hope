import { renderHook, act } from '@testing-library/react';
import { useBookmarkSelection } from '@voc/hooks/useBookmarkSelection';

describe('useBookmarkSelection', () => {
  it('should start with empty selection', () => {
    const { result } = renderHook(() => useBookmarkSelection());

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('should add ID to selection when toggled', () => {
    const { result } = renderHook(() => useBookmarkSelection());

    act(() => {
      result.current.toggle('bookmark-1');
    });

    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isSelected('bookmark-1')).toBe(true);
  });

  it('should remove ID from selection when toggled twice', () => {
    const { result } = renderHook(() => useBookmarkSelection());

    act(() => {
      result.current.toggle('bookmark-1');
    });
    act(() => {
      result.current.toggle('bookmark-1');
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isSelected('bookmark-1')).toBe(false);
  });

  it('should select all provided IDs', () => {
    const { result } = renderHook(() => useBookmarkSelection());
    const ids = ['bookmark-1', 'bookmark-2', 'bookmark-3'];

    act(() => {
      result.current.selectAll(ids);
    });

    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected('bookmark-1')).toBe(true);
    expect(result.current.isSelected('bookmark-2')).toBe(true);
    expect(result.current.isSelected('bookmark-3')).toBe(true);
  });

  it('should replace selection when selectAll is called', () => {
    const { result } = renderHook(() => useBookmarkSelection());

    // Select first set
    act(() => {
      result.current.selectAll(['bookmark-1', 'bookmark-2']);
    });

    // Select different set
    act(() => {
      result.current.selectAll(['bookmark-3', 'bookmark-4']);
    });

    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected('bookmark-1')).toBe(false);
    expect(result.current.isSelected('bookmark-3')).toBe(true);
    expect(result.current.isSelected('bookmark-4')).toBe(true);
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useBookmarkSelection());

    act(() => {
      result.current.selectAll(['bookmark-1', 'bookmark-2', 'bookmark-3']);
    });
    expect(result.current.selectedCount).toBe(3);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isSelected('bookmark-1')).toBe(false);
  });

  it('should handle empty array in selectAll', () => {
    const { result } = renderHook(() => useBookmarkSelection());

    act(() => {
      result.current.selectAll(['bookmark-1']);
    });
    expect(result.current.selectedCount).toBe(1);

    act(() => {
      result.current.selectAll([]);
    });

    expect(result.current.selectedCount).toBe(0);
  });

  it('should handle single selection', () => {
    const { result } = renderHook(() => useBookmarkSelection());

    act(() => {
      result.current.toggle('only-bookmark');
    });

    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isSelected('only-bookmark')).toBe(true);
  });

  it('should track partial selection', () => {
    const { result } = renderHook(() => useBookmarkSelection());

    act(() => {
      result.current.toggle('bookmark-1');
    });
    act(() => {
      result.current.toggle('bookmark-2');
    });

    expect(result.current.selectedCount).toBe(2);
    expect(result.current.isSelected('bookmark-1')).toBe(true);
    expect(result.current.isSelected('bookmark-2')).toBe(true);
    expect(result.current.isSelected('bookmark-3')).toBe(false);
  });
});
