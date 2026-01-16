import { useRef, useState } from "react";
import { render, fireEvent } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const ShortcutHarness = () => {
  const [title, setTitle] = useState("Title");
  const [search, setSearch] = useState("Query");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  useKeyboardShortcuts({
    titleInputRef,
    searchInputRef,
    cardsContainerRef,
    onClearForm: () => setTitle(""),
    onClearSearch: () => setSearch(""),
  });

  return (
    <div>
      <input
        aria-label="Title"
        ref={titleInputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <input
        aria-label="Search"
        ref={searchInputRef}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div
        ref={cardsContainerRef}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} tabIndex={0} data-bookmark-card="true">
            Card {index}
          </div>
        ))}
      </div>
    </div>
  );
};

describe("useKeyboardShortcuts", () => {
  it("focuses the title input on Ctrl+N", () => {
    const { getByLabelText } = render(<ShortcutHarness />);
    const titleInput = getByLabelText("Title");

    fireEvent.keyDown(window, { key: "n", ctrlKey: true });

    expect(titleInput).toHaveFocus();
  });

  it("focuses the search input on Cmd+F", () => {
    const { getByLabelText } = render(<ShortcutHarness />);
    const searchInput = getByLabelText("Search");

    fireEvent.keyDown(window, { key: "f", metaKey: true });

    expect(searchInput).toHaveFocus();
  });

  it("clears inputs and blurs on Escape", () => {
    const { getByLabelText } = render(<ShortcutHarness />);
    const titleInput = getByLabelText("Title") as HTMLInputElement;
    const searchInput = getByLabelText("Search") as HTMLInputElement;

    titleInput.focus();
    fireEvent.keyDown(window, { key: "Escape" });

    expect(titleInput.value).toBe("");
    expect(searchInput.value).toBe("");
    expect(document.activeElement).not.toBe(titleInput);
  });

  it("moves focus across cards with arrow keys", () => {
    const { getAllByText } = render(<ShortcutHarness />);
    const cards = getAllByText(/Card/);

    cards[0].focus();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(cards[1]).toHaveFocus();

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(cards[3]).toHaveFocus();

    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(cards[1]).toHaveFocus();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(cards[0]).toHaveFocus();
  });
});
