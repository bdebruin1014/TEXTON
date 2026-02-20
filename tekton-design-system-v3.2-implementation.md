# TEK·TON Design System v3.2 — Implementation Prompt for Claude Code

## Mission

Apply the approved TEK·TON Design System v3.2 to the existing Tekton codebase. This covers six deliverables:

1. Rebrand from "TEKTON" to "TEK·TON" across all UI touchpoints
2. Replace the existing CSS token system with v3.2 HSL-formatted design tokens
3. Theme all shadcn/ui components to match the v3.2 palette
4. Rebuild the Dashboard page to match the approved design
5. Add Framer Motion page transitions (scoped — page-level only)
6. Update the nav bar logo mark to the approved design

**CRITICAL DESIGN RULE: NO ICONS. NO EMOJIS. ANYWHERE.**

This application uses text-only navigation, text-only labels, and text-only UI elements. Do not install `lucide-react` or any icon library. Do not use SVG icons, emoji characters, or icon fonts anywhere in the interface. The design achieves hierarchy through typography, color, spacing, and weight — never through icons. Every place where a typical SaaS app would use an icon, TEK·TON uses well-set text instead. This is a deliberate design choice that gives the app a premium, editorial feel.

Do NOT change any application architecture, routing, database schema, business logic, or component structure. This is a visual-only refactor.

---

## Current State of the Codebase

The app is a Next.js 14 application with:

- `package.json` at root with Next 14, React 18, Supabase, Tailwind 3.4
- `tailwind.config.js` with a `cedar` color scale and `DM Sans` / `JetBrains Mono` fonts
- `middleware.ts` handling Supabase auth
- shadcn/ui components (check `components/ui/` for what's already installed)
- CSS variables likely in `app/globals.css` or a `tokens.css` file

Before making any changes, run these commands to understand the current structure:

```bash
find . -name "*.css" -not -path "*/node_modules/*" | head -20
find . -name "globals.css" -not -path "*/node_modules/*"
find . -name "tokens.css" -not -path "*/node_modules/*"
find . -path "*/components/ui/*" -not -path "*/node_modules/*" | head -30
grep -r "TEKTON\|Tekton\|tekton" --include="*.tsx" --include="*.ts" --include="*.css" -l | head -20
grep -r "lucide\|Icon\|icon\|emoji" --include="*.tsx" --include="*.ts" -l | head -20
cat app/globals.css
cat tailwind.config.js
ls -la app/
ls -la components/
```

Read the output carefully before proceeding. Adapt the instructions below to the actual file paths you find. If you find ANY existing icon imports (lucide-react, heroicons, react-icons, etc.), REMOVE them.

---

## Deliverable 1: Rebrand to TEK·TON

### What to Change

Every instance of the brand name in the UI must be updated:

| Context | Old | New |
|---------|-----|-----|
| Nav bar logo text | `TEKTON` | `TEK·TON` |
| Page titles / meta tags | `Tekton` | `TEK·TON` |
| `<title>` tag | `Tekton` | `TEK·TON` |
| README / comments | `Tekton` | `TEK·TON` (display) or `Tekton` (prose references) |
| package.json `name` field | Keep as `tekton` (no special chars in npm names) |

The middle dot (·) is Unicode `U+00B7` (middle dot). In JSX: `TEK·TON` or `TEK\u00B7TON`. In HTML: `TEK&middot;TON`.

### Logo Mark Component

The logo mark is a 28×28px rounded square with a gradient green background and a white "T" letterform. No icons — just the letter:

```tsx
// components/logo.tsx
export function TektonLogo({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const dims = { sm: 24, default: 28, lg: 36 }[size];
  const fontSize = { sm: 11, default: 13, lg: 16 }[size];
  
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-md font-bold"
        style={{
          width: dims,
          height: dims,
          fontSize,
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-700)) 100%)',
          color: 'hsl(var(--primary-accent))',
          boxShadow: '0 0 12px hsl(var(--primary-accent) / 0.2)',
        }}
      >
        T
      </div>
      <span
        className="font-bold tracking-[0.15em] text-[15px]"
        style={{ color: 'hsl(var(--primary-accent))' }}
      >
        TEK·TON
      </span>
    </div>
  );
}
```

---

## Deliverable 2: Design Token System v3.2

### Step 1: Create or Replace tokens.css

Find the existing CSS variables file (likely `app/globals.css` or a dedicated `tokens.css`). Replace ALL color variables with the v3.2 system using HSL format for Tailwind opacity support.

```css
/* tokens.css — TEK·TON Design System v3.2 */
/* HSL values (no hsl() wrapper) for Tailwind bg-primary/90 support */

@layer base {
  :root {
    /* ═══ CORE TRIAD ═══ */
    --primary: 147 28% 15%;           /* #1B3022 — Deep forest green */
    --primary-foreground: 0 0% 100%;  /* #FFFFFF */
    --primary-hover: 147 28% 21%;     /* #264733 */
    --primary-700: 150 32% 26%;       /* #2D5A3E */
    --primary-accent: 142 22% 52%;    /* #6B9E7A */

    /* ═══ NAVIGATION ═══ */
    --nav-bg: 207 42% 10%;            /* #0D1B24 — Near-black navy */
    --nav-foreground: 210 33% 96%;    /* #F1F5F9 */
    --nav-muted: 211 16% 56%;         /* #7B8FA3 */
    --nav-active: 142 22% 52%;        /* #6B9E7A */

    /* ═══ SURFACES ═══ */
    --background: 214 18% 95%;        /* #F0F3F7 — Page background */
    --card: 0 0% 100%;                /* #FFFFFF */
    --card-foreground: 210 43% 14%;   /* #112233 */
    --card-hover: 210 20% 98%;        /* #FAFBFC */
    --popover: 0 0% 100%;
    --popover-foreground: 210 43% 14%;

    /* ═══ SIDEBAR ═══ */
    --sidebar-bg: 220 33% 99%;        /* #FAFBFD */
    --sidebar-active: 140 12% 96%;    /* #F1F5F4 */
    --sidebar-active-border: 147 28% 15%; /* #1B3022 */

    /* ═══ TEXT HIERARCHY ═══ */
    --foreground: 210 43% 14%;        /* #112233 — Primary text */
    --text-secondary: 215 13% 35%;    /* #4A5568 */
    --muted: 214 18% 95%;
    --muted-foreground: 211 12% 59%;  /* #8896A6 */
    --text-hint: 211 16% 69%;         /* #A0AEC0 */

    /* ═══ BORDERS ═══ */
    --border: 214 32% 91%;            /* #E2E8F0 */
    --border-light: 220 27% 95%;      /* #EDF2F7 */
    --input: 214 32% 91%;
    --ring: 147 28% 15%;              /* #1B3022 — Focus ring */

    /* ═══ STATUS — MUTED & DESATURATED ═══ */
    --success: 146 25% 38%;           /* #4A7A5B */
    --success-bg: 140 12% 92%;        /* #E8EFEA */
    --success-text: 148 30% 25%;      /* #2E5440 */
    --success-foreground: 0 0% 100%;

    --warning: 36 35% 45%;            /* #9A7B4A */
    --warning-bg: 36 25% 91%;         /* #F0EBE0 */
    --warning-text: 36 38% 30%;       /* #6B5530 */

    --info: 210 30% 42%;              /* #4A6B8A */
    --info-bg: 210 30% 92%;           /* #E4ECF2 */
    --info-text: 210 33% 31%;         /* #34506B */

    --destructive: 0 22% 48%;         /* #946060 */
    --destructive-bg: 0 18% 92%;      /* #F0E6E6 */
    --destructive-text: 0 27% 33%;    /* #6B3E3E */
    --destructive-foreground: 0 0% 100%;

    /* ═══ ACCENT ═══ */
    --accent: 140 12% 96%;            /* #F1F5F4 */
    --accent-foreground: 147 28% 15%;

    --secondary: 140 12% 90%;         /* #DDE6DF */
    --secondary-foreground: 147 28% 15%;

    /* ═══ CHART COLORS ═══ */
    --chart-1: 147 28% 15%;           /* #1B3022 */
    --chart-2: 210 30% 42%;           /* #4A6B8A */
    --chart-3: 36 35% 45%;            /* #9A7B4A */
    --chart-4: 270 16% 43%;           /* #6B5B80 */
    --chart-5: 0 22% 48%;             /* #946060 */

    /* ═══ SHADOWS ═══ */
    --shadow-sm: 0 1px 2px hsl(210 43% 14% / 0.04);
    --shadow-md: 0 2px 8px hsl(210 43% 14% / 0.06), 0 1px 2px hsl(210 43% 14% / 0.04);
    --shadow-lg: 0 4px 16px hsl(210 43% 14% / 0.08), 0 2px 4px hsl(210 43% 14% / 0.04);
    --shadow-xl: 0 8px 32px hsl(210 43% 14% / 0.10), 0 4px 8px hsl(210 43% 14% / 0.06);

    /* ═══ RADIUS ═══ */
    --radius: 0.625rem;               /* 10px */
    --radius-sm: 0.375rem;            /* 6px */
    --radius-lg: 0.875rem;            /* 14px */
    --radius-xl: 1.25rem;             /* 20px */
  }
}
```

### Step 2: Update tailwind.config

Replace the existing Tailwind config with this. Keep any content paths that already exist:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
          accent: 'hsl(var(--primary-accent))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          bg: 'hsl(var(--destructive-bg))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          bg: 'hsl(var(--success-bg))',
          text: 'hsl(var(--success-text))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          bg: 'hsl(var(--warning-bg))',
          text: 'hsl(var(--warning-text))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          bg: 'hsl(var(--info-bg))',
          text: 'hsl(var(--info-text))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        nav: {
          bg: 'hsl(var(--nav-bg))',
          foreground: 'hsl(var(--nav-foreground))',
          muted: 'hsl(var(--nav-muted))',
          active: 'hsl(var(--nav-active))',
        },
        sidebar: {
          bg: 'hsl(var(--sidebar-bg))',
          active: 'hsl(var(--sidebar-active))',
          'active-border': 'hsl(var(--sidebar-active-border))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

### Step 3: Add Google Fonts

In the root layout (likely `app/layout.tsx`), ensure DM Sans and JetBrains Mono are loaded:

```tsx
import { DM_Sans, JetBrains_Mono } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// In the <body> tag:
<body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
```

---

## Deliverable 3: Theme shadcn/ui Components

### Install Missing Components

If not already installed, add these shadcn/ui components:

```bash
npx shadcn@latest add button card dialog select tabs badge input popover sheet table tooltip
```

### Badge Component Variants

The Badge component needs custom status variants. Update `components/ui/badge.tsx`:

```tsx
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive-bg text-destructive-text',
        outline: 'border border-border text-foreground',
        success: 'bg-success-bg text-success-text',
        warning: 'bg-warning-bg text-warning-text',
        info: 'bg-info-bg text-info-text',
        danger: 'bg-destructive-bg text-destructive-text',
        gray: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);
```

Add a StatusDot sub-component for badges that need a colored dot indicator:

```tsx
function StatusDot({ variant }: { variant: string }) {
  const colors: Record<string, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    info: 'bg-info',
    danger: 'bg-destructive',
    destructive: 'bg-destructive',
    gray: 'bg-muted-foreground',
  };
  return <span className={`h-1.5 w-1.5 rounded-full ${colors[variant] || 'bg-muted-foreground'}`} />;
}
```

### Button Component

Ensure the primary button uses the deep forest green:

```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] text-sm font-semibold transition-all',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
        secondary: 'bg-card text-foreground border border-border hover:bg-card-hover',
        ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);
```

### Card Component

Cards should have the 14px radius, subtle shadow, and hover lift:

```tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-lg)] border border-border bg-card shadow-sm transition-shadow hover:shadow-md',
        className
      )}
      {...props}
    />
  )
);
```

---

## Deliverable 4: Top Navigation Bar

The nav bar uses TEXT-ONLY links. No icons anywhere.

### Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ [T] TEK·TON   Pipeline  Projects  Construction  Disposition  Accounting            │
│                Contacts  Calendar  Admin                       [Search ⌘K]  ● [BD] │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Specifications

- Background: `hsl(var(--nav-bg))` — #0D1B24
- Height: 52px
- Bottom border: 1px gradient line `linear-gradient(90deg, transparent, hsl(var(--nav-active) / 0.2), transparent)`
- Logo: TektonLogo component (gradient square with "T" + "TEK·TON" text)
- Nav links: `text-[13px] font-medium` in `hsl(var(--nav-muted))`. TEXT ONLY. No icons.
- Active link: `text-white` with a 2px bottom border in `hsl(var(--nav-active))` with `box-shadow: 0 0 8px hsl(var(--nav-active) / 0.4)`
- Hover: `text-[#C8D6CF]` with `bg-white/4` background
- Search: `bg-white/6 border border-white/8` rounded input, 200px, expands to 260px on focus. Placeholder text "Search..." with ⌘K hint badge
- Notification indicator: a simple 6px colored dot (no bell icon). `bg-destructive` circle positioned in the nav-right area. Only visible when there are unread notifications.
- Avatar: 32×32 rounded-lg, gradient green background (`linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-700)))`), initials in `hsl(var(--primary-accent))`, 11px font-bold

### Nav Link Component

```tsx
function NavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'relative px-3 py-3.5 text-[13px] font-medium transition-colors rounded-md',
        isActive
          ? 'text-white'
          : 'text-nav-muted hover:text-[#C8D6CF] hover:bg-white/[0.04]'
      )}
    >
      {label}
      {isActive && (
        <span
          className="absolute bottom-0 left-3 right-3 h-0.5 rounded-t-sm"
          style={{
            background: 'hsl(var(--nav-active))',
            boxShadow: '0 0 8px hsl(var(--nav-active) / 0.4)',
          }}
        />
      )}
    </Link>
  );
}
```

---

## Deliverable 5: Dashboard Page

Rebuild the dashboard to match the approved design. The dashboard has NO sidebar — it's a full-width page.

### Layout (top to bottom)

1. **Page Header**: "Dashboard" title (22px, font-bold) + "Overview of your operations" subtitle (14px, muted) + right-aligned action buttons ("Refresh" secondary, "+ New Opportunity" primary)
2. **Quick Actions Row**: 6 action buttons in a CSS grid (`grid-cols-6`, gap-2.5). Each is a white card with border, 14px radius, centered text label, colored top border (3px) to indicate category. No icons — just the label text.
3. **Stats Grid**: 4 KPI stat cards in a CSS grid (`grid-cols-4`, gap-4)
4. **Content Grid**: 2×2 grid of dashboard cards (`grid-cols-2`, gap-5)

### Quick Actions (Text-Only, Colored Top Border)

Each quick action is a clickable card with a 3px colored top border and centered label:

| Action | Top Border Color |
|--------|-----------------|
| Daily Log | `hsl(var(--success))` |
| New PO | `hsl(var(--info))` |
| Inspection | `hsl(var(--warning))` |
| Create RFI | `hsl(var(--destructive))` |
| Punch List | `#6B5B80` (purple) |
| Reports | `hsl(var(--muted-foreground))` |

```tsx
function QuickAction({ label, borderColor }: { label: string; borderColor: string }) {
  return (
    <button
      className="bg-card border border-border rounded-[var(--radius-lg)] px-3 py-4 text-center
                 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      style={{ borderTopWidth: 3, borderTopColor: borderColor }}
    >
      <span className="text-xs font-semibold text-[hsl(var(--text-secondary))]">{label}</span>
    </button>
  );
}
```

### Stat Cards (No Icons)

Each stat card has:
- 4px left accent bar (colored by tier)
- Label (12px uppercase, font-medium, muted, letter-spacing 0.4px)
- Value (28px, font-bold, --foreground)
- Sub text (12px, muted) with optional trend indicator (text-only: "↑ 2 new" in success color)

No icon chips. The colored left bar provides enough visual differentiation.

```tsx
function StatCard({
  label, value, sub, trend, color
}: {
  label: string; value: string; sub: string; trend?: { text: string; direction: 'up' | 'down' };
  color: 'green' | 'blue' | 'amber' | 'red';
}) {
  const borderColors = {
    green: 'hsl(var(--primary))',
    blue: 'hsl(var(--info))',
    amber: 'hsl(var(--warning))',
    red: 'hsl(var(--destructive))',
  };

  return (
    <div
      className="bg-card rounded-[var(--radius-lg)] border border-border shadow-sm p-5
                 transition-all hover:shadow-md hover:-translate-y-px"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColors[color] }}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="text-[28px] font-bold text-foreground leading-none tracking-tight">
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
        {sub}
        {trend && (
          <span className={cn('font-semibold text-[11px]', trend.direction === 'up' ? 'text-success' : 'text-destructive')}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.text}
          </span>
        )}
      </div>
    </div>
  );
}
```

Stats to display:

| Label | Color | Value (empty state) |
|-------|-------|---------------------|
| Active Projects | green | 0 |
| Jobs in Progress | blue | 0 |
| Pipeline Value | amber | $0 |
| Pending Closings | green | 0 |

Values should come from actual data queries. Use `0` / `$0` as empty states until data exists.

### Dashboard Content Cards

Each card has:
- Header row: title text (14px, font-semibold) + "View All →" ghost button. No icons in the header.
- Body: list rows or empty state
- 14px radius, border, shadow-sm, hover shadow-md + translateY(-1px)

**Empty State**: When no data exists, show a centered block with bold title ("No projects yet") and helper text ("Create your first project to get started"). No icons in empty states — just typography.

```tsx
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-10 px-5">
      <div className="text-sm font-semibold text-[hsl(var(--text-secondary))]">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </div>
  );
}
```

### Dashboard Card Sections

**Active Projects card**: Each row shows a 36×36 rounded-lg avatar square (gradient green background, 2-letter initials in primary color), project name (13px, font-semibold), meta line (11px, muted), progress bar (4px, rounded), and right-aligned KPI value.

**Active Jobs card**: Each row shows job ID (primary color, font-semibold), lot, floor plan, and a status badge (pill with StatusDot).

**Pipeline card**: Each row shows a colored avatar (tinted to match the opportunity's stage), opportunity name, meta, and status badge.

**Upcoming Closings card**: Each row shows a date badge (44×44 rounded-lg card with month abbreviation + day number), property info, and sale price.

---

## Deliverable 6: Framer Motion Page Transitions

### Install

```bash
npm install framer-motion
```

### Scope — Page-Level Only

Add transitions at the route/page level. Do NOT add micro-interactions to individual components, table rows, or badges.

### Implementation

Create a transition wrapper component:

```tsx
// components/page-transition.tsx
'use client';

import { motion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

Wrap each page's content in this component. Example:

```tsx
// app/dashboard/page.tsx
import { PageTransition } from '@/components/page-transition';

export default function DashboardPage() {
  return (
    <PageTransition>
      {/* dashboard content */}
    </PageTransition>
  );
}
```

---

## Sidebar Styling (Qualia Pattern)

The sidebar follows the Qualia pattern. It uses text-only navigation — no icons.

### Index Sidebar (list pages)

- Section header: 10px, font-bold, uppercase, letter-spacing 1px, `text-hint` color
- Nav items: 13px, `text-secondary`, padding 7px 20px
- Active item: 3px left border in `sidebar-active-border`, background `sidebar-active`, text `primary`, font-semibold
- Hover: background `sidebar-active`, text `primary`

### Detail Sidebar (record pages)

- Back link: 12px, muted, flex with left arrow character "←" (text, not icon)
- Record identity block: 40×40 gradient avatar with initials, name (16px, font-semibold), meta line (12px, muted) with middle dot separator
- Section dividers: same as index (10px uppercase)
- Nav items: same styling, text only, no icons

---

## Global CSS Reset (add to globals.css)

```css
@import './tokens.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: 'rlig' 1, 'calt' 1;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.3);
  }
}
```

---

## Icon Removal Checklist

After all other work is done, do a final sweep to ensure zero icons remain:

```bash
# Find and remove any icon library imports
grep -rn "lucide-react\|@heroicons\|react-icons\|@radix-ui/react-icons" --include="*.tsx" --include="*.ts" .
# Find any SVG elements that might be inline icons
grep -rn "<svg" --include="*.tsx" . | grep -v "node_modules"
# Find any emoji usage
grep -Prn '[\x{1F300}-\x{1F9FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]' --include="*.tsx" --include="*.ts" .
# Find any Icon component references
grep -rn "Icon\b" --include="*.tsx" . | grep -v "node_modules" | grep -v "favicon"
```

If ANY of these return results, remove the offending code. Replace icon-dependent UI elements with text-only equivalents.

If a component from shadcn/ui has a hard dependency on lucide-react (some do for things like Select chevrons or Dialog close buttons), those specific internal uses are acceptable but should NOT be expanded. Do not add new icon imports.

---

## Things to NOT Change

These are architectural strengths that must be preserved exactly as they are:

1. **AutoSave pattern** — 800ms debounce, no save buttons, spinner → checkmark → error. Do not touch.
2. **Command Palette (⌘K)** — cmdk integration. Do not touch.
3. **Sidebar Qualia pattern** — Index pages show filters with counts, detail pages show record identity + section nav. Do not change the navigation logic, only the styling.
4. **Right Panel** — Tasks, Notes, Activity tabs. Do not change structure, only styling.
5. **TypeScript strict mode** — Do not add `any` types or `@ts-ignore`.
6. **Supabase auth / middleware** — Do not touch.
7. **All business logic** — Deal analyzer, lot inventory, job creation, disposition flows. Untouched.
8. **Database types** — `types/database.ts` is auto-generated. Never edit manually.

---

## Execution Order

Work through these in sequence. After each step, verify the app still builds (`npm run build`) and renders correctly:

1. Read the codebase structure first (`find`, `ls`, `cat` the key files)
2. Remove any existing icon library imports (`lucide-react`, `react-icons`, etc.) and replace icon usage with text
3. Create/replace `tokens.css` with v3.2 HSL tokens
4. Update `tailwind.config.js`
5. Update `app/globals.css` with the global reset
6. Update `app/layout.tsx` with fonts + body classes
7. Create `components/logo.tsx` (TEK·TON logo mark)
8. Update the top nav bar component with v3.2 styling — text-only links, no icons
9. Update/create shadcn/ui Badge with status variants
10. Update shadcn/ui Button and Card with v3.2 styling
11. Rebuild the Dashboard page (text-only quick actions, stat cards without icon chips, content grid)
12. Install `framer-motion` and create `components/page-transition.tsx`
13. Wrap existing pages with `<PageTransition>`
14. Search for any remaining "TEKTON" strings and replace with "TEK·TON"
15. Run the icon removal checklist (grep for any remaining icons/emojis)
16. Run `npm run build` to verify no errors

---

## Color Quick Reference

For copy-pasting into components:

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--primary` | 147 28% 15% | #1B3022 | Buttons, active borders, focus rings |
| `--primary-hover` | 147 28% 21% | #264733 | Button hover |
| `--primary-accent` | 142 22% 52% | #6B9E7A | Nav active indicator, logo glow |
| `--nav-bg` | 207 42% 10% | #0D1B24 | Top nav background |
| `--background` | 214 18% 95% | #F0F3F7 | Page background |
| `--card` | 0 0% 100% | #FFFFFF | Cards, panels, sidebar |
| `--foreground` | 210 43% 14% | #112233 | Primary text |
| `--text-secondary` | 215 13% 35% | #4A5568 | Body text |
| `--muted-foreground` | 211 12% 59% | #8896A6 | Labels, captions |
| `--border` | 214 32% 91% | #E2E8F0 | All borders |
| `--success` | 146 25% 38% | #4A7A5B | Success status |
| `--success-bg` | 140 12% 92% | #E8EFEA | Success badge BG |
| `--warning` | 36 35% 45% | #9A7B4A | Warning status |
| `--warning-bg` | 36 25% 91% | #F0EBE0 | Warning badge BG |
| `--info` | 210 30% 42% | #4A6B8A | Info status |
| `--info-bg` | 210 30% 92% | #E4ECF2 | Info badge BG |
| `--destructive` | 0 22% 48% | #946060 | Danger status |
| `--destructive-bg` | 0 18% 92% | #F0E6E6 | Danger badge BG |

---

## Verification Checklist

After completing all deliverables, verify:

- [ ] `npm run build` succeeds with no errors
- [ ] Nav bar shows "TEK·TON" with logo mark on #0D1B24 background
- [ ] Nav links are TEXT ONLY — no icons anywhere in the nav
- [ ] Nav active state has green bottom border with glow
- [ ] Dashboard renders with stat cards, quick actions, and content grid
- [ ] Stat cards have colored left accent bars — no icon chips
- [ ] Quick actions are text-only cards with colored top borders
- [ ] Sidebar navigation items are text only — no icons
- [ ] Badges use muted/desaturated status colors (not bright/candy)
- [ ] Page transitions animate on route change
- [ ] Focus rings are forest green (#1B3022)
- [ ] Body font is DM Sans, code font is JetBrains Mono
- [ ] No remaining references to old color values (#1a5632, #2c3e50, #10B981, #F59E0B, #3B82F6, #ef4444)
- [ ] No remaining "TEKTON" (all-caps without dot) in UI-facing text
- [ ] ZERO icon imports (lucide-react, heroicons, react-icons) except shadcn/ui internal deps
- [ ] ZERO emoji characters anywhere in the rendered UI
- [ ] ZERO SVG icon elements in custom components
- [ ] TypeScript strict mode still passes
