import { BOOKMARK_COLORS } from "@/lib/types";
import BookmarkFormField from "@/components/BookmarkFormField";
import BookmarkFormSelect from "@/components/BookmarkFormSelect";
import TagInput from "@/components/bookmarks/TagInput";
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
  titleInputRef?: React.Ref<HTMLInputElement>;
  registerField?: (fieldName: keyof BookmarkFormState, element: HTMLInputElement | null) => void;
  spaceOptions: { value: string; label: string }[];
  tagSuggestions: string[];
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
  registerField,
  spaceOptions,
  tagSuggestions,
}: BookmarkFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        registerField={registerField}
        containerClassName="sm:col-span-2"
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
        registerField={registerField}
        containerClassName="sm:col-span-2"
      />

      <BookmarkFormSelect
        id="spaceId"
        name="spaceId"
        label="Space"
        value={form.spaceId}
        onChange={onChange}
        options={spaceOptions}
        error={errors.spaceId}
        placeholder="Select space"
        containerClassName="sm:col-span-1"
      />

      <TagInput
        id="tags"
        name="tags"
        label="Tags"
        value={form.tags}
        onChangeValue={(next) =>
          onChange({
            target: { name: "tags", value: next },
          } as unknown as React.ChangeEvent<HTMLInputElement>)
        }
        error={errors.tags}
        suggestions={tagSuggestions}
        registerField={registerField}
        containerClassName="sm:col-span-1"
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
        registerField={registerField}
        containerClassName="sm:col-span-2"
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
        containerClassName="sm:col-span-2"
      />
    </div>
  );
}
