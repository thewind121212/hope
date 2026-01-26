/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useComprehensiveClearFilters } from '@voc/hooks/useComprehensiveClearFilters';

describe('useComprehensiveClearFilters', () => {
  it('should call all callbacks when clearAllFilters is called', () => {
    const onClearSearch = jest.fn();
    const onClearTag = jest.fn();
    const onResetSort = jest.fn();

    const { result } = renderHook(() =>
      useComprehensiveClearFilters({
        onClearSearch,
        onClearTag,
        onResetSort,
      })
    );

    act(() => {
      result.current.clearAllFilters();
    });

    expect(onClearSearch).toHaveBeenCalledTimes(1);
    expect(onClearTag).toHaveBeenCalledTimes(1);
    expect(onResetSort).toHaveBeenCalledTimes(1);
  });

  it('should call all callbacks in sequence', () => {
    const callOrder: string[] = [];
    const onClearSearch = jest.fn(() => callOrder.push('search'));
    const onClearTag = jest.fn(() => callOrder.push('tag'));
    const onResetSort = jest.fn(() => callOrder.push('sort'));

    const { result } = renderHook(() =>
      useComprehensiveClearFilters({
        onClearSearch,
        onClearTag,
        onResetSort,
      })
    );

    act(() => {
      result.current.clearAllFilters();
    });

    expect(callOrder).toEqual(['search', 'tag', 'sort']);
  });

  it('should not call callbacks if clearAllFilters is not called', () => {
    const onClearSearch = jest.fn();
    const onClearTag = jest.fn();
    const onResetSort = jest.fn();

    renderHook(() =>
      useComprehensiveClearFilters({
        onClearSearch,
        onClearTag,
        onResetSort,
      })
    );

    // No clearAllFilters call

    expect(onClearSearch).not.toHaveBeenCalled();
    expect(onClearTag).not.toHaveBeenCalled();
    expect(onResetSort).not.toHaveBeenCalled();
  });

  it('should return stable clearAllFilters function', () => {
    const onClearSearch = jest.fn();
    const onClearTag = jest.fn();
    const onResetSort = jest.fn();

    const { result, rerender } = renderHook(() =>
      useComprehensiveClearFilters({
        onClearSearch,
        onClearTag,
        onResetSort,
      })
    );

    const firstFunction = result.current.clearAllFilters;

    rerender();

    const secondFunction = result.current.clearAllFilters;

    expect(firstFunction).toBe(secondFunction);
  });
});
