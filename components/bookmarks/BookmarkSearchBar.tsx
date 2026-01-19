"use client";

import Input from "@/components/ui/Input";

interface BookmarkSearchBarProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef?: React.MutableRefObject<HTMLInputElement | null | undefined>;
}

export default function BookmarkSearchBar({
  value,
  onChange,
  inputRef,
}: BookmarkSearchBarProps) {
  return (
    <Input
      ref={inputRef as React.LegacyRef<HTMLInputElement>}
      label="Search"
      value={value}
      onChange={onChange}
      placeholder="Search by title, URL, tags"
    />
  );
}
