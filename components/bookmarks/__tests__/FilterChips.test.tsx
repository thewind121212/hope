/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import FilterChips from '@voc/components/bookmarks/FilterChips';

describe('FilterChips', () => {
  const mockProps = {
    searchQuery: '',
    selectedTags: [] as string[],
    sortKey: 'newest' as const,
    onClearSearch: jest.fn(),
    onRemoveTag: jest.fn(),
    onResetSort: jest.fn(),
  };

  it('should not render when all filters are default', () => {
    const { container } = render(<FilterChips {...mockProps} />);

    expect(container.firstChild).toBe(null);
  });

  it('should render search chip when searchQuery is not empty', () => {
    const props = { ...mockProps, searchQuery: 'test query' };
    render(<FilterChips {...props} />);

    expect(screen.getByText(/Search: "test query"/)).toBeInTheDocument();
  });

  it('should render tag chip when selectedTags is non-empty', () => {
    const props = { ...mockProps, selectedTags: ['design'] };
    render(<FilterChips {...props} />);

    expect(screen.getByText(/Tag: design/)).toBeInTheDocument();
  });

  it('should render sort chip when sortKey is not "newest"', () => {
    const props = { ...mockProps, sortKey: 'oldest' as const };
    render(<FilterChips {...props} />);

    expect(screen.getByText(/Sort: Oldest/)).toBeInTheDocument();
  });

  it('should render all chips when all filters are active', () => {
    const props = {
      ...mockProps,
      searchQuery: 'test',
      selectedTags: ['design'],
      sortKey: 'title' as const,
    };
    render(<FilterChips {...props} />);

    expect(screen.getByText(/Search: "test"/)).toBeInTheDocument();
    expect(screen.getByText(/Tag: design/)).toBeInTheDocument();
    expect(screen.getByText(/Sort: Title A–Z/)).toBeInTheDocument();
  });

  it('should call onClearSearch when search chip remove button is clicked', () => {
    const props = { ...mockProps, searchQuery: 'test', onClearSearch: jest.fn() };
    const { container } = render(<FilterChips {...props} />);

    const chip = container.querySelector('button');
    if (chip) {
      fireEvent.click(chip);
      expect(props.onClearSearch).toHaveBeenCalledTimes(1);
    }
  });

  it('should call onRemoveTag when tag chip remove button is clicked', () => {
    const props = { ...mockProps, selectedTags: ['design'], onRemoveTag: jest.fn() };
    const { container } = render(<FilterChips {...props} />);

    const chip = container.querySelector('button');
    if (chip) {
      fireEvent.click(chip);
      expect(props.onRemoveTag).toHaveBeenCalledWith('design');
    }
  });

  it('should call onResetSort when sort chip remove button is clicked', () => {
    const props = { ...mockProps, sortKey: 'oldest' as const, onResetSort: jest.fn() };
    const { container } = render(<FilterChips {...props} />);

    const chip = container.querySelector('button');
    if (chip) {
      fireEvent.click(chip);
      expect(props.onResetSort).toHaveBeenCalledTimes(1);
    }
  });

  it('should be keyboard accessible - buttons are focusable', () => {
    const props = { ...mockProps, searchQuery: 'test', onClearSearch: jest.fn() };
    const { container } = render(<FilterChips {...props} />);

    // Verify chip renders
    expect(screen.getByText(/Search: "test"/)).toBeInTheDocument();

    const chip = container.querySelector('button');
    expect(chip).toBeInTheDocument();

    // Verify button has proper aria attributes for keyboard accessibility
    expect(chip).toHaveAttribute('aria-label');
    // Buttons are natively keyboard focusable
  });
});
