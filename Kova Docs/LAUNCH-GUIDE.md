# KOVA March 2 Launch — Execution Guide

## What Ships March 2

1. Workflow engine (templates, instances, task auto-generation)
2. Admin workflow template builder (Qualia pattern)
3. Home dashboard with My Tasks, KPIs, alerts
4. Module index dashboards (Pipeline, Projects, Construction, Disposition)
5. Detail sidebar consolidation (lots, jobs, dispositions, tasks with live status)

## File Structure

Copy these files into your KOVA repo:

```
kova/
└── docs/
    ├── sprint-1a-workflow-engine.md
    ├── sprint-1b-dashboard-tasks.md
    └── LAUNCH-GUIDE.md (this file)
```

## Execution Sequence

### Session 1: Workflow Engine Database + Seed Data (Sprint 1A, Part 1)
Open Claude Code. Paste:

```
Read docs/sprint-1a-workflow-engine.md. Execute sections 1 and 2 only:
1. Create the database migration file with all 4 tables (workflow_templates, workflow_template_tasks, workflow_instances, task_instances)
2. Run the migration in Supabase
3. Regenerate types
4. Insert the 4 seed workflow templates with all their tasks
Commit after migration runs clean and seed data is verified.
```

### Session 2: Admin Workflow Template Builder (Sprint 1A, Part 2)
```
Read docs/sprint-1a-workflow-engine.md. Execute section 3:
Build the Admin workflow template builder UI. Index page with DataTable listing all templates. Detail page with the Qualia-pattern phase sections and ordered task rows with inline editing. Create the hooks and components listed in the spec.
Follow the existing Admin module patterns in the codebase for routing and layout.
Commit when the template builder is functional and you can create/edit/reorder tasks.
```

### Session 3: Workflow Instance Engine (Sprint 1A, Part 3)
```
Read docs/sprint-1a-workflow-engine.md. Execute section 4:
Create the workflow-engine Edge Function that instantiates templates when status changes. Create the database trigger functions on opportunities, projects, jobs, and dispositions tables.
Test by changing an opportunity status to 'dd' and verifying task_instances are created with correct assignees and due dates.
Commit when the trigger fires correctly.
```

### Session 4: Home Dashboard (Sprint 1B, Part 1)
```
Read docs/sprint-1b-dashboard-tasks.md. Execute sections 1 and 4:
Build the shared components first (KPICard, StatusPills, TaskListPanel, SidebarRecordList) and data hooks (useDashboardKPIs, useMyTasks, useTaskActions).
Then build the Home Dashboard with 3 zones: KPI strip, My Tasks table, Alerts & Activity panel.
"Mark Complete" must work — updating the task, checking gate logic, and unblocking downstream tasks.
Commit when the dashboard renders with real data.
```

### Session 5: Module Index Dashboards (Sprint 1B, Part 2)
```
Read docs/sprint-1b-dashboard-tasks.md. Execute section 2:
Redesign the index pages for Pipeline, Projects, Construction, and Disposition.
Each gets: KPI strip (using the shared KPICard component), status filter pills (using StatusPills component), and the existing DataTable updated with the column specs in the doc.
Reuse the shared components from Session 4.
Commit when all 4 index pages show KPIs and filterable tables.
```

### Session 6: Detail Sidebar Consolidation (Sprint 1B, Part 3)
```
Read docs/sprint-1b-dashboard-tasks.md. Execute section 3:
Update Project, Job, and Disposition detail page sidebars to show linked records with live status badges.
Use the SidebarRecordList component. Query linked lots, jobs, dispositions, and tasks for each record.
Project sidebar shows lots + jobs + dispositions + task summary.
Job sidebar shows task progress bar + PO list.
Disposition sidebar shows task progress.
Commit when sidebars render with real linked data.
```

## Timeline

| Session | Estimated Time | Target |
|---------|---------------|--------|
| 1. DB + Seed | 30-45 min | Day 1 (Tue Feb 25) |
| 2. Admin UI | 45-60 min | Day 1 (Tue Feb 25) |
| 3. Edge Function | 30-45 min | Day 2 (Wed Feb 26) |
| 4. Home Dashboard | 45-60 min | Day 2 (Wed Feb 26) |
| 5. Module Dashboards | 45-60 min | Day 3 (Thu Feb 27) |
| 6. Sidebar Updates | 30-45 min | Day 3 (Thu Feb 27) |

Days 4-5 (Fri-Sat): Testing, bug fixes, seed data adjustments, deploy to Vercel.
Day 6 (Sun Mar 1): Final check.
Day 7 (Mon Mar 2): Team launch.

## What the Team Sees on March 2

1. Open KOVA → Home Dashboard shows their tasks, overdue items, portfolio KPIs
2. Click Pipeline → KPI strip + filterable opportunity table
3. Open an opportunity → change status to DD → workflow auto-generates DD checklist tasks
4. Go back to Home → DD tasks appear in My Tasks with due dates
5. Complete a task → gate logic checks → next batch of tasks unlock
6. Click into a Project → sidebar shows all lots, active jobs, dispositions with live status
7. Admin > Workflows → view/edit/create workflow templates with the Qualia task builder pattern

This is a working task-driven operating system. Not a form-filling app.
