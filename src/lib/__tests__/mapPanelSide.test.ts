import { describe, expect, it } from "vitest";
import { resolvePanelSide } from "../mapPanelSide";

describe("resolvePanelSide", () => {
  it("returns right when click is on left half", () => {
    expect(resolvePanelSide({ containerX: 120, containerWidth: 600 })).toBe("right");
  });

  it("returns left when click is on right half", () => {
    expect(resolvePanelSide({ containerX: 420, containerWidth: 600 })).toBe("left");
  });

  it("falls back to default when width is invalid", () => {
    expect(resolvePanelSide({ containerX: 10, containerWidth: 0, defaultSide: "left" })).toBe("left");
  });
});
