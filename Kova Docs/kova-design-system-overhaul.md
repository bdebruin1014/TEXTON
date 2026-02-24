# KOVA Design System Overhaul — Match Qualia Quality

## The Problem

KOVA's current UI looks like scaffolded developer output — functional but not polished. It needs to look and feel like Qualia: a premium professional tool that people enjoy using daily. This is a GLOBAL overhaul applied systematically, not a page-by-page fix.

## Reference: What Qualia Gets Right

Study the Qualia screenshots in the project (Home.png, Projects_sidebar_basic_info.png, Admin_View.png, Admin_Specific_Workflow.png, Contacts_Module.png, Projects_Documents.png, Projects_Properties.png). The patterns to replicate:

### Layout Structure (3-column)
- **Left sidebar**: ~220px wide. Dark charcoal background (#1E293B). White/light text. Grouped navigation under UPPERCASE section dividers (faint gray, letter-spaced). Active item has a green left border (#1B3022, 3px). Items have generous vertical padding (10-12px). Sidebar scrolls independently from main content.
- **Main content area**: White background (#FFFFFF). Generous padding (32px horizontal, 24px top). Clean card sections with subtle borders (#E2E8F0). Section headers are medium-weight, not bold. Form fields have label ABOVE (uppercase, 11px, letter-spaced, gray-500), input below with border-bottom only (not full border box) or very subtle full border.
- **Right panel**: ~280px wide, collapsible. Light gray background (#F8FAFC). Stacked sections: CHAT, TASKS (with count), NOTES. Each section header is centered, uppercase, small, with expand/collapse. Content within each section is compact.

### Top Navigation Bar
- Background: #112233 (near-black navy). Full width. ~48px tall.
- Logo on far left (KOVA wordmark, white).
- Module links centered or left-aligned: Pipeline, Projects, Construction, Disposition, Contacts, Calendar, Accounting, Admin. White text, 14px, medium weight. Active module has a bright green bottom border or underline (#48BB78, 3px).
- Right side: search input (subtle, dark background with light placeholder), notification bell, user avatar/initials.

### Browser-Style Record Tabs
- Below the top nav, a tab bar (#2A3540 background, ~36px tall) shows open records like browser tabs.
- Each tab: record name truncated, × close button on hover. Active tab has lighter background blending into page white.
- Only visible on detail pages, not index pages.

### Typography
- Headings: System font stack or "Inter" at 600 weight max. Never bold (700+) for section headers — use medium (500) with size difference instead.
- Labels above form fields: 11px, uppercase, letter-spacing 0.05em, color gray-500 (#6B7280).
- Body text: 14px, regular weight, #1F2937.
- Table text: 13px, #374151. Table headers: 12px, uppercase, letter-spaced, #6B7280.
- Page titles: 20-22px, weight 500-600, #111827.
- Section titles within pages: 14-16px, weight 500, #111827. NOT inside cards — just text with spacing.

### Form Fields (Critical — this is where KOVA likely looks worst)
- Labels ABOVE inputs, not beside. UPPERCASE, 11px, letter-spaced, gray-500.
- Inputs: full width within their column. Height 38px. Border: 1px solid #E2E8F0. Border-radius: 6px. Padding: 8px 12px. Font: 14px.
- On focus: border-color #1B3022, box-shadow 0 0 0 2px rgba(27,48,34,0.1). Subtle, not loud.
- Two-column form layout is standard (like Qualia's Basic Info page). Use CSS grid: grid-template-columns: 1fr 1fr with gap-x-6 gap-y-4.
- Dropdowns/selects match input styling exactly.
- Date pickers: same input styling with calendar icon right-aligned.
- Toggles: small, subtle, green when active (#1B3022).
- "Not set" placeholder text in light gray italic when a field is empty.

### Tables (DataTable styling)
- NO colored row backgrounds. White rows, very subtle gray hover (#F9FAFB).
- Header row: background #F8FAFC, text uppercase 12px letter-spaced #6B7280, border-bottom 1px #E2E8F0.
- Cell padding: 12px horizontal, 10px vertical. Comfortable but not wasteful.
- Row borders: 1px solid #F1F5F9 (nearly invisible, just enough separation).
- Status badges in tables: small rounded pills (px-2 py-0.5, text-xs, font-medium). Colors: green bg (#ECFDF5 bg, #065F46 text), yellow (#FFFBEB, #92400E), red (#FEF2F2, #991B1B), blue (#EFF6FF, #1E40AF), gray (#F3F4F6, #374151).
- Pagination: bottom right, small, subtle. Current page highlighted with #1B3022 background.

### Cards
- Background white. Border: 1px solid #E2E8F0. Border-radius: 8px. Shadow: none or shadow-sm (0 1px 2px rgba(0,0,0,0.05)) — NOT shadow-md or shadow-lg.
- Padding: 20-24px.
- Card headers: weight 500, 16px, with optional subtitle in gray-500 below.

### Buttons
- Primary: bg #1B3022, text white, rounded-md (6px), px-4 py-2, text-sm font-medium. Hover: darken 10%.
- Secondary: bg white, border 1px solid #E2E8F0, text #374151. Hover: bg #F9FAFB.
- Destructive: bg white, text #DC2626, border 1px solid #FCA5A5. Hover: bg #FEF2F2.
- Ghost: no border, no background, text #6B7280. Hover: bg #F3F4F6.
- All buttons: height 36px, no box-shadow.
- Action buttons in top-right of pages: Primary only for the main action (e.g., "Create Project"). Everything else is secondary or ghost.

### Sidebar Detail Page (Record Open)
When viewing a record (project, job, opportunity, disposition):
- Sidebar top: Back arrow + "Back to [Module]" link in green (#1B3022).
- Below: Record identity block — record code (small, gray), record name (16px, weight 500), status badge.
- Below: Metric summary blocks (if applicable) — small, compact, 2-column grid. E.g., "3/0/0" with task icons, dates, counts.
- Below: Grouped navigation under UPPERCASE DIVIDER LABELS:
  ```
  ——— GENERAL ———
    Basic Info          (green left border if active)
    Properties
    Contacts

  ——— CLOSING ———
    Charges
    Disclosures
    Proceeds

  ——— TASKS ———
    Documents
    Accounting
  ```
- Section divider labels: 10px, uppercase, letter-spacing 0.08em, #9CA3AF, with horizontal lines extending to edges (like `── GENERAL ──`). NOT clickable — purely visual grouping.
- Nav items: 13px, regular weight, #4B5563. Hover: #111827. Active: #1B3022 text + 3px green left border.

### Spacing and Rhythm
- Page-level padding: 32px horizontal, 24px top.
- Section spacing: 32px between major sections.
- Form group spacing: 20px between field groups, 12px between label and input, 4px between label text and input.
- Card stacking: 16px gap between cards.
- Everything should breathe. Qualia feels spacious, not cramped.

### Empty States
- When a table, list, or section has no data: centered text "No [items] yet" in gray-400, with optional subtle action link below. No sad face icons, no heavy empty state illustrations.

### Loading States  
- Skeleton loading: gray shimmer bars matching the expected content layout. NOT spinners, NOT full-page loaders.
- For individual saves: tiny green checkmark that fades in/out next to the field. NOT toasts.

### Animations/Transitions
- Page transitions: none (instant routing).
- Sidebar collapse: 200ms ease-out width transition.
- Dropdown menus: 150ms fade-in + slight translateY(-4px → 0).
- Modal/dialog open: 200ms fade-in + scale(0.95 → 1).
- Hover effects: 150ms color/background transitions.
- NO bounce, spring, or elastic animations. Everything is crisp and professional.

## Implementation Instructions

### Step 1: Global CSS Variables
Create or update `src/styles/globals.css` (or wherever your Tailwind base styles live):

```css
:root {
  /* Primary palette */
  --color-primary: #1B3022;
  --color-primary-hover: #162A1C;
  --color-nav: #112233;
  --color-nav-accent: #48BB78;
  
  /* Backgrounds */
  --color-page-bg: #F1F5F9;
  --color-card-bg: #FFFFFF;
  --color-sidebar-bg: #1E293B;
  --color-sidebar-hover: #334155;
  --color-right-panel-bg: #F8FAFC;
  --color-table-header-bg: #F8FAFC;
  --color-table-hover: #F9FAFB;
  
  /* Borders */
  --color-border: #E2E8F0;
  --color-border-subtle: #F1F5F9;
  
  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #374151;
  --color-text-tertiary: #6B7280;
  --color-text-muted: #9CA3AF;
  --color-text-label: #6B7280;
  
  /* Status */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-info: #3B82F6;
  --color-danger: #EF4444;
  
  /* Spacing */
  --page-padding-x: 32px;
  --page-padding-top: 24px;
  --section-gap: 32px;
  --card-padding: 20px;
  --field-gap-y: 20px;
  --field-label-gap: 4px;
  
  /* Typography */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-lg: 16px;
  --text-xl: 20px;
  --label-letter-spacing: 0.05em;
  --divider-letter-spacing: 0.08em;
}
```

### Step 2: Global Component Overrides
Override ALL shadcn/ui components to match these specs. Key files:

**Button** — remove all shadow, reduce border-radius to 6px, set explicit heights (36px default, 32px sm). Primary uses var(--color-primary).

**Input** — height 38px, border-radius 6px, border var(--color-border), focus ring uses var(--color-primary) at 0.1 opacity. Font size 14px.

**Select** — match Input styling exactly.

**Table** — header bg var(--color-table-header-bg), header text uppercase 12px with letter-spacing, row hover var(--color-table-hover), cell padding 12px/10px, row border var(--color-border-subtle).

**Badge** — remove all shadow, border-radius full, small size (text-xs, px-2 py-0.5). Status-specific color combos per the spec above.

**Card** — border 1px var(--color-border), border-radius 8px, shadow-none or shadow-sm only. Padding var(--card-padding).

**Dialog/Sheet** — 200ms fade + scale transition. Overlay at rgba(0,0,0,0.4), NOT rgba(0,0,0,0.8).

### Step 3: Layout Shell
The app layout (`src/routes/_authenticated.tsx` or equivalent root layout):

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOP NAV (#112233, 48px)  [KOVA] Pipeline Projects Construction... │
├──────────────────────────────────────────────────────────────────────┤
│  RECORD TABS (if on detail page, #2A3540, 36px)                    │
├──────────┬───────────────────────────────────────┬──────────────────┤
│          │                                       │                  │
│  LEFT    │    MAIN CONTENT                       │   RIGHT          │
│  SIDEBAR │    (#FFFFFF or #F1F5F9)               │   PANEL          │
│  (220px) │                                       │   (280px)        │
│  #1E293B │    Padding: 32px × 24px               │   #F8FAFC        │
│          │                                       │   Collapsible    │
│          │                                       │                  │
└──────────┴───────────────────────────────────────┴──────────────────┘
```

- Index pages: sidebar shows module-specific filters (status, date, contacts). Main content is full-width table. Right panel shows filter options.
- Detail pages: sidebar shows back link + record identity + grouped navigation. Main content shows active tab content. Right panel shows Tasks/Notes/Activity.

### Step 4: Apply to Every Route
Go through EVERY route file in the app and apply these patterns:
1. Page titles: 20px, weight 500, with action button(s) top-right
2. Form layouts: 2-column grid, labels above inputs, uppercase labels
3. Tables: match the styling spec above
4. Cards: consistent border, radius, padding, shadow
5. Sidebar navigation: UPPERCASE divider labels, green active indicator
6. Status badges: consistent size and color across all modules
7. Empty states: consistent pattern
8. Spacing: consistent use of the CSS variable spacing

### Step 5: Specific Fixes (Common AI-Generated UI Problems)

1. **Remove all icon-heavy navigation.** KOVA uses text-only sidebar navigation. If there are Lucide icons next to every nav item, REMOVE THEM. The only acceptable icons are small functional indicators (chevrons for expand/collapse, × for close/clear).

2. **Remove excessive bold text.** Section headers should be weight 500, not 700. Only page titles can be 600. Bold is used for emphasis within body text, not for every label.

3. **Remove rainbow status colors.** Status badges use ONLY the 5 defined colors (green, yellow, red, blue, gray). Not teal, not purple, not orange, not pink.

4. **Remove card shadows.** Cards have border only, shadow-none or shadow-sm maximum. If there are shadow-md or shadow-lg cards anywhere, strip them.

5. **Remove rounded-xl and rounded-2xl.** Maximum border-radius for cards and containers is 8px (rounded-lg). Buttons are 6px (rounded-md). Badges are rounded-full.

6. **Remove gradient backgrounds.** No gradients on cards, buttons, or page backgrounds. Solid colors only, per the palette defined above.

7. **Fix cramped forms.** If form fields are stacked with 4-8px gap, increase to 20px between field groups. If labels are beside inputs, move them above.

8. **Fix table styling.** If tables have colored row stripes, thick borders, or heavy header backgrounds, strip to the minimal spec above.

9. **Fix button proliferation.** If there are more than 2 buttons in any page header, reduce. One primary action, everything else is secondary or in a dropdown menu.

10. **Fix page backgrounds.** The page background should be #F1F5F9. Cards sit on top in white. If the whole page is white with no visual separation, add the gray page background and card containers.

## Testing Your Work

After applying changes, visually compare every page against the Qualia screenshots. The quality bar:

- Does it feel as clean and professional as Qualia?
- Is there consistent spacing rhythm across the page?
- Are form labels positioned correctly (above, uppercase, small)?
- Is the sidebar navigation using the dark background with grouped sections?
- Are status badges consistent sizes and colors?
- Does the table styling match (subtle headers, no row stripes, comfortable padding)?
- Is the right panel present and collapsible on detail pages?

If ANY page still looks like scaffolded developer output after this pass, continue iterating until it matches Qualia quality.
