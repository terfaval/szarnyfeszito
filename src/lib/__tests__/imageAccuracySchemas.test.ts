import { describe, expect, it } from "vitest";
import { scienceDossierSchemaV1 } from "../imageAccuracySchemas";

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
