import type { Ref } from "react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

interface BookmarkFormFieldProps {
  id: string;
  label: string;
  name: string;
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
}: BookmarkFormFieldProps) {
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
        ref={inputRef as Ref<HTMLTextAreaElement>}
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
      ref={inputRef as Ref<HTMLInputElement>}
    />
  );
}
