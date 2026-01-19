import { useCallback, useRef, useState } from "react";
import { CreateBookmarkSchema, type CreateBookmarkInput } from "@/lib/validation";
import { Bookmark, BookmarkColor } from "@/lib/types";
import { useBookmarks } from "@/hooks/useBookmarks";

export interface BookmarkFormState {
  title: string;
  url: string;
  description: string;
  tags: string;
  color: string;
}

export interface BookmarkFormErrors {
  title?: string;
  url?: string;
  description?: string;
  tags?: string;
  color?: string;
}

type BookmarkFormMode = "create" | "edit";

const buildInitialState = (
  bookmark?: Bookmark | null
): BookmarkFormState => ({
  title: bookmark?.title ?? "",
  url: bookmark?.url ?? "",
  description: bookmark?.description ?? "",
  tags: bookmark?.tags?.join(", ") ?? "",
  color: bookmark?.color ?? "",
});

// Order of fields for validation focus
const fieldOrder: (keyof BookmarkFormState)[] = ["title", "url", "description", "tags", "color"];

export function useBookmarkForm(options?: {
  mode?: BookmarkFormMode;
  initialBookmark?: Bookmark | null;
  onSuccess?: (bookmark: CreateBookmarkInput) => void;
}) {
  const { addBookmark, updateBookmark, isLoading, errorMessage, clearError } =
    useBookmarks();
  const [form, setForm] = useState<BookmarkFormState>(() =>
    buildInitialState(options?.initialBookmark)
  );
  const [errors, setErrors] = useState<BookmarkFormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);
  const fieldRefs = useRef<Partial<Record<keyof BookmarkFormState, HTMLInputElement>>>({});

  const resetForm = useCallback(
    (bookmark?: Bookmark | null) => {
      setForm(buildInitialState(bookmark ?? options?.initialBookmark));
      setErrors({});
      setShowSuccess(false);
      if (errorMessage) {
        clearError();
      }
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    },
    [clearError, errorMessage, options?.initialBookmark]
  );

  const clearForm = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof BookmarkFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errorMessage) {
      clearError();
    }
    if (showSuccess) {
      setShowSuccess(false);
    }
  };

  // Register field ref for focus management
  const registerField = useCallback((fieldName: keyof BookmarkFormState, element: HTMLInputElement | null) => {
    if (element) {
      fieldRefs.current[fieldName] = element;
    }
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowSuccess(false);
    if (errorMessage) {
      clearError();
    }

    const tagsArray = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const bookmarkData = {
      title: form.title,
      url: form.url,
      description: form.description || undefined,
      tags: tagsArray,
      color: form.color ? (form.color as BookmarkColor) : undefined,
    };

    const result = CreateBookmarkSchema.safeParse(bookmarkData);

    if (!result.success) {
      const fieldErrors: BookmarkFormErrors = {};
      const firstErrorField: keyof BookmarkFormState | undefined = undefined;

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof BookmarkFormErrors;
        fieldErrors[field] = issue.message;
      });

      setErrors(fieldErrors);

      // Focus first invalid field
      for (const field of fieldOrder) {
        if (fieldErrors[field] && fieldRefs.current[field]) {
          fieldRefs.current[field]?.focus();
          fieldRefs.current[field]?.select();
          break;
        }
      }
      return;
    }

    if (options?.mode === "edit" && options.initialBookmark) {
      const updateResult = updateBookmark({
        ...options.initialBookmark,
        ...result.data,
      });
      if (!updateResult.success) {
        return;
      }
    } else {
      const addResult = addBookmark(result.data);
      if (!addResult.success) {
        return;
      }
    }

    options?.onSuccess?.(result.data);

    resetForm();
    setShowSuccess(true);

    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }

    successTimeoutRef.current = window.setTimeout(() => {
      setShowSuccess(false);
      successTimeoutRef.current = null;
    }, 2000);
  };

  // Check if form is currently valid (no errors, required fields filled)
  const isValid = Boolean(
    form.title.trim() &&
    form.url.trim() &&
    Object.keys(errors).length === 0
  );

  return {
    form,
    errors,
    isLoading,
    showSuccess,
    errorMessage,
    isValid,
    clearForm,
    resetForm,
    handleChange,
    handleSubmit,
    registerField,
  };
}
