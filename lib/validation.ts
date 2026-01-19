import { z } from 'zod';
import { BOOKMARK_COLORS } from './types';

/**
 * Custom URL validation with helpful error messages
 * Supports common protocols: http, https, mailto, ftp, etc.
 */
const urlSchema = z.string().refine(
  (value) => {
    try {
      const url = new URL(value);
      // Check for valid protocol
      return ['http:', 'https:', 'mailto:', 'ftp:', 'ftps:', 'file:'].includes(url.protocol);
    } catch {
      return false;
    }
  },
  {
    message: 'Please enter a valid URL (e.g., https://example.com)',
  }
);

/**
 * Enhanced title validation with helpful error message
 */
const titleSchema = z.string().min(1, {
  message: 'Title is required',
}).max(200, {
  message: 'Title must be less than 200 characters',
}).trim();

/**
 * Tags validation with reasonable limits
 */
const tagsSchema = z.array(z.string().min(1).max(50)).max(20, {
  message: 'Cannot have more than 20 tags',
});

/**
 * Color validation - must be one of the predefined colors
 */
const colorSchema = z.enum(BOOKMARK_COLORS, {
  errorMap: () => ({ message: 'Invalid color selected' }),
});

/**
 * Full bookmark schema (with id and createdAt)
 */
export const BookmarkSchema = z.object({
  id: z.string().uuid(),
  title: titleSchema,
  url: urlSchema,
  description: z.string().max(500, {
    message: 'Description must be less than 500 characters',
  }).optional(),
  tags: tagsSchema,
  color: colorSchema.optional(),
  createdAt: z.string().datetime(),
});

/**
 * Schema for creating new bookmarks (without id and createdAt)
 */
export const CreateBookmarkSchema = BookmarkSchema.omit({
  id: true,
  createdAt: true,
});

/**
 * Schema for updating existing bookmarks
 */
export const UpdateBookmarkSchema = BookmarkSchema.partial().extend({
  id: z.string().uuid(),
});

/**
 * Schema for importing bookmarks
 */
export const ImportBookmarksSchema = z.array(BookmarkSchema);

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkSchema>;
export type ImportBookmarksInput = z.infer<typeof ImportBookmarksSchema>;
