import { Bookmark } from "@/lib/types";

interface ImportPreviewProps {
  bookmarks: Bookmark[];
  totalCount: number;
  invalidCount: number;
}

export default function ImportPreview({
  bookmarks,
  totalCount,
  invalidCount,
}: ImportPreviewProps) {
  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-3 text-sm">
      <div className="flex flex-wrap gap-4 text-gray-600">
        <span>Total valid: {totalCount}</span>
        {invalidCount > 0 && <span>Invalid skipped: {invalidCount}</span>}
      </div>
      <ul className="space-y-1">
        {bookmarks.map((bookmark) => (
          <li key={bookmark.id} className="text-gray-700">
            <span className="font-medium">{bookmark.title}</span> — {bookmark.url}
          </li>
        ))}
      </ul>
    </div>
  );
}
