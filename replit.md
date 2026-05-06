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
- Student: `student1@heartspace.com` (Arjun Mehta)
- Student: `student2@heartspace.com` (Sneha Kapoor)
- Student: `student3@heartspace.com` (Rohan Verma)

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
- `lib/db/src/schema/` — DB schema: users.ts, sessions.ts, moods.ts
- `artifacts/api-server/src/routes/` — auth.ts, users.ts, sessions.ts, moods.ts, dashboard.ts
- `artifacts/heartspace/src/` — React frontend

## Architecture decisions

- Auth is token-based (base64 userId:timestamp) stored in localStorage — simple for a counselling MVP
- Password hashing uses SHA-256 + a static salt (not bcrypt) for simplicity; upgrade to bcrypt for production
- Counsellors see all students; students only see their own data — enforced at the API route level
- The codegen script patches `lib/api-zod/src/index.ts` after orval runs to avoid duplicate export conflicts between Zod schemas and TypeScript types
- Role-based routing is handled in the React frontend via AuthContext reading from localStorage

## Product

- **Login page**: Branded HeartSpace login with heart SVG, Student/Counsellor toggle, warm cream/brown palette
- **Layout**: Fixed 260px left sidebar with logo, 11 nav items (Dashboard + Sessions functional, rest "soon"), quote cards, user profile + logout
- **Student dashboard**: Time-based greeting, 5 stat cards, Today's Plan timeline (real sessions or demo), Progress bars + circular chart, Mood check-in (1–5 with real API), Focus Mode card, Habit streaks, Weekly rhythm, Growth insights SVG line chart, motivational quote
- **Counsellor dashboard**: Greeting, 4 stat cards, student grid with mood badges
- **Sessions page**: Upcoming + past split view, schedule dialog (counsellors only), status actions

## Gotchas

- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen` before using new types
- The codegen script uses `echo` to overwrite `lib/api-zod/src/index.ts` — do not manually add exports there
- Zod must be declared in `artifacts/api-server/package.json` dependencies (not just workspace root)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
