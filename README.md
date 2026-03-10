This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Supabase integration

- Define `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in your `.env*` files (the server-only service role key should *never* reach the browser).
- Assign the allow-listed admin email via `ADMIN_EMAIL` and make sure that account exists in Supabase Auth with a password so the admin can log in at `/admin/login`. Only that email will pass the guard.
- Use `src/lib/supabaseServerClient.ts` for trusted server-side access; it reads the service role key from the environment and throws early if the token or URL are missing.
- Initialize the `birds`, `content_blocks`, and `images` tables via `supabase/init.sql` (it also declares the expected enums).
- Run `npm run supabase:smoke` once you have a Supabase project and the tables created. The script inserts a bird, reads it back, and then deletes it so you can confirm both insert and fetch succeed.

## Distribution region catalogs (D26)

These catalogs back deterministic bird distribution map generation (the AI selects `region_id`s only; the server expands them to geometries).

- Build catalogs offline from shapefiles via `TICKETS/leaflet shapefile builder/build_region_catalogs.py` (outputs `globalRegions.json` + `hungaryRegions.json`, optionally `*.json.gz` with `--gzip`).
- Avoid the legacy repo-root `out/globalRegions.json` (~600MB, huge single-row geometries) — it will likely exceed Supabase request limits. Prefer the builder output under `TICKETS/leaflet shapefile builder/out/` with simplification enabled (defaults are safe).
- Import catalogs into Supabase in small batches (streamed; avoids “file too big” issues in dashboards):
  - `npm run region:catalog:import -- --dry-run "TICKETS/leaflet shapefile builder/out/globalRegions.json"`
  - `npm run region:catalog:import -- "TICKETS/leaflet shapefile builder/out/globalRegions.json" "TICKETS/leaflet shapefile builder/out/hungaryRegions.json"`

If you prefer running from inside the builder folder, relative paths work too:
- `cd "TICKETS/leaflet shapefile builder"`
- `node ../../scripts/import-region-catalog.mjs --dry-run "out/globalRegions.json"`

Optional post-import sanity check (counts + type breakdown):
- `npm run region:catalog:verify`

## Dossier generation API

- The admin-only route `POST /api/generate-bird-dossier` replaces the older `generate-text` endpoint with the Field-Guide D1 workflow. Provide `bird_id` in the JSON body and the route will call `AI_MODEL_TEXT` (configured through `src/lib/config.ts`) to generate the dossier.
- Responses are validated against the v2.3 dossier schema (`schema_version`, `signature_trait`, `header`, `pill_meta`, `short_options`, `long_paragraphs`, `identification`, `distribution`, `nesting`, `migration`, `fun_fact`, `ethics_tip`, `typical_places`). Validation failures return `422` along with `issues` and the model name so the admin can triage missing fields.
- On success, the API creates a `content_blocks` row with `blocks_json` holding the dossier, `generation_meta` capturing `model`, `prompt_hash`, and `generated_at`, all saved with `review_status=draft`, then flips the bird’s `status` to `text_generated`.
- The response also surfaces the stored `generation_meta`, making it easy to correlate UI data with the exact prompt hash for future auditing.
- Existing helpers such as `POST /api/birds/:id/text-review` still finalize the current draft as approved before images can be generated, so the pipeline remains state-machine driven.

## Image generation API

- `POST /api/generate-images` is protected by the admin session and requires `bird_id` (plus optional `force_regenerate`). The endpoint enforces `birds.status=text_approved` (or `images_generated` with `force_regenerate=true`), then generates PNG assets via the configured provider, upserts canonical `images` rows, and sets `birds.status=images_generated` only when required variants succeed. Science Dossier + Visual Brief inputs are optional and controlled via `IMAGE_ACCURACY_INPUTS`.
- Configure `IMAGE_PROVIDER` (default `stub`), `AI_MODEL_IMAGE` (metadata), and `SUPABASE_IMAGE_BUCKET` (default `bird-images`) in your `.env*`. Ensure the bucket exists on Supabase, is private, and grants the service role key write access; `src/lib/config.ts` centralizes these canonical names before the handler uploads binary PNG objects (overwrite enabled) and resets `images.review_status` to `draft` on regeneration.

## Admin experience

- `/admin` now exposes a guarded dashboard with quick stats for each bird status, placeholders for upcoming Places/Phenomena work, and links into the entity flows.
- `/admin/birds` lists up to 100 birds, lets you search/filter locally, and includes a quick-create panel that refreshes after a new bird is saved.
- `/admin/birds/[id]` renders a shell editor with general metadata, tab labels for each pipeline stage, and a form to update slug, names, and status.
