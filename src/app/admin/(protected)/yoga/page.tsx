"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Dumbbell,
  Flower2,
  Footprints,
  Info,
  Link2,
  Plus,
  Repeat,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import {
  ACL_ROUTINES,
  ActivityLogRow,
  ActivityType,
  STRENGTH_WORKOUTS,
  YogaCategory,
} from "@/types/activity";

const WEEKDAY_LABELS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function getWeekDates(reference: Date) {
  const clone = new Date(reference);
  clone.setHours(0, 0, 0, 0);
  const dayIndex = (clone.getDay() + 6) % 7;
  const weekStart = new Date(clone);
  weekStart.setDate(clone.getDate() - dayIndex);
  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + index);
    return next;
  });
}

function getMonthStart(reference: Date) {
  const copy = new Date(reference);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getMonthDays(reference: Date) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const dayCount = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: dayCount }, (_, index) => new Date(year, month, index + 1));
}

type LogsMap = Record<string, Partial<Record<ActivityType, ActivityLogRow[]>>>;

const DEFAULT_STATUS: Record<ActivityType, string | null> = {
  yoga: null,
  strength: null,
  acl: null,
  running: null,
};

type ActivityPayload = {
  date: string;
  category: string;
  label: string;
  exerciseId?: string | null;
  durationMinutes?: number | null;
  distanceKm?: number | null;
  intensity?: number | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

const ACTIVITY_ORDER: ActivityType[] = ["yoga", "strength", "acl", "running"];
const ACTIVITY_LABELS: Record<ActivityType, string> = {
  yoga: "JÓGA",
  strength: "ERŐSÍTÉS",
  acl: "ACL-STABILITÁS",
  running: "FUTÁS",
};

const CATEGORY_COLORS: Record<ActivityType, string> = {
  yoga: "#db9221",
  strength: "#05768d",
  acl: "#14b8a6",
  running: "#fbbf24",
};

function getIconUrl(key: string) {
  return `/yoga/icons/${key}`;
}

function getActivityIcon(activity: ActivityType) {
  if (activity === "yoga") return getIconUrl("icon_yoga.svg");
  if (activity === "strength") return getIconUrl("icon_training.svg");
  if (activity === "acl") return getIconUrl("icon_acl.svg");
  return getIconUrl("icon_run.svg");
}

function getYogaCategoryIcon(category: YogaCategory) {
  return category === "strong"
    ? getIconUrl("icon_yoga-strong.svg")
    : getIconUrl("icon_yoga-relax.svg");
}

function getStrengthCategoryIcon(category: "easy" | "intense") {
  return category === "intense"
    ? getIconUrl("icon_training-intense.svg")
    : getIconUrl("icon_training-easy.svg");
}

function getAclCategoryIcon(category: "routine" | "block") {
  // The "train" icon is used for the longer stability block.
  return category === "block" ? getIconUrl("icon_acl-train.svg") : getIconUrl("icon_acl-routine.svg");
}

const SUBCATEGORY_COLORS: Record<ActivityType, Record<string, string>> = {
  yoga: {
    relax: "#db9221",
    strong: "#be2d12",
  },
  strength: {
    easy: "#0891b2",
    intense: "#0369a1",
  },
  acl: {
    routine: "#2dd4bf",
    block: "#0f766e",
  },
  running: {
    run: "#fbbf24",
  },
};

function resolveLogColor(activity: ActivityType, row?: ActivityLogRow) {
  if (!row) {
    return CATEGORY_COLORS[activity];
  }

  const byCategory = SUBCATEGORY_COLORS[activity]?.[row.category];
  return byCategory ?? CATEGORY_COLORS[activity];
}

export default function YogaPage() {
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [currentMonth, setCurrentMonth] = useState(() => getMonthStart(new Date()));
  const [logsMap, setLogsMap] = useState<LogsMap>({});
  const [loadedMonths, setLoadedMonths] = useState<string[]>([]);
  const [loadingMonths, setLoadingMonths] = useState<string[]>([]);

  // Legacy activity grid state (the grid will be replaced by the overlay card deck).
  // Keep these for now to avoid a risky large diff while iterating on the new UX.
  const [selectedYogaOptionId, setSelectedYogaOptionId] = useState("");
  const [showYogaForm, setShowYogaForm] = useState(false);
  const [newYogaForm, setNewYogaForm] = useState({
    label: "",
    description: "",
    durationMinutes: 10,
    intensity: 2 as 1 | 2 | 3,
    category: "relax" as YogaCategory,
  });
  const addCustomYogaEntry = useCallback(() => {
    setShowYogaForm(false);
  }, []);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayActivity, setOverlayActivity] = useState<ActivityType | null>(null);
  const [overlaySubcategory, setOverlaySubcategory] = useState<string | null>(null);
  const [overlayItemId, setOverlayItemId] = useState<string | null>(null);
  const [overlayExerciseDetail, setOverlayExerciseDetail] = useState<{
    key: string;
    title: string;
    detail?: string;
  } | null>(null);

  const [yogaCategory, setYogaCategory] = useState<YogaCategory>("relax");
  const [yogaTitle, setYogaTitle] = useState("");
  const [yogaDuration, setYogaDuration] = useState("10");
  const [yogaIntensity, setYogaIntensity] = useState<1 | 2 | 3>(2);
  const [yogaLink, setYogaLink] = useState("");
  const [yogaNewNotes, setYogaNewNotes] = useState("");
  const [selectedYogaTemplateId, setSelectedYogaTemplateId] = useState("");
  const [yogaSavedNotes, setYogaSavedNotes] = useState("");
  const [showNewYogaForm, setShowNewYogaForm] = useState(false);
  const [yogaTemplates, setYogaTemplates] = useState<
    {
      id: string;
      category: YogaCategory;
      label: string;
      durationMinutes: number | null;
      intensity: number | null;
      link: string | null;
      lastUsedDate: string;
    }[]
  >([]);
  const [loadingYogaTemplates, setLoadingYogaTemplates] = useState(false);

  const [selectedACLId, setSelectedACLId] = useState(ACL_ROUTINES[0].id);
  const [selectedStrengthId, setSelectedStrengthId] = useState(STRENGTH_WORKOUTS[0].id);
  const [runDistance, setRunDistance] = useState("");
  const [runDuration, setRunDuration] = useState("");
  const [runNotes, setRunNotes] = useState("");

  const [savingState, setSavingState] = useState<Record<ActivityType, boolean>>({
    yoga: false,
    strength: false,
    acl: false,
    running: false,
  });
  const [statusMessages, setStatusMessages] = useState<Record<ActivityType, string | null>>(
    () => ({ ...DEFAULT_STATUS })
  );
  const [errorMessages, setErrorMessages] = useState<Record<ActivityType, string | null>>(
    () => ({ ...DEFAULT_STATUS })
  );

  const selectedWeek = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("hu-HU", { month: "long", year: "numeric" }).format(currentMonth);
  }, [currentMonth]);
  const monthDays = useMemo(() => {
    const days = getMonthDays(currentMonth);
    const offset = (currentMonth.getDay() + 6) % 7;
    const leadingEmpty = Array.from({ length: offset }, () => null as Date | null);
    return [...leadingEmpty, ...days];
  }, [currentMonth]);

  type LegacyYogaOption = {
    id: string;
    label: string;
    description: string;
    durationMinutes: number;
    intensity: number;
    category: YogaCategory;
  };

  const availableYogaOptions = useMemo<LegacyYogaOption[]>(() => {
    // Legacy grid placeholder (hidden by CSS).
    return [];
  }, []);

  const loadMonthLogs = useCallback(async (monthKey: string) => {
    setLoadingMonths((prev) => [...prev, monthKey]);

    try {
      const response = await fetch(`/api/activity-logs?month=${monthKey}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Nem sikerült betölteni.");
      }

      setLogsMap((prev) => {
        const next = { ...prev };
        payload.data.forEach((entry: ActivityLogRow) => {
          const day = next[entry.date] ?? {};
          const existing = day[entry.activity_type] ?? [];
          next[entry.date] = {
            ...day,
            [entry.activity_type]: [...existing, entry],
          };
        });
        return next;
      });
      setLoadedMonths((prev) => [...prev, monthKey]);
      setErrorMessages({ ...DEFAULT_STATUS });
    } catch (error) {
      console.error(error);
      setErrorMessages((prev) => ({
        ...prev,
        yoga: "Hiba történt a napló betöltése közben.",
      }));
    } finally {
      setLoadingMonths((prev) => prev.filter((key) => key !== monthKey));
    }
  }, []);

  const loadYogaTemplates = useCallback(async () => {
    setLoadingYogaTemplates(true);
    try {
      const response = await fetch("/api/yoga-templates");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Nem sikerült betölteni a mentett jógákat.");
      }

      setYogaTemplates(payload.data ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingYogaTemplates(false);
    }
  }, []);

  useEffect(() => {
    const key = formatMonthKey(currentMonth);
    if (!loadedMonths.includes(key) && !loadingMonths.includes(key)) {
      loadMonthLogs(key);
    }
  }, [currentMonth, loadedMonths, loadingMonths, loadMonthLogs]);

  useEffect(() => {
    loadYogaTemplates();
  }, [loadYogaTemplates]);

  useEffect(() => {
    const key = formatMonthKey(selectedDate);
    if (!loadedMonths.includes(key) && !loadingMonths.includes(key)) {
      loadMonthLogs(key);
    }
  }, [selectedDate, loadedMonths, loadingMonths, loadMonthLogs]);

  useEffect(() => {
    // Don't clobber the overlay form state while the panel is open.
    if (overlayOpen) {
      return;
    }

    const dayLogs = logsMap[formatDateKey(selectedDate)] ?? {};
    const latestACL = dayLogs.acl?.[dayLogs.acl.length - 1];
    const latestStrength = dayLogs.strength?.[dayLogs.strength.length - 1];

    if (latestACL?.exercise_id) {
      setSelectedACLId(latestACL.exercise_id);
    }

    if (latestStrength?.exercise_id) {
      setSelectedStrengthId(latestStrength.exercise_id);
    }
  }, [logsMap, selectedDate, overlayOpen]);

  const handleSelectDay = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    setOverlayOpen(true);
    setOverlayActivity(null);
    setOverlaySubcategory(null);
    setOverlayItemId(null);
    setOverlayExerciseDetail(null);

    setYogaTitle("");
    setYogaDuration("10");
    setYogaIntensity(2);
    setYogaLink("");
    setYogaNewNotes("");
    setSelectedYogaTemplateId("");
    setYogaSavedNotes("");
    setShowNewYogaForm(false);

    setRunDistance("");
    setRunDuration("");
    setRunNotes("");

    setSelectedDate(normalized);
  };

  const saveActivity = useCallback(
    async (activityType: ActivityType, payload: ActivityPayload, successMessage: string) => {
      setSavingState((prev) => ({ ...prev, [activityType]: true }));
      setStatusMessages((prev) => ({ ...prev, [activityType]: null }));
      setErrorMessages((prev) => ({ ...prev, [activityType]: null }));

      try {
        const response = await fetch("/api/activity-logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...payload, activityType }),
        });

        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error ?? "Mentés sikertelen.");
        }

        const log: ActivityLogRow = body.data;

        setLogsMap((prev) => {
          const key = payload.date;
          const day = prev[key] ?? {};
          const existing = day[activityType] ?? [];
          return {
            ...prev,
            [key]: {
              ...day,
              [activityType]: [...existing, log],
            },
          };
        });

        setStatusMessages((prev) => ({
          ...prev,
          [activityType]: successMessage,
        }));
        return true;
      } catch (error) {
        console.error(error);
        setStatusMessages((prev) => ({
          ...prev,
          [activityType]: null,
        }));
        setErrorMessages((prev) => ({
          ...prev,
          [activityType]: "Nem sikerült menteni a bejegyzést.",
        }));
        return false;
      } finally {
        setSavingState((prev) => ({ ...prev, [activityType]: false }));
      }
    },
    []
  );

  const resetOverlayState = () => {
    setOverlayActivity(null);
    setOverlaySubcategory(null);
    setOverlayItemId(null);
    setOverlayExerciseDetail(null);
  };

  const handleCloseOverlay = () => {
    setOverlayOpen(false);
    resetOverlayState();
  };

  useEffect(() => {
    if (!overlayOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseOverlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [overlayOpen]);

  const handleSaveYogaTemplate = async () => {
    const template = yogaTemplates.find((item) => item.id === selectedYogaTemplateId);

    if (!template) {
      setErrorMessages((prev) => ({
        ...prev,
        yoga: "Válassz egy mentett jógát, vagy add hozzá újként.",
      }));
      return;
    }

    const ok = await saveActivity(
      "yoga",
      {
        date: formatDateKey(selectedDate),
        category: template.category,
        label: template.label,
        durationMinutes: template.durationMinutes,
        intensity: template.intensity,
        notes: yogaSavedNotes.trim() || null,
        metadata: template.link ? { link: template.link } : null,
      },
      "Jóga rögzítve."
    );

    if (ok) {
      setYogaSavedNotes("");
      setSelectedYogaTemplateId("");
      loadYogaTemplates();
    }
  };

  const handleSaveYogaNew = async () => {
    const duration = Number(yogaDuration);

    if (!yogaTitle.trim() || !Number.isFinite(duration) || duration <= 0) {
      setErrorMessages((prev) => ({
        ...prev,
        yoga: "Adj meg címet és hosszot (percben).",
      }));
      return;
    }

    const ok = await saveActivity(
      "yoga",
      {
        date: formatDateKey(selectedDate),
        category: yogaCategory,
        label: yogaTitle.trim(),
        durationMinutes: Math.round(duration),
        intensity: yogaIntensity,
        notes: yogaNewNotes.trim() || null,
        metadata: yogaLink.trim()
          ? {
              link: yogaLink.trim(),
            }
          : null,
      },
      "Jóga rögzítve."
    );

    if (ok) {
      setYogaTitle("");
      setYogaDuration("10");
      setYogaIntensity(2);
      setYogaLink("");
      setYogaNewNotes("");
      setShowNewYogaForm(false);
      loadYogaTemplates();
    }
  };

  const handleSaveACL = async () => {
    const selectedRoutine = ACL_ROUTINES.find((item) => item.id === selectedACLId) ?? ACL_ROUTINES[0];

    const ok = await saveActivity(
      "acl",
      {
        date: formatDateKey(selectedDate),
        category: selectedRoutine.category,
        label: selectedRoutine.label,
        exerciseId: selectedRoutine.id,
        metadata: {
          focus: selectedRoutine.focus,
          exercises: selectedRoutine.exercises,
        },
      },
      "ACL blokk rögzítve."
    );

    if (ok) {
      // Keep the overlay open to allow logging multiple entries for the same day.
    }
  };

  const handleSaveACLById = async (routineId: string) => {
    const routine = ACL_ROUTINES.find((item) => item.id === routineId);
    if (!routine) {
      return;
    }

    setSelectedACLId(routine.id);
    const ok = await saveActivity(
      "acl",
      {
        date: formatDateKey(selectedDate),
        category: routine.category,
        label: routine.label,
        exerciseId: routine.id,
        metadata: {
          focus: routine.focus,
          exercises: routine.exercises,
        },
      },
      "ACL blokk rögzítve."
    );

    if (ok) {
      // Keep the overlay open to allow logging multiple entries for the same day.
    }
  };

  const handleSaveStrength = async () => {
    const workout = STRENGTH_WORKOUTS.find((item) => item.id === selectedStrengthId) ?? STRENGTH_WORKOUTS[0];

    const ok = await saveActivity(
      "strength",
      {
        date: formatDateKey(selectedDate),
        category: workout.category,
        label: workout.label,
        exerciseId: workout.id,
        metadata: {
          exercises: workout.exercises,
        },
      },
      "Erősítés rögzítve."
    );

    if (ok) {
      // Keep the overlay open to allow logging multiple entries for the same day.
    }
  };

  const handleSaveStrengthById = async (workoutId: string) => {
    const workout = STRENGTH_WORKOUTS.find((item) => item.id === workoutId);
    if (!workout) {
      return;
    }

    setSelectedStrengthId(workout.id);
    const ok = await saveActivity(
      "strength",
      {
        date: formatDateKey(selectedDate),
        category: workout.category,
        label: workout.label,
        exerciseId: workout.id,
        metadata: {
          exercises: workout.exercises,
        },
      },
      "Erősítés rögzítve."
    );

    if (ok) {
      // Keep the overlay open to allow logging multiple entries for the same day.
    }
  };

  const handleSaveRunning = async () => {
    const ok = await saveActivity(
      "running",
      {
        date: formatDateKey(selectedDate),
        category: "run",
        label: "Futás",
        durationMinutes: runDuration ? Number(runDuration) : null,
        distanceKm: runDistance ? Number(runDistance) : null,
        notes: runNotes.trim() || null,
      },
      "Futás rögzítve."
    );

    if (ok) {
      setRunDistance("");
      setRunDuration("");
      setRunNotes("");
    }
  };

  const handleChangeMonth = (offset: number) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + offset);
      return getMonthStart(next);
    });
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + offset);
      return getMonthStart(next);
    });
  };

  const selectedDayKey = formatDateKey(selectedDate);
  const selectedDayLogs = logsMap[selectedDayKey] ?? {};
  const selectedActivities = ACTIVITY_ORDER.filter((activity) => (selectedDayLogs[activity]?.length ?? 0) > 0);
  const selectedDayEntries = useMemo(() => {
    const entries: { activity: ActivityType; row: ActivityLogRow; index: number }[] = [];
    ACTIVITY_ORDER.forEach((activity) => {
      const rows = selectedDayLogs[activity] ?? [];
      rows.forEach((row, index) => entries.push({ activity, row, index }));
    });
    return entries;
  }, [selectedDayLogs]);

  const handleOpenOverlay = () => {
    setOverlayOpen(true);
    resetOverlayState();

    setYogaTitle("");
    setYogaDuration("10");
    setYogaIntensity(2);
    setYogaLink("");
    setYogaNewNotes("");
    setSelectedYogaTemplateId("");
    setYogaSavedNotes("");
    setShowNewYogaForm(false);

    setRunDistance("");
    setRunDuration("");
    setRunNotes("");
  };

  const handleOverlayBack = () => {
    if (overlayExerciseDetail) {
      setOverlayExerciseDetail(null);
      return;
    }

    if (overlayItemId) {
      setOverlayItemId(null);
      return;
    }

    if (overlaySubcategory) {
      setOverlaySubcategory(null);
      return;
    }

    if (overlayActivity) {
      setOverlayActivity(null);
      return;
    }

    handleCloseOverlay();
  };

  const handleSelectOverlayActivity = (activity: ActivityType) => {
    setOverlayActivity(activity);
    setOverlaySubcategory(activity === "running" ? "run" : null);
    setOverlayItemId(null);
    setOverlayExerciseDetail(null);
  };

  const overlayAccentColor = useMemo(() => {
    if (!overlayActivity) {
      return null;
    }

    if (overlayActivity === "running") {
      return SUBCATEGORY_COLORS.running.run;
    }

    if (overlaySubcategory) {
      return SUBCATEGORY_COLORS[overlayActivity]?.[overlaySubcategory] ?? CATEGORY_COLORS[overlayActivity];
    }

    return CATEGORY_COLORS[overlayActivity];
  }, [overlayActivity, overlaySubcategory]);

  return (
    <section className="admin-stack yoga-page">
      <header className="admin-heading">
        <p className="admin-heading__label">Yoga napló</p>
        <h1 className="admin-heading__title">Mindful-mozgásnapló</h1>
        <p className="admin-heading__description">
          Válaszd ki az adott napot, logold a jóga / erősítés / ACL / futás aktivitásait, majd nézd meg, mi
          történt a hónapban.
        </p>
      </header>

      {overlayOpen && (
        <div className="yoga-overlay" role="dialog" aria-modal="true">
          <button type="button" className="yoga-overlay__backdrop" onClick={handleCloseOverlay} aria-label="Bezárás" />
          <div
            className="yoga-overlay__panel"
            style={overlayAccentColor ? ({ ["--card-accent" as never]: overlayAccentColor } as any) : undefined}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="yoga-overlay__header">
              <button type="button" className="btn btn--ghost yoga-overlay__back" onClick={handleOverlayBack}>
                <ChevronLeft size={16} />
                Vissza
              </button>
              <div className="yoga-overlay__title">
                <p className="yoga-overlay__label">Kiválasztott nap</p>
                <strong>{selectedDayKey}</strong>
              </div>
              <button type="button" className="btn btn--ghost" onClick={handleCloseOverlay} aria-label="Bezárás">
                <X size={16} />
              </button>
            </div>

            {selectedDayEntries.length > 0 && (
              <div className="yoga-overlay__archive">
                <p className="yoga-overlay__label">Naplózott kártyák</p>
                <div className="yoga-archive-grid">
                  {selectedDayEntries.map(({ activity, row }, idx) => {
                    const accent = resolveLogColor(activity, row);
                    const iconUrl =
                      activity === "yoga"
                        ? getYogaCategoryIcon(row.category === "strong" ? "strong" : "relax")
                        : activity === "strength"
                          ? getStrengthCategoryIcon(row.category === "intense" ? "intense" : "easy")
                          : activity === "acl"
                            ? getAclCategoryIcon(row.category === "block" ? "block" : "routine")
                            : getActivityIcon("running");

                    const link =
                      activity === "yoga" && typeof row.metadata?.link === "string" ? row.metadata.link : null;

                    const exercisesRaw =
                      (activity === "acl" || activity === "strength") && row.metadata && typeof row.metadata === "object"
                        ? (row.metadata as any).exercises
                        : null;
                    const exercises = Array.isArray(exercisesRaw) ? (exercisesRaw as any[]) : [];

                    return (
                      <article
                        key={`${row.id ?? "entry"}-${idx}`}
                        className="yoga-archive-card"
                        style={{ ["--card-accent" as never]: accent } as any}
                      >
                        <span
                          className="yoga-deck-card__corner"
                          style={{ ["--icon-url" as never]: `url('${iconUrl}')` } as any}
                          aria-hidden="true"
                        >
                          <span className="yoga-deck-card__cornerIcon" aria-hidden="true" />
                        </span>

                        <p className="yoga-archive-card__meta">{ACTIVITY_LABELS[activity]}</p>
                        <h3 className="yoga-archive-card__title">{row.label || ACTIVITY_LABELS[activity]}</h3>

                        {activity === "yoga" && (
                          <p className="yoga-archive-card__meta">
                            {row.category === "strong" ? "STRONG" : "RELAX"}
                            {typeof row.duration_minutes === "number" ? ` • ${row.duration_minutes} perc` : ""}
                            {typeof row.intensity === "number" ? (
                              <span className="yoga-intensity" aria-label="Intenzitás">
                                {([1, 2, 3] as const).map((value) => (
                                  <span
                                    key={value}
                                    className={`yoga-intensity__star ${
                                      (row.intensity ?? 0) >= value ? "yoga-intensity__star--active" : ""
                                    }`}
                                    aria-hidden="true"
                                  >
                                    <Star size={18} strokeWidth={0} />
                                  </span>
                                ))}
                              </span>
                            ) : null}
                          </p>
                        )}

                        {activity === "running" && (
                          <p className="yoga-archive-card__meta">
                            {typeof row.distance_km === "number" ? `${row.distance_km} km` : "—"}
                            {typeof row.duration_minutes === "number" ? ` • ${row.duration_minutes} perc` : ""}
                          </p>
                        )}

                        {(activity === "acl" || activity === "strength") && exercises.length > 0 && (
                          <div className="yoga-exercise-list">
                            {exercises.map((exercise) => {
                              const name = typeof exercise?.name === "string" ? exercise.name : "Gyakorlat";
                              const reps = typeof exercise?.reps === "string" ? exercise.reps : "";
                              return (
                                <div key={`${name}-${reps}`} className="yoga-exercise-row">
                                  <span className="yoga-exercise-name">{name}</span>
                                  <span className="yoga-exercise-reps">{reps}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {link && (
                          <a className="yoga-archive-card__link" href={link} target="_blank" rel="noreferrer">
                            {link}
                          </a>
                        )}

                        {row.notes && <p className="yoga-archive-card__notes">{row.notes}</p>}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="yoga-deck">
              {!overlayActivity && (
                <>
                  <p className="yoga-deck__hint">Válassz egy kategóriát.</p>
                  <div className="yoga-deck__grid yoga-deck__grid--4">
                    {ACTIVITY_ORDER.map((activity) => {
                      const accent = CATEGORY_COLORS[activity];
                      const description =
                        activity === "yoga"
                          ? "Relax vagy strong jóga rögzítése. Cím, perc, intenzitás, megjegyzés."
                          : activity === "strength"
                            ? "Teljes testes erősítés (könnyű / intenzív). Dokumentált gyakorlatlista."
                            : activity === "acl"
                              ? "ACL-stabilitás rutin + blokk. Gyakorlatlista és fókusz."
                              : "Idő és/vagy táv rögzítése. Opcionális megjegyzés.";
                      return (
                        <button
                          key={activity}
                          type="button"
                          className="yoga-deck-card"
                          style={{ ["--card-accent" as never]: accent } as any}
                          onClick={() => handleSelectOverlayActivity(activity)}
                        >
                          <span
                            className="yoga-deck-card__corner"
                            style={{ ["--icon-url" as never]: `url('${getActivityIcon(activity)}')` } as any}
                            aria-hidden="true"
                          >
                            <span className="yoga-deck-card__cornerIcon" aria-hidden="true" />
                          </span>
                          <strong className="yoga-deck-card__title">{ACTIVITY_LABELS[activity]}</strong>
                          <p className="yoga-deck-card__desc">{description}</p>
                          <span className="yoga-deck-card__plus" aria-hidden="true">
                            <Plus size={18} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {overlayActivity === "yoga" && !overlaySubcategory && (
                <div className="yoga-deck__grid">
                  {(["relax", "strong"] as YogaCategory[]).map((category) => (
                    <button
                      key={category}
                      type="button"
                      className="yoga-deck-card"
                      style={{ ["--card-accent" as never]: SUBCATEGORY_COLORS.yoga[category] } as any}
                      onClick={() => {
                        setYogaCategory(category);
                        setOverlaySubcategory(category);
                      }}
                    >
                      <span
                        className="yoga-deck-card__corner"
                        style={{ ["--icon-url" as never]: `url('${getYogaCategoryIcon(category)}')` } as any}
                        aria-hidden="true"
                      >
                        <span className="yoga-deck-card__cornerIcon" aria-hidden="true" />
                      </span>
                      <strong className="yoga-deck-card__title">{category === "relax" ? "RELAX" : "STRONG"}</strong>
                      <p className="yoga-deck-card__desc">
                        {category === "relax" ? "Mobilizáló, regeneráló flow." : "Erősebb, dinamikus gyakorlás."}
                      </p>
                      <span className="yoga-deck-card__plus" aria-hidden="true">
                        <Plus size={18} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {overlayActivity === "yoga" && overlaySubcategory && (
                <div className="yoga-form-card">
                  <header className="yoga-form-card__head">
                    <strong>Jóga</strong>
                    <span
                      className="yoga-form-card__badge"
                      style={{ ["--card-accent" as never]: SUBCATEGORY_COLORS.yoga[overlaySubcategory] } as any}
                      aria-label={overlaySubcategory}
                    >
                      <span
                        className="yoga-form-card__badgeIcon"
                        style={{ ["--icon-url" as never]: `url('${getYogaCategoryIcon(yogaCategory)}')` } as any}
                        aria-hidden="true"
                      />
                    </span>
                  </header>

                  {loadingYogaTemplates ? (
                    <p className="yoga-form-card__meta">Mentett jógák betöltése…</p>
                  ) : (
                    <>
                      {yogaTemplates
                        .filter((item) => item.category === (overlaySubcategory === "strong" ? "strong" : "relax"))
                        .length > 0 && (
                        <>
                          <label className="form-field">
                            <span className="form-field__label">Korábbi jógák</span>
                            <select
                              className="input"
                              value={selectedYogaTemplateId}
                              onChange={(event) => {
                                setSelectedYogaTemplateId(event.target.value);
                                setYogaSavedNotes("");
                              }}
                            >
                              <option value="">Válassz mentett jógát…</option>
                              {yogaTemplates
                                .filter((item) => item.category === (overlaySubcategory === "strong" ? "strong" : "relax"))
                                .map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {(typeof item.durationMinutes === "number" ? `${item.durationMinutes}p - ` : "") +
                                      item.label +
                                      (typeof item.intensity === "number" ? ` (${item.intensity}/3)` : "")}
                                  </option>
                                ))}
                            </select>
                          </label>

                          {(() => {
                            const selected =
                              yogaTemplates.find((item) => item.id === selectedYogaTemplateId) ?? null;
                            if (!selected) {
                              return null;
                            }

                            return (
                              <>
                                <p className="yoga-form-card__meta">
                                  {typeof selected.durationMinutes === "number" ? `${selected.durationMinutes} perc` : "—"}{" "}
                                  • Intenzitás:{" "}
                                  {typeof selected.intensity === "number" ? (
                                    <span className="yoga-intensity" aria-label="Intenzitás">
                                      {([1, 2, 3] as const).map((value) => (
                                        <span
                                          key={value}
                                          className={`yoga-intensity__star ${
                                            (selected.intensity ?? 0) >= value ? "yoga-intensity__star--active" : ""
                                          }`}
                                          aria-hidden="true"
                                        >
                                          <Star size={18} strokeWidth={0} />
                                        </span>
                                      ))}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </p>

                                {selected.link && (
                                  <a className="yoga-archive-card__link" href={selected.link} target="_blank" rel="noreferrer">
                                    {selected.link}
                                  </a>
                                )}

                                <label className="form-field">
                                  <span className="form-field__label">Komment</span>
                                  <textarea
                                    className="input"
                                    rows={2}
                                    placeholder="Rövid megjegyzés…"
                                    value={yogaSavedNotes}
                                    onChange={(event) => setYogaSavedNotes(event.target.value)}
                                  />
                                </label>

                                <div className="yoga-form-actions">
                                  <button
                                    type="button"
                                    className="btn btn--primary"
                                    onClick={handleSaveYogaTemplate}
                                    disabled={savingState.yoga}
                                    aria-label="Mentett jóga rögzítése"
                                  >
                                    <Plus size={18} />
                                  </button>
                                  {statusMessages.yoga && <p className="yoga-status">{statusMessages.yoga}</p>}
                                  {errorMessages.yoga && <p className="yoga-error">{errorMessages.yoga}</p>}
                                </div>
                              </>
                            );
                          })()}
                        </>
                      )}

                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setShowNewYogaForm((prev) => !prev)}
                      >
                        <Plus size={16} />
                        Új jóga hozzáadása
                      </button>

                      {(showNewYogaForm ||
                        yogaTemplates.filter((item) => item.category === (overlaySubcategory === "strong" ? "strong" : "relax"))
                          .length === 0) && (
                        <>
                          <div className="yoga-form-grid">
                            <label className="form-field">
                              <span className="form-field__label">Cím</span>
                              <input className="input" value={yogaTitle} onChange={(e) => setYogaTitle(e.target.value)} />
                            </label>

                            <label className="form-field">
                              <span className="form-field__label">Hossz (perc)</span>
                              <input
                                className="input"
                                type="number"
                                min={1}
                                value={yogaDuration}
                                onChange={(e) => setYogaDuration(e.target.value)}
                              />
                            </label>
                          </div>

                          <label className="form-field">
                            <span className="form-field__label">Link (opcionális)</span>
                            <div className="yoga-link-row">
                              <Link2 size={16} />
                              <input
                                className="input"
                                placeholder="https://…"
                                value={yogaLink}
                                onChange={(e) => setYogaLink(e.target.value)}
                              />
                            </div>
                          </label>

                          <label className="form-field">
                            <span className="form-field__label">Intenzitás</span>
                            <div className="yoga-intensity">
                              {([1, 2, 3] as const).map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  className={`yoga-intensity__star ${yogaIntensity >= value ? "yoga-intensity__star--active" : ""}`}
                                  onClick={() => setYogaIntensity(value)}
                                  aria-label={`${value} csillag`}
                                >
                                  <Star size={20} strokeWidth={0} />
                                </button>
                              ))}
                            </div>
                          </label>

                          <label className="form-field">
                            <span className="form-field__label">Megjegyzés</span>
                            <textarea
                              className="input"
                              rows={3}
                              placeholder="Saját komment…"
                              value={yogaNewNotes}
                              onChange={(e) => setYogaNewNotes(e.target.value)}
                            />
                          </label>

                          <div className="yoga-form-actions">
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={handleSaveYogaNew}
                              disabled={savingState.yoga}
                              aria-label="Új jóga rögzítése"
                            >
                              <Plus size={18} />
                            </button>
                            {statusMessages.yoga && <p className="yoga-status">{statusMessages.yoga}</p>}
                            {errorMessages.yoga && <p className="yoga-error">{errorMessages.yoga}</p>}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {overlayActivity === "running" && (
                <div className="yoga-form-card">
                  <header className="yoga-form-card__head">
                    <strong>Futás rögzítése</strong>
                    <span
                      className="yoga-form-card__badge"
                      style={{ ["--card-accent" as never]: SUBCATEGORY_COLORS.running.run } as any}
                      aria-label="run"
                    >
                      <span
                        className="yoga-form-card__badgeIcon"
                        style={{ ["--icon-url" as never]: `url('${getActivityIcon("running")}')` } as any}
                        aria-hidden="true"
                      />
                    </span>
                  </header>

                  <div className="yoga-form-grid">
                    <label className="form-field">
                      <span className="form-field__label">Távolság (km)</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={runDistance}
                        onChange={(e) => setRunDistance(e.target.value)}
                      />
                    </label>
                    <label className="form-field">
                      <span className="form-field__label">Időtartam (perc)</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={runDuration}
                        onChange={(e) => setRunDuration(e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="form-field">
                    <span className="form-field__label">Megjegyzés</span>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Opcionális komment…"
                      value={runNotes}
                      onChange={(e) => setRunNotes(e.target.value)}
                    />
                  </label>

                  <div className="yoga-form-actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={handleSaveRunning}
                      disabled={savingState.running}
                      aria-label="Futás rögzítése"
                    >
                      <Plus size={18} />
                    </button>
                    {statusMessages.running && <p className="yoga-status">{statusMessages.running}</p>}
                    {errorMessages.running && <p className="yoga-error">{errorMessages.running}</p>}
                  </div>
                </div>
              )}

              {overlayActivity === "strength" && !overlaySubcategory && (
                <div className="yoga-deck__grid">
                  {(["easy", "intense"] as const).map((category) => (
                    <button
                      key={category}
                      type="button"
                      className="yoga-deck-card"
                      style={{ ["--card-accent" as never]: SUBCATEGORY_COLORS.strength[category] } as any}
                      onClick={() => setOverlaySubcategory(category)}
                    >
                      <span
                        className="yoga-deck-card__corner"
                        style={{ ["--icon-url" as never]: `url('${getStrengthCategoryIcon(category)}')` } as any}
                        aria-hidden="true"
                      >
                        <span className="yoga-deck-card__cornerIcon" aria-hidden="true" />
                      </span>
                      <strong className="yoga-deck-card__title">{category === "easy" ? "KÖNNYŰ" : "INTENZÍV"}</strong>
                      <p className="yoga-deck-card__desc">
                        {category === "easy"
                          ? "Kíméletes teljes testes erősítés."
                          : "Nagyobb terhelésű teljes testes blokk."}
                      </p>
                      <span className="yoga-deck-card__plus" aria-hidden="true">
                        <Plus size={18} />
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {overlayActivity === "strength" && overlaySubcategory && (
                <div className="yoga-deck__grid">
                  {STRENGTH_WORKOUTS.filter((workout) => workout.category === overlaySubcategory).map((workout) => (
                    <div
                      key={workout.id}
                      className="yoga-detail-card"
                      style={{ ["--card-accent" as never]: SUBCATEGORY_COLORS.strength[overlaySubcategory] } as any}
                    >
                      <header className="yoga-detail-card__head">
                        <strong className="yoga-detail-card__title">{workout.label}</strong>
                      </header>
                      <p className="yoga-detail-card__desc">
                        Dokumentált gyakorlatlista. Az i ikonra kattintva részletek.
                      </p>
                      <div className="yoga-exercise-list">
                        {workout.exercises.map((exercise) => {
                          const detailKey = `${workout.id}:${exercise.name}`;
                          const isOpen = overlayExerciseDetail?.key === detailKey;
                          return (
                            <div key={exercise.name} className="yoga-exercise-row">
                              <button
                                type="button"
                                className="yoga-exercise-info"
                                onClick={() =>
                                  setOverlayExerciseDetail({
                                    key: detailKey,
                                    title: exercise.name,
                                    detail: exercise.detail,
                                  })
                                }
                                aria-label="Részletek"
                              >
                                <Info size={16} />
                              </button>
                                <span className="yoga-exercise-name">{exercise.name}</span>
                                <span className="yoga-exercise-reps">{exercise.reps}</span>
                                {isOpen && (
                                  <div className="yoga-exercise-popover">
                                  <div className="yoga-exercise-popover__head">
                                    <strong>{overlayExerciseDetail.title}</strong>
                                    <button
                                      type="button"
                                      className="btn btn--ghost"
                                      onClick={() => setOverlayExerciseDetail(null)}
                                      aria-label="Bezárás"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <p>
                                    {overlayExerciseDetail.detail?.trim()
                                      ? overlayExerciseDetail.detail
                                      : "Nincs további információ ehhez a gyakorlathoz."}
                                  </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      <div className="yoga-form-actions">
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => handleSaveStrengthById(workout.id)}
                          disabled={savingState.strength}
                        >
                          {savingState.strength ? "Mentés..." : "Rögzítés"}
                        </button>
                        {statusMessages.strength && <p className="yoga-status">{statusMessages.strength}</p>}
                        {errorMessages.strength && <p className="yoga-error">{errorMessages.strength}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {overlayActivity === "acl" && (
                <div className="yoga-deck__grid">
                  {ACL_ROUTINES.map((routine) => (
                    <div
                      key={routine.id}
                      className="yoga-detail-card"
                      style={{ ["--card-accent" as never]: SUBCATEGORY_COLORS.acl[routine.category] } as any}
                    >
                      <header className="yoga-detail-card__head">
                        <strong className="yoga-detail-card__title">{routine.label}</strong>
                      </header>
                      <p className="yoga-detail-card__desc">
                        {routine.category === "routine"
                          ? "Aktiváló rutin jóga vagy futás előtt."
                          : "Stabilitási blokk heti 2×, célzott térdstabilitás."}
                      </p>
                      <p className="yoga-detail-card__focus">{routine.focus}</p>
                      <div className="yoga-exercise-list">
                        {routine.exercises.map((exercise) => {
                          const detailKey = `${routine.id}:${exercise.name}`;
                          const isOpen = overlayExerciseDetail?.key === detailKey;
                          return (
                            <div key={exercise.name} className="yoga-exercise-row">
                              <button
                                type="button"
                                className="yoga-exercise-info"
                                onClick={() =>
                                  setOverlayExerciseDetail({
                                    key: detailKey,
                                    title: exercise.name,
                                    detail: exercise.detail,
                                  })
                                }
                                aria-label="Részletek"
                              >
                                <Info size={16} />
                              </button>
                              <span className="yoga-exercise-name">{exercise.name}</span>
                              <span className="yoga-exercise-reps">{exercise.reps}</span>
                              {isOpen && (
                                <div className="yoga-exercise-popover">
                                  <div className="yoga-exercise-popover__head">
                                    <strong>{overlayExerciseDetail.title}</strong>
                                    <button
                                      type="button"
                                      className="btn btn--ghost"
                                      onClick={() => setOverlayExerciseDetail(null)}
                                      aria-label="Bezárás"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                  <p>
                                    {overlayExerciseDetail.detail?.trim()
                                      ? overlayExerciseDetail.detail
                                      : "Nincs további információ ehhez a gyakorlathoz."}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="yoga-form-actions">
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => handleSaveACLById(routine.id)}
                          disabled={savingState.acl}
                        >
                          {savingState.acl ? "Mentés..." : "Rögzítés"}
                        </button>
                        {statusMessages.acl && <p className="yoga-status">{statusMessages.acl}</p>}
                        {errorMessages.acl && <p className="yoga-error">{errorMessages.acl}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="yoga-week-card admin-card">
        <div className="yoga-week-days">
          {selectedWeek.map((day) => {
            const key = formatDateKey(day);
            const isActive = key === formatDateKey(selectedDate);
            const dayLog = logsMap[key] ?? {};
            const loggedActivities = ACTIVITY_ORDER.filter((activity) => (dayLog[activity]?.length ?? 0) > 0);
            const ringColor = loggedActivities.length
              ? resolveLogColor(loggedActivities[0], dayLog[loggedActivities[0]]?.[0])
              : null;
            return (
              <button
                key={key}
                type="button"
                className={`yoga-week-day ${isActive ? "yoga-week-day--active" : ""} ${
                  loggedActivities.length ? "yoga-week-day--logged" : ""
                }`}
                onClick={() => handleSelectDay(day)}
                style={ringColor ? ({ ["--yoga-ring" as never]: ringColor } as any) : undefined}
              >
                <span className="yoga-week-day__weekday">{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</span>
                <strong className="yoga-week-day__number">{day.getDate()}</strong>
                {loggedActivities.map((activity, index) => {
                  const position = index === 0 ? "tr" : index === 1 ? "br" : index === 2 ? "bl" : "tl";
                  const color = resolveLogColor(activity, dayLog[activity]?.[0]);
                  return (
                    <span
                      key={`${key}-${activity}`}
                      className={`yoga-week-day__corner yoga-week-day__corner--${position}`}
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  );
                })}
                {formatDateKey(day) === formatDateKey(today) && (
                  <span className="yoga-week-day__today">Ma</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="yoga-day-actions">
          <div className="yoga-day-actions__pills">
            {selectedActivities.length ? (
              selectedActivities.map((activity) => {
                const entries = selectedDayLogs[activity] ?? [];
                const row = entries[entries.length - 1];
                const accent = resolveLogColor(activity, row);
                const Icon =
                  activity === "yoga"
                    ? Flower2
                    : activity === "strength"
                      ? Dumbbell
                      : activity === "acl"
                        ? ShieldCheck
                        : Footprints;
                return (
                  <span key={`pill-${activity}`} className="yoga-pill" style={{ backgroundColor: accent }}>
                    <Icon size={14} />
                    {ACTIVITY_LABELS[activity]}
                  </span>
                );
              })
            ) : (
              <p className="yoga-day-actions__empty">Nincs rögzített aktivitás ehhez a naphoz.</p>
            )}
          </div>
          <button type="button" className="btn btn--primary" onClick={handleOpenOverlay} aria-label="Új rögzítés">
            <Plus size={18} />
          </button>
        </div>

        <div className="yoga-activity-grid">
          <article className="yoga-activity-card">
            <header className="yoga-activity-header">
              <Activity size={18} />
              <div>
                <p className="yoga-activity-label">Yoga (relax / strong)</p>
                <p className="yoga-activity-sub">válaszd ki a könyvtárból vagy adj hozzá újat</p>
              </div>
            </header>
            <select
              className="input"
              value={selectedYogaOptionId}
              onChange={(event) => setSelectedYogaOptionId(event.target.value)}
            >
              {availableYogaOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label} · {entry.durationMinutes} perc · {entry.intensity}⭐
                </option>
              ))}
            </select>

            <div className="yoga-activity-info">
              <p>
                {availableYogaOptions.find((entry) => entry.id === selectedYogaOptionId)?.description ??
                  "Válassz egy jóga rutint az előre definiált listából."}
              </p>
            </div>

            <button
              type="button"
              className="btn btn--ghost yoga-add-button"
              onClick={() => setShowYogaForm((prev) => !prev)}
            >
              Új jóga hozzáadása
            </button>

            {showYogaForm && (
              <div className="yoga-new-form">
                <label className="form-field">
                  <span className="form-field__label">Cím</span>
                  <input
                    className="input"
                    value={newYogaForm.label}
                    onChange={(event) =>
                      setNewYogaForm((prev) => ({ ...prev, label: event.target.value }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span className="form-field__label">Leírás</span>
                  <textarea
                    className="input"
                    rows={2}
                    value={newYogaForm.description}
                    onChange={(event) =>
                      setNewYogaForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </label>

                <div className="yoga-new-form__row">
                  <label className="form-field">
                    <span className="form-field__label">Hossz (perc)</span>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={newYogaForm.durationMinutes}
                      onChange={(event) =>
                        setNewYogaForm((prev) => ({
                          ...prev,
                          durationMinutes: Number(event.target.value) || 0,
                        }))
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span className="form-field__label">Intenzitás</span>
                    <div className="yoga-intensity">
                      {[1, 2, 3].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`yoga-intensity__star ${
                            newYogaForm.intensity === value ? "yoga-intensity__star--active" : ""
                          }`}
                          onClick={() =>
                            setNewYogaForm((prev) => ({
                              ...prev,
                              intensity: value as 1 | 2 | 3,
                            }))
                          }
                        >
                          <Star />
                        </button>
                      ))}
                    </div>
                  </label>
                </div>

                <div className="yoga-category-switch">
                  <button
                    type="button"
                    className={`btn btn--secondary ${
                      newYogaForm.category === "relax" ? "btn--active" : ""
                    }`}
                    onClick={() => setNewYogaForm((prev) => ({ ...prev, category: "relax" }))}
                  >
                    Relax
                  </button>
                  <button
                    type="button"
                    className={`btn btn--secondary ${
                      newYogaForm.category === "strong" ? "btn--active" : ""
                    }`}
                    onClick={() => setNewYogaForm((prev) => ({ ...prev, category: "strong" }))}
                  >
                    Strong
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn--primary yoga-add-button"
                  onClick={addCustomYogaEntry}
                >
                  Mentés a könyvtárba
                </button>
              </div>
            )}

            <label className="form-field">
              <span className="form-field__label">Megjegyzés</span>
              <textarea
                className="input"
                rows={2}
                placeholder="Töltsd ki, hogy mit éreztél."
                value={yogaNewNotes}
                onChange={(event) => setYogaNewNotes(event.target.value)}
              />
            </label>

            <div className="yoga-activity-footer">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveYogaNew}
                disabled={savingState.yoga}
              >
                {savingState.yoga ? "Mentés..." : "Jóga naplózása"}
              </button>
              {statusMessages.yoga && <p className="yoga-status">{statusMessages.yoga}</p>}
              {errorMessages.yoga && <p className="yoga-error">{errorMessages.yoga}</p>}
            </div>
          </article>

          <article className="yoga-activity-card yoga-activity-card--split">
            <header className="yoga-activity-header">
              <Repeat size={18} />
              <div>
                <p className="yoga-activity-label">Erősítés (easy / intense)</p>
                <p className="yoga-activity-sub">válassz kártyát a dokumentált rutinok közül</p>
              </div>
            </header>

            <div className="yoga-activity-grid--cards">
              {["easy", "intense"].map((category) => (
                <div key={category} className="yoga-subgrid">
                  <p className="yoga-subgrid__label">{category === "easy" ? "Könnyű" : "Intenzív"}</p>
                  {STRENGTH_WORKOUTS.filter((item) => item.category === category).map((workout) => (
                    <button
                      type="button"
                      key={workout.id}
                      className={`yoga-subcard ${
                        selectedStrengthId === workout.id ? "yoga-subcard--active" : ""
                      }`}
                      onClick={() => setSelectedStrengthId(workout.id)}
                    >
                      <div className="yoga-subcard__head">
                        <strong>{workout.label}</strong>
                        <span>{workout.rounds}</span>
                      </div>
                      <ul>
                        {workout.exercises.map((exercise) => (
                          <li key={exercise.name}>
                            <span>{exercise.name}</span>
                            <span>{exercise.reps}</span>
                            {exercise.detail && (
                              <details>
                                <summary>Részletek</summary>
                                <p>{exercise.detail}</p>
                              </details>
                            )}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="yoga-activity-footer">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveStrength}
                disabled={savingState.strength}
              >
                {savingState.strength ? "Mentés..." : "Erősítés naplózása"}
              </button>
              {statusMessages.strength && <p className="yoga-status">{statusMessages.strength}</p>}
              {errorMessages.strength && <p className="yoga-error">{errorMessages.strength}</p>}
            </div>
          </article>

          <article className="yoga-activity-card yoga-activity-card--split">
            <header className="yoga-activity-header">
              <ShieldCheck size={18} />
              <div>
                <p className="yoga-activity-label">ACL stabilitás</p>
                <p className="yoga-activity-sub">aktiváló rutin vagy stabilitási blokk</p>
              </div>
            </header>

            <div className="yoga-activity-grid--cards">
              {ACL_ROUTINES.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  className={`yoga-subcard ${
                    selectedACLId === routine.id ? "yoga-subcard--active" : ""
                  }`}
                  onClick={() => setSelectedACLId(routine.id)}
                >
                  <div className="yoga-subcard__head">
                    <strong>{routine.label}</strong>
                    <span>{routine.focus}</span>
                  </div>
                  <ul>
                    {routine.exercises.map((exercise) => (
                      <li key={exercise.name}>
                        <span>{exercise.name}</span>
                        <span>{exercise.reps}</span>
                        {exercise.detail && (
                          <details>
                            <summary>Részletek</summary>
                            <p>{exercise.detail}</p>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="yoga-activity-footer">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveACL}
                disabled={savingState.acl}
              >
                {savingState.acl ? "Mentés..." : "ACL naplózása"}
              </button>
              {statusMessages.acl && <p className="yoga-status">{statusMessages.acl}</p>}
              {errorMessages.acl && <p className="yoga-error">{errorMessages.acl}</p>}
            </div>
          </article>

          <article className="yoga-activity-card">
            <header className="yoga-activity-header">
              <Activity size={18} />
              <div>
                <p className="yoga-activity-label">Futás</p>
                <p className="yoga-activity-sub">csak idő és/vagy távolság megadása</p>
              </div>
            </header>
            <div className="yoga-run-grid">
              <label className="form-field">
                <span className="form-field__label">Távolság (km)</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.1"
                  value={runDistance}
                  onChange={(event) => setRunDistance(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span className="form-field__label">Időtartam (perc)</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={runDuration}
                  onChange={(event) => setRunDuration(event.target.value)}
                />
              </label>
            </div>
            <label className="form-field">
              <span className="form-field__label">Megjegyzés</span>
              <textarea
                className="input"
                rows={2}
                placeholder="Írhatsz támpontot a futásról."
                value={runNotes}
                onChange={(event) => setRunNotes(event.target.value)}
              />
            </label>
            <div className="yoga-activity-footer">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveRunning}
                disabled={savingState.running}
              >
                {savingState.running ? "Mentés..." : "Futás naplózása"}
              </button>
              {statusMessages.running && <p className="yoga-status">{statusMessages.running}</p>}
              {errorMessages.running && <p className="yoga-error">{errorMessages.running}</p>}
            </div>
          </article>
        </div>
      </div>

      <div className="yoga-month-card admin-card">
        <div className="yoga-month-header">
          <button type="button" className="btn btn--ghost" onClick={() => handleChangeMonth(-1)}>
            <ArrowLeft size={16} />
            Vissza
          </button>
          <strong>{monthLabel}</strong>
          <button type="button" className="btn btn--ghost" onClick={() => handleChangeMonth(1)}>
            Következő
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="yoga-month-grid">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="yoga-month-weekday">
              {label}
            </div>
          ))}

          {monthDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="yoga-month-day yoga-month-day--empty" />;
            }

            const key = formatDateKey(date);
            const dayLog = logsMap[key] ?? {};
            const loggedActivities = ACTIVITY_ORDER.filter((activity) => (dayLog[activity]?.length ?? 0) > 0);

            const isToday = key === formatDateKey(today);

            return (
              <button
                key={key}
                type="button"
                className={`yoga-month-day ${
                  loggedActivities.length ? "yoga-month-day--logged" : ""
                } ${isToday ? "yoga-month-day--today" : ""}`}
                onClick={() => handleSelectDay(date)}
              >
                <span className="yoga-month-day__number">{date.getDate()}</span>
                {loggedActivities.map((activity, index) => {
                  const position = index === 0 ? "tr" : index === 1 ? "br" : index === 2 ? "bl" : "tl";
                  const color = resolveLogColor(activity, dayLog[activity]?.[0]);
                  return (
                    <span
                      key={`${key}-${activity}-corner`}
                      className={`yoga-month-day__corner yoga-month-day__corner--${position}`}
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                  );
                })}
                <div className="yoga-month-day__pills" aria-label="Aktivitások">
                  {loggedActivities.map((activity) => {
                    const row = dayLog[activity]?.[0];
                    const accent = resolveLogColor(activity, row);
                    const Icon =
                      activity === "yoga"
                        ? Flower2
                        : activity === "strength"
                          ? Dumbbell
                          : activity === "acl"
                            ? ShieldCheck
                            : Footprints;
                    return (
                      <span key={`${key}-${activity}-pill`} className="yoga-month-pill" style={{ backgroundColor: accent }}>
                        <Icon size={12} />
                      </span>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
