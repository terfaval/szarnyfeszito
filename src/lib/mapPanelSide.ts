export type PanelSide = "left" | "right";

type PanelSideArgs = {
  containerX: number;
  containerWidth: number;
  defaultSide?: PanelSide;
};

export function resolvePanelSide({ containerX, containerWidth, defaultSide = "right" }: PanelSideArgs): PanelSide {
  if (!Number.isFinite(containerX) || !Number.isFinite(containerWidth) || containerWidth <= 0) {
    return defaultSide;
  }
  return containerX < containerWidth / 2 ? "right" : "left";
}
