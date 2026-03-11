export function habitatIconForClass(habitatClass: unknown): string | null {
  if (typeof habitatClass !== "string") {
    return null;
  }

  switch (habitatClass.trim().toLowerCase()) {
    case "erdő":
      return "/BIRDS/ICONS/BACKGROUND/ICON_FOREST.svg";
    case "vízpart":
      return "/BIRDS/ICONS/BACKGROUND/ICON_WATER.svg";
    case "puszta":
      return "/BIRDS/ICONS/BACKGROUND/ICON_GRASSLAND.svg";
    case "hegy":
      return "/BIRDS/ICONS/BACKGROUND/ICON_MOUNTAIN.svg";
    case "város":
      return "/BIRDS/ICONS/BACKGROUND/ICON_CITY.svg";
    default:
      return null;
  }
}

