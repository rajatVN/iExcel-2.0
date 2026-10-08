-- ===========================================================================
-- iExcel 2.0 In-Basket Assessment — database schema (PostgreSQL)
--
-- Idempotent: safe to run on every start. Works on Supabase PostgreSQL and
-- on the embedded local PGlite database.
--
-- Row Level Security is enabled on every table with NO policies. The app
-- connects server-side as the database owner, so it is unaffected; the
-- Supabase anon/authenticated roles (PostgREST) get no access at all.
-- ===========================================================================

create table if not exists candidates (
  id                uuid primary key default gen_random_uuid(),
  candidate_code    text not null unique,
  name              text not null,
  role              text,
  -- Pilot login only. scrypt hash: "scrypt$<salt hex>$<hash hex>"
  access_code_hash  text not null,
  created_at        timestamptz not null default now()
);

create table if not exists assessments (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  name              text not null,
  version           text not null,
  duration_minutes  integer not null check (duration_minutes > 0),
  created_at        timestamptz not null default now()
);

create table if not exists assessment_sessions (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references candidates(id),
  assessment_id      uuid not null references assessments(id),
  -- Authoritative timing, always set from the database clock.
  started_at         timestamptz not null,
  expires_at         timestamptz not null,
  duration_minutes   integer not null check (duration_minutes > 0),
  submitted_at       timestamptz,
  status             text not null default 'in_progress'
                       check (status in ('in_progress', 'submitted')),
  submission_reason  text check (submission_reason in ('manual', 'timeout')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- One attempt per candidate per assessment: re-opening never starts a new timer.
  unique (candidate_id, assessment_id),
  check (expires_at > started_at),
  check ((status = 'submitted') = (submitted_at is not null)),
  check ((status = 'submitted') = (submission_reason is not null))
);

create table if not exists assessment_responses (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references assessment_sessions(id) on delete cascade,
  item_id              integer not null check (item_id between 1 and 9),
  -- Items 1–8
  priority             text check (priority in ('High', 'Medium', 'Low')),
  action_text          text,
  say_now_text         text,
  hold_text            text,
  -- Legacy: combined "Say now / Hold" answer from before the field was split.
  -- No longer written by the form; kept so earlier responses are not lost.
  say_hold_text        text,
  -- Item 9
  recommendation_text  text,
  -- Telemetry (never shown to candidates)
  first_opened_at      timestamptz,
  last_opened_at       timestamptz,
  visit_count          integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (session_id, item_id)
);

-- Full change history. Candidates may revise earlier decisions; every saved
-- change is kept for the assessment record.
create table if not exists response_versions (
  id             uuid primary key default gen_random_uuid(),
  response_id    uuid not null references assessment_responses(id) on delete cascade,
  session_id     uuid not null references assessment_sessions(id) on delete cascade,
  item_id        integer not null,
  field_changed  text not null
                   check (field_changed in ('priority', 'action_text', 'say_now_text', 'hold_text',
                                            'say_hold_text', 'recommendation_text')),
  old_value      text,
  new_value      text,
  changed_at     timestamptz not null default now(),
  -- True when the change reached the server after expires_at (grace window).
  after_expiry   boolean not null default false
);
-- Migration (idempotent): split "Say now / Hold" into two fields. Databases
-- created before the split get the new columns and a widened field check.
-- Existing say_hold_text values are left untouched (shown as legacy).
alter table assessment_responses add column if not exists say_now_text text;
alter table assessment_responses add column if not exists hold_text text;
alter table response_versions drop constraint if exists response_versions_field_changed_check;
alter table response_versions add constraint response_versions_field_changed_check
  check (field_changed in ('priority', 'action_text', 'say_now_text', 'hold_text',
                           'say_hold_text', 'recommendation_text'));

create index if not exists response_versions_session_idx on response_versions (session_id, item_id, changed_at);

-- Non-scoring telemetry: start, submit, visibility, connectivity, panels opened…
create table if not exists session_events (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references assessment_sessions(id) on delete cascade,
  event_type  text not null,
  item_id     integer,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists session_events_session_idx on session_events (session_id, created_at);

-- Generated candidate response reports. Files are stored in the database so
-- they work identically locally and on serverless hosting.
create table if not exists reports (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null unique references assessment_sessions(id) on delete cascade,
  docx_path         text not null,
  pdf_path          text not null,
  docx_data         bytea not null,
  pdf_data          bytea not null,
  generated_at      timestamptz not null default now(),
  generation_count  integer not null default 1
);

-- ---------------------------------------------------------------------------
-- Future (not used yet): manual evaluation by assessors. Scoring is
-- deliberately NOT part of this version. A later table might look like:
--
-- create table response_evaluations (
--   id           uuid primary key default gen_random_uuid(),
--   session_id   uuid not null references assessment_sessions(id),
--   item_id      integer not null,
--   assessor_id  uuid not null,
--   indicator    text not null,
--   rating       integer,
--   notes        text,
--   created_at   timestamptz not null default now()
-- );
-- ---------------------------------------------------------------------------

alter table candidates            enable row level security;
alter table assessments           enable row level security;
alter table assessment_sessions   enable row level security;
alter table assessment_responses  enable row level security;
alter table response_versions     enable row level security;
alter table session_events        enable row level security;
alter table reports               enable row level security;
