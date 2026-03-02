# Szárnyfeszítő – Security Baseline v0 (Admin MVP)

## 1. Alapelv

Ez a verzió kizárólag admin felület.
Nincs publikus UI.
Nincs nyilvános adatolvasás.

A rendszer read/write csak admin jogosultsággal működik.

---

## 2. Auth modell (v0)

Single-admin rendszer.

- Supabase Auth használata
- Csak előre meghatározott email cím engedélyezett
- Más felhasználó nem tud belépni

Nincs:
- regisztráció
- OAuth
- multi-role

---

## 3. Role kezelés

v0-ban nincs külön role rendszer.
Belépett user = admin.

Későbbi bővítés:
- admin
- editor
- viewer

---

## 4. API Route védelem

Minden generáló API route:

- szerver oldali
- auth check kötelező
- nincs client oldali model-hívás
- nincs publikus endpoint

---

## 5. Environment Variables

Kötelező env változók:

OPENAI_API_KEY=
AI_MODEL_TEXT=
AI_MODEL_IMAGE=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

Szabályok:

- .env fájl nincs commitolva
- .env.example verziózott
- Service role kulcs csak szerveren használható

`src/lib/config.ts` centralizálja ezeket a canonical neveket és kényszeríti, hogy a szerveroldali generálás mind ugyanazt az alapot használja.

---

## 6. Storage védelem

- Image upload csak server oldalon
- Storage bucket nem publikus v0-ban
- Public URL csak approved státusz után generálható

---

## 7. Publish Gate biztonsági szabály

Egy entitás csak akkor lehet published, ha:

- TEXT_APPROVED
- Kötelező képek approved
- Kötelező mezők validáltak

---

## 8. AI Biztonság

- Prompt nem szerkeszthető UI-ban
- Nincs user input alapú generálás
- Minden generálás determinisztikus stílus configból indul

---

## 9. Későbbi bővítés előkészítve

- RLS policy helye fenntartva
- Role alapú publish jogosultság
- Audit log tábla lehetősége

---

Ez a baseline az Admin MVP-hez elegendő.
