import { describe, expect, it } from "vitest";
import { buildPlaceMetaLine } from "../placePanelMeta";

describe("buildPlaceMetaLine", () => {
  it("formats type + county when available", () => {
    expect(buildPlaceMetaLine({ typeLabel: "Puszta", county: "Hajdú-Bihar", nearestCity: null }))
      .toBe("Puszta · Hajdú-Bihar");
  });

  it("falls back to nearest city if county missing", () => {
    expect(buildPlaceMetaLine({ typeLabel: "Vizes élõhely", county: null, nearestCity: "Szeged" }))
      .toBe("Vizes élõhely · Szeged");
  });

  it("returns type only when no region info", () => {
    expect(buildPlaceMetaLine({ typeLabel: "Erdõszél", county: null, nearestCity: null }))
      .toBe("Erdõszél");
  });
});
