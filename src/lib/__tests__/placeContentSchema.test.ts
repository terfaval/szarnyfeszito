import { describe, expect, it } from "vitest";
import { placeUiVariantsSchemaV1 } from "../placeContentSchema";

describe("placeUiVariantsSchemaV1", () => {
  it("fills defaults for missing optional variant blocks", () => {
    const payload = placeUiVariantsSchemaV1.parse({
      schema_version: "place_ui_variants_v1",
      language: "hu",
    });

    expect(payload.variants.teaser).toBe("");
    expect(payload.variants.short).toBe("");
    expect(payload.variants.seasonal_snippet.spring).toBe("");
  });

  it("rejects non-string variant values", () => {
    expect(() =>
      placeUiVariantsSchemaV1.parse({
        schema_version: "place_ui_variants_v1",
        language: "hu",
        variants: { teaser: 123 },
      })
    ).toThrow();
  });
});
