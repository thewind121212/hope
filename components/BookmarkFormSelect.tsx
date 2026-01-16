import Select from "@/components/ui/Select";

interface SelectOption {
  value: string;
  label: string;
}

interface BookmarkFormSelectProps {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

export default function BookmarkFormSelect({
  id,
  label,
  name,
  value,
  onChange,
  options,
  error,
  placeholder = "Select an option",
}: BookmarkFormSelectProps) {
  return (
    <Select
      id={id}
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      options={[{ value: "", label: placeholder }, ...options]}
      error={error}
    />
  );
}
