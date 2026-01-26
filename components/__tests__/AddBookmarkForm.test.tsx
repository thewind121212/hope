/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

import { createRef, type MutableRefObject } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddBookmarkForm from "@/components/AddBookmarkForm";
import { useBookmarks } from "@/hooks/useBookmarks";

jest.mock("@/hooks/useBookmarks", () => ({
  useBookmarks: jest.fn(),
}));

const mockUseBookmarks = useBookmarks as jest.Mock;

const createMocks = () => {
  const addBookmark = jest.fn(() => ({
    success: true,
    bookmark: {
      id: "bookmark-id",
      title: "Stored",
      url: "https://stored.com",
      description: "Stored",
      tags: [],
      createdAt: "2025-01-01T00:00:00.000Z",
    },
  }));

  mockUseBookmarks.mockReturnValue({
    addBookmark,
    updateBookmark: jest.fn(),
    isLoading: false,
    errorMessage: null,
    clearError: jest.fn(),
  });

  return { addBookmark };
};

const renderForm = () => {
  const titleInputRef = createRef<HTMLInputElement | null>();
  const clearFormRef = {
    current: null,
  } as MutableRefObject<(() => void) | null>;

  return render(
    <AddBookmarkForm titleInputRef={titleInputRef} clearFormRef={clearFormRef} />
  );
};

describe("AddBookmarkForm", () => {
  beforeEach(() => {
    createMocks();
  });

  it("renders all form fields", () => {
    renderForm();

    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tags/i)).toBeInTheDocument();
  });

  it("shows validation error when submitting empty form", async () => {
    renderForm();

    const form = screen.getByRole("button", { name: "Add Bookmark" }).closest("form");
    if (!form) {
      throw new Error("Form not found");
    }

    fireEvent.submit(form);

    expect(
      await screen.findByText("Too small: expected string to have >=1 characters")
    ).toBeInTheDocument();
    expect(await screen.findByText("Invalid URL")).toBeInTheDocument();
  });

  it("shows validation error for invalid URL format", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/Title/i), "React Docs");
    await user.type(screen.getByLabelText(/URL/i), "not-a-url");
    await user.click(screen.getByRole("button", { name: "Add Bookmark" }));

    expect(await screen.findByText("Invalid URL")).toBeInTheDocument();
  });

  it("calls onBookmarkAdded with correct data on valid submit", async () => {
    const user = userEvent.setup();
    const onBookmarkAdded = jest.fn();
    const titleInputRef = createRef<HTMLInputElement | null>();
    const clearFormRef = {
      current: null,
    } as MutableRefObject<(() => void) | null>;

    render(
      <AddBookmarkForm
        titleInputRef={titleInputRef}
        clearFormRef={clearFormRef}
        onBookmarkAdded={onBookmarkAdded}
      />
    );

    await user.type(screen.getByLabelText(/Title/i), "React Docs");
    await user.type(screen.getByLabelText(/URL/i), "https://react.dev");
    await user.type(screen.getByLabelText(/Description/i), "React reference");
    await user.type(screen.getByLabelText(/Tags/i), "react, docs");
    await user.click(screen.getByRole("button", { name: "Add Bookmark" }));

    expect(onBookmarkAdded).toHaveBeenCalledWith({
      title: "React Docs",
      url: "https://react.dev",
      description: "React reference",
      tags: ["react", "docs"],
      color: undefined,
    });
  });

  it("clears form fields after successful submit", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/Title/i), "React Docs");
    await user.type(screen.getByLabelText(/URL/i), "https://react.dev");
    await user.type(screen.getByLabelText(/Description/i), "React reference");
    await user.type(screen.getByLabelText(/Tags/i), "react, docs");
    await user.click(screen.getByRole("button", { name: "Add Bookmark" }));

    expect(screen.getByLabelText(/Title/i)).toHaveValue("");
    expect(screen.getByLabelText(/URL/i)).toHaveValue("");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("");
    expect(screen.getByLabelText(/Tags/i)).toHaveValue("");
  });
});
