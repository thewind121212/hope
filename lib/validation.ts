import { z } from 'zod';
import { BOOKMARK_COLORS } from './types';

export const BookmarkSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
  tags: z.array(z.string()),
  color: z.enum(BOOKMARK_COLORS).optional(),
  createdAt: z.string().datetime(),
});

export const CreateBookmarkSchema = BookmarkSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;
