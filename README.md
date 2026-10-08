# iExcel 2.0 – In-Basket Assessment (Project Drishti Pilot)

A web application for running the Project Drishti in-basket exercise. It handles assessment administration, response capture and report generation:

- pilot candidate login → dashboard → briefing → **timed session** (server-authoritative)
- nine in-basket items, free navigation, **live autosave** with offline protection
- manual submission or **automatic submission at timeout**
- candidate response report generated server-side as **DOCX and PDF**
- admin area to view responses, change history and telemetry, to download or regenerate reports, and to release a retest or reset an attempt

There is **no automated evaluation or scoring**. Responses go to assessors for manual rating.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

On first start the app creates and seeds an embedded PostgreSQL database in `./.data/pglite` (no setup needed).

| Who | Login |
| --- | --- |
| Pilot candidates | `C01` … `C25`, access code `login-<ID>` (e.g. `C05` / `login-C05`) (seeded in `src/lib/seed.ts`) |
| Admin | http://localhost:3000/admin, code = `ADMIN_ACCESS_CODE` in `.env.local` |

Each candidate gets **one** attempt unless an admin releases a retest or resets the attempt (see *Retests and resets* below). To start over locally, wipe the local database (stop the dev server first):

```bash
npm run db:reset
```

## Configuration (`.env.local`; see `.env.example`)

| Variable | Purpose |
| --- | --- |
| `ASSESSMENT_DURATION_MINUTES` | Session length. Production `30`; set `2` to test timeout quickly. Captured per session at start. |
| `SUBMISSION_GRACE_SECONDS` | Window after expiry in which already-typed but unsynced edits (e.g. after a network drop) may still reach the server. Such writes are flagged "after expiry". Default 60. |
| `SESSION_SECRET` | Signs login cookies (≥ 32 chars). |
| `ADMIN_ACCESS_CODE` | Admin area access code. |
| `REPORT_TIMEZONE` | Time zone printed in reports/admin. Default `Asia/Kolkata`. |
| `DATABASE_URL` | Empty → local embedded Postgres. Set to the **Supabase Postgres connection string** to use Supabase. |
| `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | Reserved for a later move to Supabase Auth/Storage; not required now. |

### Switching to Supabase

1. Create a Supabase project.
2. Copy the Postgres connection string from Project Settings → Database (session pooler or direct).
3. Set `DATABASE_URL` and restart.

The schema (`db/schema.sql`) is applied automatically and is idempotent. Row Level Security is enabled with no policies, so Supabase's public API cannot read candidate data. The app only accesses the database from the server.

## How the key guarantees work

**Timer.** `started_at` and `expires_at` are written with the database clock when *Start assessment* is pressed. Starting again is idempotent: there's one in-progress session per candidate, and the timer never restarts or extends. The browser shows `expires_at − (local time + measured server offset)`, ticking every 250 ms. It re-syncs with `/api/session/clock` every 30 s, on reconnect and when the tab becomes visible. Refreshing, opening a second tab or reconnecting all derive from the same `expires_at`.

**Timeout.** At 00:00 the inputs lock. Then pending edits are flushed and the client calls `submit` with intent `timeout`. The server accepts that only when *its* clock agrees time is up. If the browser was closed, the server finalises the session itself on the next request touching it (candidate or admin) once expiry plus grace has passed.

**Autosave.** Every keystroke updates a `pending` map that's mirrored to `localStorage`. A debounced save (1.2 s) is sent, or an immediate one on priority change, item change, opening the briefing, tab hide, near expiry and submit. Only one request is in flight at a time, so writes stay ordered. A field leaves `pending` only when the server acknowledges that exact value. Failures retry with backoff, and coming back online triggers a sync. On reload, any unsynced local copy is re-applied and synced. Status shown: *Saving…*, *Saved ✓*, *Save failed — retrying…*, *Offline — your work is being saved locally*, *Back online — syncing…*.

**Retests and resets.** Each attempt is its own `assessment_sessions` row with an `attempt_number`. A candidate can start a new attempt only when their latest one is submitted and `attempt_number < candidates.max_attempts`, which is 1 unless an admin raises it with *Release retest* (typed confirmation `RETEST`). The candidate then sees *Retest – Attempt N*, and earlier attempts and reports are kept. *Reset this attempt* (typed confirmation `RESET`, checked on the server too) permanently deletes the latest attempt with its responses, history, events and report, so the candidate can take it again. The assessment page sends its attempt id as `?sid=`, so a tab left open on a reset attempt is rejected (409) and can't write into a newer one.

**History.** Every saved change to a field is written to `response_versions` (old value → new value, time, after-expiry flag). It's visible to admins only.

**Reports.** `generateCandidateReport(sessionId)` (`src/lib/report`) reads only the stored database responses, refuses unsubmitted sessions, renders DOCX (`docx`) and PDF (`pdfkit` with embedded Noto Sans, so the text is selectable and ₹ renders), and stores both in the `reports` table. Regenerating produces the same content.

**Security.** Candidate and admin identities are separate signed httpOnly cookies. Candidate APIs never accept a session id; they always derive it from the logged-in candidate. Report downloads check ownership, or admin. Submitted sessions reject writes (409). Timing fields can't be written by any endpoint. Assessor material (Part 3: Sections I and J) is **not in the codebase at all**.

## Project layout

```
db/schema.sql                 Postgres schema (Supabase / PGlite)
src/content/drishti.ts        Candidate-facing content (sections B–H), verbatim
src/lib/                      config, db adapter, auth, sessions, admin queries
src/lib/report/               report data, DOCX + PDF renderers
src/app/                      pages (login, dashboard, briefing, assessment, complete, admin) and API routes
src/components/assessment/    assessment UI, autosave engine, timer
assets/fonts/                 Noto Sans (SIL OFL) for PDF output
```

## Notes

- The source `.docx` contains confidential assessor material and is excluded by `.gitignore`.
- The organisation chart image (`public/organisation-structure.png`) is taken from the source document. It labels Arvind Choudhary as Managing Director, while the table in Section C lists him as COO. This inconsistency is in the source.
