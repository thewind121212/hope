/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

import { getBookmarks, setBookmarks, __resetCacheForTesting as resetBookmarkCache } from "@voc/lib/storage";
import { getSpaces, PERSONAL_SPACE_ID, __resetCacheForTesting as resetSpaceCache } from "@voc/lib/spacesStorage";
import { runSpacesMigration } from "@voc/lib/spacesMigration";

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

const fixedDate = new Date("2026-01-19T00:00:00.000Z");

describe("spacesMigration", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorageMock(),
      writable: true,
    });

    (uuidv4 as jest.Mock).mockReset().mockReturnValue("id");

    resetBookmarkCache();
    resetSpaceCache();
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
    resetBookmarkCache();
    resetSpaceCache();
  });

  it("creates Personal space when missing", () => {
    runSpacesMigration();
    expect(getSpaces().some((s) => s.id === PERSONAL_SPACE_ID)).toBe(true);
  });

  it("assigns missing spaceId to existing bookmarks", () => {
    setBookmarks([
      {
        id: "b1",
        title: "React",
        url: "https://react.dev",
        tags: ["react"],
        createdAt: fixedDate.toISOString(),
      },
    ]);

    runSpacesMigration();

    const bookmarks = getBookmarks();
    expect(bookmarks[0]?.spaceId).toBe(PERSONAL_SPACE_ID);
  });

  it("does not rewrite bookmarks when all have spaceId", () => {
    setBookmarks([
      {
        id: "b1",
        title: "React",
        url: "https://react.dev",
        tags: ["react"],
        createdAt: fixedDate.toISOString(),
        spaceId: PERSONAL_SPACE_ID,
      },
    ]);

    const before = getBookmarks();
    runSpacesMigration();
    const after = getBookmarks();

    expect(after).toEqual(before);
  });
});
