"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/ui/components/Button";

export type DistributionMapBatchBird = {
  id: string;
  name_hu: string;
};

type RowStatus = "pending" | "running" | "ok" | "error";

type Row = DistributionMapBatchBird & {
  status: RowStatus;
  message: string | null;
};

export default function DistributionMapBatchTool({ birds }: { birds: DistributionMapBatchBird[] }) {
  const initialRows = useMemo<Row[]>(
    () =>
      birds.map((bird) => ({
        ...bird,
        status: "pending",
        message: null,
      })),
    [birds]
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

    for (const birdId of targetIds) {
      if (cancelRef.current) break;

      const bird = rows.find((r) => r.id === birdId);
      if (!bird) continue;

      setRows((current) =>
        current.map((row) =>
          row.id === birdId ? { ...row, status: "running", message: null } : row
        )
      );

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/birds/${birdId}/distribution-map/generate`, {
          method: "POST",
          signal: controller.signal,
        });
        const payload = (await res.json().catch(() => ({}))) as { error?: string };

        if (!res.ok) {
          throw new Error(payload?.error ?? `HTTP ${res.status}`);
        }

        setRows((current) =>
          current.map((row) =>
            row.id === birdId ? { ...row, status: "ok", message: null } : row
          )
        );
      } catch (error) {
        if (controller.signal.aborted) {
          setRows((current) =>
            current.map((row) =>
              row.id === birdId ? { ...row, status: "pending", message: null } : row
            )
          );
          break;
        }

        const message = error instanceof Error ? error.message : "Ismeretlen hiba";
        setRows((current) =>
          current.map((row) =>
            row.id === birdId ? { ...row, status: "error", message } : row
          )
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
    await runBatch(birds.map((b) => b.id));
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
      current.map((row) =>
        row.status === "error" ? { ...row, status: "pending", message: null } : row
      )
    );
    await runBatch(failed);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleStart} disabled={running || birds.length === 0}>
          Minden elterjedési térkép frissítése
        </Button>
        <Button type="button" variant="ghost" onClick={handleStop} disabled={!running}>
          Leállítás
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleRetryFailed}
          disabled={running || counts.error === 0}
        >
          Hibások újrapróbálása ({counts.error})
        </Button>
      </div>

      <p className="admin-stat-note">
        Állapot: {running ? "fut…" : "kész"} · kész: {counts.ok} · hiba: {counts.error} · hátra:
        {counts.pending}
      </p>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="admin-stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="admin-stat-label">{row.name_hu}</p>
                <p className="admin-stat-note">{row.id}</p>
              </div>
              <div className="text-right">
                <p className="admin-stat-note">
                  {row.status === "pending"
                    ? "vár"
                    : row.status === "running"
                      ? "fut…"
                      : row.status === "ok"
                        ? "ok"
                        : "hiba"}
                </p>
              </div>
            </div>
            {row.message ? <p className="admin-message admin-message--error">{row.message}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

