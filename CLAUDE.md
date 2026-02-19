# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tekton is an operations platform for production home builders and real estate developers (Red Cedar Homes / VanRock Holdings). It manages the full development lifecycle: land acquisition, construction management, home sales, and investor distributions. The codebase is currently in its planning phase with comprehensive documentation but no source code yet.

## Tech Stack

React 19 + TypeScript 5.9 (strict) SPA built with Vite 6, deployed on Vercel, backed by Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions). Key libraries: TanStack Router (file-based routing), TanStack Query v5 (server state), Zustand (UI state), React Hook Form + Zod v4 (forms/validation), Tailwind CSS v4 + shadcn/ui (styling), TanStack Table v8, FullCalendar, Recharts.

## Commands

```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # Production build
supabase db push     # Run database migrations
supabase gen types typescript --linked > src/types/database.ts  # Regenerate DB types
npx @biomejs/biome check .        # Lint (Biome)
npx @biomejs/biome check --fix .  # Lint + auto-fix
npx vitest           # Run tests
npx vitest run       # Run tests once (CI mode)
```

## Architecture

**Hub-and-spoke model with Projects at center.** Three perspectives view the same assets:
- **Projects** (Owner/Developer) — "How is this investment performing?"
- **Construction** (Builder) — "How is this build going?"
- **Disposition** (Sales/Exit) — "How is the sellout going?"

**11 modules:** Pipeline, Projects (hub), Construction, Disposition, Accounting, Purchasing, Investors, Contacts, Calendar, Workflows, Admin.

**Four project types:** Scattered Lot, Community Development, Lot Development, Lot Purchase.

## Key Patterns

- **Auto-save everywhere:** All forms use 800ms debounce auto-save via `useAutoSave()` hook — no explicit save buttons. Exception: Workflow templates use explicit save.
- **State management:** Server state in TanStack Query (30s staleTime), UI state in Zustand stores (`authStore`, `uiStore`, `entityStore`, `filterStore`), form state in React Hook Form.
- **Multi-entity scoping:** Zustand `entityStore` tracks active entity; sidebar entity picker determines data visibility.
- **Routing:** TanStack Router file-based routes under `src/routes/`. Auth guard at `_authenticated.tsx` redirects to `/login`.
- **Path alias:** `@/` maps to `src/`.
- **Database types:** Auto-generated from Supabase into `src/types/database.ts` — regenerate after schema changes.
- **RLS:** Row-level security policies on all tables for data isolation.

## Design System

- **Primary:** #1B3022 (deep forest green) | **Nav:** #112233 (near-black navy) | **Background:** #F1F5F9 | **Accent:** #48BB78
- **Status colors:** Success #4A7A5B, Warning #C4841D, Info #3B6FA0, Destructive #B84040
- **Sidebar is context-sensitive:** Index pages show status filters with count badges; detail pages show record identity block + section navigation.
- shadcn/ui primitives in `src/components/ui/`, layout components in `src/components/layout/`.

## Biome Configuration

Formatter: 2 spaces, 120 char line width. Linter uses recommended rules with organized imports.

## Build Plan

The project follows a 10-phase sequential buildout documented in `TEKTON-BUILDOUT-PLAN (1).md`. UI/UX interaction patterns for every page are in `TEKTON-PAGE-INTERACTIONS.md`. Phases build on each other — implement in order.

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SENTRY_DSN=your-sentry-dsn
```
