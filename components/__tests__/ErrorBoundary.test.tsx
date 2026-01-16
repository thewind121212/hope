import { render, fireEvent } from "@testing-library/react";
import ErrorBoundary from "@/components/ErrorBoundary";

let shouldThrow = false;

const ProblemChild = () => {
  if (shouldThrow) {
    throw new Error("Boom");
  }
  return <div>Safe content</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = false;
  });

  it("renders fallback and retries", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    shouldThrow = true;

    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(getByText("Something went wrong")).toBeInTheDocument();
    expect(getByText("Boom")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(getByText("Try again"));

    expect(queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(getByText("Safe content")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("renders children when no error", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(getByText("Safe content")).toBeInTheDocument();
  });
});
