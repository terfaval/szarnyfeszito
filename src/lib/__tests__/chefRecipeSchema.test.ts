import { describe, expect, it } from "vitest";
import { chefRecipeSchemaV1 } from "../chefRecipeSchema";

describe("chefRecipeSchemaV1", () => {
  it("accepts a minimal valid payload", () => {
    const payload = chefRecipeSchemaV1.parse({
      schema_version: "v1",
      language: "hu",
      title: "Gyors paradicsomos tészta",
      short_description: "Egyszerű, gyors vacsora sok bazsalikommal.",
      servings: 2,
      cook_time_minutes: 20,
      ingredients: [
        { name: "spagetti", amount: 200, unit: "g", note: null },
        { name: "paradicsom", amount: 4, unit: "db", note: null },
        { name: "fokhagyma", amount: 2, unit: "gerezd", note: null },
        { name: "olívaolaj", amount: 2, unit: "ek", note: null },
        { name: "só", amount: null, unit: null, note: "ízlés szerint" },
      ],
      steps: [
        "Főzd meg a tésztát sós vízben al dente állagra.",
        "Közben pirítsd meg a fokhagymát olívaolajon, add hozzá a paradicsomot.",
        "Forgasd össze a tésztával, tálaláskor ízesítsd.",
      ],
    });

    expect(payload.servings).toBe(2);
    expect(payload.ingredients[4].amount).toBeNull();
  });

  it("rejects missing ingredients", () => {
    expect(() =>
      chefRecipeSchemaV1.parse({
        schema_version: "v1",
        language: "hu",
        title: "Valami",
        short_description: "Leírás",
        servings: 2,
        cook_time_minutes: 10,
        ingredients: [],
        steps: ["A", "B", "C"],
      })
    ).toThrow();
  });
});

