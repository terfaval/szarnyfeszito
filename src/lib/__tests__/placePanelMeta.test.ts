import { describe, expect, it } from "vitest";
import { buildPlaceMetaLine } from "../placePanelMeta";

describe("buildPlaceMetaLine", () => {
  it("formats type + county when available", () => {
    expect(buildPlaceMetaLine({ typeLabel: "Puszta", county: "Hajd\u00fa-Bihar", nearestCity: null })).toBe(
      "Puszta \u00b7 Hajd\u00fa-Bihar"
    );
  });

  it("falls back to nearest city if county missing", () => {
    expect(buildPlaceMetaLine({ typeLabel: "Vizes \u00e9l\u0151hely", county: null, nearestCity: "Szeged" })).toBe(
      "Vizes \u00e9l\u0151hely \u00b7 Szeged"
    );
  });

  it("returns type only when no region info", () => {
    expect(buildPlaceMetaLine({ typeLabel: "Erd\u0151sz\u00e9l", county: null, nearestCity: null })).toBe(
      "Erd\u0151sz\u00e9l"
    );
  });
});
