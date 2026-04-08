# Szárnyfeszítõ projekt-brief – design (2026-04-08)

## Cél
Egy közepes terjedelmû, magyar nyelvû, portfólió-célú projekt-brief készítése, amely a Szárnyfeszítõ publikus felületét állítja fókuszba, és csak nagyvonalakban utal a tartalom-keltetõ admin háttérre.

## Közönség
Portfólió-olvasók (általános szakmai közönség), nem fejlesztõi dokumentációt keresõk.

## Fókusz és hangnem
- Fókusz: publikus madár- és helyszín-felfedezõ felület.
- Admin/keltetõ: 2–3 mondat, csak mint kontrollált tartalom-elõállítás.
- Hangnem: tárgyilagos, letisztult, portfólió-elõképes, nem marketing.
- Technikai részletek: rövid, high-level.

## Forrásalap (elsõdleges)
- `SPEC.md`, `DECISIONS.md` (aktív scope és állapot)
- Publikus oldalak: `src/app/page.tsx`, `src/app/public/page.tsx`, `src/app/birds/*`, `src/app/places/*`
- Publikus megjelenítõ komponensek: `src/components/explorer/*`, `src/components/shared/BirdDossierCard.tsx`
- Publikus read-service logika: `src/lib/publicRead/*`

Megjegyzés: a `README.md` sablon jellegû, ezért nem tekintendõ elsõdleges forrásnak.

## Szerkezet (a brief 11 pontja)
0. Mire támaszkodik ez a brief?
1. Projekt neve
2. Mi ez a projekt?
3. Mire való, milyen helyzetben használható?
4. Mit tud jelenleg? (4–8 pont)
5. Mi benne az érdekes vagy egyedi?
6. Milyen állapotban van?
7. Rövid technikai keret
8. Rejtett vagy mellékes modulok (kihagyva)
9. Fejlõdési irányok (3–5 pont)
10. Rövid összkép
11. Bizonytalanságok vagy eltérések
+ Záró blokk: „Egymondatos portfólió-leírás”

## Tartalmi irányelvek
- A publikus élményt és a felhasználói helyzeteket kell leírni.
- A tartalom-elõállítás háttere csak annyiban szerepel, amennyiben magyarázza a publikus oldal minõség-kontrollját.
- Nem jelennek meg a jóga/chef/spirit modulok.
- Nem találunk ki hiányzó részleteket; a bizonytalanságokat külön szekció jelzi.

## Bizonytalanság-kezelés
Explicit bizonytalanságok:
- Éles deploy státusz és hozzáférhetõség
- Valós publikált tartalom-mennyiség
- Aktív felhasználói forgalom

## Elfogadási kritériumok
- Magyar nyelv, közepes terjedelem (kb. 600–900 szó).
- A publikus felület a fõ fókusz.
- Admin/keltetõ csak nagyvonalakban szerepel.
- Nincs marketing hangnem.
- Külön „Egymondatos portfólió-leírás” blokk a végén.
