import { describe, expect, it } from "vitest";
import { parseBirdDossier, parseBirdIdentificationBlockV23 } from "../dossierSchema";

describe("dossierSchema axis normalization", () => {
  it("accepts accented / capitalized identification axis tokens", () => {
    const identification = parseBirdIdentificationBlockV23({
      identification: {
        key_features: [
          { axis: "Csőr", title: "Rövid, hajlott csőr", description: "Konkrét jellegzetesség a terepen." },
          { axis: "Tollazat", title: "Mintázott tollazat", description: "Konkrét jellegzetesség a terepen." },
          { axis: "Hang", title: "Éles csipogás", description: "Konkrét jellegzetesség a terepen." },
          { axis: "Mozgás", title: "Hirtelen szökkenés", description: "Konkrét jellegzetesség a terepen." },
        ],
        identification_paragraph: "Egy bekezdésnyi azonosítási összefoglaló, ami nem üres.",
      },
    });

    expect(identification.key_features.map((f) => f.axis)).toEqual(["csor", "tollazat", "hang", "mozgas"]);
  });

  it("accepts object-shaped axis tokens", () => {
    const identification = parseBirdIdentificationBlockV23({
      identification: {
        key_features: [
          { axis: { value: "Csőr" }, title: "Rövid, hajlott csőr", description: "Konkrét jellegzetesség a terepen." },
          { axis: { value: "Tollazat" }, title: "Mintázott tollazat", description: "Konkrét jellegzetesség a terepen." },
          { axis: { value: "Hang" }, title: "Éles csipogás", description: "Konkrét jellegzetesség a terepen." },
          { axis: { value: "Mozgás" }, title: "Hirtelen szökkenés", description: "Konkrét jellegzetesség a terepen." },
        ],
        identification_paragraph: "Egy bekezdésnyi azonosítási összefoglaló, ami nem üres.",
      },
    });

    expect(identification.key_features.map((f) => f.axis)).toEqual(["csor", "tollazat", "hang", "mozgas"]);
  });

  it("accepts mojibake habitat_class tokens", () => {
    const dossier = parseBirdDossier({
      schema_version: "v2.3",
      signature_trait: "A nádas peremén elejtett hangja mögött a tollazat árnyéka villan fel.",
      header: {
        name_hu: "Példamadár",
        name_latin: "Exemplaris exemplaris",
        subtitle: "Nádszéli tünemény",
        short_summary: "Tollazata a hajnali fénynél csillog, így a nádasban könnyen megjegyezhető.",
      },
      pill_meta: {
        habitat_class: `v\u0102\u00ADzpart`,
        color_bg: "blue",
        region_teaser: "A Balaton partján él",
        size_cm: { min: 36, max: 42 },
        wingspan_cm: { min: 70, max: 90 },
        diet_short: "Rovarokkal és apró békákkal táplálkozik",
        lifespan_years: { min: 3, max: 8 },
      },
      short_options: [
        "A sziluettje lapos, tollazata aranyszínűen csillog, mozogva a vízfelszínből felkúszik fölé, szárnycsapásai lassan ívelnek.",
        "Tollazata pöttyös mintázatú, ahogy a nádas közelében áll, hangja tompa csipogás, amely a partvidék csendjét csak átkarolja.",
        "Mozgása táncos, szárnycsapásai rövidek, mozdulatai fürgék, a csőre rövid és hajlott, így a sűrű növények között is fürgén szökken.",
      ],
      long_paragraphs: [
        "A reggeli ködben a sziluettje csak puha árnyék, a part menti nádasba simulva figyel, a csőre ritkán mozdul.",
        "Napközben lágyan lebeg a víz fölé, néha egy-egy merész kiáltással jelzi párjának az estét, a nyugodt jelenlétét gyorsan megjegyzi, aki figyeli.",
      ],
      identification: {
        key_features: [
          { axis: "csor", title: "Rövid, hajlott csőr", description: "Rövid csőrét ügyesen használja a sekély vízből szedegetett lárvákra." },
          { axis: "tollazat", title: "Pöttyös tollazat", description: "Tollazata sűrű és pöttyös, mintha a nád ritmusát követné." },
          { axis: "hang", title: "Tompa csipogás", description: "Hangja tompa csipogás, inkább rövid kiáltásokat ismétel." },
          { axis: "mozgas", title: "Lebegő mozgás", description: "Mozgása lebegő, szárnycsapásai rövidek, könnyedek." },
        ],
        identification_paragraph: "A négy kulcsfontosságú jellemző együttesen biztosítja, hogy gyorsan felismerhető legyen a nádasokban.",
      },
      distribution: {
        taxonomy: { order: null, family: null, genus: null, species: null },
        iucn_status: null,
        distribution_regions: ["Dél-alföldi vizes élőhelyek"],
        distribution_note: "Általában az alföldi nádasok sűrű peremén fordul elő.",
      },
      nesting: {
        nesting_type: "Nádfonat",
        nest_site: "Nádas szigetek",
        breeding_season: "Április-május",
        clutch_or_chicks_count: "4-5 tojás",
        nesting_note: "Vízközeli szigeteket kedveli.",
      },
      migration: {
        is_migratory: false,
        timing: null,
        route: null,
        migration_note: "Általában a környékén marad, csak extrém hidegben mozdul.",
      },
      fun_fact: "Szívesen lebeg a víz fölött, mintha tükörlabda lenne.",
      did_you_know: "Ha közelebb merészkedik, gyakran a víztükör peremén fut végig, mintha lépésekkel mérné fel a nádas ritmusát.",
      ethics_tip: "Tisztítsuk meg a partokat, ne zavarjuk a fészkét.",
      typical_places: ["Tisza-tavi nádasa"],
      leaflets: {
        schema_version: "leaflets_v1",
        world: { regions: [{ code: "europe", intensity: 0.7, rationale: "Európai elterjedésre utaló dossier-részletek alapján." }], note: "Régió-szintű jelölés (v1)." },
        hungary: { regions: [{ code: "HU33", intensity: 0.5, rationale: "Alföldi vizes élőhelyek említése alapján." }], note: "Régió-szintű jelölés (v1)." },
      },
    });

    expect(dossier.pill_meta.habitat_class).toBe("vízpart");
  });
});
