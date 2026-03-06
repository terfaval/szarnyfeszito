"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import type { ScienceDossierRecord, VisualBriefRecord } from "@/types/imageAccuracy";

type SaveResult<T> = { ok: true; record: T } | { ok: false; error: string };

function safeJsonStringify(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function parseJson(text: string): SaveResult<unknown> {
  try {
    const parsed = JSON.parse(text);
    return { ok: true, record: parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON.";
    return { ok: false, error: message };
  }
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? "Request failed.");
  }
  return payload;
}

type ImageAccuracyHandoffProps = {
  birdId: string;
  scienceDossier: ScienceDossierRecord | null;
  visualBrief: VisualBriefRecord | null;
  scienceDossierStatus: string;
  visualBriefStatus: string;
};

export function ImageAccuracyHandoff({
  birdId,
  scienceDossier,
  visualBrief,
  scienceDossierStatus,
  visualBriefStatus,
}: ImageAccuracyHandoffProps) {
  const router = useRouter();
  const [scienceJson, setScienceJson] = useState(() =>
    safeJsonStringify(scienceDossier?.payload ?? null)
  );
  const [briefJson, setBriefJson] = useState(() =>
    safeJsonStringify(visualBrief?.payload ?? null)
  );
  const [saving, setSaving] = useState<"science" | "brief" | null>(null);
  const [approving, setApproving] = useState<"science" | "brief" | null>(null);
  const [generating, setGenerating] = useState<"science" | "brief" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setScienceJson(safeJsonStringify(scienceDossier?.payload ?? null));
  }, [scienceDossier?.id, scienceDossier?.updated_at]);

  useEffect(() => {
    setBriefJson(safeJsonStringify(visualBrief?.payload ?? null));
  }, [visualBrief?.id, visualBrief?.updated_at]);

  const canApproveScience = useMemo(() => {
    return scienceDossier?.review_status === "draft" || scienceDossierStatus !== "approved";
  }, [scienceDossier?.review_status, scienceDossierStatus]);

  const canEditBrief = scienceDossierStatus === "approved";

  const canApproveBrief = useMemo(() => {
    if (!canEditBrief) {
      return false;
    }
    return visualBrief?.review_status === "draft" || visualBriefStatus !== "approved";
  }, [canEditBrief, visualBrief?.review_status, visualBriefStatus]);

  const saveScience = async () => {
    setError(null);
    setMessage(null);
    const parsed = parseJson(scienceJson);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving("science");
    try {
      await postJson(`/api/birds/${birdId}/science-dossier`, {
        schema_version: "v1",
        payload: parsed.record,
      });
      setMessage("Science Dossier saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save Science Dossier.");
    } finally {
      setSaving(null);
    }
  };

  const generateScience = async () => {
    setError(null);
    setMessage(null);
    setGenerating("science");
    try {
      await postJson(`/api/birds/${birdId}/science-dossier/generate`, {});
      setMessage("Science Dossier generated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate Science Dossier.");
    } finally {
      setGenerating(null);
    }
  };

  const approveScience = async () => {
    setError(null);
    setMessage(null);
    setApproving("science");
    try {
      await postJson(`/api/birds/${birdId}/science-dossier/approve`, {});
      setMessage("Science Dossier approved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve Science Dossier.");
    } finally {
      setApproving(null);
    }
  };

  const generateBrief = async () => {
    if (!canEditBrief) {
      setError("Approve the Science Dossier before generating the Visual Brief.");
      return;
    }
    setError(null);
    setMessage(null);
    setGenerating("brief");
    try {
      await postJson(`/api/birds/${birdId}/visual-brief/generate`, {});
      setMessage("Visual Brief generated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate Visual Brief.");
    } finally {
      setGenerating(null);
    }
  };

  const saveBrief = async () => {
    if (!canEditBrief) {
      setError("Approve the Science Dossier before editing the Visual Brief.");
      return;
    }
    setError(null);
    setMessage(null);
    const parsed = parseJson(briefJson);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving("brief");
    try {
      await postJson(`/api/birds/${birdId}/visual-brief`, {
        schema_version: "v1",
        payload: parsed.record,
      });
      setMessage("Visual Brief saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save Visual Brief.");
    } finally {
      setSaving(null);
    }
  };

  const approveBrief = async () => {
    if (!canEditBrief) {
      setError("Approve the Science Dossier before approving the Visual Brief.");
      return;
    }
    setError(null);
    setMessage(null);
    setApproving("brief");
    try {
      await postJson(`/api/birds/${birdId}/visual-brief/approve`, {});
      setMessage("Visual Brief approved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve Visual Brief.");
    } finally {
      setApproving(null);
    }
  };

  return (
    <section className="space-y-4">
      <Card className="space-y-3">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-zinc-400">Handoff</p>
          <h1 className="text-lg font-semibold text-white">Image accuracy inputs</h1>
          <p className="text-sm text-zinc-400">
            Review and approve the structured artifacts that drive image generation.
          </p>
        </header>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Science Dossier (v1)</h2>
            <p className="text-sm text-zinc-500">
              Identification-first facts and constraints (not user-facing narrative).
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={saving !== null || approving !== null || generating !== null}
              onClick={generateScience}
            >
              {generating === "science" ? "Generating…" : "Generate"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={saving !== null || approving !== null || generating !== null}
              onClick={saveScience}
            >
              {saving === "science" ? "Saving…" : "Save draft"}
            </Button>
            <Button
              type="button"
              variant="accent"
              disabled={
                !canApproveScience || saving !== null || approving !== null || generating !== null
              }
              onClick={approveScience}
            >
              {approving === "science" ? "Approving…" : "Approve"}
            </Button>
          </div>
        </div>

        <textarea
          className="min-h-[280px] w-full rounded-[14px] border border-white/10 bg-black/20 p-4 font-mono text-xs text-zinc-200 outline-none focus:border-white/30"
          value={scienceJson}
          onChange={(event) => setScienceJson(event.target.value)}
          spellCheck={false}
        />
      </Card>

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Visual Brief (v1)</h2>
            <p className="text-sm text-zinc-500">
              Composition rules and must-not constraints for each required/optional variant.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={
                !canEditBrief || saving !== null || approving !== null || generating !== null
              }
              onClick={generateBrief}
            >
              {generating === "brief" ? "Generating…" : "Generate"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={
                !canEditBrief || saving !== null || approving !== null || generating !== null
              }
              onClick={saveBrief}
            >
              {saving === "brief" ? "Saving…" : "Save draft"}
            </Button>
            <Button
              type="button"
              variant="accent"
              disabled={
                !canApproveBrief || saving !== null || approving !== null || generating !== null
              }
              onClick={approveBrief}
            >
              {approving === "brief" ? "Approving…" : "Approve"}
            </Button>
          </div>
        </div>

        {!canEditBrief && (
          <p className="text-sm text-amber-200">
            Approve the Science Dossier first to unlock the Visual Brief editor.
          </p>
        )}

        <textarea
          className="min-h-[280px] w-full rounded-[14px] border border-white/10 bg-black/20 p-4 font-mono text-xs text-zinc-200 outline-none focus:border-white/30 disabled:opacity-50"
          value={briefJson}
          onChange={(event) => setBriefJson(event.target.value)}
          disabled={!canEditBrief}
          spellCheck={false}
        />
      </Card>

      {error && (
        <p className="text-xs text-rose-400" aria-live="assertive">
          {error}
        </p>
      )}
      {message && (
        <p className="text-xs text-emerald-300" aria-live="polite">
          {message}
        </p>
      )}

      <Card className="space-y-2">
        <p className="text-sm text-zinc-500">
          When both artifacts are approved, return to the bird editor to run{" "}
          <span className="font-semibold text-white">Generate Images</span>.
        </p>
      </Card>
    </section>
  );
}

export default ImageAccuracyHandoff;
