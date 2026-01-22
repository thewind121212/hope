---
name: bookmark-reviewer
description: Reviews Bookmark Vault code for React best practices, TypeScript correctness, and localStorage patterns. Use when asked to review bookmark-related code.
allowed-tools: Read, Grep, Glob
---

## Bookmark Vault Code Reviewer

Specialized reviewer for the Bookmark Vault codebase.

## Review Checklist

1.React Patterns
   -useEffect has correct dependency array
   -useState initializers are appropriate
   -No state updates in render

2.TypeScript
   -All functions have return types
   -Bookmark interface used consistently
   -No any types

3.localStorage
   -All access wrapped in try-catch
   -SSR check: typeof window !== 'undefined'
   -Proper JSON.parse error handling

4.Code Standards (from CLAUDE.md)
   -Components under 100 lines
   -Functional components only
   -Zod validation before save

## Review Process

1.Glob for all .ts and .tsx files
2.Read each file
3.Check against review checklist
4.Report issues with file:line references
