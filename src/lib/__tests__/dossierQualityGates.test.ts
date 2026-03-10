import { describe, expect, it } from "vitest";
import type { Bird } from "../../types/bird";
import type { BirdDossier } from "../../types/dossier";
import {
  QualityGateError,
  SHORT_OPTION_SENSORY_SUFFIXES,
  runQualityGates,
} from "../dossierQualityGates";

const baseBird: Bird = {
  id: "bird-001",
  slug: "pelda",
  name_hu: "Példamadár",
  name_latin: "Exemplaris exemplaris",
  status: "draft",
  science_dossier_status: "none",
  visual_brief_status: "none",
  size_category: null,
  visibility_category: null,
  classification_status: "none",
  color_tags: [],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const baseDossier: BirdDossier = {
  schema_version: "v2.3",
  signature_trait:
    "A nádas peremén elejtett hangja mögött a tollazat árnyéka narancssárgán villan fel.",
  header: {
    name_hu: "Példamadár",
    name_latin: "Exemplaris exemplaris",
    subtitle: "Nádszéli tünemény",
    short_summary:
      "Tollazata a hajnali fénynél csillog, így a nádasban könnyen megjegyezhető.",
  },
  pill_meta: {
    habitat_class: "vízpart",
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
      {
        axis: "csor",
        title: "Rövid, hajlott csőr",
        description: "Rövid csőrét ügyesen használja a sekély vízből szedegetett lárvákra.",
      },
      {
        axis: "tollazat",
        title: "Pöttyös tollazat",
        description: "Tollazata sűrű és pöttyös, mintha a nád ritmusát követné.",
      },
      {
        axis: "hang",
        title: "Tompa csipogás",
        description: "Hangja tompa csipogás, inkább rövid kiáltásokat ismétel.",
      },
      {
        axis: "mozgas",
        title: "Lebegő mozgás",
        description: "Mozgása lebegő, szárnycsapásai rövidek, könnyedek.",
      },
    ],
    identification_paragraph:
      "A négy kulcsfontosságú jellemző együttesen biztosítja, hogy gyorsan felismerhető legyen a nádasokban.",
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
  typical_places: ["Tisza-tavi nádasa", "Duna menti szigetek"],
  leaflets: {
    schema_version: "leaflets_v1",
    world: {
      regions: [{ code: "europe", intensity: 0.7, rationale: "Európai elterjedésre utaló dossier-részletek alapján." }],
      note: "Régió-szintű jelölés (v1).",
    },
    hungary: {
      regions: [{ code: "HU33", intensity: 0.5, rationale: "Alföldi vizes élőhelyek említése alapján." }],
      note: "Régió-szintű jelölés (v1).",
    },
  },
};

const cloneDossier = () => JSON.parse(JSON.stringify(baseDossier)) as BirdDossier;

describe("dossierQualityGates", () => {
  it("allows a healthy dossier", () => {
    expect(() => runQualityGates(cloneDossier(), baseBird)).not.toThrow();
  });

  it("rejects name lock violations", () => {
    const dossier = cloneDossier();
    dossier.header.name_hu = "Másnév";
    expect(() => runQualityGates(dossier, baseBird)).toThrow(QualityGateError);
  });

  it("rejects sensory suffix dominance in short options", () => {
    const dossier = cloneDossier();
    dossier.short_options[0] = SHORT_OPTION_SENSORY_SUFFIXES[0];
    expect(() => runQualityGates(dossier, baseBird)).toThrow(QualityGateError);
  });

  it("rejects short options that are too short or fragmentary", () => {
    const dossier = cloneDossier();
    dossier.short_options[2] = "Túl rövid";
    expect(() => runQualityGates(dossier, baseBird)).toThrow(QualityGateError);
  });

  it("rejects duplicate identification titles", () => {
    const dossier = cloneDossier();
    dossier.identification.key_features[1].title =
      dossier.identification.key_features[0].title;
    expect(() => runQualityGates(dossier, baseBird)).toThrow(QualityGateError);
  });

  it("rejects structured size ranges that are too narrow", () => {
    const dossier = cloneDossier();
    dossier.pill_meta.size_cm = { min: 40, max: 41 };
    expect(() => runQualityGates(dossier, baseBird)).toThrow(QualityGateError);
  });
});
