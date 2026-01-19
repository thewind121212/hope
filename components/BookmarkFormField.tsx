import type { Ref } from "react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import type { BookmarkFormState } from "@/hooks/useBookmarkForm";

interface BookmarkFormFieldProps {
  id: string;
  label: string;
  name: keyof BookmarkFormState;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  as?: "input" | "textarea";
  type?: string;
  rows?: number;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  registerField?: (fieldName: keyof BookmarkFormState, element: HTMLInputElement | null) => void;
}

export default function BookmarkFormField({
  id,
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  required,
  as = "input",
  type = "text",
  rows = 3,
  inputRef,
  registerField,
}: BookmarkFormFieldProps) {
  const handleRef = (element: HTMLInputElement | HTMLTextAreaElement | null) => {
    // Register with useBookmarkForm for focus management
    if (registerField && element instanceof HTMLInputElement) {
      registerField(name, element);
    }
    // Forward the ref if provided
    if (typeof inputRef === "function") {
      inputRef(element);
    } else if (inputRef && "current" in inputRef) {
      (inputRef as React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>).current = element;
    }
  };

  if (as === "textarea") {
    return (
      <Textarea
        id={id}
        name={name}
        label={label}
        error={error}
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        ref={handleRef as Ref<HTMLTextAreaElement>}
      />
    );
  }

  return (
    <Input
      id={id}
      name={name}
      label={label}
      error={error}
      value={value}
      onChange={onChange}
      type={type}
      required={required}
      placeholder={placeholder}
      ref={handleRef as Ref<HTMLInputElement>}
    />
  );
}
