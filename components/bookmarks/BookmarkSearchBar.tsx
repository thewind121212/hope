"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface BookmarkSearchBarProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function BookmarkSearchBar({
  value,
  onChange,
  onClear,
  inputRef,
}: BookmarkSearchBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input
        ref={inputRef}
        label="Search"
        value={value}
        onChange={onChange}
        placeholder="Search by title, URL, tags"
        containerClassName="flex-1 min-w-[220px]"
      />
      <Button
        type="button"
        variant="secondary"
        onClick={onClear}
        disabled={!value}
      >
        Clear
      </Button>
    </div>
  );
}
