# Yoga Guru (Studio) – tervezett modul (F0 + F2)

**Scope:** Studio-only (`/admin/yoga`). Explorer out of scope.  
**AI:** kizárólag server-side (AGENTS “AI is server-side only”).  
**Cél:** a napi jóga/gyakorlat javaslat “guru” jellegű, vezetett flow-ban.

## F0 – probléma framing

### Mit akarunk
- A Yoga felületen legyen egy `Yoga Guru` gomb, kinézetben/érzetben hasonló a Dashboard `birdwatch` gomb mintájához (sticky action + panel/overlay vagy gyors navigáció).
- Gombnyomásra megnyílik a **külön `Yoga Guru` oldal** (`/admin/yoga/guru`), ahol az AI asszisztens:
  - figyelembe veszi az **előzményeket** (activity logok),
  - a **heti tervet** (lásd “Nyitott kérdések”),
  - és a **kommenteket** (tipikusan `notes` vagy külön megjegyzés forrás).
- Az AI javaslatokat ad a *kiválasztott napra*: milyen gyakorlatot végezzen a felhasználó.
- A javasolt opciók közül választani lehet, majd a kiválasztott opciót ugyanazzal a logolási mechanizmussal rögzítjük, mint a normál módban.

### Javaslat típusok (v1)
Az AI a következők közül ajánlhat (legalább 2–4 opció):
1) **DB template**: meglévő yoga template (a `activity_logs`-ból derivált template, vagy később külön könyvtár).
2) **YouTube (direct)**: `url + title + hossz (perc)` megadással.
3) **YouTube search**: csak kulcsszavak (kereséshez), ha nem akar konkrét linket ajánlani.

### NON-goals (most nem építjük)
- Anatómiai katalógus és jóga póz-katalógus generálása/ikon-pipeline (külön fázis).
- Explorer felület, publikus megjelenítés, runtime AI.
- YouTube API integráció (v1-ben elég: url/title/duration vagy keywords).

### Nyitott kérdések (döntést igényel)
- **Weekly plan:** hol van a heti terv kanonikusan? (jelenleg a Yoga oldal csak “recommended counts” konstanst tartalmaz; nincs per-user terv tábla a repóban).
- **Kommentek forrása:** csak `activity_logs.notes`, vagy van külön komment tábla/mező?

## F2 – design (kanonikus payload + stop rules)

### 1) UI flow (javasolt)
- Belépés: `/admin/yoga` → `Yoga Guru` gomb.
- Kontextus kiválasztás: alapértelmezetten a Yoga oldal “selected day” dátuma.
- “Javaslat kérése”:
  - rövid “mai állapot” input (opcionális): energia, fájdalom/ACL, időkeret.
  - AI hívás server-side.
- Eredmény: 2–4 javaslat kártya (DB/YouTube/link/keywords).
- Választás után: “Rögzítés” → ugyanaz a logolási út (`/api/activity-logs`).

### 2) Kanonikus AI válasz (JSON)
Az AI output legyen **szigorúan validált JSON** (Chef modul mintájára), pl. `schema_version="v1"`.

**YogaGuruRecommendationV1 (példa mezők):**
- `schema_version`: `"v1"`
- `language`: `"hu"`
- `date`: `"YYYY-MM-DD"`
- `summary`: rövid indoklás (1–3 mondat)
- `recommendations`: array (2–4 elem), ahol egy elem típusa:
  - `type`: `"db_template" | "youtube" | "youtube_search"`
  - `title`: string
  - `duration_minutes`: number|null
  - `intensity`: 1|2|3|null
  - `category`: `"relax" | "strong" | null`
  - `link_url`: string|null (YouTube direct esetén kötelező)
  - `search_keywords`: string[]|null (YouTube search esetén kötelező)
  - `source_notes`: rövid magyarázat (miért ezt ajánlja)

**Stop rules:**
- Ha a kontextus hiányos (nincs log, nincs terv) → akkor is adjon 2 opciót, de jelezze röviden.
- Ne találjon ki konkrét “orvosi” állításokat; ha fájdalom/ACL jelzés van, legyen óvatos és ajánljon “relax / mobility” opciót.

### 3) Logolás mapping (normál mód kompatibilitás)
A kiválasztott ajánlásból létrejövő `activity_logs` mentés:
- `activityType = "yoga"`
- `category`: `"relax"|"strong"` (ha van)
- `label`: `title`
- `durationMinutes`: `duration_minutes` (ha van)
- `intensity`: `intensity` (ha van)
- `notes`: opcionális (felhasználó megjegyzése + AI summary röviden, ha akarjuk)
- `metadata`:
  - `link`: `link_url` (ha van)
  - `source`: `"yoga_guru_v1"`
  - `source_type`: `"db_template"|"youtube"|"youtube_search"`
  - `search_keywords`: csak youtube_search esetén (opcionális)

### 3.1 Journaling döntés (v1)
- A logolás **insert** alapú: egy nap/tevékenység több bejegyzést is tartalmazhat.
- Következmény: a Guru “rögzítés” ugyanúgy új sort hoz létre, mint a normál logolás.

### 4) Server-side API javaslat (v1)
- `POST /api/yoga-guru/recommend`
  - input: `{ date, constraints?, include_history_days? }`
  - server összegyűjti: log előzmények (pl. 14 nap), napi/ heti célok (ha létezik), kommentek
  - AI call: `callOpenAIChatCompletion(... response_format: json_object ...)`
  - output: `{ data: YogaGuruRecommendationV1 }`

Megjegyzés: modell az env-ből jöjjön (új `AI_MODEL_YOGA_GURU` vagy fallback `AI_MODEL_TEXT`).

### 5) Tervezett (opcionális) táblák – ha a heti terv/kommentek nem férnek el a logokban

V1-ben a tényleges “mit csináltam” napló **marad** `activity_logs`, de a Guru-hoz megengedettek új táblák:

- `yoga_week_plans` (v1 javaslat): per hét/per user célok (pl. yoga relax/strong arány, perc cél, ACL/futás cél).
- `yoga_guru_comments` (v1 javaslat): rövid megjegyzések a naphoz (pain/energy/goal), amiket a Guru figyelembe vesz.
- `yoga_guru_recommendations` (opcionális): a generált ajánlások audit/tracing célra (request_id, model, prompt_hash, output_json).

RLS: ha új táblák jönnek, a policy döntést migrációban rögzíteni kell (service_role write + admin read, vagy más modell).

## Implementációs checklist (amikor F3-ba lépünk)

### Governance (előfeltétel)
- SPEC: `7.5.1 Yoga Guru` elfogadott scope + open questions lezárása.
- Decision: D44 státusz `Accepted` (ha tényleges build indul).

### F1 (Audit)
- Megerősíteni a DB valós állapotát: `activity_logs` létezik-e, van-e unique constraint, RLS be van-e kapcsolva.
- Felmérni: van-e már “heti terv” és “komment” tárolás a DB-ben (vagy csak `notes`).

### F2 (Design)
- Fix AI JSON schema + Zod validáció (Chef mintára).
- Fix “recommendation → activity_logs” mapping (metadata mezők).
- Döntés: több log / nap / activity vagy 1 (és ennek megfelelő API/UI viselkedés).

### F3 (Build)
- UI:
  - `Yoga Guru` gomb a Yoga felületen (birdwatch jellegű action mintával).
  - Guru oldal/panel + ajánlás lista + választás + rögzítés.
- API:
  - `POST /api/yoga-guru/recommend` (server-side AI, strict JSON).
- Config:
  - új env: `AI_MODEL_YOGA_GURU` (opcionális, fallback `AI_MODEL_TEXT`).

### F4 (Check)
- Happy path: javaslat → választás → log mentés, majd megjelenik a kiválasztott napon.
- Failure path: AI hiba → UI “fallback” (pl. keywords-only ajánlás vagy hibaüzenet).
- Regression: `/admin/yoga` normál logolás továbbra is működik.

## Későbbi bővítés (külön fázis)

### Guide jelleg + katalógusok
1) **Anatómiai katalógus**: izmok/csontok, tudományos rajzok + rövid leírás + kapcsolódó gyakorlatok.
2) **Jóga katalógus**: póz tartás/átmenet leírások + ikonok (referenciaképhez igazodó stílus).

Ezekhez governance kell: SPEC + külön D# decision az image/icon pipeline-ra és a kanonikus payloadokra.
