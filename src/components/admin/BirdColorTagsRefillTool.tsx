"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import type { PublishedBirdColorTagsRefillListItem } from "@/lib/birdService";
import type { BirdColorTag } from "@/types/bird";

type RowStatus = "pending" | "running" | "ok" | "error";

type Row = PublishedBirdColorTagsRefillListItem & {
  status: RowStatus;
  message: string | null;
};

const BIRD_COLOR_TAGS: BirdColorTag[] = [
  "white",
  "black",
  "grey",
  "brown",
  "yellow",
  "orange",
  "red",
  "green",
  "blue",
];

function parseBirdColorTags(value: unknown): BirdColorTag[] | null {
  if (!Array.isArray(value)) return null;
  const cleaned = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => BIRD_COLOR_TAGS.includes(item as BirdColorTag)) as BirdColorTag[];
  return cleaned.length ? Array.from(new Set(cleaned)) : null;
}

export default function BirdColorTagsRefillTool({
  birds,
}: {
  birds: PublishedBirdColorTagsRefillListItem[];
}) {
  const initialRows = useMemo<Row[]>(
    () =>
      birds
        .slice()
        .sort((a, b) => a.name_hu.localeCompare(b.name_hu, "hu"))
        .map((bird) => ({
          ...bird,
          status: "pending",
          message: null,
        })),
    [birds]
  );

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState("");
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (!normalizedSearch) return true;
      return (
        row.name_hu.toLowerCase().includes(normalizedSearch) ||
        row.slug.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [rows, normalizedSearch]);

  const counts = useMemo(() => {
    const out = {
      total: rows.length,
      missing: 0,
      pending: 0,
      running: 0,
      ok: 0,
      error: 0,
    };

    rows.forEach((row) => {
      out[row.status] += 1;
      if (!Array.isArray(row.color_tags) || row.color_tags.length === 0) {
        out.missing += 1;
      }
    });

    return out;
  }, [rows]);

  const runBatch = async (targetIds: string[]) => {
    cancelRef.current = false;
    setRunning(true);

    for (const birdId of targetIds) {
      if (cancelRef.current) break;

      setRows((current) =>
        current.map((row) =>
          row.id === birdId ? { ...row, status: "running", message: null } : row
        )
      );

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/birds/${birdId}/color-tags/refill`, {
          method: "POST",
          signal: controller.signal,
        });
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
          data?: { bird?: { color_tags?: unknown } };
        };

        if (!res.ok) {
          throw new Error(payload?.error ?? `HTTP ${res.status}`);
        }

        setRows((current) =>
          current.map((row) =>
            row.id === birdId
              ? {
                  ...row,
                  status: "ok",
                  message: null,
                  color_tags: parseBirdColorTags(payload?.data?.bird?.color_tags) ?? row.color_tags,
                }
              : row
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
          current.map((row) => (row.id === birdId ? { ...row, status: "error", message } : row))
        );
      } finally {
        abortRef.current = null;
      }
    }

    setRunning(false);
  };

  const handleStartMissingOnly = async () => {
    if (running) return;
    setRows(initialRows);
    const missingIds = initialRows
      .filter((row) => !Array.isArray(row.color_tags) || row.color_tags.length === 0)
      .map((row) => row.id);
    await runBatch(missingIds);
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
      <div className="admin-filter-row">
        <Input
          label="Search birds"
          placeholder="Name or slug"
          value={search}
          className="flex-1"
          helperText="Filter the list below (does not change which items run)"
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" onClick={handleStartMissingOnly} disabled={running || counts.missing === 0}>
            Refill missing ({counts.missing})
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
            Hibásak újrapróbálása ({counts.error})
          </Button>
        </div>
      </div>

      <p className="admin-stat-note">
        Állapot: {running ? "fut…" : "kész"} · összes: {counts.total} · hiányzó: {counts.missing} · ok:{" "}
        {counts.ok} · hiba: {counts.error}
      </p>

      <div className="space-y-2">
        {filteredRows.map((row) => (
          <div key={row.id} className="admin-stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="admin-stat-label">{row.name_hu}</p>
                <p className="admin-stat-note">
                  <Link className="admin-nav-link" href={`/admin/birds/${row.id}`}>
                    Open bird
                  </Link>{" "}
                  · {row.slug}
                </p>
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
                <p className="admin-stat-note">
                  color_tags:{" "}
                  {Array.isArray(row.color_tags) && row.color_tags.length > 0 ? row.color_tags.join(", ") : "—"}
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
