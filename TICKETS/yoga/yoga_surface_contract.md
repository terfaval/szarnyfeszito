# Yoga (Studio) – felület + contract (F1 AUDIT)

**Scope:** Studio-only admin felület. Explorer out of scope.  
**Felület:** `/admin/yoga`  
**Döntés-hivatkozás:** D16 (Activity journaling surface)

## 1) Repo inventory (érintett modulok)

### UI (Studio)
- `src/app/admin/(protected)/yoga/page.tsx` – Yoga oldal: havi rács + heti sor + overlay logolás (yoga/strength/acl/running).
- `src/app/globals.css` – Yoga page + overlay + kártyák stílusai.
- `src/ui/components/AdminTopBar.tsx` – navigáció (`/admin/yoga`) + Yoga-specifikus logo.
- `public/YOGA/ICONS/*` – Yoga felület ikonok.

### API
- `src/app/api/activity-logs/route.ts` – **kanonikus** ActivityLog endpoint (GET/POST/PATCH/DELETE).
- `src/app/api/yoga-logs/route.ts` – legacy alias (GET/POST) a fenti endpointhez.
- `src/app/api/yoga-templates/route.ts` – Yoga “template” lista (a logokból derivált).

### Szerver oldali DB-access
- `src/lib/supabaseServerClient.ts` – server-side Supabase kliens (service role key).
- `src/lib/activityService.ts` – `activity_logs` CRUD + `listYogaTemplates()` deriválás.
- `src/types/activity.ts` – statikus libraryk: Yoga, ACL, Strength, defaultok.

## 2) Kanonikus contractok

## 2.0 Security (auth + RLS)

- **Auth:** az API route-ok admin cookie alapján engednek (`getAdminUserFromCookies`).
- **DB access:** a szerver oldali Supabase kliens **service role key**-t használ (`src/lib/supabaseServerClient.ts`).
- **RLS:** a repóban precedens, hogy service_role használat mellett is explicit policy-kat vezetünk be, ha RLS be van kapcsolva (lásd D18b és a `supabase/migrations/*rls_policies*` jellegű migrációk).  
  Következmény: ha a Yoga Guru v1-ben új táblát vezetünk be (pl. terv/komment), akkor a migrációban dönteni kell: RLS off, vagy service_role policy + admin read policy.

### 2.1 ActivityLog – tárolás (DB)
Az app a Yoga/edzés naplózást a `activity_logs` táblában kezeli.

**App oldali mezők (payload):**
- `date` (YYYY-MM-DD, local time)
- `activityType` ∈ `yoga|strength|acl|running`
- `category` (pl. `relax|strong` yoga esetén)
- `label` (megjelenített cím)
- `exerciseId` (opcionális, pl. ACL routine id)
- `durationMinutes` (opcionális)
- `distanceKm` (opcionális)
- `intensity` (opcionális)
- `notes` (opcionális)
- `metadata` (opcionális JSON)

**Yoga link tárolása:**
- UI a linket a `metadata.link` mezőben tárolja (string URL), lásd `src/app/admin/(protected)/yoga/page.tsx`.

### 2.2 ActivityLog – API
**Endpoint:** `/api/activity-logs`

- `GET /api/activity-logs?month=YYYY-MM` → `{ data: ActivityLogRow[] }` (auth: admin cookie)
- `POST /api/activity-logs` → új sor beszúrás (auth szükséges)
- `PATCH /api/activity-logs` → meglévő sor frissítés `id` alapján
- `DELETE /api/activity-logs` → törlés `id` alapján

Megjegyzés: a Yoga oldalon a kliens a mentéshez `fetch("/api/activity-logs")` hívásokat használ, és lokálisan frissíti a `logsMap` állapotot.

### 2.3 Yoga “templates”
**Endpoint:** `/api/yoga-templates`

Ez nem külön DB tábla. A template lista a legutóbbi (limitelt) `activity_logs` yoga rekordokból van deriválva (`listYogaTemplates()`), és deduplikálva:
- kulcs: `{category,label,durationMinutes,intensity,link}`
- link: `metadata.link` → `template.link`

## 3) Faulty behaviors (BB-xx) – tünet → gyanú → modul

### BB-01: Spec/Decision vs. implementáció eltérés a “naponta 1 log / activity” szabályban
**Tünet:** a dokumentáció (SPEC + D16) azt állítja, hogy `(date, activity_type)` egyedi, és “upsert” jellegű mentés van.  
**Megfigyelés a kódban:** a UI több bejegyzést is kezel tömbként ugyanarra a napra és activity-re, és a mentés alapértelmezésben `POST` (insert), nem upsert.

**Bizonyíték (kódrészlet):**
- `src/app/admin/(protected)/yoga/page.tsx` – a `LogsMap` típusa `ActivityLogRow[]` tömböt tárol activity-ként, és a `saveActivity()` default `POST`.  
- `src/app/api/activity-logs/route.ts` + `src/lib/activityService.ts` – `createActivityLog()` `insert`, nincs `upsert` vagy `onConflict`.

**Gyanú:** vagy (A) a SPEC/D16 elavult, vagy (B) a DB-ben van unique constraint, és a UI “második mentés” esetén hibára futhat.  
**Érintett modul:** Yoga UI + activity log API + DB schema.

**Prioritás javaslat:**
- **P0:** döntés kell: *engedünk-e több bejegyzést ugyanarra a napra ugyanarra az activity-re?*  
  - Ha igen → dokumentációt (SPEC/D16) hozzá kell igazítani.
  - Ha nem → DB unique + API upsert + UI “edit existing” flow legyen a default.

### BB-02: `activity_logs` DB migration hiányzik a repóból (deterministic build kockázat)
**Tünet:** a repo nem tartalmaz `create table activity_logs ...` migrációt.  
**Hatás:** új környezetben (friss Supabase) a Yoga felület és az API nem tud determinisztikusan felállni.

**Bizonyíték:** a `supabase/migrations` + `supabase/init.sql` fájlokban nincs `activity_logs` definíció, miközben a kód `.from("activity_logs")` hívásokat használ.

**Prioritás javaslat:**
- **P0:** hozzunk létre egy `supabase/migrations/` migrációt az `activity_logs` táblára + RLS policy-kra (a repo RLS gyakorlatához igazítva).

**Repo fix (D46):**
- A hiányzó baseline-t pótolja: `supabase/migrations/20260311_d46_activity_logs_table_v1.sql`.
- Tudatosan nem rak rá `(date, activity_type)` unique constraintet addig, amíg a “1 vs N log/nap/activity” döntés nincs lezárva.

## 4) Handoff / fejlesztési támpontok

### Hol érdemes kezdeni (UI)
- `src/app/admin/(protected)/yoga/page.tsx` – itt van a teljes nap kiválasztás → overlay → mentés flow.

### Hol érdemes kezdeni (API)
- `src/app/api/activity-logs/route.ts` – auth + input-validáció + CRUD.
- `src/lib/activityService.ts` – DB réteg, egy helyen tudjuk módosítani (pl. upsert bevezetése).

### Minimal evidence (F4) amikor hozzányúlunk
- Happy path: nap kiválasztása → yoga mentés (template + new) → heti sor/havi rács jelölések frissülnek.
- Failure path: API 401 (kijelentkezve) → UI hibaüzenet.
- Regression: ACL és running mentés működik, és a törlés (DELETE) frissíti a UI-t.
