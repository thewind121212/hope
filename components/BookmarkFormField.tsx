import type { Ref } from "react";

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
  const baseClasses =
    "w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const borderClass = error ? "border-red-500" : "border-gray-300";

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required ? " *" : ""}
      </label>
      {as === "textarea" ? (
        <textarea
          ref={inputRef as Ref<HTMLTextAreaElement>}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          className={`${baseClasses} ${borderClass}`}
          placeholder={placeholder}
        />
      ) : (
        <input
          ref={inputRef as Ref<HTMLInputElement>}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          type={type}
          required={required}
          className={`${baseClasses} ${borderClass}`}
          placeholder={placeholder}
        />
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
