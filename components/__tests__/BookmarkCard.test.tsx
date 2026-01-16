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

  it("calls onDelete with correct id", async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();

    render(
      <BookmarkCard
        bookmark={bookmark}
        onDelete={onDelete}
        onEdit={jest.fn()}
        isPendingAdd={false}
        isPendingDelete={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith(bookmark);
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
