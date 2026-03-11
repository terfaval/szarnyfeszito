import { describe, expect, it } from "vitest";
import { phenomenonUiVariantsSchemaV1 } from "../phenomenonContentSchema";

describe("phenomenonUiVariantsSchemaV1", () => {
  it("fills defaults for missing optional variant blocks", () => {
    const payload = phenomenonUiVariantsSchemaV1.parse({
      schema_version: "phenomenon_ui_variants_v1",
      language: "hu",
    });

    expect(payload.variants.teaser).toBe("");
    expect(payload.variants.short).toBe("");
    expect(payload.variants.ethics_tip).toBe("");
  });

  it("rejects non-string variant values", () => {
    expect(() =>
      phenomenonUiVariantsSchemaV1.parse({
        schema_version: "phenomenon_ui_variants_v1",
        language: "hu",
        variants: { teaser: 123 },
      })
    ).toThrow();
  });
});

