"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-white p-6 text-center font-sans">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">Application Error</h1>
          <p className="mt-2 text-sm text-gray-600">
            A critical system error occurred. Please refresh the page or try again in a few moments.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
