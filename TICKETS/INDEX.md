# Szárnyfeszítő – Master Ticket Index

Ez a dokumentum modulonként rendezi a teljes fejlesztési ticket struktúrát,
és ajánlott futtatási sorrendet ad a Codex számára.

---

# 🔵 FÁZIS 1 – Core Admin / Keltető (Kötelező alap)

Ajánlott sorrend:

1. T001 – Project Scaffold
2. T002 – Supabase Setup
3. T003 – Single Admin Auth
4. T004 – Bird CRUD
5. T005 – Text Generation API
6. T006 – Text Review Flow
7. T007 – Image Generation API
8. T008 – Image Review Flow
9. T009 – Publish Gate
10. T010 – Dashboard

✔ Ezzel elkészül a működő Admin pipeline.

---

# 🟢 FÁZIS 2 – Places / Phenomena / Relations

Függőség: Fázis 1 kész.

Ajánlott sorrend:

1. T101 – Place CRUD
2. T102 – Phenomenon CRUD
3. T103 – place_birds
4. T104 – phenomenon_places
5. T105 – phenomenon_birds
6. T106 – Place Text Generation
7. T107 – Phenomenon Text Generation

✔ Ezzel teljessé válik az entitás-háló.

---

# 🟡 FÁZIS 3 – AI Quality & Validation (Erősen ajánlott)

Függőség: Fázis 1 működik.

1. T201 – Schema Validation
2. T202 – Fact Box Policy
3. T203 – Hallucination Guard
4. T204 – Source Tracking

✔ Ezzel a rendszer tudományos és minőségi kontrollt kap.

---

# 🟣 FÁZIS 4 – Image Style & Prompt System

Függőség: T007 működik.

1. T301 – Style Config Registry
2. T302 – Image Spec Generator
3. T303 – Background Variant Rules
4. T304 – Generation Queue

✔ Ezzel a képgenerálás iparszerű és kontrollált lesz.

---

# 🔴 FÁZIS 5 – Production Hardening

Ajánlott utolsó körben.

1. T401 – Rate Limits & Timeouts
2. T402 – Error Observability
3. T403 – DB Migrations Structure
4. T404 – Content Export

✔ Ezzel production-ready szintet ér el a rendszer.

---

# ⚙️ Ajánlott stratégia

Minimum működő rendszer:
FÁZIS 1

Minőségi, stabil tartalomgyártás:
FÁZIS 1 + FÁZIS 3 + FÁZIS 4

Teljes belső platform:
FÁZIS 1 + 2 + 3 + 4

Production érettség:
Mind az 5 fázis

---

Ez az index segíti a Codex-et a moduláris, kontrollált fejlesztésben.
