# Supabase CLI migrations

Database schema is versioned with [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) migrations. Do not paste SQL into the Dashboard SQL editor to create tables — use the CLI so local and remote stay in sync.

## Layout

```
supabase/
  config.toml              # Local stack config (commit this)
  seed.sql                 # Optional local seed data
  migrations/              # Applied in filename order
    20260820120000_extensions.sql
    20260820120001_store_settings.sql
    20260820120002_ingredients.sql
    20260820120003_ingredient_price_history.sql
    20260820120004_menu_items.sql
    20260820120005_recipe_lines.sql
    20260820120006_menu_addons.sql
    20260820120007_combos.sql
    20260820120008_combo_items.sql
    20260820120009_purchase_plans.sql
    20260820120010_purchase_plan_lines.sql
    20260820120011_sales_records.sql
    20260821140000_menu_item_description.sql
```

Each table has its own migration file, including indexes, triggers, RLS policies, and grants. Shared helpers (`update_updated_at_column`) live in `extensions.sql`. Primary keys use Postgres `gen_random_uuid()` (not `uuid-ossp`, which is not on the hosted search path). Files are ordered so foreign keys always point at tables that already exist.

| Migration | Depends on |
| --- | --- |
| `store_settings` | `auth.users` |
| `ingredients` | `auth.users` |
| `ingredient_price_history` | `ingredients` |
| `menu_items` | `auth.users` |
| `recipe_lines` | `menu_items`, `ingredients` |
| `menu_addons` | `menu_items` |
| `combos` | `auth.users` |
| `combo_items` | `combos`, `menu_items` |
| `purchase_plans` | `auth.users` |
| `purchase_plan_lines` | `purchase_plans`, `menu_items` |
| `sales_records` | `auth.users`, `purchase_plans`, `menu_items` |
| `menu_item_description` | `menu_items` |

## Prerequisites

Install the CLI (pick one):

```bash
npm install -g supabase
# Windows (Scoop)
scoop install supabase
```

Or run it via `npx supabase <command>` without a global install.

Local development also needs [Docker Desktop](https://docs.docker.com/desktop/) (or another Docker-compatible runtime) running.

If you installed the CLI as an npm dependency, prefix every command below with `npx` (for example `npx supabase start`).

## First-time setup

From the project root (`food_cost/`):

```bash
# Already done for this repo — creates supabase/config.toml
supabase init

# Authenticate the CLI with your Supabase account
supabase login

# Link this folder to a hosted project (project ref is in the dashboard URL)
supabase link --project-ref <project-ref>
```

## Local development

```bash
# Start Postgres, Auth, Studio, etc. Applies all migrations + seed.sql
supabase start

# Recreate the local database from scratch (destructive locally)
supabase db reset

# Stop containers (data persists until db reset)
supabase stop
```

Studio is typically at [http://127.0.0.1:54323](http://127.0.0.1:54323). API URL and keys are printed by `supabase start` — put those in `.env` for local app development.

## Push to the hosted project

```bash
# Apply pending migrations to the linked remote database
supabase db push
```

`db push` records each filename timestamp in `supabase_migrations.schema_migrations` and skips migrations that are already applied.

If the remote database was created earlier by running a one-off `schema.sql` in the SQL editor, do **not** push blindly (tables would already exist). Either:

- start from a fresh project and `supabase db push`, or
- baseline the existing schema: `supabase db pull`, then continue with new migrations only.

## Add a new migration

```bash
# Creates an empty timestamped file under supabase/migrations/
supabase migration new add_column_to_ingredients
```

Write SQL in that file, then:

```bash
# Apply locally
supabase db reset
# or, if the local stack is already running:
supabase migration up

# Apply to the linked remote
supabase db push
```

Keep **one concern per file** (one table, or one additive change). Never edit a migration that has already been pushed to remote — add a new file instead.

When adding a table, include in the same file:

1. `CREATE TABLE`
2. Indexes
3. Triggers
4. `ENABLE ROW LEVEL SECURITY` and policies
5. `GRANT` to `authenticated` and `service_role`

New tables are not auto-exposed to the Data API; the grants in these migrations are required for the Vue client.

## Generate TypeScript types

```bash
# From the local database
supabase gen types typescript --local > src/types/database.types.ts

# From the linked remote
supabase gen types typescript --linked > src/types/database.types.ts
```

## Useful commands

| Command | Purpose |
| --- | --- |
| `supabase start` | Start local stack, apply migrations + seed |
| `supabase stop` | Stop local stack |
| `supabase db reset` | Wipe local DB, replay all migrations + seed |
| `supabase db push` | Apply pending migrations to linked remote |
| `supabase db pull` | Capture remote schema into a new local migration |
| `supabase db diff -f <name>` | Diff local DB vs migrations and write a new file |
| `supabase migration new <name>` | Create an empty migration file |
| `supabase migration list` | Show local vs remote migration status |
| `supabase gen types typescript --local` | Generate TS types |

## Config notes

- `config.toml` is safe to commit. Do not put secrets in it; use `env()` if needed.
- `supabase/.temp/` and `supabase/.branches/` are CLI state and are gitignored.
- `seed.sql` runs only on local `start` / `db reset`, not on `db push`.

## Store membership and invite emails

User management needs the store-membership migration **and** the `invite-member` Edge Function. Push both before using `/users` or invite links; the Vue app queries `store_id` / `store_members` which do not exist until `db push` succeeds.

```bash
supabase db push
supabase functions deploy invite-member
supabase secrets set APP_URL=https://your-app.example
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set INVITE_FROM_EMAIL="Food Cost <noreply@your-domain.com>"
```

`APP_URL` is the public app origin used in invite emails (no trailing slash). Add that same origin under Authentication → URL Configuration → Redirect URLs.

### `RESEND_API_KEY`

This is an API key from [Resend](https://resend.com), the transactional email service used by `invite-member`. Supabase Auth can email **new** addresses (`inviteUserByEmail`). People who already have an account (for example a second-store invite) need Resend.

1. Create an account at [resend.com](https://resend.com) (free tier is enough to start).
2. Verify a sending domain under **Domains** (for example `your-domain.com`). Until then you can only send test mail to the Resend account owner.
3. Open **API Keys** → **Create API Key** and copy the value. It starts with `re_`.
4. Set the secrets above. `INVITE_FROM_EMAIL` must use that verified domain (or `beth.t@example.com` for sending only to the Resend account owner).

Without `RESEND_API_KEY`, the function falls back to Supabase Auth invite for brand-new emails only. If Resend rejects a message, the function returns `email_error` and uses the same Auth fallback for new emails. Pending invites can also be copied from `/users`.
