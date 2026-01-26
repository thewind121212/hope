import { v4 as uuidv4 } from "uuid";
import type { Space } from "@voc/lib/types";
import { debouncedRecalculateChecksumExport } from "@/lib/storage";

const SPACES_KEY = "bookmark-vault-spaces";

// ============================================================================
// IN-MEMORY CACHE TO AVOID REPEATED LOCALSTORAGE PARSING
// ============================================================================
let spaceCache: Space[] | null = null;

export function invalidateSpaceCache(): void {
  spaceCache = null;
}

export const PERSONAL_SPACE_ID = "personal";

export function getDefaultPersonalSpace(): Space {
  return {
    id: PERSONAL_SPACE_ID,
    name: "Personal",
    createdAt: new Date().toISOString(),
  };
}

function safeParseSpaces(raw: string | null): Space[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Space => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Space;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        typeof candidate.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

function loadSpaces(): Space[] {
  if (typeof window === "undefined") return [];

  // Return cached spaces if available
  if (spaceCache !== null) {
    // Return a COPY to prevent mutations of cached array
    return Array.from(spaceCache);
  }

  // Parse from localStorage and cache the result
  const parsed = safeParseSpaces(localStorage.getItem(SPACES_KEY));
  spaceCache = parsed;
  // Return a COPY to prevent mutations of cached array
  return Array.from(parsed);
}

function saveSpaces(spaces: Space[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(SPACES_KEY, JSON.stringify(spaces));
    // Store a COPY in cache, not the caller's reference (defensive against mutations)
    spaceCache = Array.from(spaces);
    return true;
  } catch {
    return false;
  }
}

export function setSpaces(spaces: Space[]): boolean {
  const saved = saveSpaces(spaces);
  debouncedRecalculateChecksumExport();
  return saved;
}

export function ensureDefaultSpace(): Space {
  const spaces = loadSpaces();
  const existing = spaces.find((space) => space.id === PERSONAL_SPACE_ID);
  if (existing) return existing;

  const personal = getDefaultPersonalSpace();
  saveSpaces([personal, ...spaces]);
  debouncedRecalculateChecksumExport();
  return personal;
}

export function getSpaces(): Space[] {
  const spaces = loadSpaces();
  const personal = spaces.find((space) => space.id === PERSONAL_SPACE_ID);
  if (personal) return spaces;

  const defaultSpace = getDefaultPersonalSpace();
  saveSpaces([defaultSpace, ...spaces]);
  debouncedRecalculateChecksumExport();
  return [defaultSpace, ...spaces];
}

export function addSpace(input: { name: string; color?: string }): Space {
  const name = input.name.trim();
  const newSpace: Space = {
    id: uuidv4(),
    name,
    color: input.color,
    createdAt: new Date().toISOString(),
  };

  const spaces = getSpaces();
  saveSpaces([...spaces, newSpace]);
  debouncedRecalculateChecksumExport();
  return newSpace;
}

export function updateSpace(space: Space): Space | null {
  if (space.id === PERSONAL_SPACE_ID) {
    const spaces = getSpaces();
    const updated = spaces.map((item) =>
      item.id === PERSONAL_SPACE_ID
        ? { ...item, name: space.name, color: space.color }
        : item
    );
    const saved = saveSpaces(updated);
    debouncedRecalculateChecksumExport();
    return saved ? space : null;
  }

  const spaces = getSpaces();
  const updated = spaces.map((item) => (item.id === space.id ? space : item));
  const saved = saveSpaces(updated);
  debouncedRecalculateChecksumExport();
  return saved ? space : null;
}

export function deleteSpace(spaceId: string): boolean {
  if (spaceId === PERSONAL_SPACE_ID) return false;
  const spaces = getSpaces();
  const filtered = spaces.filter((space) => space.id !== spaceId);
  const saved = saveSpaces(filtered);
  debouncedRecalculateChecksumExport();
  return saved;
}

// ============================================================================
// TEST UTILITIES
// ============================================================================
export function __resetCacheForTesting(): void {
  spaceCache = null;
}
