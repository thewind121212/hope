"use client";

import { getBookmarks } from "@/lib/storage";

const formatDate = (date: Date) => date.toISOString().split("T")[0];

export default function ExportButton() {
  const handleExport = () => {
    const bookmarks = getBookmarks();
    const json = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookmarks-${formatDate(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
    >
      Export
    </button>
  );
}
