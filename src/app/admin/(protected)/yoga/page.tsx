"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, Repeat, ShieldCheck, Star } from "lucide-react";
import {
  ACL_ROUTINES,
  ACTIVITY_COLORS,
  ActivityLogRow,
  ActivityType,
  STRENGTH_WORKOUTS,
  YOGA_LIBRARY,
  YogaCategory,
  YogaLibraryEntry,
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

type LogsMap = Record<string, Partial<Record<ActivityType, ActivityLogRow>>>;

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

  const [customYogaEntries, setCustomYogaEntries] = useState<YogaLibraryEntry[]>([]);
  const [selectedYogaOptionId, setSelectedYogaOptionId] = useState(YOGA_LIBRARY[0].id);
  const [showYogaForm, setShowYogaForm] = useState(false);
  const [newYogaForm, setNewYogaForm] = useState({
    label: "",
    description: "",
    durationMinutes: 10,
    intensity: 2 as YogaLibraryEntry["intensity"],
    category: "relax" as YogaCategory,
  });
  const [yogaNotes, setYogaNotes] = useState("");

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
    const leadingEmpty = Array.from({ length: offset });
    return [...leadingEmpty, ...days];
  }, [currentMonth]);

  const availableYogaOptions = useMemo(() => {
    const buffer = new Map<string, YogaLibraryEntry>();
    const addEntry = (entry: YogaLibraryEntry) => {
      if (!buffer.has(entry.id)) {
        buffer.set(entry.id, entry);
      }
    };

    YOGA_LIBRARY.forEach(addEntry);
    customYogaEntries.forEach(addEntry);

    Object.values(logsMap).forEach((day) => {
      const yogaLog = day?.yoga;
      if (yogaLog) {
        const computedId = yogaLog.exercise_id
          ? yogaLog.exercise_id
          : `log-${yogaLog.label}-${yogaLog.duration_minutes ?? 0}`;
        if (!buffer.has(computedId)) {
          const description =
            typeof yogaLog.metadata?.description === "string"
              ? yogaLog.metadata.description
              : "Korábban rögzített jóga";

          buffer.set(computedId, {
            id: computedId,
            label: yogaLog.label,
            description,
            durationMinutes: yogaLog.duration_minutes ?? 10,
            intensity: (Math.min(3, Math.max(1, yogaLog.intensity ?? 1)) as YogaLibraryEntry["intensity"]),
            category: ["strong", "relax"].includes(yogaLog.category) ? (yogaLog.category as YogaCategory) : "relax",
            icon: yogaLog.metadata?.icon ?? "sun",
          });
        }
      }
    });

    return Array.from(buffer.values());
  }, [customYogaEntries, logsMap]);

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
          next[entry.date] = {
            ...(next[entry.date] ?? {}),
            [entry.activity_type]: entry,
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

  useEffect(() => {
    const key = formatMonthKey(currentMonth);
    if (!loadedMonths.includes(key) && !loadingMonths.includes(key)) {
      loadMonthLogs(key);
    }
  }, [currentMonth, loadedMonths, loadingMonths, loadMonthLogs]);

  useEffect(() => {
    const key = formatMonthKey(selectedDate);
    if (!loadedMonths.includes(key) && !loadingMonths.includes(key)) {
      loadMonthLogs(key);
    }
  }, [selectedDate, loadedMonths, loadingMonths, loadMonthLogs]);

  useEffect(() => {
    const dayLogs = logsMap[formatDateKey(selectedDate)] ?? {};

    if (dayLogs.yoga) {
      const match = availableYogaOptions.find((entry) => entry.id === dayLogs.yoga?.exercise_id);
      if (match) {
        setSelectedYogaOptionId(match.id);
      }
      setYogaNotes(dayLogs.yoga.notes ?? "");
    } else {
      setYogaNotes("");
    }

    if (dayLogs.acl && dayLogs.acl.exercise_id) {
      setSelectedACLId(dayLogs.acl.exercise_id);
    }

    if (dayLogs.strength && dayLogs.strength.exercise_id) {
      setSelectedStrengthId(dayLogs.strength.exercise_id);
    }

    if (dayLogs.running) {
      setRunDistance(dayLogs.running.distance_km?.toString() ?? "");
      setRunDuration(dayLogs.running.duration_minutes?.toString() ?? "");
      setRunNotes(dayLogs.running.notes ?? "");
    } else {
      setRunDistance("");
      setRunDuration("");
      setRunNotes("");
    }
  }, [availableYogaOptions, logsMap, selectedDate]);

  const handleSelectDay = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    setSelectedDate(normalized);
  };

  const addCustomYogaEntry = useCallback(() => {
    if (!newYogaForm.label.trim() || newYogaForm.durationMinutes <= 0) {
      return;
    }

    const entry: YogaLibraryEntry = {
      id: `custom-${Date.now()}`,
      label: newYogaForm.label.trim(),
      description: newYogaForm.description.trim() || "Új jóga a listához",
      durationMinutes: newYogaForm.durationMinutes,
      intensity: newYogaForm.intensity,
      category: newYogaForm.category,
      icon: "sun",
    };

    setCustomYogaEntries((prev) => [...prev.filter((item) => item.id !== entry.id), entry]);
    setSelectedYogaOptionId(entry.id);
    setShowYogaForm(false);
    setNewYogaForm({
      label: "",
      description: "",
      durationMinutes: 10,
      intensity: 2,
      category: "relax",
    });
  }, [newYogaForm]);

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
          return {
            ...prev,
            [key]: {
              ...(prev[key] ?? {}),
              [activityType]: log,
            },
          };
        });

        setStatusMessages((prev) => ({
          ...prev,
          [activityType]: successMessage,
        }));
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
      } finally {
        setSavingState((prev) => ({ ...prev, [activityType]: false }));
      }
    },
    []
  );

  const handleSaveYoga = () => {
    const selectedEntry =
      availableYogaOptions.find((entry) => entry.id === selectedYogaOptionId) ??
      availableYogaOptions[0];

    if (!selectedEntry) {
      return;
    }

    saveActivity(
      "yoga",
      {
        date: formatDateKey(selectedDate),
        category: selectedEntry.category,
        label: selectedEntry.label,
        exerciseId: selectedEntry.id,
        durationMinutes: selectedEntry.durationMinutes,
        intensity: selectedEntry.intensity,
        notes: yogaNotes.trim() || null,
      },
      "Jóga naplózva."
    );
  };

  const handleSaveACL = () => {
    const selectedRoutine = ACL_ROUTINES.find((item) => item.id === selectedACLId) ?? ACL_ROUTINES[0];

    saveActivity(
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
  };

  const handleSaveStrength = () => {
    const workout = STRENGTH_WORKOUTS.find((item) => item.id === selectedStrengthId) ?? STRENGTH_WORKOUTS[0];

    saveActivity(
      "strength",
      {
        date: formatDateKey(selectedDate),
        category: workout.category,
        label: workout.label,
        exerciseId: workout.id,
        metadata: {
          rounds: workout.rounds,
          exercises: workout.exercises,
        },
      },
      "Erősítés rögzítve."
    );
  };

  const handleSaveRunning = () => {
    saveActivity(
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

  return (
    <section className="admin-stack yoga-page">
      <header className="admin-heading">
        <p className="admin-heading__label">Yoga napló</p>
        <h1 className="admin-heading__title">Szárnyfeszítő mozgásnapló</h1>
        <p className="admin-heading__description">
          Válaszd ki az adott napot, logold a jóga / erősítés / ACL / futás aktivitásait, majd nézd meg, mi
          történt a hónapban.
        </p>
      </header>

      <div className="yoga-week-card admin-card">
        <div className="yoga-week-days">
          {selectedWeek.map((day) => {
            const key = formatDateKey(day);
            const isActive = key === formatDateKey(selectedDate);
            const dayLog = logsMap[key] ?? {};
            return (
              <button
                key={key}
                type="button"
                className={`yoga-week-day ${isActive ? "yoga-week-day--active" : ""}`}
                onClick={() => handleSelectDay(day)}
              >
                <span className="yoga-week-day__weekday">{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</span>
                <strong className="yoga-week-day__number">{day.getDate()}</strong>
                <div className="yoga-week-day__dots">
                  {(["yoga", "strength", "acl", "running"] as ActivityType[]).map((activity) =>
                    dayLog[activity] ? (
                      <span
                        key={`${key}-${activity}`}
                        className="yoga-week-day__dot"
                        style={{ backgroundColor: ACTIVITY_COLORS[activity] }}
                      />
                    ) : null
                  )}
                </div>
                {formatDateKey(day) === formatDateKey(today) && (
                  <span className="yoga-week-day__today">Ma</span>
                )}
              </button>
            );
          })}
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
                              intensity: value as YogaLibraryEntry["intensity"],
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
                value={yogaNotes}
                onChange={(event) => setYogaNotes(event.target.value)}
              />
            </label>

            <div className="yoga-activity-footer">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveYoga}
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
            const badges = (Object.keys(dayLog) as ActivityType[]).map((activity) => (
              <span
                key={`${key}-${activity}`}
                className="yoga-month-day__badge"
                style={{ backgroundColor: ACTIVITY_COLORS[activity] }}
              />
            ));

            const isToday = key === formatDateKey(today);

            return (
              <div
                key={key}
                className={`yoga-month-day ${
                  Object.keys(dayLog).length ? "yoga-month-day--logged" : ""
                } ${isToday ? "yoga-month-day--today" : ""}`}
              >
                <span className="yoga-month-day__number">{date.getDate()}</span>
                <div className="yoga-month-day__badges">{badges}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
