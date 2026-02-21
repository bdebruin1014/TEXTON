# TEKTON — REPO-WIDE CLEANUP: ENTITY & BUSINESS MODEL CORRECTIONS

## Commit to: `tekton/docs/repo-cleanup-entities.md`

Read this file, then execute all changes described below. Run `npm run build` at the end to verify zero TypeScript errors.

---

## WHAT THIS FIXES

Red Cedar Homes (RCH) is a **for-sale residential builder only**. The codebase and documentation contain stale references to entities and business models that do not exist:

**REMOVE all references to:**
- NewShire Property Management (does not exist)
- WG Maintenance (does not exist)
- Property management (RCH does not do this)
- Build-to-Rent / BTR (RCH does not do this)
- Lease-up tracking, tenant management, rental anything
- Any entity type of 'pm' or 'maintenance'

**THE CORRECT ENTITY STRUCTURE IS:**
- VanRock Holdings LLC — Parent holding company (third-party, not RCH-related)
- Red Cedar Homes LLC — Builder/contractor, operating company (RCH-related)
- Red Cedar Homes SC, LLC — Operating company (RCH-related)
- Scattered Lot Fund II, LLC — Fund (RCH-related)
- Carolina Affordable Housing Project Inc. — 501(c)(3) nonprofit (RCH-related)
- 153 Oakwood Ave LLC — SPE for Oslo project (RCH-related)
- DCL Holdings — Investor (third-party)
- TCMP — Investor (third-party)
- SCR Management, LLC — Management (third-party)
- Per-project SPEs as needed

**THE CORRECT PROJECT TYPES ARE (all for-sale):**
- scattered_lot
- community_dev
- lot_dev (lot development)
- lot_purchase

No BTR. No rental. No property management.

---

## SCOPE: WHERE TO LOOK

Search the entire repo for these strings (case-insensitive) and remove or replace them:

1. `NewShire` — remove from entity lists, seed data, constants, docs, comments
2. `WG Maintenance` — remove from entity lists, seed data, constants, docs, comments
3. `property management` — remove from entity descriptions and app descriptions (keep if referring to third-party SPE property in the accounting context, but remove as a business line)
4. `btr` or `build-to-rent` or `build_to_rent` or `BTR` — remove from project type enums, UI dropdowns, seed data, docs
5. `lease-up` or `lease_up` or `tenant` — remove
6. `'pm'` as an entity_type enum value — remove
7. `'maintenance'` as an entity_type enum value — remove

### Files most likely affected:

**Documentation:**
- Any `README.md` or docs files mentioning the entity list
- Any master prompt or specification docs

**Constants / Config:**
- `src/lib/constants.ts` or similar — entity type enums, project type enums
- Any seed data files

**Database:**
- `supabase/migrations/` — check for seed data inserting NewShire or WG Maintenance
- Entity type CHECK constraints — remove 'pm' and 'maintenance' if present
- Project type CHECK constraints — remove 'btr' if present

**Components:**
- Any entity selector/dropdown that lists entity types
- Any project type selector that includes BTR
- Any UI copy mentioning property management as an RCH business line

**Edge Functions:**
- Any system prompts or AI context mentioning NewShire, WG Maintenance, property management, or BTR

---

## REPLACEMENT RULES

When you find an entity list like:
```
VanRock Holdings, Red Cedar Homes, Carolina Affordable Housing Project,
NewShire Property Management, WG Maintenance, SPEs
```

Replace with:
```
VanRock Holdings LLC, Red Cedar Homes LLC, Carolina Affordable Housing
Project Inc., per-project SPEs
```

When you find a project types list including BTR, remove the BTR entry entirely. The four types are: scattered_lot, community_dev, lot_dev, lot_purchase.

When you find entity_type enums including 'pm' or 'maintenance', remove those values. Valid entity types: 'holding', 'builder', 'operating', 'spe', 'fund', 'nonprofit', 'investor', 'management'.

When you find app descriptions saying RCH serves property management or BTR, rewrite to emphasize **for-sale residential development only**.

---

## ALSO UPDATE: MATTERS MODULE SPEC

If `docs/matters-module-spec.md` exists (the Matters module build spec), verify it contains NO references to NewShire, WG Maintenance, property management, or BTR. The Edge Function system prompt in that file should describe VanRock/RCH as:

```
a for-sale residential development company... builds through Red Cedar Homes LLC
(general contractor) and operates through project-specific SPEs. Development types:
scattered lot, community development, lot development, and lot purchase — all
for-sale residential, no rentals.
```

---

## VERIFICATION

After all changes:

```bash
# Search for any remaining references
grep -ri "newshire" src/ supabase/ docs/ --include="*.ts" --include="*.tsx" --include="*.sql" --include="*.md"
grep -ri "wg maintenance" src/ supabase/ docs/ --include="*.ts" --include="*.tsx" --include="*.sql" --include="*.md"
grep -ri "property management" src/ supabase/ docs/ --include="*.ts" --include="*.tsx" --include="*.sql" --include="*.md"
grep -ri "build.to.rent\|btr" src/ supabase/ docs/ --include="*.ts" --include="*.tsx" --include="*.sql" --include="*.md"
```

All four greps should return zero results (or only false positives in unrelated contexts).

Then:
```bash
npm run build
```

Zero TypeScript errors. Commit with message: `chore: remove stale entity refs (NewShire, WG Maintenance, BTR)`
