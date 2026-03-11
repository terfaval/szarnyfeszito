"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/ui/components/Button";
import type { PlaceStatus } from "@/types/place";

export type PlaceBirdRefillBatchPlace = {
  id: string;
  name: string;
  place_status: PlaceStatus;
};

type RowStatus = "pending" | "running" | "ok" | "error";

type Row = PlaceBirdRefillBatchPlace & {
  status: RowStatus;
  message: string | null;
};

export default function PlaceBirdRefillBatchTool({ places }: { places: PlaceBirdRefillBatchPlace[] }) {
  const publishedPlaces = useMemo(
    () =>
      places
        .filter((place) => place.place_status === "published")
        .map((place) => ({ id: place.id, name: place.name, place_status: place.place_status }))
        .sort((a, b) => a.name.localeCompare(b.name, "hu")),
    [places]
  );

  const initialRows = useMemo<Row[]>(
    () =>
      publishedPlaces.map((place) => ({
        ...place,
        status: "pending",
        message: null,
      })),
    [publishedPlaces]
  );

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const counts = useMemo(() => {
    const out = { pending: 0, running: 0, ok: 0, error: 0 };
    rows.forEach((row) => {
      out[row.status] += 1;
    });
    return out;
  }, [rows]);

  const runBatch = async (targetIds: string[]) => {
    cancelRef.current = false;
    setRunning(true);

    for (const placeId of targetIds) {
      if (cancelRef.current) break;

      const place = rows.find((r) => r.id === placeId);
      if (!place) continue;

      setRows((current) =>
        current.map((row) => (row.id === placeId ? { ...row, status: "running", message: null } : row))
      );

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/places/${placeId}/birds/suggest?existing_published_only=true`, {
          method: "POST",
          signal: controller.signal,
        });
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          data?: { inserted_count?: number };
        };

        if (!res.ok) {
          throw new Error(payload?.error ?? `HTTP ${res.status}`);
        }

        const insertedCount =
          typeof payload?.data?.inserted_count === "number" ? payload.data.inserted_count : null;

        setRows((current) =>
          current.map((row) =>
            row.id === placeId
              ? {
                  ...row,
                  status: "ok",
                  message: insertedCount === null ? null : `+${insertedCount} link(s)`,
                }
              : row
          )
        );
      } catch (error) {
        if (controller.signal.aborted) {
          setRows((current) =>
            current.map((row) => (row.id === placeId ? { ...row, status: "pending", message: null } : row))
          );
          break;
        }

        const message = error instanceof Error ? error.message : "Unknown error";
        setRows((current) =>
          current.map((row) => (row.id === placeId ? { ...row, status: "error", message } : row))
        );
      } finally {
        abortRef.current = null;
      }
    }

    setRunning(false);
  };

  const handleStart = async () => {
    if (running) return;
    setRows(initialRows);
    await runBatch(publishedPlaces.map((p) => p.id));
  };

  const handleStartAutoApprove = async () => {
    if (running) return;
    setRows(initialRows);

    cancelRef.current = false;
    setRunning(true);

    for (const placeId of publishedPlaces.map((p) => p.id)) {
      if (cancelRef.current) break;

      setRows((current) =>
        current.map((row) => (row.id === placeId ? { ...row, status: "running", message: null } : row))
      );

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/places/${placeId}/birds/suggest?existing_published_only=true&review_status=approved`,
          { method: "POST", signal: controller.signal }
        );
        const payload = (await res.json().catch(() => ({}))) as { error?: string; data?: { inserted_count?: number } };
        if (!res.ok) throw new Error(payload?.error ?? `HTTP ${res.status}`);

        const insertedCount =
          typeof payload?.data?.inserted_count === "number" ? payload.data.inserted_count : null;

        setRows((current) =>
          current.map((row) =>
            row.id === placeId
              ? { ...row, status: "ok", message: insertedCount === null ? null : `+${insertedCount} link(s)` }
              : row
          )
        );
      } catch (error) {
        if (controller.signal.aborted) {
          setRows((current) =>
            current.map((row) => (row.id === placeId ? { ...row, status: "pending", message: null } : row))
          );
          break;
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        setRows((current) => current.map((row) => (row.id === placeId ? { ...row, status: "error", message } : row)));
      } finally {
        abortRef.current = null;
      }
    }

    setRunning(false);
  };

  const handleStop = () => {
    cancelRef.current = true;
    abortRef.current?.abort();
  };

  const handleRetryFailed = async () => {
    if (running) return;
    const failed = rows.filter((row) => row.status === "error").map((row) => row.id);
    if (!failed.length) return;

    setRows((current) =>
      current.map((row) => (row.status === "error" ? { ...row, status: "pending", message: null } : row))
    );
    await runBatch(failed);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleStart} disabled={running || publishedPlaces.length === 0}>
          Refill Place→Bird links (published places)
        </Button>
        <Button type="button" variant="accent" onClick={handleStartAutoApprove} disabled={running || publishedPlaces.length === 0}>
          Refill + auto-approve
        </Button>
        <Button type="button" variant="ghost" onClick={handleStop} disabled={!running}>
          Stop
        </Button>
        <Button type="button" variant="ghost" onClick={handleRetryFailed} disabled={running || counts.error === 0}>
          Retry failed ({counts.error})
        </Button>
      </div>

      <p className="admin-stat-note">
        Status: {running ? "running…" : "idle"} · ok: {counts.ok} · error: {counts.error} · left: {counts.pending}
      </p>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="admin-stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="admin-stat-label">{row.name}</p>
                <p className="admin-stat-note">{row.id}</p>
              </div>
              <div className="text-right">
                <p className="admin-stat-note">
                  {row.status === "pending"
                    ? "pending"
                    : row.status === "running"
                      ? "running…"
                      : row.status === "ok"
                        ? "ok"
                        : "error"}
                </p>
              </div>
            </div>
            {row.message ? (
              <p className={row.status === "error" ? "admin-message admin-message--error" : "admin-message"}>
                {row.message}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
