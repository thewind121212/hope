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
  const baseClasses =
    "w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const borderClass = error ? "border-red-500" : "border-gray-300";

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        className={`${baseClasses} ${borderClass}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
