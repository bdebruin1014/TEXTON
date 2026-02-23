# KOVA Design System v3.3 — Claude Code Implementation Prompt

Read this entire document before writing any code. Then execute each section in order.

---

## Pre-Flight: Discover the Codebase

Run these commands first. Read the output. Adapt all file paths below to what you actually find.

```bash
find . -name "*.css" -not -path "*/node_modules/*" | head -20
find . -name "globals.css" -not -path "*/node_modules/*"
find . -path "*/components/ui/*" -not -path "*/node_modules/*" | head -30
grep -r "lucide\|Icon\|icon\|emoji" --include="*.tsx" --include="*.ts" -l | head -20
grep -r "KOVA\|Kova\|kova" --include="*.tsx" --include="*.ts" --include="*.css" -l | head -20
cat app/globals.css
cat tailwind.config.* 2>/dev/null || cat tailwind.config.js
ls -la app/
ls -la components/
ls -la app/layout.tsx 2>/dev/null || ls -la app/layout.jsx
```

---

## CRITICAL DESIGN RULES (read before every component)

1. **ZERO ICONS. ZERO EMOJIS. ANYWHERE.** Do not install lucide-react. Do not use SVGs. Do not use emoji characters. The UI uses text, color, spacing, and typography only. If a shadcn/ui component has a hard internal dependency on lucide (like Select chevrons), that is acceptable — but never add NEW icon imports.

2. **Dark sidebar.** The left sidebar has a dark charcoal background (#1E2A30), light text (#C8D6CF), and a green left-border on the active item. This matches the Qualia reference pattern. It is NOT white.

3. **Browser-style record tabs.** When viewing records in Pipeline, Projects, Construction, Disposition, or Accounting, a horizontal tab bar appears below the top nav (like Chrome browser tabs). Each open record is a tab with the record name and an x close button. A + button opens a new record. Tabs have a dark background (#2A3540), the active tab blends into the page background (#F0F3F7).

4. **Right panel = Chat + Tasks + Notes.** The right panel is a stacked vertical layout (not horizontal tabs). It has collapsible sections: CHAT (with direct messages and online status dots), TASKS (assigned to the current user for this record, with checkboxes), and NOTES (threaded notes with "Add Note" button). This matches the Qualia pattern exactly.

5. **Global nav modules (9 items):** Pipeline, Projects, Construction, Disposition, Contact, Calendar, Workflow, Operations, Admin. That is it. No "Tools" or other dropdown. Remove any existing "Tools" menu and redistribute its items under Admin or Operations as appropriate.

---

## Section 1: Rebrand to KOVA

Find every UI-facing instance of "TEKTON" or "Tekton" and replace with "KOVA". Keep kova (lowercase) in package.json name, file paths, and code identifiers.

```bash
grep -rn "KOVA\|Kova" --include="*.tsx" --include="*.ts" --include="*.css" --include="*.html" . | grep -v node_modules | grep -v ".git"
```

Replace each match. Page titles, meta tags, nav bar text, README display text all become KOVA.

---

## Section 2: Design Tokens (tokens.css)

Create or replace the CSS custom properties file. Use HSL values WITHOUT the hsl() wrapper so Tailwind opacity modifiers work.

Create app/tokens.css (or replace the existing variables in app/globals.css):

```css
@layer base {
  :root {
    --primary: 147 28% 15%;
    --primary-foreground: 0 0% 100%;
    --primary-hover: 147 28% 21%;
    --primary-700: 150 32% 26%;
    --primary-accent: 142 22% 52%;

    --nav-bg: 207 42% 10%;
    --nav-foreground: 210 33% 96%;
    --nav-muted: 211 16% 56%;
    --nav-active: 142 22% 52%;

    --sidebar-bg: 195 22% 15%;
    --sidebar-foreground: 150 12% 80%;
    --sidebar-muted: 211 16% 56%;
    --sidebar-active: 165 18% 20%;
    --sidebar-active-border: 142 22% 52%;
    --sidebar-section: 200 10% 40%;
    --sidebar-hover: 195 15% 18%;

    --background: 214 18% 95%;
    --card: 0 0% 100%;
    --card-foreground: 210 43% 14%;
    --card-hover: 210 20% 98%;
    --popover: 0 0% 100%;
    --popover-foreground: 210 43% 14%;

    --foreground: 210 43% 14%;
    --text-secondary: 215 13% 35%;
    --muted: 214 18% 95%;
    --muted-foreground: 211 12% 59%;
    --text-hint: 211 16% 69%;

    --border: 214 32% 91%;
    --border-light: 220 27% 95%;
    --input: 214 32% 91%;
    --ring: 147 28% 15%;

    --success: 146 25% 38%;
    --success-bg: 140 12% 92%;
    --success-text: 148 30% 25%;
    --success-foreground: 0 0% 100%;

    --warning: 36 35% 45%;
    --warning-bg: 36 25% 91%;
    --warning-text: 36 38% 30%;

    --info: 210 30% 42%;
    --info-bg: 210 30% 92%;
    --info-text: 210 33% 31%;

    --destructive: 0 22% 48%;
    --destructive-bg: 0 18% 92%;
    --destructive-text: 0 27% 33%;
    --destructive-foreground: 0 0% 100%;

    --accent: 140 12% 96%;
    --accent-foreground: 147 28% 15%;
    --secondary: 140 12% 90%;
    --secondary-foreground: 147 28% 15%;

    --chart-1: 147 28% 15%;
    --chart-2: 210 30% 42%;
    --chart-3: 36 35% 45%;
    --chart-4: 270 16% 43%;
    --chart-5: 0 22% 48%;

    --tab-bar-bg: 204 20% 21%;
    --tab-inactive: 195 22% 15%;
    --tab-inactive-text: 211 16% 56%;
    --tab-active-text: 210 43% 14%;

    --panel-bg: 210 20% 98%;

    --shadow-sm: 0 1px 2px hsl(210 43% 14% / 0.04);
    --shadow-md: 0 2px 8px hsl(210 43% 14% / 0.06), 0 1px 2px hsl(210 43% 14% / 0.04);
    --shadow-lg: 0 4px 16px hsl(210 43% 14% / 0.08), 0 2px 4px hsl(210 43% 14% / 0.04);

    --radius: 0.625rem;
    --radius-sm: 0.375rem;
    --radius-lg: 0.875rem;
    --radius-xl: 1.25rem;
  }
}
```

---

## Section 3: Tailwind Config

Replace tailwind.config.js entirely. Preserve any existing content paths.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT:'hsl(var(--primary))',foreground:'hsl(var(--primary-foreground))',hover:'hsl(var(--primary-hover))',accent:'hsl(var(--primary-accent))' },
        secondary: { DEFAULT:'hsl(var(--secondary))',foreground:'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT:'hsl(var(--destructive))',foreground:'hsl(var(--destructive-foreground))',bg:'hsl(var(--destructive-bg))' },
        success: { DEFAULT:'hsl(var(--success))',bg:'hsl(var(--success-bg))',text:'hsl(var(--success-text))',foreground:'hsl(var(--success-foreground))' },
        warning: { DEFAULT:'hsl(var(--warning))',bg:'hsl(var(--warning-bg))',text:'hsl(var(--warning-text))' },
        info: { DEFAULT:'hsl(var(--info))',bg:'hsl(var(--info-bg))',text:'hsl(var(--info-text))' },
        muted: { DEFAULT:'hsl(var(--muted))',foreground:'hsl(var(--muted-foreground))' },
        accent: { DEFAULT:'hsl(var(--accent))',foreground:'hsl(var(--accent-foreground))' },
        popover: { DEFAULT:'hsl(var(--popover))',foreground:'hsl(var(--popover-foreground))' },
        card: { DEFAULT:'hsl(var(--card))',foreground:'hsl(var(--card-foreground))' },
        nav: { bg:'hsl(var(--nav-bg))',foreground:'hsl(var(--nav-foreground))',muted:'hsl(var(--nav-muted))',active:'hsl(var(--nav-active))' },
        sidebar: { bg:'hsl(var(--sidebar-bg))',foreground:'hsl(var(--sidebar-foreground))',muted:'hsl(var(--sidebar-muted))',active:'hsl(var(--sidebar-active))','active-border':'hsl(var(--sidebar-active-border))',section:'hsl(var(--sidebar-section))',hover:'hsl(var(--sidebar-hover))' },
        chart: { 1:'hsl(var(--chart-1))',2:'hsl(var(--chart-2))',3:'hsl(var(--chart-3))',4:'hsl(var(--chart-4))',5:'hsl(var(--chart-5))' },
      },
      fontFamily: { sans:['"DM Sans"','system-ui','sans-serif'], mono:['"JetBrains Mono"','monospace'] },
      boxShadow: { sm:'var(--shadow-sm)',md:'var(--shadow-md)',lg:'var(--shadow-lg)' },
      borderRadius: { sm:'var(--radius-sm)',DEFAULT:'var(--radius)',lg:'var(--radius-lg)',xl:'var(--radius-xl)' },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

---

## Section 4: Global CSS

Replace app/globals.css:

```css
@import './tokens.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground antialiased; font-feature-settings: 'rlig' 1, 'calt' 1; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.3); }
}
```

---

## Section 5: Fonts (layout.tsx)

```tsx
import { DM_Sans, JetBrains_Mono } from 'next/font/google';
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
// body:
<body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
```

---

## Section 6: Logo Component

Create components/logo.tsx. The logo is a small gradient green square with a T letterform plus the wordmark. No icons.

```tsx
export function KovaLogo({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const dims = { sm: 22, default: 26, lg: 34 }[size];
  const fontSize = { sm: 10, default: 12, lg: 15 }[size];
  const textSize = { sm: '12px', default: '14px', lg: '17px' }[size];
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center rounded-md font-bold"
        style={{ width:dims, height:dims, fontSize, background:'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-700)) 100%)', color:'hsl(var(--primary-accent))', boxShadow:'0 0 12px hsl(var(--primary-accent) / 0.15)' }}>T</div>
      <span className="font-bold" style={{ fontSize:textSize, letterSpacing:'1.5px', color:'hsl(var(--primary-accent))' }}>KOVA</span>
    </div>
  );
}
```

---

## Section 7: Top Navigation Bar

9 text-only modules. No icons. No dropdowns. Remove any existing Tools menu.

Modules: Pipeline, Projects, Construction, Disposition, Contact, Calendar, Workflow, Operations, Admin

Specs: height 48px, bg nav-bg (#0D1B24), gradient bottom border. Links are 12px font-medium nav-muted, active is white with 2px green bottom bar + glow. Right side: search input 160px with cmd-K badge, 7px notification dot, 28px avatar with initials.

```tsx
const NAV_MODULES = [
  { label: 'Pipeline', href: '/pipeline' },
  { label: 'Projects', href: '/projects' },
  { label: 'Construction', href: '/construction' },
  { label: 'Disposition', href: '/disposition' },
  { label: 'Contact', href: '/contacts' },
  { label: 'Calendar', href: '/calendar' },
  { label: 'Workflow', href: '/workflow' },
  { label: 'Operations', href: '/operations' },
  { label: 'Admin', href: '/admin' },
];
```

---

## Section 8: Browser-Style Record Tabs

NEW component. Renders below top nav on detail pages in: Pipeline, Projects, Construction, Disposition, Accounting.

Tab bar bg: #2A3540. Height: 34px. Active tab: bg matches page bg (#F0F3F7), text foreground, font-semibold. Inactive tab: bg #1E2A30, text #7B8FA3. Each tab: record name (truncated 25 chars) + x close button. Plus button at end. Tabs have top border-radius 6px, no bottom radius.

Use Zustand for tab state. Store open tabs per module. Opening a record adds a tab. Closing x removes it.

---

## Section 9: Dark Sidebar

Background: #1E2A30 (hsl var --sidebar-bg). Light text. Green active border.

Index pages: section headers 9px uppercase sidebar-section color. Nav items 12px, sidebar-foreground at 75% opacity. Active: 3px green left border, bg sidebar-active, white text, font-semibold. Hover: bg sidebar-hover.

Detail pages: back link 12px muted. Record identity: name 13px white semibold, code 11px muted. Count row with small stat chips. Send Message button full-width bg-primary. Section dividers and nav items same as index.

---

## Section 10: Right Panel (Chat + Tasks + Notes)

Width 260px. Background #FAFBFC. Border-left. Stacked collapsible sections, NOT tabs.

CHAT section: header with toggle arrow. Tabs All/Messages/Channels. DM list with 6px status dots (green=online, gray=offline). Just names.

TASKS section: header with count badge. Helper text. Checkbox list with task name, due date, assignee.

NOTES section: header. Empty state italic. Add Note button full-width bordered.

---

## Section 11: Property / Parcels Plus Button

On project property detail: address fields in grid (ADDRESS, APT, CITY, COUNTY, STATE, ZIP). Uppercase 10px labels. Parcel ID section with green + button (36x36, bg-primary, white + text) to add rows. Each parcel: label PARCEL ID #N, input, x remove button (24px circle). Same pattern for any repeatable field group.

---

## Section 12: Admin Page

Card grid matching Qualia admin. Optional greeting and search bar. 3-column grid of white cards with border, rounded-lg, 24px padding, hover lift. Each card: title (15px semibold) with right arrow character, description (12px muted). NO icons on cards.

Cards: Organization, Entities, Workflow Templates, Custom Fields, Document Templates, Integrations, Fee Schedule, Permissions, System Settings.

---

## Section 13: Dashboard

Full width, no sidebar, no record tabs. Page header + quick actions (6-col, text-only, colored top borders) + stats (4-col, left bar, no icons) + content grid (2x2 cards).

---

## Section 14: shadcn/ui Theming

Badge: add success, warning, info, danger, gray variants with StatusDot (5px circle).
Button: primary=forest green, secondary=white with border, ghost=transparent.
Card: rounded-lg border shadow-sm hover:shadow-md.

---

## Section 15: Framer Motion

Install framer-motion. Create page-transition wrapper. Wrap pages. Page-level only, no micro-animations.

---

## Section 16: Final Sweep

```bash
grep -rn "lucide-react\|@heroicons\|react-icons" --include="*.tsx" --include="*.ts" . | grep -v node_modules
grep -rn "<svg" --include="*.tsx" . | grep -v node_modules
grep -rn "Icon\b" --include="*.tsx" . | grep -v node_modules | grep -v favicon | grep -v ".d.ts"
grep -rn "Tools" --include="*.tsx" . | grep -v node_modules
npm run build
```

Fix all results. Verify build passes.

---

## Execution Order

1. Pre-flight discovery
2. Remove icon imports, replace with text
3. Create tokens.css
4. Replace tailwind.config
5. Update globals.css
6. Update layout.tsx fonts
7. Create logo component
8. Build top nav (9 modules, no Tools, text only)
9. Build record tabs component + Zustand store
10. Rebuild sidebar as DARK
11. Rebuild right panel as stacked Chat/Tasks/Notes
12. Build property/parcel plus-button pattern
13. Build admin page card grid
14. Build dashboard
15. Theme shadcn/ui Badge, Button, Card
16. Install framer-motion + page transitions
17. Rebrand TEKTON to KOVA everywhere
18. Final icon/Tools sweep
19. npm run build

---

## DO NOT CHANGE

AutoSave pattern, Command Palette (cmdk), Supabase auth/middleware, database types, any business logic, TypeScript strict mode.
