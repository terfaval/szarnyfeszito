"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BirdDossierLeafletsV1 } from "@/types/dossier";
import { getHungaryRegionDef, getWorldRegionDef } from "@/lib/leafletsRegions";

type LeafletMiniMapProps = {
  kind: "world" | "hungary";
  leaflets: BirdDossierLeafletsV1 | null | undefined;
  className?: string;
};

const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const intensityColor = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  const hue = 220 - clamped * 200; // blue -> red
  return `hsl(${hue} 85% 55%)`;
};

export default function BirdLeaflets({ kind, leaflets, className }: LeafletMiniMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);

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

    if (kind === "world") {
      map.setView([20, 0], 1);
    } else {
      map.setView([47.1625, 19.5033], 6);
    }

    L.tileLayer(tileUrl, {
      maxZoom: 8,
      minZoom: 1,
    }).addTo(map);

    mapRef.current = map;
    overlayRef.current = L.layerGroup().addTo(map);

    return () => {
      overlayRef.current?.clearLayers();
      overlayRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [kind]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) {
      return;
    }

    overlay.clearLayers();

    if (!leaflets) {
      return;
    }

    const regions = kind === "world" ? leaflets.world.regions : leaflets.hungary.regions;
    const radius = kind === "world" ? 700_000 : 55_000;

    regions.forEach((region) => {
      const def = kind === "world" ? getWorldRegionDef(region.code as never) : getHungaryRegionDef(region.code as never);
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
