## Frontend design (general) — FE + UI system

This is the “source of truth” for how we build UI in `fe/`. The goal is to keep the app **visually consistent (light/dark)** and make it easy to **split/refactor components** without breaking behavior.

### Tech baseline (what the app is)

- **Framework**: React SPA (Vite)
- **Styling**: Tailwind (via `@tailwindcss/vite`) + `dark:` variants
- **Auth**: SuperTokens
- **Routing**: React Router
- **Server state**: TanStack Query
- **Global UI state**: Redux (ex: modal stack)
- **Icons**: `lucide-react`

### UI foundations

- **Dark mode strategy**
  - We use **class-based dark mode**. `ThemeToggle` toggles the `dark` class on `<html>` and persists to `localStorage`.
  - Tailwind is enabled for dark mode via `fe/src/index.css`:
    - `@custom-variant dark (&:where(.dark, .dark *));`
  - **Rule**: all components must render correctly in **both** modes by using `dark:*` counterparts for any surface/text/border color.

- **Main surfaces (base UI look)**
  - **App canvas**: `bg-gray-50` (light) / `dark:bg-gray-950` (dark) is the default background pattern (see `App.tsx`).
  - **Cards / modals**: `bg-white` + `text-slate-900` in light, `dark:bg-slate-900` + `dark:text-white` in dark (see `core-design/modal/ModalBase.tsx`).
  - **Borders**: use subtle borders: `border-gray-100/200` (light) + `dark:border-slate-800/gray-700` (dark).

### Color system (tokens we use)

We mostly rely on Tailwind’s default palette and use a small set of “semantic” colors consistently:

- **Neutral (primary UI surfaces)**
  - **Canvas**: `gray-50` / `gray-950`
  - **Surface**: `white` / `slate-900`
  - **Text**: `gray-900` or `slate-900` (light) / `gray-50` or `slate-100` (dark)
  - **Muted text**: `gray-500` or `slate-500` (light) / `gray-400` or `slate-400` (dark)

- **Primary action**
  - **Primary**: `indigo-600` (light) / `indigo-500` (dark)
  - **Hover**: `indigo-700` (light) / `indigo-400` (dark)
  - Examples: `core-design/input/CommonButton.tsx`, modal confirm button in `core-design/modal/ModalBase.tsx`

- **Info / loading**
  - **Info**: `blue-*` when we need an informational state (ex: loading button uses `bg-blue-50` + `text-blue-600`).

- **Danger**
  - **Danger**: `red-*` for destructive states or critical warnings.

**Rule**: don’t invent new “main colors” per feature. If you need a new semantic token (ex: “success”), add it as a documented rule here and reuse everywhere.

### Layout rules (consistency)

- **Pages are thin**
  - `fe/src/page/*` should mostly compose feature components and routing params.
  - Put UI/logic into `fe/src/components/<feature>/…`.

- **Spacing**
  - Prefer Tailwind spacing scale (ex: `p-4`, `p-6`, `gap-2`, `space-y-6`).
  - Favor rounded UI: `rounded-xl` / `rounded-2xl` / `rounded-3xl`.

### Component split rules (how to refactor safely)

Use these rules when splitting big files into smaller components.

- **Module boundaries (micro store vs global store)**
  - We use **three** kinds of “state containers”, each with a clear boundary:
    - **TanStack Query** = *server state* (fetch, cache, invalidate).
    - **Micro store (Zustand, per feature/module)** = *feature-local UI state*.
    - **Redux (global store)** = *cross-feature app UI state* that must be shared broadly.

- **Micro store (Zustand) — feature-local UI state**
  - **Where**: inside the feature module, e.g. `fe/src/components/category-module/store.ts`.
  - **What it stores** (good examples):
    - View mode toggles (`grid` / `list`)
    - Local menu open ids (`activeMenuId`)
    - Local modal/form state for that feature (`createCategoryModalData`)
    - Temporary selections that only that feature cares about
  - **What it must NOT store**:
    - Server-fetched entities as the source of truth (use TanStack Query for `categories`, `items`, etc.)
    - App-wide state used by multiple unrelated features (move to Redux)
  - **Rule of thumb**: keep it small and UI-oriented; store **ids + UI flags**, not heavy objects.

- **Redux (global store) — cross-feature UI state**
  - **Where**: `fe/src/store/*` and wired in `fe/src/store/global.store.ts`.
  - **What it stores** (good examples):
    - Global modal stack / layering (see `fe/src/store/modal.store.ts` + used by `core-design/modal/ModalBase.tsx`)
    - Layout-level UI state that multiple pages/features must read/write
  - **When to promote micro store → Redux**
    - The same state is needed by multiple feature modules or the app shell (`App.tsx`, sidebar, global overlays)
    - You need centralized orchestration (ex: stacking/ordering, global “close all”)
    - You need predictable global behavior across routes

- **`core-design/` (reusable primitives)**
  - **What belongs here**: generic UI blocks that can be used by multiple features without feature knowledge.
  - Examples in repo: inputs (`CommonInput`, `Select`), modals (`ModalBase`, `ConfirmModal`), loaders (`Spinner`), cards (`ActiveMenu`).
  - **Rules**
    - No feature-specific data fetching.
    - No feature-specific Redux slices.
    - Props should be generic and typed.

- **`components/<feature>/` (feature modules)**
  - **What belongs here**: UI + behavior for a domain (ex: `category-module`, `generator`).
  - Allowed: feature-local state, feature-local helpers, feature-specific styling choices (still following the color system).
  - Recommended split inside a feature:
    - `components/<feature>/components/*` (pure subcomponents)
    - `components/<feature>/hooks/*` (feature hooks)
    - `components/<feature>/utils.ts` (feature utilities)
    - `components/<feature>/types.ts` (feature types)

- **Container vs presentational split**
  - **Container**: owns data fetching / query hooks / orchestration, passes typed props down.
  - **Presentational**: only renders UI; no API calls; minimal side effects.

- **State boundaries**
  - **TanStack Query**: server state (fetching, caching, invalidation).
  - **Redux**: app-wide UI state that must be shared (ex: modal stack).
  - **Component state**: everything else (UI toggles, local inputs).
  - **Micro store (Zustand)**: feature-local UI state shared across several components inside the same feature module.

### Service layer pattern (API + hooks)

- **`fe/src/services/<module>/api.ts`**
  - Low-level `fetch` calls only (typed inputs/outputs, throws on errors).
- **`fe/src/services/<module>/useQuery.ts`**
  - TanStack Query hooks + stable query keys + invalidation rules.

**Rule**: UI components should not call `fetch` directly—use hooks from `services/*/useQuery.ts` or higher-level `hooks/`.

### Naming and file conventions

- **Components**: `PascalCase.tsx`
- **Hooks**: `useXxx.ts`
- **Utilities**: `utils.ts` (or `*.utils.ts` if a folder is large)
- **Barrels** (`index.ts`) are ok for exports, but don’t hide important types or logic there.

### UI checklist (before you merge a split/refactor)

- **Theme**: looks correct in both light and dark (no hard-coded light-only colors)
- **Typography**: uses consistent text colors (`gray/slate` pattern) and sizes
- **Focus/hover**: interactive elements have hover states in both themes
- **Boundaries**: API logic stays in `services/` and hooks; primitives stay in `core-design/`

