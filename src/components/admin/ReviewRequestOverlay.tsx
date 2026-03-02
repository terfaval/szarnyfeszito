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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-zinc-400">{description}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 rounded-full border border-white/10 text-zinc-300 hover:border-white/40"
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
          className="mt-4 w-full rounded-[14px] border border-zinc-800 bg-transparent px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-white focus:outline-none"
        />

        {error && (
          <p className="mt-2 text-xs text-rose-400" aria-live="assertive">
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
