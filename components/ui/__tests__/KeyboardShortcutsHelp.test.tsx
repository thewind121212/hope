/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardShortcutsHelp } from '@voc/components/ui/KeyboardShortcutsHelp';

describe('KeyboardShortcutsHelp', () => {
  it('renders trigger button', () => {
    render(<KeyboardShortcutsHelp />);

    expect(screen.getByLabelText('Show keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Keyboard shortcuts')).toBeInTheDocument();
  });

  it('opens popover on click', async () => {
    render(<KeyboardShortcutsHelp />);

    const trigger = screen.getByLabelText('Show keyboard shortcuts');
    await userEvent.click(trigger);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Add new bookmark')).toBeInTheDocument();
    expect(screen.getByText('Focus search')).toBeInTheDocument();
    expect(screen.getByText('Clear & blur')).toBeInTheDocument();
    expect(screen.getByText('Navigate cards')).toBeInTheDocument();
  });

  it('closes popover on backdrop click', async () => {
    render(<KeyboardShortcutsHelp />);

    const trigger = screen.getByLabelText('Show keyboard shortcuts');
    await userEvent.click(trigger);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

    const backdrop = screen.getByText(/Keyboard Shortcuts/).closest('.fixed')?.previousSibling as HTMLElement;
    if (backdrop) {
      await userEvent.click(backdrop);
    }

    await waitFor(() => {
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });
  });

  it('displays all shortcuts with keys', async () => {
    render(<KeyboardShortcutsHelp />);

    const trigger = screen.getByLabelText('Show keyboard shortcuts');
    await userEvent.click(trigger);

    // Check for keyboard elements
    const keys = screen.getAllByRole('definition');
    expect(keys.length).toBeGreaterThan(0);

    // Check for specific key combinations
    expect(screen.getByText('⌘')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('toggles popover on repeated clicks', async () => {
    render(<KeyboardShortcutsHelp />);

    const trigger = screen.getByLabelText('Show keyboard shortcuts');

    // Open
    await userEvent.click(trigger);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

    // Close
    await userEvent.click(trigger);
    await waitFor(() => {
      expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
    });

    // Open again
    await userEvent.click(trigger);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <KeyboardShortcutsHelp className="custom-class" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('shows Esc hint in footer', async () => {
    render(<KeyboardShortcutsHelp />);

    const trigger = screen.getByLabelText('Show keyboard shortcuts');
    await userEvent.click(trigger);

    expect(screen.getByText(/Press.*Esc.*to close/)).toBeInTheDocument();
  });
});
