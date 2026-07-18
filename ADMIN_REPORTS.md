# Admin Access & Report Collection Guide

> **People ERP** — Consolidated reporting, spending tracking and admin access model
> Companion to [APPLICATION_WORKFLOW.md](./APPLICATION_WORKFLOW.md)

---

## Table of Contents

1. [System Analysis Summary](#system-analysis-summary)
2. [Admin Access Model](#admin-access-model)
3. [How Money Moves Through the System](#how-money-moves-through-the-system)
4. [Report Surfaces — What Exists Where](#report-surfaces--what-exists-where)
5. [Consolidated Reports (Super Admin)](#consolidated-reports-super-admin)
6. [Metric Definitions](#metric-definitions)
7. [API Reference](#api-reference)
8. [Exporting Data](#exporting-data)
9. [Security & Multi-Tenancy Notes](#security--multi-tenancy-notes)
10. [Known Gaps & Recommendations](#known-gaps--recommendations)

---

## System Analysis Summary

People ERP is a **multi-tenant (franchise-based) NGO welfare management system**. One deployment serves multiple organisations (franchises); every core collection (`Application`, `Scheme`, `Project`, `Payment`, `Beneficiary`, `Donation`, …) carries a `franchise` field applied by `franchisePlugin`, and every query is scoped through `tenantResolver` → `buildFranchiseReadFilter` / `buildFranchiseMatchStage`.

The money-relevant data flow:

```
Project (budget.total)
  └── Scheme (budget.total, distributionTimeline template, statusStages)
        └── Application (requestedAmount → approvedAmount)
              ├── Payment            (one-off / installment disbursements)
              └── RecurringPayment   (monthly/quarterly/… cycles)
Donation (income side — donor contributions)
```

Key workflow facts (verified in code, details in `APPLICATION_WORKFLOW.md`):

- **Application lifecycle**: `draft → pending → (review stages) → approved → disbursed → completed`, with `rejected / on_hold / cancelled` exits. The parallel `applicationStages[]` array tracks the per-scheme review pipeline (default 8 stages or scheme-level `statusStages` override).
- **Approval criteria**: role-gated stage advancement (`allowedRoles` per stage), regional scope matching (application's `district/area/unit` tagged from the beneficiary), optional eligibility scoring with auto-reject threshold, optional interview with pass/fail result, and per-role required comments/documents per stage.
- **On approval**: `approvedAmount` is set (≤ `requestedAmount`), Payment records are generated from the scheme's `distributionTimeline` (or a MasterData template, or a single 100% payment), renewal dates are set for renewable schemes, and the beneficiary is notified via WhatsApp.
- **Disbursement**: each installment is a `Payment` (`pending → approved → processing → completed / failed`) with method-specific details (bank/UPI/cheque/cash), deductions (TDS/GST/fees → `financial.netAmount`) and a verification/reconciliation block. Recurring support payments are `RecurringPayment` cycles (`scheduled → due → overdue → processing → completed`).

---

## Admin Access Model

### Role hierarchy

| Role | Scope | Notes |
|---|---|---|
| **Global Super Admin** (`User.isSuperAdmin`) | All franchises | Bypasses franchise membership and role checks (`authorize()` short-circuits). Manages franchises via `/api/global`. |
| `super_admin` | Franchise-wide (all data in the franchise; cross-franchise users can switch/aggregate franchises) | Full access to every module and report. |
| `state_admin` | Entire franchise/state | Same data visibility as super_admin within the franchise; no franchise management. |
| `district_admin` | Assigned district(s) | Applications/beneficiaries tagged to their district. Can approve/reject at Final Review. |
| `area_admin` / `area_president` | Assigned area(s) | Document/field verification, interviews, comments. |
| `unit_admin` | Assigned unit(s) | Entry-level review; cannot approve. |
| `scheme_coordinator` / `project_coordinator` | Assigned schemes/projects | Interview-stage actions; scheme-scoped visibility. |

Effective role/scope per franchise comes from `UserFranchise` (a user can hold different roles in different franchises); `authenticate` sets `req.userRole` and `crossFranchiseResolver` sets `req.crossFranchiseIds` for users who belong to multiple franchises.

### Two enforcement layers

1. **Role gates** — `authorize('super_admin', 'state_admin')` style checks (used by the consolidated reports below).
2. **RBAC permissions** — fine-grained named permissions (`applications.read.regional`, `finances.read.all`, `reports.read`, …) resolved by `rbacService.hasPermission` from Role/UserRole/Permission collections. Most list pages and the sidebar are permission-gated.

Regional data isolation is enforced in controllers by matching the admin's `adminScope` (unit/area/district or `regions[]`) against the application's tagged location — an admin never sees applications outside their geography, in any report.

---

## How Money Moves Through the System

| Stage | Field / Collection | Meaning for reporting |
|---|---|---|
| **Budgeted** | `Project.budget.total`, `Scheme.budget.total` | What the organisation planned to spend. |
| **Requested** | `Application.requestedAmount` | What beneficiaries asked for. |
| **Committed** | `Application.approvedAmount` where status ∈ {approved, disbursed, completed} | What admins have promised. |
| **Disbursed** | `Payment.amount` where status = completed **+** `RecurringPayment.amount` where status = completed | What actually left the organisation. |
| **Pending payout** | `Payment` status ∈ {pending, approved, processing} + `RecurringPayment` status ∈ {scheduled, due, overdue, processing} | Committed money not yet paid. |
| **Income** | `Donation.amount` where status = completed | Donor money received. |

Two derived ratios matter most for an NGO:

- **Budget utilisation** = disbursed ÷ total budget — are we spending what we planned?
- **Disbursement efficiency** = disbursed ÷ committed — are approvals actually reaching beneficiaries?

---

## Report Surfaces — What Exists Where

| Surface | Route (ERP) | Audience | What it shows |
|---|---|---|---|
| Dashboard | `/dashboard` | All admins (region-scoped) | Entity counts, application status split, recent activity. |
| **Consolidated Reports** ★ new | `/reports/consolidated` | **Super Admin** (menu) / State Admin (API) | Org-wide money + application consolidation. See next section. |
| Application Consolidation | `/applications/consolidation` | All admins (region-scoped) | Application **counts** by status for a date range. |
| Budget & Expenses | `/budget` | `finances.read.*` | Budget vs allocated vs spent per project/scheme, transactions, analytics with insights. |
| Payments tracking | `/payment-tracking/*` | `finances.read.*` | Per-payment operational lists (overdue, due soon, processing, completed). |
| Recurring payments | `/recurring-payments/*` | `finances.read.*` | Cycle schedules, forecast. |
| Donors & Donations | `/donors/*` | `donors.read.*` | Donor CRM, donation history, follow-ups. |
| Admin Report Forms | `/admin-reports` | All admins | Custom form-based reports admins fill (e.g. surveys) — `AdminReport*` models. |
| Program Reports | `/program-reports` | All admins | Event/program reporting. |
| Per-application field reports | Application detail → Reports | Application-scoped | Interview/verification notes (`Report` model). |
| Activity/Login/Error logs | `/activity-logs`, `/login-logs`, `/error-logs` | `activity_logs.read` | Audit trail. |

★ **Consolidated Reports** is the new page added to close the gap: before it, no single place answered "how much did we spend, where, on which schemes, and how far along is every application" across the organisation.

---

## Consolidated Reports (Super Admin)

**Route:** `/reports/consolidated` — sidebar → *Reports & Analytics → Consolidated Reports* (visible to `super_admin` only; the API also accepts `state_admin`).

### Page layout

1. **Date-range filter** — applies to applications, payments and donations. Budgets and beneficiary registers are cumulative (a budget has no "created this week" meaning).
2. **Money KPI row** — Total Budget (+utilisation), Committed, Disbursed (+efficiency), Pending Disbursement (+overdue alert).
3. **Programme KPI row** — Applications (+in pipeline), Approval Rate (+avg days to approve), Beneficiaries Served (unique, +registered/verified), Donations Received.
4. **Funds Flow tab** — monthly chart + table of Requested / Approved / Disbursed / Donations-In for the last 6/12/24 months. CSV export.
5. **Schemes tab** — per-scheme table: budget, application counts, committed, disbursed, pending payouts, approval rate, budget-utilisation bar. CSV export.
6. **Regions tab** — district/area/unit roll-up: applications, beneficiaries, committed, disbursed, pending. Level switcher + CSV export.
7. **Pipeline tab** — status funnel (count + requested ₹ per status), pending-application ageing buckets (0–7 / 8–30 / 31–90 / 90+ days, with stale alert), processing-time stats (avg/fastest/slowest days to approval), interview outcomes, and current-stage distribution of in-flight applications.

### Cross-franchise behaviour

For cross-franchise super admins the standard franchise tab bar applies: the page respects the `franchiseFilter` query param (single franchise or `all`), exactly like the rest of the ERP.

---

## Metric Definitions

| Metric | Formula (source of truth) |
|---|---|
| Total Budget | Σ `Project.budget.total` + Σ `Scheme.budget.total` (non-cancelled) |
| Requested | Σ `Application.requestedAmount` (status ≠ draft) |
| Committed / Approved ₹ | Σ `Application.approvedAmount` where status ∈ {approved, disbursed, completed} |
| Disbursed | Σ completed `Payment.amount` + Σ completed `RecurringPayment.amount` |
| Pending Disbursement | Σ `Payment.amount` (pending/approved/processing) + Σ `RecurringPayment.amount` (scheduled/due/overdue/processing) |
| Budget Utilisation % | Disbursed ÷ Total Budget × 100 |
| Disbursement Efficiency % | Disbursed ÷ Committed × 100 |
| Approval Rate % | approved ÷ (approved + rejected) × 100 — in-progress applications are excluded so the rate reflects actual decisions |
| Avg. days to approval | mean(`approvedAt` − `createdAt`) over approved applications |
| Beneficiaries Served | distinct `Application.beneficiary` in the period (status ≠ draft) |
| Donations Received | Σ `Donation.amount` where status = completed |
| Pending ageing | in-pipeline applications bucketed by `createdAt` age: 0–7, 8–30, 31–90, 90+ days |

"In pipeline" = status ∈ {pending, under_review, field_verification, interview_scheduled, interview_completed, pending_committee_approval, on_hold}.

---

## API Reference

Base: `/api/consolidated-reports` — all endpoints require a Bearer token and role `super_admin` or `state_admin` (global super admins bypass). Backed by `api/src/controllers/consolidatedReportController.js`, routes in `api/src/routes/consolidatedReportRoutes.js`.

| Endpoint | Query params | Returns |
|---|---|---|
| `GET /overview` | `startDate`, `endDate` (YYYY-MM-DD) | `overview` — applications block (counts, byStatus, approvalRate, avgApprovalDays, uniqueBeneficiaries), funds block (budget/requested/approved/disbursed/pending/overdue/failed + ratios), beneficiaries, donations, entity counts. |
| `GET /schemes` | `startDate`, `endDate` | `schemes[]` — one row per scheme with application counts, money movement, approval rate, budget utilisation, disbursement efficiency, distinct beneficiaries. |
| `GET /regions` | `level` = `district` \| `area` \| `unit` (default district), `startDate`, `endDate` | `regions[]` — roll-up per location with counts, money and ratios. Unassigned applications appear as "Unassigned". |
| `GET /funds-flow` | `months` (1–36, default 12) | `fundsFlow[]` — one row per month: requested, approved, disbursed (regular + recurring), donations, with counts. |
| `GET /pipeline` | — | `pipeline` — statusFunnel[], stageDistribution[], pendingAging buckets, processingTime stats, interview outcomes. |

All endpoints honour `?franchiseFilter=<franchiseId|all>` for cross-franchise users.

Example:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  -H "X-Franchise-Slug: people" \
  "https://<host>/api/consolidated-reports/overview?startDate=2026-01-01&endDate=2026-06-30"
```

---

## Exporting Data

- **CSV, from the page**: Funds Flow, Schemes and Regions tabs each have a CSV button (client-side generation from the fetched data — what you see is what you export).
- **Existing module exports**: applications, payments, donors and donations keep their own export endpoints (`exportHandler` middleware, `exportConfigs.js`) with permission checks (`*.export` / read permissions).
- **API**: for BI tools or scheduled pulls, hit the JSON endpoints above with a super/state admin token.

Suggested reporting cadence for an NGO board pack:

| Report | Cadence | Source |
|---|---|---|
| Funds flow + KPI screenshot | Monthly | Consolidated Reports → Funds Flow |
| Scheme utilisation CSV | Monthly | Schemes tab export |
| Region performance CSV | Quarterly | Regions tab export |
| Pending ageing review | Weekly ops call | Pipeline tab |
| Donor income vs disbursement | Quarterly | Overview KPIs (Donations vs Disbursed) |

---

## Security & Multi-Tenancy Notes

- The consolidated endpoints never accept a raw franchise id from the client except through the already-audited `franchiseFilter` mechanism (validated against `req.crossFranchiseIds`).
- Draft applications are excluded from every count and money figure.
- Soft-deleted beneficiaries (`isDeleted: true`) are excluded from beneficiary registers.
- The endpoints are read-only aggregations — no state is mutated, safe to poll.
- Menu visibility (`requireSuperAdmin`) is cosmetic; the real gate is `authorize('super_admin','state_admin')` on the router. The page additionally renders an access-restricted card for other roles.

---

## Known Gaps & Recommendations

Found during the analysis; not addressed by this change:

1. **`Scheme.statistics.*` and `budget.spent/allocated` counters are not reliably updated** — the consolidated reports intentionally compute from Applications/Payments (source of truth) instead of these cached counters. Avoid building new features on `Scheme.statistics`.
2. **Donations are not linked to schemes/projects for "restricted funds" accounting** — income vs spending can only be compared at organisation level today. If donor-restricted funds matter, add an optional `scheme`/`project` ref on `Donation` and extend the funds-flow report.
3. **RecurringPayment has no `completedAt`** — monthly disbursement attribution for recurring cycles uses `updatedAt` (the status flip to `completed` is the last update in practice). A dedicated timestamp would make the series exact.
4. **`reportRoutes.js` (per-application reports) has verbose debug logging and a backup file (`reportRoutes-backup.js`)** — candidates for cleanup.
5. **No scheduled email/PDF board report** — the API now makes this straightforward (render the overview JSON into the existing pdfReceiptService/email pipeline) if needed later.
