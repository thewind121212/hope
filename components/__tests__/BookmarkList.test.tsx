/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

import { createRef, useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookmarkList from "@/components/BookmarkList";
import { useBookmarks } from "@/hooks/useBookmarks";

jest.mock("@/hooks/useBookmarks", () => ({
  useBookmarks: jest.fn(),
}));

const mockUseBookmarks = useBookmarks as jest.Mock;

const bookmarks = [
  {
    id: "bookmark-1",
    title: "React Docs",
    url: "https://react.dev",
    description: "React reference",
    tags: ["react"],
    createdAt: "2025-01-01T00:00:00.000Z",
  },
  {
    id: "bookmark-2",
    title: "Next.js Docs",
    url: "https://nextjs.org",
    description: "Next.js guides",
    tags: ["nextjs"],
    createdAt: "2025-01-01T00:00:00.000Z",
  },
];

const createReturn = (filtered: typeof bookmarks) => ({
  bookmarks: filtered,
  allBookmarks: bookmarks,
  deleteBookmark: jest.fn(),
  updateBookmark: jest.fn(),
  errorMessage: null,
  clearError: jest.fn(),
  pendingAdds: new Set<string>(),
  pendingDeletes: new Set<string>(),
  simulateError: false,
  setSimulateError: jest.fn(),
});

const Harness = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  return (
    <BookmarkList
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      selectedTag="all"
      onTagChange={jest.fn()}
      sortKey="newest"
      onSortChange={jest.fn()}
      searchInputRef={searchInputRef}
      cardsContainerRef={cardsContainerRef}
    />
  );
};

describe("BookmarkList", () => {
  afterEach(() => {
    mockUseBookmarks.mockReset();
  });

  it("shows empty state when no bookmarks", () => {
    mockUseBookmarks.mockReturnValue({
      bookmarks: [],
      allBookmarks: [],
      deleteBookmark: jest.fn(),
      updateBookmark: jest.fn(),
      errorMessage: null,
      clearError: jest.fn(),
      pendingAdds: new Set<string>(),
      pendingDeletes: new Set<string>(),
      simulateError: false,
      setSimulateError: jest.fn(),
    });

    render(
      <BookmarkList
        searchQuery={""}
        onSearchChange={jest.fn()}
        selectedTag="all"
        onTagChange={jest.fn()}
        sortKey="newest"
        onSortChange={jest.fn()}
        searchInputRef={createRef<HTMLInputElement | null>()}
        cardsContainerRef={createRef<HTMLDivElement | null>()}
      />
    );

    expect(screen.getByText("No bookmarks yet")).toBeInTheDocument();
  });

  it("renders correct number of bookmark cards", () => {
    mockUseBookmarks.mockReturnValue(createReturn(bookmarks));

    const { container } = render(
      <BookmarkList
        searchQuery={""}
        onSearchChange={jest.fn()}
        selectedTag="all"
        onTagChange={jest.fn()}
        sortKey="newest"
        onSortChange={jest.fn()}
        searchInputRef={createRef<HTMLInputElement | null>()}
        cardsContainerRef={createRef<HTMLDivElement | null>()}
      />
    );

    expect(container.querySelectorAll("[data-bookmark-card='true']")).toHaveLength(
      2
    );
  });

  it("filters displayed bookmarks via search input", async () => {
    mockUseBookmarks.mockImplementation((searchTerm?: string) => {
      const query = (searchTerm ?? "").toLowerCase();
      const filtered = bookmarks.filter((bookmark) =>
        [bookmark.title, bookmark.url, bookmark.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
      return createReturn(filtered);
    });

    const user = userEvent.setup();
    const { container } = render(<Harness />);

    expect(container.querySelectorAll("[data-bookmark-card='true']")).toHaveLength(
      2
    );

    await user.type(screen.getByPlaceholderText("Search by title, URL, tags"), "Next");

    expect(container.querySelectorAll("[data-bookmark-card='true']")).toHaveLength(
      1
    );
    expect(screen.getByText("Next.js Docs")).toBeInTheDocument();
  });
});
