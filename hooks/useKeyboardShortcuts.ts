"use client";

import { useEffect } from "react";

interface KeyboardShortcutOptions {
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  cardsContainerRef: React.RefObject<HTMLDivElement | null>;
  onClearForm: () => void;
  onClearSearch: () => void;
}

const getColumnsCount = (container: HTMLElement) => {
  const template = window.getComputedStyle(container).gridTemplateColumns;
  if (!template || template === "none") {
    return 1;
  }

  const repeatMatch = template.match(/repeat\((\d+),/);
  if (repeatMatch) {
    return Number(repeatMatch[1]);
  }

  const columns = template.split(" ").filter(Boolean);
  return Math.max(columns.length, 1);
};

export function useKeyboardShortcuts({
  titleInputRef,
  searchInputRef,
  cardsContainerRef,
  onClearForm,
  onClearSearch,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key ? event.key.toLowerCase() : "";
      const isModifier = event.metaKey || event.ctrlKey;

      if (isModifier && key === "n") {
        event.preventDefault();
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
        return;
      }

      if (isModifier && key === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (key === "escape") {
        onClearForm();
        onClearSearch();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      if (!key.startsWith("arrow")) {
        return;
      }

      const cardsContainer = cardsContainerRef.current;
      if (!cardsContainer) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        ["input", "textarea", "select"].includes(activeElement.tagName.toLowerCase())
      ) {
        return;
      }

      const cards = Array.from(
        cardsContainer.querySelectorAll<HTMLElement>("[data-bookmark-card=\"true\"]")
      );

      if (cards.length === 0) {
        return;
      }

      const activeCard = activeElement?.closest(
        "[data-bookmark-card=\"true\"]"
      ) as HTMLElement | null;

      if (!activeCard) {
        return;
      }

      const currentIndex = cards.indexOf(activeCard);
      if (currentIndex < 0) {
        return;
      }

      const columns = getColumnsCount(cardsContainer);
      let nextIndex = currentIndex;

      switch (key) {
        case "arrowright":
          nextIndex = Math.min(currentIndex + 1, cards.length - 1);
          break;
        case "arrowleft":
          nextIndex = Math.max(currentIndex - 1, 0);
          break;
        case "arrowdown":
          nextIndex = Math.min(currentIndex + columns, cards.length - 1);
          break;
        case "arrowup":
          nextIndex = Math.max(currentIndex - columns, 0);
          break;
        default:
          return;
      }

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        const nextCard = cards[nextIndex];
        nextCard?.focus();
        if (typeof nextCard?.scrollIntoView === "function") {
          nextCard.scrollIntoView({ block: "nearest" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cardsContainerRef,
    onClearForm,
    onClearSearch,
    searchInputRef,
    titleInputRef,
  ]);
}
