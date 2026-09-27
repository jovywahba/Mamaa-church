# Mama Church — نظام إدارة الخدمات والتبرعات

An internal, Arabic-only (RTL) web application for managing the church charity's work:

1. **خدمات من يديك أعطيناك إلى الأسر**: families receiving assistance (father, mother, any number of children, address, several phone numbers, assistance types, notes).
2. **التبرعات إلى من يديك أعطيناك**: donation cases (father, mother, children, phone numbers, الحالة من طرف, المساعدة موجهة إلى, notes).

Features: secure login, dashboard, full create / view / edit / delete for both sections, repeatable children rows, multi-select categories, global Arabic-aware search, combinable filters, pagination, detailed record pages with audit info (created/updated at and by), admin user management, loading / empty / error states, and a responsive layout for desktop, tablet, and mobile.

## Technology stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4, Cairo font, lucide-react icons, sonner toasts |
| Forms | react-hook-form + zod (the same schemas validate in the browser and on the server) |
| Backend | Supabase (Postgres, Auth, Row Level Security) via `@supabase/ssr` |

## Project structure

```
supabase/schema.sql          Complete database schema: tables, FKs, indexes, triggers, RPCs, RLS
supabase/migrations/         Incremental migrations for an existing database (already included in schema.sql)
scripts/create-user.mjs      CLI to create/update an application user (uses the service-role key locally)
scripts/import-families-csv.mjs  One-time, idempotent import of historical family-assistance CSV files
src/proxy.ts                 Refreshes the session and blocks unauthenticated requests
src/app/login                Login page (username or email + password)
src/app/(app)/               Protected area: dashboard, families, donations, search, users
src/components/ui            Buttons, inputs, cards, badges, dialogs, multi-select, pagination...
src/components/layout        Sidebar, top bar with global search, mobile navigation
src/components/records       Filter panel, data table, record tables, delete button
src/components/forms         Family & donation forms, repeatable list, form actions
src/components/detail        Detail page building blocks
src/lib/actions              Server Actions (auth, families, donations, search, users)
src/lib/data                 Server-side data access
src/lib/validation           zod schemas + form/DB mapping
src/lib/supabase             Supabase clients (server, proxy, admin/service-role)
```

## Database design

All primary keys are UUIDs. Every table has `created_at`, and case tables also have `updated_at`, `created_by`, and `updated_by`. Database triggers set these audit columns from the logged-in user's JWT, so the client can't spoof them.

| Table | Purpose |
| --- | --- |
| `profiles` | One row per application user (username, full name, role `admin`/`staff`, `is_active`). Created automatically by a trigger on `auth.users`. |
| `family_assistance_types` | Lookup: the 11 assistance types + «أخرى» (seeded). |
| `family_assistance_cases` | Main record of a family service: father/mother data (age **or** birth year), address, notes, other assistance, `service_date` (تاريخ الخدمة), `expense_amount` (المصاريف, EGP) and, for imported rows, provenance (`source_service_type`, `source_recorded_at`, `import_key`). |
| `family_assistance_children` | Children of a family (name, age or birth year, education stage), `ON DELETE CASCADE`. |
| `family_assistance_phones` | Any number of phone numbers per family, `ON DELETE CASCADE`. |
| `family_assistance_case_types` | Many-to-many: family ↔ assistance types. |
| `donation_categories` | Lookup: «المساعدة موجهة إلى» categories + «أخرى» (seeded). |
| `donation_cases` | Main donation record (age **or** birth year for each parent, phones, الحالة من طرف, notes). |
| `donation_children` | Children of a donation case (name, age or birth year, job). |
| `donation_case_categories` | Many-to-many: donation case ↔ categories. |

**Search.** Each case keeps a denormalised, Arabic-normalised `search_text` column, which triggers maintain. It holds the names, children, phones, jobs, address, notes, referrer, and category labels, and a trigram (GIN) index covers it. The normalisation removes diacritics and unifies أ/إ/آ→ا, ة→ه, ى→ي, and Arabic-Indic digits→Latin. So a search for «ابراهيم» finds «إبراهيم», and a search for «٠١٠» finds «010». A multi-word query must match all of its words.

**RPC functions** (all `SECURITY INVOKER`, so RLS always applies):
`save_family_case`, `save_donation_case` (atomic create/update of a case with its children/phones/categories), `list_family_cases`, `list_donation_cases` (filters + pagination + total count), and `global_search`.

**Row Level Security** is enabled on every table:
- Anonymous users have no table or function privileges at all.
- Only **active** users (`profiles.is_active = true`) can read or write case records.
- Profiles and lookup tables are read-only for users. Only the server, using the service-role key, can create users or change roles.

## Environment variables

Copy `.env.example` to `.env.local` and fill it in:

```bash
NEXT_PUBLIC_SUPABASE_URL=            # https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # anon / publishable key (safe for the browser)
SUPABASE_SERVICE_ROLE_KEY=           # service-role / secret key — SERVER ONLY, never commit
AUTH_EMAIL_DOMAIN=mamachurch.local   # internal domain used to map usernames to auth emails
```

`.env.local` and every `.env*` file except `.env.example` are git-ignored. The service-role key has no `NEXT_PUBLIC_` prefix, so Next.js never sends it to the browser. The module that uses it (`src/lib/supabase/admin.ts`) imports `server-only`, so it can't be bundled into client code.

## Supabase setup

1. Create a Supabase project, or use the existing one.
2. Open **SQL Editor → New query**, paste the full contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
   The script is idempotent, so you can run it again safely after updates.
3. In **Project Settings → API**, copy the project URL, the anon/publishable key, and the service-role/secret key into `.env.local`.
4. Optional: in **Authentication → Providers → Email**, turn off public sign-ups. Users are created only by an admin.

### Updating an existing database

`supabase/schema.sql` always describes the full, current schema, and running it again is safe. For an existing project you can also run only the new files in `supabase/migrations/`, in date order, in the SQL Editor:

| Migration | Adds |
| --- | --- |
| `20260927_family_service_history.sql` | Service date, expenses, and birth years for family records, plus the service-role-only `import_family_case` RPC |

## Importing historical family data (CSV)

`scripts/import-families-csv.mjs` imports the old Google-Forms exports of «خدمات من يديك أعطيناك إلى الأسر». These imports go into the **families section only**.

```bash
# 1. Put the CSV files in data-import/ (git-ignored; they contain personal data)
# 2. Dry run: prints an analysis and writes data-import/import-report-dry-run.json
node --env-file=.env.local scripts/import-families-csv.mjs data-import/*.csv
# 3. Import
node --env-file=.env.local scripts/import-families-csv.mjs --apply data-import/*.csv
```

- **Cleaning:** the script converts Arabic digits to Latin digits and removes invisible bidi marks and extra whitespace. It turns form placeholders (`0000`, `00`, `-----`, `00000000000`) into empty values. Values from 1900 up to the current year are stored as birth years, not ages. Several phone numbers in one cell are split into separate phones. Notes are kept in full.
- **Test/junk rows:** rows with numbers typed into the name, job, and address fields are excluded and listed in the report.
- **True duplicates:** rows with identical content (the form timestamp is ignored) are imported once.
- **Separate services:** several services for the same family stay as separate records, because they differ in date, type, cost, or notes.
- **Service types:** the old «نوع الخدمة» values map to the current assistance types only when the match is confident. Anything else goes under «أخرى», with the original wording kept.
- **Idempotent:** each record gets a SHA-256 `import_key`, so running the import again skips records that are already there.
- **Security:** the script writes through the `import_family_case` RPC, which only the service role can execute.

## Running locally

```bash
npm install
cp .env.example .env.local        # then fill in the values
npm run create-user -- --username admin --password 'A-Strong-Password' --name "مسؤول النظام" --role admin
npm run dev                       # http://localhost:3000
```

## How authentication works

- The login page asks for **اسم المستخدم** and **كلمة المرور**. Supabase Auth identifies users by email, so the server maps a username to an internal address, `<username>@AUTH_EMAIL_DOMAIN`. Users never see this address. You can also log in with a full email address if the account was created with one, for example `npm run create-user -- --email someone@example.com ...`.
- Sign-in runs in a Server Action. The session is stored in secure HTTP-only cookies through `@supabase/ssr`.
- `src/proxy.ts` refreshes the session on every request and redirects anonymous visitors to `/login`. Every protected page also checks the user on the server, and RLS enforces access in the database.
- Deactivated users are signed out and can't log in again. An admin can also end their existing sessions.
- Admins manage users at **المستخدمون** (`/users`): create users, reset passwords, change roles, and activate or deactivate accounts. These actions run server-side with the service-role key after the server checks that the caller is an admin.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm run create-user -- ...` | Create or update a user (`--username`/`--email`, `--password`, `--name`, `--role admin\|staff`) |

## Security checklist

- No secrets in source control: `.env*` is ignored and only `.env.example`, which has empty values, is committed.
- The service-role key is used only in server code (`server-only`) and in the local CLI script.
- RLS is enabled on all tables, and anonymous access is revoked.
- Audit columns are set by database triggers and can't be forged by the client.
- Server Actions re-validate all input with zod and check the session before touching the database.
- Login redirects accept only same-site relative paths, which prevents open redirects.
