"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import type { PublishedBirdRefillListItem } from "@/lib/birdService";

type SexComparisonPayload = {
  review_status: "draft" | "reviewed" | "approved";
  summary: string;
  key_differences: [string, string, string];
} | null;

type DuoImagePayload = {
  id: string;
  review_status: "draft" | "reviewed" | "approved";
  preview_url: string | null;
} | null;

type RefillStatusPayload = {
  bird: { id: string; slug: string; name_hu: string; status: string };
  sex_comparison: SexComparisonPayload;
  duo_image: DuoImagePayload;
};

type RowStatus = "idle" | "running" | "ok" | "missing" | "error";

type Row = PublishedBirdRefillListItem & {
  status: RowStatus;
  message: string | null;
  missing_text: boolean | null;
  missing_image: boolean | null;
};

const DUO_VARIANT = "main_habitat_pair_sexes_v1";

async function fetchStatus(birdId: string): Promise<RefillStatusPayload> {
  const res = await fetch(`/api/birds/${birdId}/sex-comparison/refill-status`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    data?: RefillStatusPayload;
  };
  if (!res.ok || !payload?.data) {
    throw new Error(payload?.error ?? `HTTP ${res.status}`);
  }
  return payload.data;
}

export default function BirdSexComparisonRefillTool({
  birds,
}: {
  birds: PublishedBirdRefillListItem[];
}) {
  const initialRows = useMemo<Row[]>(
    () =>
      birds
        .slice()
        .sort((a, b) => a.name_hu.localeCompare(b.name_hu, "hu"))
        .map((b) => ({
          ...b,
          status: "idle",
          message: null,
          missing_text: null,
          missing_image: null,
        })),
    [birds]
  );

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(true);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RefillStatusPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<string | null>(null);

  const [summary, setSummary] = useState("");
  const [diff1, setDiff1] = useState("");
  const [diff2, setDiff2] = useState("");
  const [diff3, setDiff3] = useState("");

  const [textReviewNote, setTextReviewNote] = useState("");
  const [imageReviewNote, setImageReviewNote] = useState("");

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matches =
        !normalizedSearch ||
        row.name_hu.toLowerCase().includes(normalizedSearch) ||
        row.slug.toLowerCase().includes(normalizedSearch);

      if (!matches) return false;

      if (!missingOnly) return true;

      const missingText = row.missing_text === true;
      const missingImage = row.missing_image === true;
      const unknown = row.missing_text === null || row.missing_image === null;
      return unknown || missingText || missingImage;
    });
  }, [rows, normalizedSearch, missingOnly]);

  const counts = useMemo(() => {
    const out = { idle: 0, running: 0, ok: 0, missing: 0, error: 0 };
    rows.forEach((r) => {
      out[r.status] += 1;
    });
    return out;
  }, [rows]);

  const runScan = async (targetIds: string[]) => {
    cancelRef.current = false;
    setRunning(true);

    for (const birdId of targetIds) {
      if (cancelRef.current) break;

      setRows((current) =>
        current.map((row) =>
          row.id === birdId
            ? { ...row, status: "running", message: null }
            : row
        )
      );

      try {
        const status = await fetchStatus(birdId);
        const hasApprovedText = status.sex_comparison?.review_status === "approved";
        const hasApprovedImage = status.duo_image?.review_status === "approved";
        const missingText = !hasApprovedText;
        const missingImage = !hasApprovedImage;
        const nextStatus: RowStatus =
          missingText || missingImage ? "missing" : "ok";
        const message =
          missingText || missingImage
            ? `${missingText ? "missing text" : "text ok"} · ${
                missingImage ? "missing image" : "image ok"
              }`
            : "ok";

        setRows((current) =>
          current.map((row) =>
            row.id === birdId
              ? {
                  ...row,
                  status: nextStatus,
                  message,
                  missing_text: missingText,
                  missing_image: missingImage,
                }
              : row
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        setRows((current) =>
          current.map((row) =>
            row.id === birdId
              ? {
                  ...row,
                  status: "error",
                  message,
                  missing_text: null,
                  missing_image: null,
                }
              : row
          )
        );
      }
    }

    setRunning(false);
  };

  const handleScanAll = async () => {
    if (running) return;
    await runScan(rows.map((r) => r.id));
  };

  const handleStop = () => {
    cancelRef.current = true;
  };

  const loadDetail = async (birdId: string) => {
    setSelectedId(birdId);
    setDetail(null);
    setDetailError(null);
    setDetailMessage(null);
    setDetailLoading(true);

    try {
      const status = await fetchStatus(birdId);
      setDetail(status);

      const sc = status.sex_comparison;
      setSummary(sc?.summary ?? "");
      setDiff1(sc?.key_differences?.[0] ?? "");
      setDiff2(sc?.key_differences?.[1] ?? "");
      setDiff3(sc?.key_differences?.[2] ?? "");
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Unable to load details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelected = async () => {
    if (!selectedId) return;
    await loadDetail(selectedId);
    setRows((current) =>
      current.map((row) =>
        row.id === selectedId ? { ...row, status: "idle", message: null } : row
      )
    );
  };

  const callJson = async (url: string, body?: Record<string, unknown>) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(payload?.error ?? `HTTP ${res.status}`);
    }
  };

  const handleGenerateText = async () => {
    if (!selectedId) return;
    setDetailMessage(null);
    setDetailError(null);
    try {
      await callJson(`/api/birds/${selectedId}/sex-comparison/generate`);
      setDetailMessage("Generated sex comparison draft.");
      await refreshSelected();
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Unable to generate text.");
    }
  };

  const handleRequestTextFix = async () => {
    if (!selectedId) return;
    const comment = textReviewNote.trim();
    if (!comment) {
      setDetailError("Add a short text review note first.");
      return;
    }
    setDetailMessage(null);
    setDetailError(null);
    try {
      await callJson(`/api/birds/${selectedId}/sex-comparison/request-fix`, {
        comment,
      });
      setTextReviewNote("");
      setDetailMessage("Text marked for fixes.");
      await refreshSelected();
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Unable to request fixes.");
    }
  };

  const handleApproveText = async () => {
    if (!selectedId) return;
    setDetailMessage(null);
    setDetailError(null);
    try {
      await callJson(`/api/birds/${selectedId}/sex-comparison/approve`, {
        summary,
        key_differences: [diff1, diff2, diff3],
      });
      setDetailMessage("Text approved.");
      await refreshSelected();
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Unable to approve text.");
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedId) return;
    setDetailMessage(null);
    setDetailError(null);
    try {
      const res = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bird_id: selectedId, variant: DUO_VARIANT }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload?.error ?? `HTTP ${res.status}`);
      }
      setDetailMessage("Generated duo image draft.");
      await refreshSelected();
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Unable to generate image.");
    }
  };

  const handleRequestImageFix = async () => {
    if (!selectedId || !detail?.duo_image?.id) return;
    const comment = imageReviewNote.trim();
    if (!comment) {
      setDetailError("Add a short image review note first.");
      return;
    }
    setDetailMessage(null);
    setDetailError(null);
    try {
      await callJson(
        `/api/birds/${selectedId}/images/${detail.duo_image.id}/request-fix`,
        { comment }
      );
      setImageReviewNote("");
      setDetailMessage("Image marked for fixes.");
      await refreshSelected();
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Unable to request image fixes.");
    }
  };

  const handleApproveImage = async () => {
    if (!selectedId || !detail?.duo_image?.id) return;
    setDetailMessage(null);
    setDetailError(null);
    try {
      const res = await fetch(`/api/birds/${selectedId}/images/${detail.duo_image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_status: "approved" }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload?.error ?? `HTTP ${res.status}`);
      }
      setDetailMessage("Image approved.");
      await refreshSelected();
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Unable to approve image.");
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr,1.2fr]">
      <Card className="space-y-4 text-sm">
        <div className="admin-filter-row">
          <Input
            label="Search"
            placeholder="Name or slug"
            value={search}
            className="flex-1"
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="form-field">
            <span className="form-field__label">Show</span>
            <div className="form-field__row">
              <select
                value={missingOnly ? "missing" : "all"}
                onChange={(e) => setMissingOnly(e.target.value === "missing")}
                className="input"
              >
                <option value="missing">Missing only</option>
                <option value="all">All</option>
              </select>
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={handleScanAll} disabled={running || rows.length === 0}>
            Scan published birds
          </Button>
          <Button type="button" variant="ghost" onClick={handleStop} disabled={!running}>
            Stop
          </Button>
          <p className="admin-stat-note">
            idle: {counts.idle} Â· ok: {counts.ok} Â· missing: {counts.missing} Â· error: {counts.error}
          </p>
        </div>

        <div className="space-y-2">
          {filteredRows.map((row) => (
            <button
              key={row.id}
              type="button"
              className="admin-stat-card text-left"
              onClick={() => loadDetail(row.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="admin-stat-label">{row.name_hu}</p>
                  <p className="admin-stat-note">{row.slug}</p>
                </div>
                <div className="text-right">
                  <p className="admin-stat-note">{row.status}</p>
                </div>
              </div>
              {row.message ? <p className="admin-stat-note mt-2">{row.message}</p> : null}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 text-sm">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="admin-subheading">Selected bird</p>
            <p className="admin-stat-note">
              {detail?.bird ? `${detail.bird.name_hu} (${detail.bird.slug})` : "Pick a bird from the list."}
            </p>
          </div>
          {detail?.bird ? (
            <Link className="admin-nav-link" href={`/admin/birds/${detail.bird.id}/publish`}>
              Open publish gate
            </Link>
          ) : null}
        </header>

        {detailLoading ? <p className="admin-stat-note">Loadingâ€¦</p> : null}
        {detailError ? <p className="admin-message admin-message--error">{detailError}</p> : null}
        {detailMessage ? <p className="admin-message admin-message--success">{detailMessage}</p> : null}

        {detail?.bird ? (
          <>
            <div className="grid gap-3">
              <p className="admin-subheading">Text: male vs female</p>
              <p className="admin-stat-note">
                Status: {detail.sex_comparison?.review_status ?? "missing"}
              </p>

              <label className="form-field">
                <span className="form-field__label">Summary</span>
                <textarea
                  className="input"
                  style={{ minHeight: 96 }}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="2-4 sentences, free text."
                />
              </label>

              <div className="grid gap-2 md:grid-cols-3">
                <Input label="Key diff #1" value={diff1} onChange={(e) => setDiff1(e.target.value)} />
                <Input label="Key diff #2" value={diff2} onChange={(e) => setDiff2(e.target.value)} />
                <Input label="Key diff #3" value={diff3} onChange={(e) => setDiff3(e.target.value)} />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={handleGenerateText}>
                  {detail.sex_comparison ? "Regenerate text" : "Generate text"}
                </Button>
                <Button type="button" variant="ghost" onClick={handleApproveText} disabled={!summary.trim()}>
                  Approve text
                </Button>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Input
                  label="Text review note"
                  value={textReviewNote}
                  onChange={(e) => setTextReviewNote(e.target.value)}
                  placeholder="What should change in the next generation?"
                  className="flex-1"
                />
                <Button type="button" variant="ghost" onClick={handleRequestTextFix}>
                  Request changes
                </Button>
              </div>
            </div>

            <hr />

            <div className="grid gap-3">
              <p className="admin-subheading">Image: duo (male + female)</p>
              <p className="admin-stat-note">
                Variant: <code>{DUO_VARIANT}</code> Â· Status:{" "}
                {detail.duo_image?.review_status ?? "missing"}
              </p>

              {detail.duo_image?.preview_url ? (
                <div className="admin-stat-card">
                  <img src={detail.duo_image.preview_url} alt="Duo image preview" />
                </div>
              ) : (
                <div className="admin-stat-card">
                  <p className="admin-stat-note">No image yet.</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={handleGenerateImage}>
                  {detail.duo_image ? "Regenerate image" : "Generate image"}
                </Button>
                <Button type="button" variant="ghost" onClick={handleApproveImage} disabled={!detail.duo_image?.id}>
                  Approve image
                </Button>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <Input
                  label="Image review note"
                  value={imageReviewNote}
                  onChange={(e) => setImageReviewNote(e.target.value)}
                  placeholder="What should change in the next image?"
                  className="flex-1"
                />
                <Button type="button" variant="ghost" onClick={handleRequestImageFix} disabled={!detail.duo_image?.id}>
                  Request changes
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
