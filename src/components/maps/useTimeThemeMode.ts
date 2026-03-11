"use client";

import { useEffect, useMemo, useState } from "react";
import type { MapThemeMode } from "./basemaps";

function readThemeFromDom(): MapThemeMode | null {
  const attr = document.documentElement.getAttribute("data-time-theme");
  if (attr === "night") return "night";
  if (attr === "day") return "day";
  return null;
}

function readThemeFromMedia(): MapThemeMode {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
}

export function useTimeThemeMode(): { mode: MapThemeMode; isNight: boolean } {
  const [mode, setMode] = useState<MapThemeMode>(() => {
    if (typeof window === "undefined") return "day";
    return readThemeFromDom() ?? readThemeFromMedia();
  });

  useEffect(() => {
    const update = () => setMode(readThemeFromDom() ?? readThemeFromMedia());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-time-theme"] });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", update);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", update);
    };
  }, []);

  return useMemo(() => ({ mode, isNight: mode === "night" }), [mode]);
}

