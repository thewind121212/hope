/**
 * @jest-environment jsdom
 */
import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

import {
  addPinnedView,
  deletePinnedView,
  getPinnedViews,
  updatePinnedView,
  __resetCacheForTesting as resetViewCache,
} from "@voc/lib/pinnedViewsStorage";

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

describe("pinnedViewsStorage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorageMock(),
      writable: true,
    });

    (uuidv4 as jest.Mock).mockReset().mockReturnValue("view-id");

    resetViewCache();
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
    resetViewCache();
  });

  it("returns empty list initially", () => {
    expect(getPinnedViews()).toEqual([]);
  });

  it("adds pinned view with defaults", () => {
    const created = addPinnedView({ spaceId: "personal", name: "My View" });

    expect(created.spaceId).toBe("personal");
    expect(created.searchQuery).toBe("");
    expect(created.tag).toBe("all");
    expect(created.sortKey).toBe("newest");

    // Advance timers for debounced checksum recalculation
    jest.advanceTimersByTime(500);

    expect(getPinnedViews("personal")).toHaveLength(1);
  });

  it("updates pinned view", () => {
    const created = addPinnedView({ spaceId: "personal", name: "My View" });

    // Advance timers for debounced checksum from addPinnedView
    jest.advanceTimersByTime(500);

    const updated = updatePinnedView({ ...created, name: "Renamed" });

    // Advance timers for debounced checksum from updatePinnedView
    jest.advanceTimersByTime(500);

    expect(updated?.name).toBe("Renamed");
    expect(getPinnedViews("personal")[0]?.name).toBe("Renamed");
  });

  it("deletes pinned view", () => {
    const created = addPinnedView({ spaceId: "personal", name: "My View" });

    // Advance timers for debounced checksum from addPinnedView
    jest.advanceTimersByTime(500);

    expect(deletePinnedView(created.id)).toBe(true);

    // Advance timers for debounced checksum from deletePinnedView
    jest.advanceTimersByTime(500);

    expect(getPinnedViews("personal")).toHaveLength(0);
  });
});
