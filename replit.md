# HeartSpace

A warm, role-based counselling platform by Vaishnavi Saxena for students and counsellors.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/heartspace run dev` — run the frontend (port 19808)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Demo Credentials

All users use password: `password123`

- Counsellor: `vaishnavi@heartspace.com` (Vaishnavi Saxena)
- Counsellor: `counsellor@heartspace.com` (Dr. Priya Sharma)
- Prep Space Student: `student1@heartspace.com` (Arjun Mehta)
- Prep Space Student: `student2@heartspace.com` (Sneha Kapoor)
- Self Space Student: `student3@heartspace.com` (Rohan Verma)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS (artifact: `heartspace`)
- API: Express 5 (artifact: `api-server`, path: `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — React Query hooks (generated)
- `lib/api-zod/src/generated/api.ts` — Zod schemas (generated)
- `lib/db/src/schema/` — DB schema: users.ts, sessions.ts, moods.ts, syllabus.ts, assignments.ts, daily-tracker.ts, session-notes.ts
- `artifacts/api-server/src/routes/` — auth.ts, users.ts, sessions.ts, moods.ts, dashboard.ts, syllabus.ts, assignments.ts, daily-tracker.ts, notes.ts, student-detail.ts, ai-summary.ts
- `artifacts/heartspace/src/` — React frontend
- `artifacts/heartspace/src/lib/api-client.ts` — custom fetch client for new endpoints (syllabus, assignments, daily-tracker, notes, student-detail, ai-summary)

## Architecture decisions

- Auth is token-based (base64 userId:timestamp:heartspace) stored in localStorage as `heartspace_token`/`heartspace_user`
- Password hashing uses SHA-256 + a static salt (not bcrypt) for simplicity; upgrade to bcrypt for production
- Three user types: counsellor / prep-space student / self-space student — stored as `role` + `space` on users table
- Counsellors see all students; students only see their own data — enforced at the API route level
- The codegen script patches `lib/api-zod/src/index.ts` after orval runs to avoid duplicate export conflicts between Zod schemas and TypeScript types
- Role-based routing: counsellor → /counsellor, prep student → /dashboard, self student → /self-dashboard
- New endpoints (syllabus, assignments, daily-tracker, notes, student-detail, ai-summary) use a custom fetch client (`api-client.ts`) rather than OpenAPI codegen for simplicity
- AI summary uses OpenAI API if OPENAI_API_KEY is set; otherwise generates a structured data-driven summary

## Product

### Login
- 3-way toggle: Prep Space | Self Space | Counsellor
- Demo credentials shown per tab
- Routes to correct dashboard based on user.space after login

### Prep Space (exam prep students)
- Dashboard: wellness overview (mood, sessions, stats)
- **Syllabus Tracker** (`/syllabus`): 7 Math subjects, topic-level status (Not Started → Mastered), confidence 1-5, daily/weekly revision checkboxes, progress bars per subject, auto-seed default topics
- **Assignment Tracker** (`/assignments`): log practice sets with accuracy %, approach understanding (Confused/Partial/Clear/Strong), speed (Slow/Moderate/Fast/Exam Ready)
- **Daily Tracker** (`/daily-tracker`): sleep, physical activity, study hours, me time, stress, emotional state, daily note. Upserts by date.
- **Sessions** (`/sessions`): upcoming + past

### Self Space (basic wellness students)
- Dashboard: full wellness dashboard (mood, sessions, habits, focus, etc.)
- **Daily Tracker** (`/daily-tracker`)
- **Sessions** (`/sessions`)

### Counsellor
- **Dashboard** (`/counsellor`): student grid with 7-day mood avg bar, sleep avg, risk flag (red badge + alert banner if mood ≤ 2 for 3+ days), click-through to student detail
- **Student Detail** (`/student/:id`): full student data including moods history, daily tracker table, sessions, syllabus progress (prep only), assignments (prep only)
  - Session notes (private to counsellor)
  - Intervention notes (visible to student)
  - Pre-session AI summary (last 14 days, generated from data or OpenAI)
- **Sessions** (`/sessions`)

## DB Schema

- `users` — id, email, passwordHash, name, role (student|counsellor), space (prep|self|null), avatarUrl
- `sessions` — counselling sessions
- `moods` — mood check-ins (1-5)
- `syllabus_topics` — per-user topic tracking with status/confidence/revision
- `assignments` — practice set logs with accuracy/approach/speed
- `daily_tracker` — daily wellbeing entries (upsert by date)
- `session_notes` — counsellor notes (session_note or intervention type)

## Gotchas

- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen` before using new types
- The codegen script uses `echo` to overwrite `lib/api-zod/src/index.ts` — do not manually add exports there
- Zod must be declared in `artifacts/api-server/package.json` dependencies (not just workspace root)
- New API routes (syllabus, assignments, etc.) bypass OpenAPI codegen — use `api-client.ts` custom client

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
