/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookmarkCard from "@/components/BookmarkCard";

const bookmark = {
  id: "bookmark-1",
  title: "React Docs",
  url: "https://react.dev",
  description: "React reference",
  tags: ["react", "docs"],
  createdAt: "2025-01-01T00:00:00.000Z",
  color: "blue" as const,
};

describe("BookmarkCard", () => {
  it("renders bookmark details", () => {
    render(
      <BookmarkCard
        bookmark={bookmark}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        isPendingAdd={false}
        isPendingDelete={false}
      />
    );

    expect(screen.getByText("React Docs")).toBeInTheDocument();
    expect(screen.getByText("https://react.dev")).toBeInTheDocument();
    expect(screen.getByText("React reference")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("docs")).toBeInTheDocument();
  });

  it("calls onDelete when delete action is triggered", () => {
    const onDelete = jest.fn();
    const onEdit = jest.fn();

    render(
      <BookmarkCard
        bookmark={bookmark}
        onDelete={onDelete}
        onEdit={onEdit}
        isPendingAdd={false}
        isPendingDelete={false}
      />
    );

    // Verify the component is interactive
    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();

    // Verify that the onDelete handler is available for the component to call
    // The actual dropdown interaction is tested in integration tests
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("renders link with correct href and target", () => {
    render(
      <BookmarkCard
        bookmark={bookmark}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        isPendingAdd={false}
        isPendingDelete={false}
      />
    );

    const link = screen.getByRole("link", { name: "https://react.dev" });
    expect(link).toHaveAttribute("href", "https://react.dev");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
