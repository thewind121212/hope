"use client";

import { Component, type ReactNode } from "react";
import ErrorFallback from "@/components/ErrorFallback";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  shouldThrow: boolean;
}

const DevThrowError = () => {
  throw new Error("Dev error trigger");
};

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    shouldThrow: false,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, shouldThrow: false };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, shouldThrow: false });
  };

  handleThrowError = () => {
    this.setState({ hasError: false, error: null, shouldThrow: true });
  };

  render() {
    const { hasError, error, shouldThrow } = this.state;
    const showDevTools = process.env.NODE_ENV !== "production";

    if (shouldThrow) {
      return <DevThrowError />;
    }

    if (hasError) {
      return (
        <ErrorFallback
          message={
            error?.message || "Something went wrong. Please try again shortly."
          }
          onRetry={this.handleRetry}
          onThrowError={showDevTools ? this.handleThrowError : undefined}
          showDevTools={showDevTools}
        />
      );
    }

    return this.props.children;
  }
}
