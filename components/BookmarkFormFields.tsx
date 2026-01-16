import { BOOKMARK_COLORS } from "@/lib/types";
import BookmarkFormField from "@/components/BookmarkFormField";
import BookmarkFormSelect from "@/components/BookmarkFormSelect";
import type {
  BookmarkFormErrors,
  BookmarkFormState,
} from "@/hooks/useBookmarkForm";

interface BookmarkFormFieldsProps {
  form: BookmarkFormState;
  errors: BookmarkFormErrors;
  onChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
}

const colorOptions = BOOKMARK_COLORS.map((color) => ({
  value: color,
  label: color.charAt(0).toUpperCase() + color.slice(1),
}));

export default function BookmarkFormFields({
  form,
  errors,
  onChange,
  titleInputRef,
}: BookmarkFormFieldsProps) {
  return (
    <>
      <BookmarkFormField
        id="title"
        name="title"
        label="Title"
        required
        value={form.title}
        onChange={onChange}
        error={errors.title}
        placeholder="Enter bookmark title"
        inputRef={titleInputRef}
      />

      <BookmarkFormField
        id="url"
        name="url"
        label="URL"
        required
        value={form.url}
        onChange={onChange}
        error={errors.url}
        placeholder="https://example.com"
      />

      <BookmarkFormField
        id="description"
        name="description"
        label="Description"
        as="textarea"
        value={form.description}
        onChange={onChange}
        error={errors.description}
        placeholder="Optional description"
      />

      <BookmarkFormField
        id="tags"
        name="tags"
        label="Tags"
        value={form.tags}
        onChange={onChange}
        error={errors.tags}
        placeholder="react, javascript, tutorial (comma-separated)"
      />

      <BookmarkFormSelect
        id="color"
        name="color"
        label="Color Label"
        value={form.color}
        onChange={onChange}
        options={colorOptions}
        error={errors.color}
        placeholder="No color"
      />
    </>
  );
}
