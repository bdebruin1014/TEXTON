# KOVA Design System v3.1 — Implementation Spec

Commit this file to `docs/kova-design-system-v3.1.md` in the repo, then run a single Claude Code prompt referencing it.

---

## OVERVIEW

This spec updates the entire KOVA visual system. There are 6 major changes:

1. **Primary green darkened** — `#1B3022` → `#143A23` (deeper forest green) across all buttons, links, focus rings, accents, badges, borders
2. **Dark sidebar** — Sidebar background changes from white (`#ffffff`) to dark navy (`#112233`) matching the top nav header. All sidebar text, labels, icons, and hover states updated for dark background.
3. **Project Tab Bar** — New Qualia-style horizontal tab strip between the header+sidebar and the main content area. Lets users open multiple projects as tabs and quickly switch between them. Grey strip background, active tab is white/light.
4. **Form Field State System** — Four visual states for form inputs: required-empty (salmon), auto-generated (blue), manual-override (yellow + cancel ✕), and normal (white). Required fields clear their red state when filled.
5. **App renamed** — All user-facing strings now use "KOVA".
6. **Fully responsive** — Three breakpoints: mobile (<768px), tablet (768–1024px), desktop (>1024px). Sidebar collapses to a slide-over drawer on mobile/tablet. Tab bar scrolls horizontally. Form grids stack. Right panel collapses. Touch-friendly tap targets.

---

## 1. CSS VARIABLES — COMPLETE REPLACEMENT

Replace the entire `:root` block in `src/index.css` (or wherever the CSS variables live). This is the single source of truth for all colors.

```css
:root {
  /* ===== PRIMARY — deeper forest green ===== */
  --primary: 145 50% 15%;              /* #143A23 */
  --primary-foreground: 0 0% 100%;     /* #ffffff */
  --primary-hover: 145 47% 20%;        /* #1C4D30 */
  --primary-accent: 145 32% 42%;       /* #4A8C5E */

  /* ===== SECONDARY ===== */
  --secondary: 140 14% 85%;            /* #D4E2D8 */
  --secondary-foreground: 145 50% 15%; /* #143A23 */

  /* ===== SURFACES ===== */
  --background: 210 29% 97%;           /* #F1F5F9 */
  --card: 0 0% 100%;                   /* #ffffff */
  --foreground: 210 50% 13%;           /* #112233 */
  --muted: 210 29% 97%;               /* #F1F5F9 */
  --muted-foreground: 215 16% 47%;     /* #64748B */
  --accent: 140 14% 93%;              /* #EBF2ED */
  --accent-foreground: 145 50% 15%;    /* #143A23 */

  /* ===== DARK CHROME — header AND sidebar ===== */
  --nav-bg: 210 50% 13%;              /* #112233 */
  --nav-fg: 210 29% 97%;              /* #F1F5F9 */
  --nav-muted: 215 20% 65%;           /* #94A3B8 */
  --nav-active: 145 32% 42%;          /* #4A8C5E */

  --sidebar-bg: 210 50% 13%;          /* #112233 */
  --sidebar-fg: 215 20% 65%;          /* #94A3B8 */
  --sidebar-active-border: 145 32% 42%; /* #4A8C5E */
  --sidebar-active-text: 0 0% 100%;   /* #ffffff */
  --sidebar-active-bg: 0 0% 100% / 0.06;
  --sidebar-hover: 0 0% 100% / 0.04;
  --sidebar-section-label: 210 18% 43%; /* #5A6F82 */
  --sidebar-record-name: 210 29% 97%; /* #F1F5F9 */
  --sidebar-record-code: 210 17% 56%; /* #7B8FA3 */
  --sidebar-icon-bg: 145 32% 42% / 0.15;
  --sidebar-icon-fg: 145 32% 42%;     /* #4A8C5E */

  /* ===== PROJECT TAB BAR ===== */
  --tab-bar-bg: #D5DAE0;
  --tab-bg: #D5DAE0;
  --tab-text: #475569;
  --tab-text-hover: #1E293B;
  --tab-hover-bg: #E2E7EB;
  --tab-active-bg: #F1F5F9;
  --tab-active-text: #112233;
  --tab-close: #94A3B8;

  /* ===== BORDERS & FOCUS ===== */
  --border: 214 32% 91%;              /* #E2E8F0 */
  --ring: 145 50% 15%;                /* #143A23 */

  /* ===== STATUS ===== */
  --success: 145 34% 36%;             /* #3D7A4E */
  --success-bg: 140 14% 85%;          /* #D4E2D8 */
  --warning: 33 75% 44%;              /* #C4841D */
  --warning-bg: 36 52% 88%;           /* #F3E8D0 */
  --info: 210 42% 43%;                /* #3B6FA0 */
  --info-bg: 214 95% 93%;             /* #DBEAFE */
  --destructive: 0 49% 49%;           /* #B84040 */
  --destructive-bg: 0 44% 88%;        /* #F0D4D4 */

  /* ===== FORM FIELD STATES ===== */
  --field-required-bg: #FFF5F5;
  --field-required-border: #F5C6C6;
  --field-required-label: #B84040;
  --field-auto-bg: #EFF6FF;
  --field-auto-border: #BFDBFE;
  --field-auto-text: #1E40AF;
  --field-auto-label: #2563EB;
  --field-override-bg: #FFFBEB;
  --field-override-border: #FDE68A;
  --field-override-text: #92400E;
  --field-override-label: #D97706;

  /* ===== CHARTS ===== */
  --chart-1: 145 50% 15%;             /* #143A23 */
  --chart-2: 210 42% 43%;             /* #3B6FA0 */
  --chart-3: 33 75% 44%;              /* #C4841D */
  --chart-4: 270 24% 49%;             /* #7C5E99 */
  --chart-5: 0 49% 49%;               /* #B84040 */
}
```

**IMPORTANT**: If the existing codebase uses HSL-formatted variables (like shadcn/ui convention `145 50% 15%`), use those. If it uses hex directly, use the hex values shown in comments. Match whatever format is currently in use. The hex values are the canonical source.

### Hex Quick Reference

| Token | OLD | NEW |
|-------|-----|-----|
| Primary | `#1B3022` | `#143A23` |
| Primary Hover | `#264733` | `#1C4D30` |
| Primary Accent / Nav Active | `#6B9E7A` | `#4A8C5E` |
| Success | `#4A7A5B` | `#3D7A4E` |
| Success BG / Badge Green | `#DDE6DF` | `#D4E2D8` |
| Sidebar BG | `#ffffff` | `#112233` |
| Sidebar Active Border | `#1B3022` | `#4A8C5E` |
| Sidebar Active Text | `#1B3022` | `#ffffff` |
| Accent (hover bg) | `#F1F5F4` | `#EBF2ED` |

---

## 2. TAILWIND CONFIG UPDATE

In `tailwind.config.js` (or `tailwind.config.ts`), update the `colors` extension to match. Remove the old `cedar` palette if present and replace with:

```js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#143A23',
        foreground: '#ffffff',
        hover: '#1C4D30',
        accent: '#4A8C5E',
        50: '#EBF2ED',
        100: '#D4E2D8',
        200: '#A3C4AE',
        300: '#7DB38E',
        400: '#4A8C5E',
        500: '#3D7A4E',
        600: '#246139',
        700: '#1C4D30',
        800: '#143A23',
        900: '#091A10',
      },
      nav: {
        bg: '#112233',
        fg: '#F1F5F9',
        muted: '#94A3B8',
        active: '#4A8C5E',
      },
      sidebar: {
        bg: '#112233',
        fg: '#94A3B8',
        'active-border': '#4A8C5E',
        'active-text': '#ffffff',
        'section-label': '#5A6F82',
        'record-name': '#F1F5F9',
        'record-code': '#7B8FA3',
      },
      tab: {
        bar: '#D5DAE0',
        bg: '#D5DAE0',
        text: '#475569',
        'text-hover': '#1E293B',
        'hover-bg': '#E2E7EB',
        'active-bg': '#F1F5F9',
        'active-text': '#112233',
        close: '#94A3B8',
      },
      field: {
        'required-bg': '#FFF5F5',
        'required-border': '#F5C6C6',
        'required-label': '#B84040',
        'auto-bg': '#EFF6FF',
        'auto-border': '#BFDBFE',
        'auto-text': '#1E40AF',
        'auto-label': '#2563EB',
        'override-bg': '#FFFBEB',
        'override-border': '#FDE68A',
        'override-text': '#92400E',
        'override-label': '#D97706',
      },
    },
  },
},
```

---

## 3. LAYOUT RESTRUCTURE — DARK SIDEBAR + TAB BAR

### Current Layout Structure

```
┌─────────────────────────────────────────────────┐
│ TOP NAV (#112233)                               │
├───────────┬─────────────────────────┬───────────┤
│ SIDEBAR   │ MAIN CONTENT            │ RIGHT     │
│ (white)   │ (#F1F5F9)               │ PANEL     │
│ 240px     │                         │ 280px     │
└───────────┴─────────────────────────┴───────────┘
```

### New Layout Structure

```
┌─────────────────────────────────────────────────┐
│ TOP NAV (#112233)                               │
├───────────┬─────────────────────────────────────┤
│           │ PROJECT TAB BAR (#D5DAE0)           │
│ SIDEBAR   ├─────────────────────────┬───────────┤
│ (#112233) │ MAIN CONTENT            │ RIGHT     │
│ DARK      │ (#F1F5F9)               │ PANEL     │
│ 240px     │                         │ 280px     │
└───────────┴─────────────────────────┴───────────┘
```

The sidebar is now dark (#112233) matching the header. The project tab bar sits ABOVE the content area but to the RIGHT of the sidebar — the sidebar spans the full height uninterrupted.

### Implementation

Update the main layout component (likely `src/components/layout/AppLayout.tsx` or `src/routes/_authenticated.tsx`):

```tsx
// Conceptual structure — adapt to your actual component names
import { useState } from 'react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Nav — full width */}
      <TopNav onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Body — sidebar + content column */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — persistent on desktop, slide-over drawer on mobile/tablet */}
        <div className={cn(
          'fixed inset-y-0 left-0 z-40 w-[280px] lg:w-[240px] lg:relative lg:z-auto',
          'transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0 pt-[52px] lg:pt-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Content Column — tab bar + main + right panel */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Project Tab Bar */}
          <ProjectTabBar />

          {/* Content Row — main area + right panel */}
          <div className="flex flex-1 min-h-0">
            <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
              {children}
            </main>
            {/* Right Panel — hidden on mobile, collapsible on tablet+ */}
            <RightPanel className="hidden xl:block" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. SIDEBAR COMPONENT — DARK THEME

Update `src/components/layout/Sidebar.tsx` (or equivalent). The sidebar background is now `#112233` with light text.

```tsx
// Key styling changes:
// Container:
//   bg-[#112233] text-sidebar-fg border-r border-white/[0.06]

// Section labels:
//   text-[11px] font-semibold uppercase tracking-wider text-[#5A6F82]

// Nav items (inactive):
//   text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#C8D5E0]
//   border-l-[3px] border-transparent

// Nav items (active):
//   border-l-[#4A8C5E] text-white font-semibold bg-white/[0.06]

// Record identity block:
//   Icon: bg-[rgba(74,140,94,0.15)] text-[#4A8C5E]
//   Name: text-[#F1F5F9] font-semibold
//   Code: text-[#7B8FA3] text-xs

// Back link:
//   text-[#7B8FA3] hover:text-[#C8D5E0]

// Dividers:
//   border-white/[0.06]  (NOT border-gray-200)
```

---

## 5. PROJECT TAB BAR — NEW COMPONENT

Create `src/components/layout/ProjectTabBar.tsx`.

This component manages open project tabs using a Zustand store. When a user navigates to a project detail page, a tab is added. Clicking a tab navigates to that project. Clicking × closes the tab.

### Zustand Store

Create `src/stores/projectTabStore.ts`:

```ts
import { create } from 'zustand';

interface ProjectTab {
  id: string;         // project UUID
  name: string;       // "Village Grove"
  code: string;       // "PRJ-2026-0003"
  type: string;       // "SL" | "Community" | "Lot Dev" | "Lot Purchase"
}

interface ProjectTabStore {
  tabs: ProjectTab[];
  activeTabId: string | null;
  openTab: (tab: ProjectTab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

export const useProjectTabStore = create<ProjectTabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (tab) => {
    const { tabs } = get();
    if (!tabs.find((t) => t.id === tab.id)) {
      set({ tabs: [...tabs, tab], activeTabId: tab.id });
    } else {
      set({ activeTabId: tab.id });
    }
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    const newTabs = tabs.filter((t) => t.id !== id);
    let newActive = activeTabId;
    if (activeTabId === id) {
      newActive = newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? null;
    }
    set({ tabs: newTabs, activeTabId: newActive });
  },

  setActiveTab: (id) => set({ activeTabId: id }),
}));
```

### Component

```tsx
import { useNavigate } from '@tanstack/react-router';
import { useProjectTabStore } from '@/stores/projectTabStore';
import { cn } from '@/lib/utils';

const TYPE_ABBREV: Record<string, string> = {
  'Scattered Lot': 'SL',
  'Community Development': 'Community',
  'Lot Development': 'Lot Dev',
  'Lot Purchase': 'Lot Purchase',
};

export function ProjectTabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useProjectTabStore();
  const navigate = useNavigate();

  if (tabs.length === 0) return null;

  const handleClick = (id: string) => {
    setActiveTab(id);
    navigate({ to: '/projects/$projectId', params: { projectId: id } });
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeTab(id);
  };

  return (
    <div
      className="flex items-end h-[30px] bg-[#D5DAE0] overflow-hidden"
      style={{ paddingLeft: 4, gap: 1 }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 text-xs font-medium cursor-pointer',
              'rounded-t transition-all min-w-0 max-w-[220px]',
              isActive
                ? 'bg-[#F1F5F9] text-[#112233] font-semibold z-[1]'
                : 'bg-[#D5DAE0] text-[#475569] hover:bg-[#E2E7EB] hover:text-[#1E293B]'
            )}
          >
            <span className="truncate">{tab.name}</span>
            <span className={cn(
              'text-[11px] font-normal shrink-0',
              isActive ? 'text-[#64748B]' : 'text-[#94A3B8]'
            )}>
              · {TYPE_ABBREV[tab.type] || tab.type}
            </span>
            <span
              onClick={(e) => handleClose(e, tab.id)}
              className={cn(
                'text-sm shrink-0 ml-0.5',
                isActive
                  ? 'text-[#64748B] hover:text-[#112233]'
                  : 'text-[#94A3B8] hover:text-[#334155]'
              )}
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

### Hooking It Up

In the project detail route loader (e.g. `src/routes/_authenticated/projects/$projectId.tsx`), call `openTab` when the route loads:

```ts
// Inside the route component or a useEffect:
const { openTab } = useProjectTabStore();
const project = /* your loaded project data */;

useEffect(() => {
  if (project) {
    openTab({
      id: project.id,
      name: project.name,
      code: project.code,
      type: project.type,
    });
  }
}, [project?.id]);
```

Remove the "← BACK TO PROJECTS" link from the sidebar detail view since the tab bar now handles navigation.

---

## 6. FORM FIELD STATE SYSTEM — NEW COMPONENTS

### 6a. CSS Classes

Add these to your global CSS (`src/index.css` or equivalent). These work with the existing `form-group` pattern or can be applied via Tailwind utility classes.

```css
/* ===== FORM FIELD STATES ===== */

/* Required (empty) — salmon background, clears when filled */
.field-required-empty input,
.field-required-empty select,
.field-required-empty textarea {
  background-color: var(--field-required-bg);
  border-color: var(--field-required-border);
}
.field-required-empty label {
  color: var(--field-required-label);
  font-weight: 600;
}

/* Auto-generated — blue tint, readonly */
.field-auto input,
.field-auto select {
  background-color: var(--field-auto-bg);
  border-color: var(--field-auto-border);
  color: var(--field-auto-text);
}
.field-auto label {
  color: var(--field-auto-label);
  font-weight: 600;
}

/* Manual override — yellow tint with cancel X */
.field-override input,
.field-override select {
  background-color: var(--field-override-bg);
  border-color: var(--field-override-border);
  color: var(--field-override-text);
  padding-right: 2rem;
}
.field-override label {
  color: var(--field-override-label);
  font-weight: 600;
}
```

### 6b. AutoSaveField Enhancement

Extend the existing `useAutoSave` hook or `AutoSaveField` component to support field states. The field state is determined by:

1. **required-empty**: Field has `required` prop AND current value is empty/null/undefined
2. **auto-generated**: Field has `autoValue` prop (a computed value from other fields). Shown when user has NOT manually overridden.
3. **manual-override**: Field has `autoValue` prop AND user has typed a different value. Shows cancel ✕ to revert.
4. **normal**: Everything else (filled, not auto-generated, not required-empty).

```tsx
// src/components/forms/FormField.tsx
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  value: string | number | null;
  onChange: (value: string) => void;
  required?: boolean;
  autoValue?: string | number | null;  // computed value from other fields
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
}

export function FormField({
  label, name, value, onChange, required, autoValue, readOnly, type = 'text', placeholder,
}: FormFieldProps) {
  const [isOverridden, setIsOverridden] = useState(false);

  // Determine field state
  const isEmpty = value === null || value === undefined || String(value).trim() === '';
  const hasAutoValue = autoValue !== null && autoValue !== undefined;
  const isAutoGenerated = hasAutoValue && !isOverridden;
  const isManualOverride = hasAutoValue && isOverridden;
  const isRequiredEmpty = required && isEmpty && !hasAutoValue;

  // Display value: auto-generated if not overridden
  const displayValue = isAutoGenerated ? String(autoValue) : (value ?? '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (hasAutoValue) setIsOverridden(true);
    onChange(e.target.value);
  };

  const handleRevert = () => {
    setIsOverridden(false);
    onChange(String(autoValue));
  };

  const fieldState = isRequiredEmpty
    ? 'field-required-empty'
    : isAutoGenerated
    ? 'field-auto'
    : isManualOverride
    ? 'field-override'
    : '';

  return (
    <div className={cn('flex flex-col relative', fieldState)}>
      <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
        {required && <span className="text-destructive font-bold">*</span>}
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={displayValue}
        onChange={handleChange}
        readOnly={readOnly || isAutoGenerated}
        placeholder={placeholder || (required ? 'Required' : '')}
        className={cn(
          'border rounded-md px-3 py-2 text-sm transition-all',
          'focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring'
        )}
      />
      {isManualOverride && (
        <button
          type="button"
          onClick={handleRevert}
          className="absolute right-2.5 bottom-2.5 text-foreground text-sm font-bold opacity-70 hover:opacity-100"
          title="Revert to auto-calculated value"
        >
          ✕
        </button>
      )}
    </div>
  );
}
```

### 6c. Required Field Behavior

The required-empty state (salmon background + red label) MUST clear immediately when the user types any character. It returns if they clear the field. This is handled by the `isRequiredEmpty` conditional above — it checks `isEmpty` on every render, so as `value` updates via `onChange`, the class removes itself automatically.

---

## 7. GLOBAL SEARCH-AND-REPLACE FOR OLD COLORS

Run these replacements across ALL `.tsx`, `.ts`, `.css` files:

```
#1B3022 → #143A23
#264733 → #1C4D30
#6B9E7A → #4A8C5E
#4A7A5B → #3D7A4E
#DDE6DF → #D4E2D8
#F1F5F4 → #EBF2ED
```

Also replace these if the sidebar was previously white:
```
sidebar-bg: #ffffff → sidebar-bg: #112233
sidebar-active-border: #1B3022 → sidebar-active-border: #4A8C5E
sidebar-active-text: #1B3022 → sidebar-active-text: #ffffff
sidebar-hover: #F1F5F4 → sidebar-hover: rgba(255,255,255,0.04)
```

---

## 8. RESPONSIVE DESIGN

KOVA must work across desktop, tablet, and mobile. Three breakpoints using Tailwind defaults:

| Breakpoint | Width | Target |
|------------|-------|--------|
| `sm` | ≥640px | Large phones (landscape) |
| `md` | ≥768px | Tablets |
| `lg` | ≥1024px | Small laptops, sidebar visible |
| `xl` | ≥1280px | Desktop, right panel visible |

### 8a. Top Nav — Responsive

```tsx
// TopNav.tsx changes:
// - Add a hamburger menu button visible on < lg screens
// - Hide module text labels on mobile, show icon-only or truncated
// - Search bar collapses to icon on mobile
// - Notification + avatar always visible

<nav className="bg-[#112233] h-[52px] flex items-center px-4 md:px-5 gap-3 md:gap-7">
  {/* Hamburger — mobile/tablet only */}
  <button
    onClick={onMenuToggle}
    className="lg:hidden text-[#94A3B8] hover:text-white"
    aria-label="Toggle sidebar"
  >
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>

  <span className="text-[#4A8C5E] font-bold tracking-[2px] text-base shrink-0">KOVA</span>

  {/* Module links — hidden on mobile, scrollable on tablet */}
  <div className="hidden md:flex items-center gap-4 lg:gap-7 overflow-x-auto">
    <a>Pipeline</a>
    <a>Projects</a>
    <a>Construction</a>
    <a>Disposition</a>
    <a className="hidden lg:block">Accounting</a>
    <a className="hidden lg:block">Contacts</a>
    <a className="hidden lg:block">Calendar</a>
    <a className="hidden lg:block">Admin</a>
  </div>

  <span className="flex-1" />

  {/* Search — icon on mobile, input on desktop */}
  <div className="hidden md:block">
    <input className="..." placeholder="Search... ⌘K" />
  </div>
  <button className="md:hidden text-[#94A3B8]">
    {/* Search icon */}
  </button>

  <span className="text-[#94A3B8]">🔔</span>
  <span className="avatar">BD</span>
</nav>
```

On mobile (<768px), show a "More" overflow menu or bottom sheet for the hidden module links (Accounting, Contacts, Calendar, Admin). Alternatively, use a horizontal scrollable row.

### 8b. Sidebar — Slide-over Drawer

On screens below `lg` (1024px), the sidebar becomes a fixed-position drawer that slides in from the left:

```tsx
// Sidebar wrapper in AppLayout (see Section 3 above for full code)
// Key behaviors:
// - lg+: static sidebar, always visible, w-[240px]
// - <lg: off-screen by default (-translate-x-full), slides in when toggled
// - Semi-transparent overlay (bg-black/50) behind it when open
// - Close on overlay click, or close button inside sidebar
// - pt-[52px] offset so it doesn't overlap the top nav

// Inside Sidebar component, add a close button for mobile:
<button
  onClick={onClose}
  className="lg:hidden absolute top-3 right-3 text-[#7B8FA3] hover:text-white"
>
  ✕
</button>
```

The sidebar width increases slightly on mobile (280px vs 240px) for better touch targets.

### 8c. Project Tab Bar — Responsive

```tsx
// Tab bar behavior by breakpoint:
// - Desktop (lg+): tabs visible, shrink with text truncation
// - Tablet (md-lg): tabs scroll horizontally, touch-swipeable
// - Mobile (<md): tab bar becomes a select dropdown or compact scrollable strip

// Option A: Always show tab bar, horizontal scroll on all sizes
<div className="flex items-end h-[30px] bg-[#D5DAE0] overflow-x-auto scrollbar-none">
  {/* tabs */}
</div>

// Option B: Dropdown on mobile (preferred for < 640px)
// Show a <select> or dropdown button showing current project name
// Full tab bar visible on md+
```

Add `-webkit-overflow-scrolling: touch` and `scrollbar-width: none` for smooth mobile scrolling:

```css
.project-tab-bar {
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.project-tab-bar::-webkit-scrollbar {
  display: none;
}
```

### 8d. Form Grids — Stack on Mobile

All form-row grids must collapse to single column on mobile:

```css
/* Tailwind approach — update form grid components */
/* 2-col default: */
.form-row { @apply grid grid-cols-1 md:grid-cols-2 gap-4 mb-4; }

/* 3-col: */
.form-row.three-col { @apply grid-cols-1 md:grid-cols-2 lg:grid-cols-3; }

/* 4-col: */
.form-row.four-col { @apply grid-cols-1 sm:grid-cols-2 lg:grid-cols-4; }
```

Or if using Tailwind classes inline on each form row:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
  <FormField ... />
  <FormField ... />
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
  <FormField ... />
  <FormField ... />
  <FormField ... />
  <FormField ... />
</div>
```

### 8e. KPI Cards — Stack on Mobile

```tsx
// KPI row: horizontal on desktop, wrapping grid on mobile
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
  <KpiCard ... />
  <KpiCard ... />
  <KpiCard ... />
  <KpiCard ... />
</div>
```

### 8f. Right Panel — Hidden Below xl

The right panel (Tasks/Notes/Activity) is a desktop feature:

```tsx
// In AppLayout, the right panel only renders on xl+:
<RightPanel className="hidden xl:block" />

// On tablet (md-xl), provide a toggle button in the top-right of main content
// that opens the right panel as a slide-over from the right:
<button className="xl:hidden fixed bottom-4 right-4 bg-primary text-white rounded-full w-10 h-10 shadow-lg flex items-center justify-center">
  {/* Panel icon */}
</button>

// Or use a bottom sheet on mobile for Tasks/Notes
```

### 8g. Data Tables — Responsive

For DataTable components, on mobile:

```tsx
// Option A (preferred): Horizontal scroll wrapper
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <table className="min-w-[600px] w-full">
    {/* table content */}
  </table>
</div>

// Option B: Card view on mobile (for simpler tables)
// Render each row as a card on < md, table on md+
```

### 8h. Touch Targets

Ensure minimum 44x44px tap targets on mobile:

```css
@media (max-width: 768px) {
  /* Sidebar nav items */
  .nav-item { min-height: 44px; padding: 10px 20px; }

  /* Tab bar tabs */
  .project-tab { min-height: 36px; padding: 6px 14px; }

  /* Form inputs */
  .form-group input,
  .form-group select {
    min-height: 44px;
    font-size: 16px; /* prevents iOS zoom on focus */
  }

  /* Buttons */
  .btn-primary { min-height: 44px; padding: 12px 20px; }
}
```

**CRITICAL**: Set `font-size: 16px` on mobile inputs to prevent iOS Safari from auto-zooming when the input is focused. This is the #1 mobile form UX issue.

### 8i. Viewport Meta Tag

Ensure `index.html` has:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

### 8j. Responsive Summary Table

| Element | Mobile (<768) | Tablet (768-1024) | Desktop (>1024) |
|---------|---------------|-------------------|-----------------|
| Top Nav | Hamburger + logo + search icon + avatar | Hamburger + logo + scrollable modules + search + avatar | Full nav with all modules |
| Sidebar | Off-screen drawer (280px), overlay | Off-screen drawer (280px), overlay | Static 240px, always visible |
| Tab Bar | Horizontal scroll, compact | Horizontal scroll | Static, tabs shrink |
| Main Content | Full width, p-4 | Full width, p-6 | Flex with right panel, p-6 |
| Right Panel | Hidden (bottom sheet toggle) | Hidden (slide-over toggle) | Static 280px |
| Form Grids | 1 column | 2 columns | 2-4 columns |
| KPI Cards | 2-col grid | 2-col grid | 4-col row |
| Data Tables | Horizontal scroll | Full table | Full table |
| Inputs | 44px height, 16px font | Standard | Standard |

---

## 9. BRANDING

Verify all user-facing instances use "KOVA" or "kova" as appropriate:

1. Logo component — render "KOVA" in `text-[#4A8C5E] font-bold tracking-[2px]`
2. `index.html` `<title>` tag → "KOVA"
3. Any meta tags (og:title, description) → "KOVA"
4. Login/auth screens → "KOVA"
5. Package.json name field — should be "kova"
6. README.md header

---

## 10. VERIFICATION CHECKLIST

After implementing, verify:

- [ ] `npm run build` succeeds with no errors
- [ ] Primary buttons are dark forest green (#143A23), hover to #1C4D30
- [ ] Top nav is #112233 with "KOVA" logo in #4A8C5E
- [ ] Sidebar is #112233 (dark), same color as header — seamless chrome
- [ ] Active sidebar item has #4A8C5E left border and white text
- [ ] Section labels in sidebar are #5A6F82 (muted)
- [ ] Project tab bar appears above content, to the right of sidebar
- [ ] Tab bar is grey (#D5DAE0), active tab is #F1F5F9 (matches content bg)
- [ ] Tabs shrink as more are added (max-width 220px, text truncation)
- [ ] Closing active tab activates the adjacent tab
- [ ] Required empty fields show salmon (#FFF5F5) background
- [ ] Required fields clear the salmon state immediately on input
- [ ] Auto-generated fields show blue (#EFF6FF) background
- [ ] Manual override fields show yellow (#FFFBEB) with black ✕
- [ ] Clicking ✕ on override field reverts to auto-generated value (turns blue)
- [ ] Focus rings use #143A23
- [ ] Badge greens use #D4E2D8 bg with #143A23 text
- [ ] All branding references show "KOVA"
- [ ] **Mobile (375px)**: Hamburger menu visible, sidebar hidden, form fields stack to 1 col, inputs are 44px min height with 16px font
- [ ] **Mobile**: Tapping hamburger opens sidebar as overlay drawer, tapping overlay closes it
- [ ] **Mobile**: Tab bar scrolls horizontally with momentum, no scrollbar visible
- [ ] **Mobile**: Right panel is hidden
- [ ] **Mobile**: KPI cards render as 2-col grid
- [ ] **Mobile**: Data tables scroll horizontally
- [ ] **Tablet (768px)**: Module links visible in top nav, sidebar still drawer
- [ ] **Tablet**: Form grids are 2 columns
- [ ] **Desktop (1024px+)**: Sidebar always visible, no hamburger
- [ ] **Desktop (1280px+)**: Right panel visible
- [ ] **Desktop**: Form grids use 2-4 columns as specified
- [ ] No iOS Safari zoom on input focus (font-size ≥ 16px on mobile)
