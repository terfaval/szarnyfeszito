"use client";

import type { ReactNode } from "react";
import { MapContainer } from "react-leaflet";
import type { MapContainerProps } from "react-leaflet";
import type { BasemapPresetKey } from "./basemaps";
import { DEFAULT_BASEMAP_PRESET, resolveBasemapPreset } from "./basemaps";
import { useTimeThemeMode } from "./useTimeThemeMode";

export type ThemedMapContainerProps = MapContainerProps & {
  basemapPreset?: BasemapPresetKey;
  className?: string;
  children?: ReactNode;
};

export default function ThemedMapContainer({ basemapPreset = DEFAULT_BASEMAP_PRESET, className, ...props }: ThemedMapContainerProps) {
  const { mode } = useTimeThemeMode();
  const resolved = resolveBasemapPreset({ preset: basemapPreset, theme: mode });
  const mergedClassName = [className, "sf-map", resolved.mapClassName].filter(Boolean).join(" ");

  return <MapContainer {...props} className={mergedClassName} />;
}

