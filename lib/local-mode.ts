"use client";

import { useEffect, useState } from "react";

export const LOCAL_MODE_KEY = "simple-bookmark:local-mode";

export function setLocalMode() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_MODE_KEY, "true");
}

export function clearLocalMode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_MODE_KEY);
}

export function isLocalMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LOCAL_MODE_KEY) === "true";
}

export function useLocalMode() {
  const [localMode, setLocalModeState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocalModeState(isLocalMode());
    setHydrated(true);
  }, []);

  return { localMode, hydrated };
}
