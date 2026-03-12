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
  suggested_linked_count: number | null;
  suggested_pending_count: number | null;
  approved_linked_count: number | null;
  pending_preview: string[];
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
        suggested_linked_count: null,
        suggested_pending_count: null,
        approved_linked_count: null,
        pending_preview: [],
      })),
    [publishedPlaces]
  );

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [running, setRunning] = useState(false);
  const [approving, setApproving] = useState(false);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSummaryForPlace = async (placeId: string) => {
    const res = await fetch("/api/places/bird-links/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_ids: [placeId] }),
    });
    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      data?: Array<{
        place_id: string;
        suggested_linked_count: number;
        suggested_pending_count: number;
        suggested_pending_names_preview: string[];
        approved_linked_count: number;
      }>;
    };
    if (!res.ok) {
      throw new Error(payload?.error ?? `HTTP ${res.status}`);
    }
    return payload?.data?.find((row) => row.place_id === placeId) ?? null;
  };

  const approveForPlace = async (placeId: string) => {
    const res = await fetch(`/api/places/${placeId}/birds/approve-batch`, { method: "POST" });
    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
      data?: { updated_count?: number; skipped_unpublished_count?: number };
    };
    if (!res.ok) {
      throw new Error(payload?.error ?? `HTTP ${res.status}`);
    }
    const summary = await fetchSummaryForPlace(placeId).catch(() => null);
    return { approved: payload?.data ?? {}, summary };
  };

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
        current.map((row) =>
          row.id === placeId
            ? {
                ...row,
                status: "running",
                message: null,
                suggested_linked_count: null,
                suggested_pending_count: null,
                approved_linked_count: null,
                pending_preview: [],
              }
            : row
        )
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

        const summary = await fetchSummaryForPlace(placeId).catch(() => null);

        setRows((current) =>
          current.map((row) =>
            row.id === placeId
              ? {
                  ...row,
                  status: "ok",
                  message:
                    insertedCount === null
                      ? "ok"
                      : `+${insertedCount} link(s)${
                          summary
                            ? ` · suggested linked: ${summary.suggested_linked_count} · pending: ${summary.suggested_pending_count} · approved: ${summary.approved_linked_count}`
                            : ""
                        }`,
                  suggested_linked_count: summary?.suggested_linked_count ?? null,
                  suggested_pending_count: summary?.suggested_pending_count ?? null,
                  approved_linked_count: summary?.approved_linked_count ?? null,
                  pending_preview: summary?.suggested_pending_names_preview ?? [],
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
        setRows((current) => current.map((row) => (row.id === placeId ? { ...row, status: "error", message } : row)));
      } finally {
        abortRef.current = null;
      }
    }

    setRunning(false);
  };

  const handleApproveAllLinkedSuggestions = async () => {
    if (running || approving) return;
    cancelRef.current = false;
    setApproving(true);

    for (const placeId of publishedPlaces.map((p) => p.id)) {
      if (cancelRef.current) break;

      setRows((current) =>
        current.map((row) => (row.id === placeId ? { ...row, status: "running" } : row))
      );

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await approveForPlace(placeId);
        const updatedCount =
          typeof result.approved?.updated_count === "number" ? result.approved.updated_count : null;
        const skippedCount =
          typeof result.approved?.skipped_unpublished_count === "number"
            ? result.approved.skipped_unpublished_count
            : null;
        const summary = result.summary;

        const summaryText = summary
          ? ` · suggested linked: ${summary.suggested_linked_count} · pending: ${summary.suggested_pending_count} · approved: ${summary.approved_linked_count}`
          : "";

        const baseMessage = `${updatedCount === null ? "Approved." : `Approved ${updatedCount} link(s).`}${
          skippedCount && skippedCount > 0 ? ` Skipped ${skippedCount} unpublished.` : ""
        }`;

        setRows((current) =>
          current.map((row) =>
            row.id === placeId
              ? {
                  ...row,
                  status: "ok",
                  message: `${baseMessage}${summaryText}`,
                  suggested_linked_count: summary?.suggested_linked_count ?? row.suggested_linked_count,
                  suggested_pending_count: summary?.suggested_pending_count ?? row.suggested_pending_count,
                  approved_linked_count: summary?.approved_linked_count ?? row.approved_linked_count,
                  pending_preview: summary?.suggested_pending_names_preview ?? row.pending_preview,
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

    setApproving(false);
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
        <Button type="button" onClick={handleStart} disabled={running || approving || publishedPlaces.length === 0}>
          Refill Place→Bird links (published places)
        </Button>
        <Button type="button" variant="accent" onClick={handleStartAutoApprove} disabled={running || approving || publishedPlaces.length === 0}>
          Refill + auto-approve
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleApproveAllLinkedSuggestions}
          disabled={running || approving || publishedPlaces.length === 0}
        >
          {approving ? "Approving..." : "Approve all (linked suggestions)"}
        </Button>
        <Button type="button" variant="ghost" onClick={handleStop} disabled={!running && !approving}>
          Stop
        </Button>
        <Button type="button" variant="ghost" onClick={handleRetryFailed} disabled={running || approving || counts.error === 0}>
          Retry failed ({counts.error})
        </Button>
      </div>

      <p className="admin-stat-note">
        Status: {running || approving ? "running..." : "idle"} · ok: {counts.ok} · error: {counts.error} · left: {counts.pending}
      </p>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="admin-stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="admin-stat-label">{row.name}</p>
                <p className="admin-stat-note">{row.id}</p>
                {row.pending_preview.length > 0 ? (
                  <p className="admin-stat-note">
                    Pending: {row.pending_preview.join(", ")}
                    {typeof row.suggested_pending_count === "number" &&
                    row.suggested_pending_count > row.pending_preview.length
                      ? ` (+${row.suggested_pending_count - row.pending_preview.length} more)`
                      : ""}
                  </p>
                ) : null}
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
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={running || approving || row.status === "running"}
                onClick={async () => {
                  try {
                    setRows((current) =>
                      current.map((r) => (r.id === row.id ? { ...r, status: "running" } : r))
                    );
                    const result = await approveForPlace(row.id);
                    const updatedCount =
                      typeof result.approved?.updated_count === "number" ? result.approved.updated_count : null;
                    const skippedCount =
                      typeof result.approved?.skipped_unpublished_count === "number"
                        ? result.approved.skipped_unpublished_count
                        : null;
                    const summary = result.summary;
                    const summaryText = summary
                      ? ` · suggested linked: ${summary.suggested_linked_count} · pending: ${summary.suggested_pending_count} · approved: ${summary.approved_linked_count}`
                      : "";
                    const baseMessage = `${updatedCount === null ? "Approved." : `Approved ${updatedCount} link(s).`}${
                      skippedCount && skippedCount > 0 ? ` Skipped ${skippedCount} unpublished.` : ""
                    }`;
                    setRows((current) =>
                      current.map((r) =>
                        r.id === row.id
                          ? {
                              ...r,
                              status: "ok",
                              message: `${baseMessage}${summaryText}`,
                              suggested_linked_count: summary?.suggested_linked_count ?? r.suggested_linked_count,
                              suggested_pending_count: summary?.suggested_pending_count ?? r.suggested_pending_count,
                              approved_linked_count: summary?.approved_linked_count ?? r.approved_linked_count,
                              pending_preview: summary?.suggested_pending_names_preview ?? r.pending_preview,
                            }
                          : r
                      )
                    );
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Unknown error";
                    setRows((current) =>
                      current.map((r) => (r.id === row.id ? { ...r, status: "error", message } : r))
                    );
                  }
                }}
              >
                Approve (this place)
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={running || approving}
                onClick={() => window.open(`/admin/places/${row.id}/birds`, "_blank")}
              >
                Open birds
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
