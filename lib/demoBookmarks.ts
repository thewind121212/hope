import type { Bookmark } from './types';

/**
 * Demo bookmarks for first-time users
 * These showcase the app's capabilities with diverse examples
 */
export const demoBookmarks: Omit<Bookmark, 'id' | 'createdAt'>[] = [
  {
    title: 'GitHub',
    url: 'https://github.com',
    description: 'Where the world builds software. Host and review code, manage projects, and build software.',
    tags: ['development', 'tools', 'git'],
    color: 'blue',
  },
  {
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    description: 'Resources for developers, by developers. Documentation for web technologies.',
    tags: ['documentation', 'reference', 'web'],
    color: 'purple',
  },
  {
    title: 'React Documentation',
    url: 'https://react.dev',
    description: 'The library for web and native user interfaces. Learn React with modern docs.',
    tags: ['react', 'javascript', 'frontend'],
    color: 'blue',
  },
  {
    title: 'TailwindCSS',
    url: 'https://tailwindcss.com',
    description: 'Rapidly build modern websites without ever leaving your HTML. Utility-first CSS framework.',
    tags: ['css', 'styling', 'framework'],
    color: 'cyan',
  },
  {
    title: 'TypeScript Handbook',
    url: 'https://www.typescriptlang.org/docs/',
    description: 'The TypeScript Handbook is a comprehensive guide to the TypeScript language.',
    tags: ['typescript', 'documentation', 'javascript'],
    color: 'blue',
  },
];

/**
 * Get demo bookmarks ready for import
 * Adds IDs and createdAt timestamps
 */
export function getDemoBookmarksWithIds(): Bookmark[] {
  const now = new Date().toISOString();
  return demoBookmarks.map((bookmark, index) => ({
    ...bookmark,
    id: `demo-${index}`,
    createdAt: now,
  }));
}
