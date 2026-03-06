"use client";

import { Button } from "@/ui/components/Button";
import { Icon } from "@/ui/icons/Icon";

type Props = {
  open: boolean;
  title: string;
  description: string;
  comment: string;
  onCommentChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  error: string | null;
  submitLabel?: string;
};

export default function ReviewRequestOverlay({
  open,
  title,
  description,
  comment,
  onCommentChange,
  onCancel,
  onSubmit,
  submitting,
  error,
  submitLabel = "Send request",
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="admin-overlay-backdrop">
      <div className="admin-overlay-panel">
        <header className="flex items-start justify-between gap-4">
          <div className="admin-heading">
            <p className="admin-heading__label">Review request</p>
            <h3 className="admin-heading__title">{title}</h3>
            <p className="admin-heading__description">{description}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 rounded-full"
            onClick={onCancel}
          >
            <Icon name="back" size={16} />
            <span className="sr-only">Close</span>
          </Button>
        </header>

        <textarea
          value={comment}
          onChange={(event) => onCommentChange(event.target.value)}
          rows={6}
          placeholder="Summarize the requested change for this panel."
          className="admin-code-textarea mt-4 text-sm"
        />

        {error && (
          <p className="admin-message admin-message--error mt-2" aria-live="assertive">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            className="min-w-[120px]"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="accent"
            className="min-w-[140px] justify-center"
            onClick={onSubmit}
            disabled={submitting || comment.trim().length === 0}
          >
            {submitting ? "Sending…" : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
