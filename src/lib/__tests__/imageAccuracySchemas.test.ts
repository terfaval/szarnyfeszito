import { describe, expect, it } from "vitest";
import { scienceDossierSchemaV1, visualBriefSchemaV1 } from "../imageAccuracySchemas";

describe("scienceDossierSchemaV1", () => {
  it('normalizes proportions.body "medium" -> "average"', () => {
    const payload = scienceDossierSchemaV1.parse({
      species_identity: { name_hu: "Daru", name_latin: "Grus grus" },
      proportions: {
        neck: "long",
        legs: "long",
        body: "medium",
        beak: { length: "long", shape: "straight" },
      },
      plumage_variants: {
        adult: "Grey base plumage with contrasting pattern",
        juvenile: "not_applicable",
        breeding: "not_applicable",
        non_breeding: "not_applicable",
      },
      must_not_include: ["Short neck", "Short legs", "Short beak"],
      confidence: { per_section: "high" },
    });

    expect(payload.proportions.body).toBe("average");
  });

  it("rejects invalid proportions.body values", () => {
    expect(() =>
      scienceDossierSchemaV1.parse({
        species_identity: { name_hu: "Daru", name_latin: "Grus grus" },
        proportions: {
          neck: "long",
          legs: "long",
          body: "large",
          beak: { length: "long", shape: "straight" },
        },
        plumage_variants: {
          adult: "Grey base plumage with contrasting pattern",
          juvenile: "not_applicable",
          breeding: "not_applicable",
          non_breeding: "not_applicable",
        },
        must_not_include: ["Short neck", "Short legs", "Short beak"],
        confidence: { per_section: "high" },
      })
    ).toThrow();
  });
});

describe("visualBriefSchemaV1", () => {
  it("normalizes nesting_clean.confidence medium -> med", () => {
    const payload = visualBriefSchemaV1.parse({
      scientific: {
        main_habitat: {
          pose: "Full-body side view, standing on a neutral perch",
          composition_rules: ["Bird fills ~75% of frame"],
          habitat_hint_elements: ["reeds", "shallow water"],
          background_rules: ["pale paper tone", "no scene perspective"],
          must_not: ["fantasy colors"],
        },
        nesting_clean: {
          nest_type: "ground scrape",
          nest_material: "dry grass",
          chicks_visible: false,
          confidence: "medium",
        },
      },
      iconic: {
        silhouette_focus: ["long legs", "long neck"],
        simplify_features: [],
        must_not: [],
        background: "none",
      },
    });

    expect(payload.scientific.nesting_clean?.confidence).toBe("med");
    expect(payload.scientific.nesting_clean?.parent_sex_hint).toBe("none");
  });

  it("drops invalid optional variants instead of failing the whole payload", () => {
    const payload = visualBriefSchemaV1.parse({
      scientific: {
        main_habitat: {
          pose: "Full-body side view, standing",
          habitat_hint_elements: ["forest edge", "leaf litter"],
        },
        flight_clean: {
          pose: "In flight, wings open",
          composition_rules: ["centered"],
          background_rules: ["white"],
          must_not: ["watermark"],
        },
        nesting_clean: {
          pose: "On nest",
          confidence: "medium",
          must_not: ["eggs visible"],
        },
      },
      iconic: {
        silhouette_focus: ["long tail", "distinct crest"],
        simplify_features: ["reduce feather detail"],
        must_not: ["background scene"],
        background: "none",
      },
    });

    expect(payload.scientific.flight_clean).toBeUndefined();
    expect(payload.scientific.nesting_clean).toBeUndefined();
  });

  it("drops non-string iconic.color_guidance instead of failing", () => {
    const payload = visualBriefSchemaV1.parse({
      scientific: {
        main_habitat: {
          pose: "Full-body side view, standing",
          habitat_hint_elements: ["reeds", "shallow water"],
        },
      },
      iconic: {
        silhouette_focus: ["long legs", "long neck"],
        simplify_features: [],
        color_guidance: true,
        must_not: [],
        background: "none",
      },
    });

    expect(payload.iconic.color_guidance).toBeUndefined();
  });
});
