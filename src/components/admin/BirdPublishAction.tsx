"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Icon } from "@/ui/icons/Icon";
import { BirdStatus } from "@/types/bird";

type BirdPublishActionProps = {
  birdId: string;
  status: BirdStatus;
  gateReady: boolean;
};

export function BirdPublishAction({ birdId, status, gateReady }: BirdPublishActionProps) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPublish = gateReady && status === "images_approved";
  const isAlreadyPublished = status === "published";

  const handlePublish = async () => {
    if (!canPublish) {
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      const response = await fetch(`/api/birds/${birdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to publish the bird right now.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish the bird.");
    } finally {
      setPublishing(false);
    }
  };

  if (!gateReady || isAlreadyPublished) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="accent"
        className="w-full justify-center text-xs"
        disabled={!canPublish || publishing}
        onClick={handlePublish}
      >
        <Icon name="generate" size={16} />
        {publishing ? "Publishing..." : "Publish bird"}
      </Button>
      {error && (
        <p className="admin-message admin-message--error" aria-live="assertive">
          {error}
        </p>
      )}
    </div>
  );
}

export default BirdPublishAction;
