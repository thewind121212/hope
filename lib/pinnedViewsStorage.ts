import { v4 as uuidv4 } from "uuid";
import type { PinnedView } from "@voc/lib/types";

const PINNED_VIEWS_KEY = "bookmark-vault-pinned-views";

function safeParsePinnedViews(raw: string | null): PinnedView[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is PinnedView => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as PinnedView;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.spaceId === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.searchQuery === "string" &&
        typeof candidate.tag === "string" &&
        typeof candidate.sortKey === "string" &&
        typeof candidate.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function loadPinnedViews(): PinnedView[] {
  if (typeof window === "undefined") return [];
  return safeParsePinnedViews(localStorage.getItem(PINNED_VIEWS_KEY));
}

export function savePinnedViews(views: PinnedView[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(PINNED_VIEWS_KEY, JSON.stringify(views));
    return true;
  } catch {
    return false;
  }
}

export function getPinnedViews(spaceId?: string): PinnedView[] {
  const all = loadPinnedViews();
  if (!spaceId) return all;
  return all.filter((view) => view.spaceId === spaceId);
}

export function addPinnedView(input: {
  spaceId: string;
  name: string;
  searchQuery?: string;
  tag?: string;
  sortKey?: PinnedView["sortKey"];
}): PinnedView {
  const view: PinnedView = {
    id: uuidv4(),
    spaceId: input.spaceId,
    name: input.name.trim(),
    searchQuery: input.searchQuery ?? "",
    tag: input.tag ?? "all",
    sortKey: input.sortKey ?? "newest",
    createdAt: new Date().toISOString(),
  };

  const existing = loadPinnedViews();
  savePinnedViews([...existing, view]);
  return view;
}

export function deletePinnedView(id: string): boolean {
  const existing = loadPinnedViews();
  const filtered = existing.filter((view) => view.id !== id);
  return savePinnedViews(filtered);
}

export function updatePinnedView(next: PinnedView): PinnedView | null {
  const existing = loadPinnedViews();
  const updated = existing.map((view) => (view.id === next.id ? next : view));
  return savePinnedViews(updated) ? next : null;
}
