"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BirdDossierLeaflets } from "@/types/dossier";
import { getBasemapTileLayerArgs } from "@/components/maps/basemaps";
import { HUNGARY_FULL_BOUNDS_V1, WORLD_FULL_BOUNDS_V1 } from "@/components/maps/viewPresets";
import { getHungaryRegionDef, getWorldRegionDef } from "@/lib/leafletsRegions";
import { getHungaryRegionV2Def, getWorldRegionV2Def } from "@/lib/leafletsRegionsV2";

type LeafletMiniMapProps = {
  kind: "world" | "hungary";
  leaflets: BirdDossierLeaflets | null | undefined;
  className?: string;
};

const intensityColor = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  const hue = 220 - clamped * 200; // blue -> red
  return `hsl(${hue} 85% 55%)`;
};

export default function BirdLeaflets({ kind, leaflets, className }: LeafletMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      attributionControl: false,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });

    const bounds = kind === "world" ? WORLD_FULL_BOUNDS_V1 : HUNGARY_FULL_BOUNDS_V1;
    map.fitBounds(bounds, { padding: [8, 8], animate: false });

    const initialIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const tileLayerArgs = getBasemapTileLayerArgs({ basemap: "bird", isDark: initialIsDark });
    const tileLayer = L.tileLayer(tileLayerArgs.url, {
      maxZoom: 8,
      minZoom: 1,
    });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    mapRef.current = map;
    overlayRef.current = L.layerGroup().addTo(map);

    return () => {
      overlayRef.current?.clearLayers();
      overlayRef.current = null;
      tileLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [kind]);

  useEffect(() => {
    const layer = tileLayerRef.current;
    if (!layer) return;
    const next = getBasemapTileLayerArgs({ basemap: "bird", isDark });
    layer.setUrl(next.url);
  }, [isDark]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    overlay.clearLayers();

    if (!leaflets) {
      return;
    }

    if (leaflets.schema_version === "leaflets_v2") {
      const present = kind === "world" ? leaflets.world.present : leaflets.hungary.present;
      const hover = kind === "world" ? leaflets.world.hover_hu : leaflets.hungary.hover_hu;
      const fill = kind === "world" ? "#36a853" : "#2b7bbb";
      const stroke = kind === "world" ? "#1f6b35" : "#1b4f7a";

      present.forEach((code) => {
        const def =
          kind === "world"
            ? getWorldRegionV2Def(code as never)
            : getHungaryRegionV2Def(code as never);

        def.bounds.forEach((b) => {
          L.rectangle(
            [
              [b.south, b.west],
              [b.north, b.east],
            ],
            {
              color: stroke,
              weight: 1,
              fillColor: fill,
              fillOpacity: 0.55,
            }
          )
            .bindTooltip(
              hover ? `${def.label} — ${hover}` : def.label,
              { direction: "top", opacity: 0.9 }
            )
            .addTo(overlay);
        });
      });

      return;
    }

    const regions = kind === "world" ? leaflets.world.regions : leaflets.hungary.regions;
    const radius = kind === "world" ? 700_000 : 55_000;

    regions.forEach((region) => {
      const def =
        kind === "world"
          ? getWorldRegionDef(region.code as never)
          : getHungaryRegionDef(region.code as never);
      const color = intensityColor(region.intensity);

      L.circle([def.center.lat, def.center.lng], {
        radius,
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.12 + Math.max(0, Math.min(1, region.intensity)) * 0.45,
      })
        .bindTooltip(`${def.label} (${Math.round(region.intensity * 100)}%)`, {
          direction: "top",
          opacity: 0.9,
        })
        .addTo(overlay);
    });
  }, [kind, leaflets]);

  return <div ref={containerRef} className={className} />;
}
