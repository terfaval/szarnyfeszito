"use client";

import { useEffect } from "react";

const DAY_START = 6;
const NIGHT_START = 18;
const MINUTE_MS = 60 * 1000;

const getThemeFromDate = () => {
  const hours = new Date().getHours();
  return hours >= DAY_START && hours < NIGHT_START ? "day" : "night";
};

const applyTheme = (theme: string) => {
  document.documentElement.setAttribute("data-time-theme", theme);
};

export default function TimeThemeEffect() {
  useEffect(() => {
    const updateTheme = () => applyTheme(getThemeFromDate());

    updateTheme();

    const intervalId = window.setInterval(updateTheme, MINUTE_MS);
    const handleFocus = () => updateTheme();

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return null;
}
