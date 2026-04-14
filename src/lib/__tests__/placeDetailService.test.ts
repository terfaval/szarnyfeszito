import { describe, expect, it } from "vitest";
import { pickApprovedPlaceBirds, type PlaceBirdFilterRow } from "../placeBirdFilters";

describe("pickApprovedPlaceBirds", () => {
  it("keeps approved birds regardless of season flags", () => {
    const rows: PlaceBirdFilterRow[] = [
      { bird: { id: "1" }, visible_in_spring: false },
      { bird: { id: "2" }, visible_in_spring: true },
    ];
    expect(pickApprovedPlaceBirds(rows).length).toBe(2);
  });
});
