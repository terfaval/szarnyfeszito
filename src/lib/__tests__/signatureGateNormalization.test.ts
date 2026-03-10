import { beforeAll, describe, expect, it } from "vitest";

let __test: typeof import("../dossierGeneration").__test;

beforeAll(async () => {
  process.env.OPENAI_API_KEY ||= "test-key";
  process.env.AI_MODEL_TEXT ||= "test-model";
  process.env.AI_MODEL_IMAGE ||= "test-model";

  ({ __test } = await import("../dossierGeneration"));
});

describe("signature gate normalization", () => {
  it("accepts a concrete Hungarian signature with accents", () => {
    const reasons = __test.validateSignatureSpecificity(
      "A mocsár peremén cserregő hangja árulja el, még mielőtt a sziluettje kibukkan."
    );
    expect(reasons).toEqual([]);
  });

  it("accepts a concrete signature even with mojibake", () => {
    const reasons = __test.validateSignatureSpecificity(
      "A mocsĂˇr peremĂ©n cserregĹ‘ hangja Ăˇrulja el, mĂ©g mielĹ‘tt a sziluettje kibukkan."
    );
    expect(reasons).toEqual([]);
  });

  it("flags generic, adjectives-only signatures", () => {
    const reasons = __test.validateSignatureSpecificity("Lenyűgöző, különleges madár.");
    expect(reasons).toContain("signature_trait lacks concrete field-guide anchors");
    expect(reasons).toContain("signature_trait reads generic (adjectives-only)");
  });

  it("extracts stable anchors from accented text", () => {
    const anchors = __test.extractAnchorKeywords(
      "A nádas peremén elejtett hangja mögött a tollazat árnyéka villan fel."
    );
    expect(anchors).toContain("nadas");
  });
});
