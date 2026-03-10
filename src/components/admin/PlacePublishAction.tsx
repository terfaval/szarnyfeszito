"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import type { Place } from "@/types/place";

type PlacePublishActionProps = {
  place: Place;
  missing: string[];
};

export default function PlacePublishAction({ place, missing }: PlacePublishActionProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gateReady = missing.length === 0;

  const isAlreadyPublished = useMemo(() => place.status === "published", [place.status]);

  const publish = async () => {
    setPublishing(true);
    setError(null);

    const response = await fetch(`/api/places/${place.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to publish place.");
      setPublishing(false);
      return;
    }

    router.refresh();
    setPublishing(false);
  };

  return (
    <section className="place-publish space-y-6">
      <header className="admin-heading">
        <p className="admin-heading__label">Publish</p>
        <h2 className="admin-heading__title admin-heading__title--large">Place publishing gate</h2>
        <p className="admin-heading__description">
          Publishing is allowed only when required metadata and approved UI variants exist (server-enforced).
        </p>
      </header>

      <Card className="stack">
        <p className="admin-subheading">Gate status</p>
        {gateReady ? (
          <p className="admin-message admin-message--success">Ready to publish.</p>
        ) : (
          <div className="space-y-2">
            <p className="admin-message admin-message--error">Not publish-ready yet.</p>
            <ul className="list-disc pl-6 text-sm text-zinc-500">
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {place.published_at ? (
        <p className="admin-note-small">
          Last published{" "}
          {new Date(place.published_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {typeof place.published_revision === "number" ? ` · rev ${place.published_revision}` : ""}
        </p>
      ) : null}

      <Button
        type="button"
        variant="accent"
        disabled={publishing || !gateReady}
        onClick={publish}
        className="w-full justify-center"
      >
        {publishing ? "Publishing..." : isAlreadyPublished ? "Republish place" : "Publish place"}
      </Button>

      {error && (
        <p className="admin-message admin-message--error" aria-live="assertive">
          {error}
        </p>
      )}
    </section>
  );
}
