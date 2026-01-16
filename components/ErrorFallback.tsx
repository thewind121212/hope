"use client";

interface ErrorFallbackProps {
  message: string;
  onRetry: () => void;
  onThrowError?: () => void;
  showDevTools?: boolean;
}

export default function ErrorFallback({
  message,
  onRetry,
  onThrowError,
  showDevTools = false,
}: ErrorFallbackProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4 text-center">
      <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-600">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        {showDevTools && onThrowError && (
          <button
            type="button"
            onClick={onThrowError}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Throw error
          </button>
        )}
      </div>
    </div>
  );
}
