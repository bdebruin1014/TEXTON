# Tekton

**The master builder's platform for real estate development.**

Tekton is a comprehensive, process-driven operations platform for production home builders and real estate developers. It manages the complete development lifecycle — from land acquisition and deal analysis through construction management, home sales, and investor distributions — across multiple entities, projects, and communities.

Built for [Red Cedar Homes](https://redcedarhomessc.com) and affiliated entities operating across the I-85 corridor from Charlotte, NC to Greenville, SC.

## Why "Tekton"

From the ancient Greek τέκτων (téktōn) — a builder, a craftsman, a master carpenter. The word that gave us "architect" (ἀρχιτέκτων, chief builder) and "technology" (τεχνολογία, the science of craft). Tekton is the builder at their most fundamental: someone who takes raw material and shapes it into something that shelters, endures, and serves.

## Architecture

Tekton is organized around a hub-and-spoke model with **Projects** at the center:

```
                          ┌──────────────┐
                          │   PIPELINE   │
                          │ Opportunities│
                          └──────┬───────┘
                                 │
                                 ▼
    ┌─────────────┐    ┌─────────────────────┐    ┌──────────────────┐
    │  INVESTORS   │◄──►│      PROJECTS       │◄──►│  CONSTRUCTION    │
    │  Funds       │    │    (OWNER/DEV)       │    │  MANAGEMENT      │
    │  Capital     │    │      ★ HUB          │    │  (BUILDER)       │
    └─────────────┘    │                     │    └──────────────────┘
                       │                     │
    ┌─────────────┐    │                     │    ┌──────────────────┐
    │  ACCOUNTING  │◄──►│                     │◄──►│   DISPOSITION    │
    │  Multi-Entity│    │                     │    │  (SALES/EXIT)    │
    └─────────────┘    └─────────────────────┘    └──────────────────┘
                                 ▲
                       ┌─────────┴──────────┐
                       │  Contacts, Calendar │
                       │  Documents, Workflow│
                       └────────────────────┘
```

The three primary perspectives serve different stakeholders viewing the same underlying assets:

| Module | Perspective | Core Record | Answers |
|--------|-------------|-------------|---------|
| **Projects** | Owner / Developer (SPE/Fund) | Project | "How is this investment performing?" |
| **Construction** | Builder / Contractor (RCH) | Job | "How is this build going?" |
| **Disposition** | Sales / Exit | Disposition | "How is the sellout going?" |

## Modules

| Module | Description |
|--------|-------------|
| **Pipeline** | Deal sourcing, property analysis, due diligence, underwriting, offer/contract, conversion to project |
| **Projects** | Land acquisition (multi-parcel), entitlement, horizontal development, lot inventory, budget, draws, investor capital |
| **Construction** | Individual home builds (Jobs), schedules, POs, subcontracts, inspections, punch lists, warranty, RCH operations |
| **Disposition** | Listings, showings, offers, buyer contracts, option selections, lender coordination, closing, settlement, post-closing |
| **Accounting** | Multi-entity double-entry bookkeeping, AP/AR, bank reconciliation, job costing, WIP, intercompany, period close |
| **Purchasing** | Estimates, bid packages, purchase orders, subcontracts, change orders, vendor management |
| **Investors** | Fund management, capital calls, distributions, waterfall calculations, K-1 tracking |
| **Contacts** | Companies, people, subcontractors, vendors, buyers, agents |
| **Calendar** | FullCalendar with Outlook 2-way sync, project/inspection/closing views |
| **Workflows** | Configurable milestone-based workflows for opportunities, projects, jobs, and dispositions |
| **Admin** | Floor plans, entities, users, permissions, integrations, deal analyzer config |

## Project Types

Tekton supports four distinct development models:

1. **Scattered Lot** — Buy individual lots, build, sell
2. **Community Development** — Assemble land, entitle, develop infrastructure, build, sell
3. **Lot Development** — Develop finished lots, sell to third-party builders
4. **Lot Purchase** — Buy finished lots in bulk (takedown tranches), build, sell

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 6 |
| Framework | React 19 + TypeScript 5.9 (strict) |
| Routing | TanStack Router |
| Server State | TanStack Query v5 |
| Client State | Zustand |
| Forms | React Hook Form + Zod v4 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Tables | TanStack Table v8 |
| Calendar | FullCalendar |
| Charts | Recharts + Tremor |
| E-Sign | DocuSeal |
| Linting | Biome |
| Testing | Vitest |
| Hosting | Vercel |
| Monitoring | Sentry |

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase CLI
- A Supabase project (see `supabase/config.toml`)

### Installation

```bash
git clone https://github.com/vanrock-holdings/tekton.git
cd tekton
npm install
```

### Environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Database

Run migrations against your Supabase project:

```bash
supabase db push
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
npm run build
```

## Project Structure

```
tekton/
├── src/
│   ├── routes/                    # TanStack Router file-based routes
│   │   ├── dashboard/
│   │   ├── pipeline/              # Opportunities + Leads
│   │   ├── projects/              # ★ THE HUB
│   │   ├── construction/          # Jobs (Builder perspective)
│   │   ├── disposition/           # Sales/Exit
│   │   ├── accounting/            # Multi-entity ledger
│   │   ├── purchasing/
│   │   ├── contacts/
│   │   ├── investors/
│   │   ├── calendar/
│   │   └── admin/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives
│   │   ├── layout/                # TopNav, Sidebar, RightPanel
│   │   ├── forms/                 # AutoSaveField, CurrencyInput, etc.
│   │   ├── tables/                # DataTable (TanStack Table wrapper)
│   │   └── charts/
│   ├── hooks/                     # useAutoSave, useSupabase, useAuth
│   ├── stores/                    # Zustand (auth, UI, entity, filters)
│   ├── lib/                       # Supabase client, query client, utils
│   ├── types/                     # Auto-generated DB types + enums
│   └── styles/                    # globals.css, tokens.css
└── supabase/
    ├── migrations/                # PostgreSQL migrations
    ├── functions/                 # Edge functions
    └── config.toml
```

## Design

Tekton uses a professional construction-industry aesthetic with a Qualia-inspired navigation pattern:

- **Primary**: #1B3022 (deep forest green)
- **Nav**: #112233 (near-black navy)
- **Background**: #F1F5F9 (cool blue-gray)
- **Cards/Sidebar**: #ffffff
- **Accent**: #48BB78 (bright green for active indicators)

The sidebar is context-sensitive: index pages show status filters with counts; detail pages show a record identity block and process-driven section navigation with uppercase dividers.

## License

Proprietary. Copyright © 2026 VanRock Holdings LLC. All rights reserved.

