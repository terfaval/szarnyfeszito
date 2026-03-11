"use client";

import type { ComponentProps } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { TileLayer } from "react-leaflet";
import type { BasemapId, BasemapPresetKey } from "./basemaps";
import { DEFAULT_BASEMAP, DEFAULT_BASEMAP_PRESET, getBasemapFallbackTileLayerArgs, getBasemapTileLayerArgs, resolveBasemapPreset } from "./basemaps";
import { useTimeThemeMode } from "./useTimeThemeMode";

type TileLayerProps = ComponentProps<typeof TileLayer>;

type BasemapLayerProps = Omit<TileLayerProps, "url" | "attribution"> & {
  basemap?: BasemapId;
  basemapPreset?: BasemapPresetKey;
};

export default function BasemapLayer({ basemap, basemapPreset = DEFAULT_BASEMAP_PRESET, ...props }: BasemapLayerProps) {
  const { mode } = useTimeThemeMode();
  const resolved = useMemo(() => resolveBasemapPreset({ preset: basemapPreset, theme: mode }), [basemapPreset, mode]);
  const effectiveBasemap = basemap ?? resolved.basemap ?? DEFAULT_BASEMAP;

  const isDark = effectiveBasemap === "bird" ? resolved.isDark : mode === "night";
  const primary = useMemo(() => {
    if (effectiveBasemap === "brand") return null;
    return getBasemapTileLayerArgs({ basemap: effectiveBasemap, isDark });
  }, [effectiveBasemap, isDark]);

  const fallback = useMemo(() => {
    if (effectiveBasemap === "brand") return null;
    return getBasemapFallbackTileLayerArgs({ basemap: effectiveBasemap, isDark });
  }, [effectiveBasemap, isDark]);

  const [useFallback, setUseFallback] = useState(false);
  const tileErrorCountRef = useRef(0);
  const lastErrorAtRef = useRef<number | null>(null);

  const onTileError = useCallback(() => {
    if (!fallback || useFallback) return;

    const now = Date.now();
    const last = lastErrorAtRef.current ?? 0;
    lastErrorAtRef.current = now;

    if (now - last > 4_000) {
      tileErrorCountRef.current = 0;
    }
    tileErrorCountRef.current += 1;

    if (tileErrorCountRef.current >= 6) {
      setUseFallback(true);
    }
  }, [fallback, useFallback]);

  if (effectiveBasemap === "brand") return null;
  if (!primary) return null;

  const active = useFallback && fallback ? fallback : primary;

  return (
    <TileLayer
      url={active.url}
      attribution={active.attribution}
      {...props}
      eventHandlers={{
        tileerror: onTileError,
      }}
    />
  );
}
