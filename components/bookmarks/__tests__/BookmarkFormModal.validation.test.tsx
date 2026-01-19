import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookmarkFormModal from '@/components/bookmarks/BookmarkFormModal';
import { Bookmark } from '@/lib/types';

// Mock dependencies
vi.mock('@/hooks/useBookmarks', () => ({
  useBookmarks: vi.fn(() => ({
    addBookmark: vi.fn(() => ({ success: true, bookmark: {} })),
    updateBookmark: vi.fn(() => ({ success: true })),
    isLoading: false,
    errorMessage: null,
    clearError: vi.fn(),
  })),
}));

vi.mock('@/hooks/useBookmarkForm', () => ({
  useBookmarkForm: vi.fn(() => ({
    form: {
      title: '',
      url: '',
      description: '',
      tags: '',
      color: '',
    },
    errors: {},
    isLoading: false,
    isValid: false,
    errorMessage: null,
    resetForm: vi.fn(),
    handleChange: vi.fn(),
    handleSubmit: vi.fn((e) => e.preventDefault()),
    registerField: vi.fn(),
  })),
}));

import { useBookmarkForm } from '@/hooks/useBookmarkForm';

describe('BookmarkFormModal Validation', () => {
  const mockOnClose = vi.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    mode: 'create' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows modal with correct title for create mode', () => {
    (useBookmarkForm as vi.Mock).mockReturnValue({
      form: { title: '', url: '', description: '', tags: '', color: '' },
      errors: {},
      isLoading: false,
      isValid: false,
      errorMessage: null,
      resetForm: vi.fn(),
      handleChange: vi.fn(),
      handleSubmit: vi.fn((e) => e.preventDefault()),
      registerField: vi.fn(),
    });

    render(<BookmarkFormModal {...defaultProps} />);

    expect(screen.getByText('Add Bookmark')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Bookmark' })).toBeInTheDocument();
  });

  it('shows modal with correct title for edit mode', () => {
    const bookmark: Bookmark = {
      id: '1',
      title: 'Test',
      url: 'https://test.com',
      tags: [],
      createdAt: '2024-01-01',
    };

    (useBookmarkForm as vi.Mock).mockReturnValue({
      form: bookmark,
      errors: {},
      isLoading: false,
      isValid: true,
      errorMessage: null,
      resetForm: vi.fn(),
      handleChange: vi.fn(),
      handleSubmit: vi.fn((e) => e.preventDefault()),
      registerField: vi.fn(),
    });

    render(<BookmarkFormModal {...defaultProps} mode="edit" initialBookmark={bookmark} />);

    expect(screen.getByText('Edit Bookmark')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('disables submit button when form has errors', () => {
    const mockHandleSubmit = vi.fn((e) => e.preventDefault());

    (useBookmarkForm as vi.Mock).mockReturnValue({
      form: { title: '', url: '', description: '', tags: '', color: '' },
      errors: { title: 'Title is required', url: 'URL is required' },
      isLoading: false,
      isValid: false,
      errorMessage: null,
      resetForm: vi.fn(),
      handleChange: vi.fn(),
      handleSubmit: mockHandleSubmit,
      registerField: vi.fn(),
    });

    render(<BookmarkFormModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Add Bookmark' });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Please fix the errors above to save')).toBeInTheDocument();
  });

  it('disables submit button when form is invalid (empty required fields)', () => {
    (useBookmarkForm as vi.Mock).mockReturnValue({
      form: { title: '', url: '', description: '', tags: '', color: '' },
      errors: {},
      isLoading: false,
      isValid: false,
      errorMessage: null,
      resetForm: vi.fn(),
      handleChange: vi.fn(),
      handleSubmit: vi.fn((e) => e.preventDefault()),
      registerField: vi.fn(),
    });

    render(<BookmarkFormModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Add Bookmark' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when form is valid', () => {
    const mockHandleSubmit = vi.fn((e) => e.preventDefault());

    (useBookmarkForm as vi.Mock).mockReturnValue({
      form: { title: 'Test', url: 'https://test.com', description: '', tags: '', color: '' },
      errors: {},
      isLoading: false,
      isValid: true,
      errorMessage: null,
      resetForm: vi.fn(),
      handleChange: vi.fn(),
      handleSubmit: mockHandleSubmit,
      registerField: vi.fn(),
    });

    render(<BookmarkFormModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Add Bookmark' });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onClose when cancel button clicked', async () => {
    (useBookmarkForm as vi.Mock).mockReturnValue({
      form: { title: '', url: '', description: '', tags: '', color: '' },
      errors: {},
      isLoading: false,
      isValid: false,
      errorMessage: null,
      resetForm: vi.fn(),
      handleChange: vi.fn(),
      handleSubmit: vi.fn((e) => e.preventDefault()),
      registerField: vi.fn(),
    });

    render(<BookmarkFormModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows error message when present', () => {
    (useBookmarkForm as vi.Mock).mockReturnValue({
      form: { title: '', url: '', description: '', tags: '', color: '' },
      errors: {},
      isLoading: false,
      isValid: false,
      errorMessage: 'Something went wrong',
      resetForm: vi.fn(),
      handleChange: vi.fn(),
      handleSubmit: vi.fn((e) => e.preventDefault()),
      registerField: vi.fn(),
    });

    render(<BookmarkFormModal {...defaultProps} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toHaveAttribute('role', 'alert');
  });

  it('does not render when closed', () => {
    (useBookmarkForm as vi.Mock).mockReturnValue({
      form: { title: '', url: '', description: '', tags: '', color: '' },
      errors: {},
      isLoading: false,
      isValid: false,
      errorMessage: null,
      resetForm: vi.fn(),
      handleChange: vi.fn(),
      handleSubmit: vi.fn((e) => e.preventDefault()),
      registerField: vi.fn(),
    });

    const { container } = render(<BookmarkFormModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Add Bookmark')).not.toBeInTheDocument();
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
