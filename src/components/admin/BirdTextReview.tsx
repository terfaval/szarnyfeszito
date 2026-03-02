"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Icon } from "@/ui/icons/Icon";
import type { ContentBlock, GeneratedContent } from "@/types/content";
import ReviewRequestOverlay from "@/components/admin/ReviewRequestOverlay";

const REVIEW_STATUS_BADGES: Record<ContentBlock["review_status"], string> = {
  draft: "border border-amber-200/40 bg-amber-900/30 text-amber-200",
  reviewed: "border border-[#F1A11E]/40 bg-[#F1A11E]/10 text-[#F1A11E]",
  approved: "border border-emerald-400/40 bg-emerald-950/50 text-emerald-200",
};

const formatRange = (
  range?: { min: number | null; max: number | null },
  unit = "cm"
) => {
  if (!range) {
    return "Unknown";
  }

  const { min, max } = range;

  if (min != null && max != null) {
    if (min === max) {
      return `${min} ${unit}`;
    }
    return `${min}–${max} ${unit}`;
  }

  if (min != null) {
    return `≥${min} ${unit}`;
  }

  if (max != null) {
    return `≤${max} ${unit}`;
  }

  return "Unknown";
};

const renderNullableValue = (value?: string | null, fallback = "Unknown") =>
  value ?? fallback;

const formatBoolean = (value: boolean | null) =>
  value === null ? "Unknown" : value ? "Yes" : "No";

type BirdTextReviewProps = {
  birdId: string;
  contentBlock: ContentBlock | null;
};

type EditableContent = Pick<
  GeneratedContent,
  "short" | "long" | "did_you_know" | "ethics_tip"
>;

type TextReviewSection = "short_summary" | "long_paragraphs" | "identification" | "fun_fact";

const SECTION_TITLES: Record<TextReviewSection, string> = {
  short_summary: "Request changes for the Short Summary",
  long_paragraphs: "Request changes for the Long Description",
  identification: "Request changes for Identification",
  fun_fact: "Request changes for the Fun Fact",
};

const SECTION_DESCRIPTIONS: Record<TextReviewSection, string> = {
  short_summary:
    "Clarify which part of the summary should be rewritten before the next generation.",
  long_paragraphs:
    "Point out the paragraphs that need adjustments so AI can rephrase them.",
  identification:
    "Highlight the identification details that need more precision or clarity.",
  fun_fact: "Note what fun fact should change to match the tone or facts.",
};

export default function BirdTextReview({
  birdId,
  contentBlock: initialBlock,
}: BirdTextReviewProps) {
  const router = useRouter();
  const [contentBlock, setContentBlock] = useState(initialBlock);
  const [approving, setApproving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayTarget, setOverlayTarget] = useState<TextReviewSection | null>(
    null
  );
  const [overlayComment, setOverlayComment] = useState("");
  const [overlaySubmitting, setOverlaySubmitting] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [editableContent, setEditableContent] = useState<EditableContent>({
    short: initialBlock?.short ?? "",
    long: initialBlock?.long ?? "",
    did_you_know: initialBlock?.did_you_know ?? "",
    ethics_tip: initialBlock?.ethics_tip ?? "",
  });

  const dossier = contentBlock?.blocks_json;
  const meta = contentBlock?.generation_meta;
  const reviewComment = meta?.review_comment;
  const reviewRequestedAt = meta?.review_requested_at;
  const isApproved = contentBlock?.review_status === "approved";

  useEffect(() => {
    setEditableContent({
      short: contentBlock?.short ?? "",
      long: contentBlock?.long ?? "",
      did_you_know: contentBlock?.did_you_know ?? "",
      ethics_tip: contentBlock?.ethics_tip ?? "",
    });
  }, [contentBlock?.id, contentBlock?.updated_at]);

  const openOverlay = (target: TextReviewSection) => {
    setOverlayTarget(target);
    setOverlayComment("");
    setOverlayError(null);
  };

  const closeOverlay = () => {
    setOverlayTarget(null);
    setOverlayComment("");
    setOverlayError(null);
  };

  const handleRequestReview = async () => {
    if (!overlayTarget) {
      return;
    }

    const trimmedComment = overlayComment.trim();

    if (!trimmedComment) {
      setOverlayError("Add a short note before requesting changes.");
      return;
    }

    setOverlaySubmitting(true);
    setOverlayError(null);
    setError(null);
    setStatusMessage(null);

    const sectionName = overlayTarget
      ? SECTION_TITLES[overlayTarget]
      : "selected section";

    try {
      const response = await fetch(
        `/api/birds/${birdId}/text-review/request-fix`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: trimmedComment }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.content_block) {
        throw new Error(payload?.error ?? "Unable to save the review note.");
      }

      setContentBlock(payload.data.content_block);
      setStatusMessage(
        `Review note saved (${sectionName}). The dossier is marked for fixes.`
      );
      closeOverlay();
    } catch (err) {
      setOverlayError(
        err instanceof Error
          ? err.message
          : "Something went wrong while requesting a review."
      );
    } finally {
      setOverlaySubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!contentBlock) {
      setError("Generate the dossier before approving it.");
      return;
    }

    setApproving(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/birds/${birdId}/text-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editableContent),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.content_block) {
        throw new Error(payload?.error ?? "Unable to approve the dossier.");
      }

      setContentBlock(payload.data.content_block);
      setStatusMessage("Text approved. The bird can move on to image work.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to approve the text right now."
      );
    } finally {
      setApproving(false);
    }
  };

  const pillMetaItems = dossier
    ? [
        { label: "Region teaser", value: dossier.pill_meta.region_teaser },
        {
          label: "Size",
          value: formatRange(dossier.pill_meta.size_cm),
        },
        {
          label: "Wingspan",
          value: formatRange(dossier.pill_meta.wingspan_cm),
        },
        { label: "Diet", value: dossier.pill_meta.diet_short },
        {
          label: "Lifespan",
          value: formatRange(dossier.pill_meta.lifespan_years, "év"),
        },
      ]
    : [];

  return (
    <section className="space-y-4">
      <Card className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-zinc-400">
              <Icon name="notes" size={14} className="text-zinc-400" />
              <p>Text dossier</p>
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {dossier?.header.name_hu ?? "Field-Guide D2.1"}
            </h2>
            <p className="text-sm text-zinc-400">
              {dossier?.header.subtitle ?? "Generated dossier preview"}
            </p>
            {dossier?.header.short_summary && (
              <p className="mt-2 text-xs text-zinc-500">
                {dossier.header.short_summary}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 text-xs uppercase tracking-[0.3em] text-zinc-400">
            {contentBlock && (
              <>
                {meta?.model && (
                  <span className="text-[11px] text-zinc-500">
                    Model: {meta.model}
                  </span>
                )}
                {meta?.generated_at && (
                  <span className="text-[11px] text-zinc-500">
                    Generated{" "}
                    {new Date(meta.generated_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                )}
                <span
                  className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.4em] ${REVIEW_STATUS_BADGES[contentBlock.review_status]
                    }`}
                >
                  {contentBlock.review_status}
                </span>
              </>
            )}
          </div>
        </header>

        {!dossier ? (
          <p className="rounded-[14px] border border-dashed border-white/10 bg-zinc-900/60 p-4 text-sm text-zinc-400">
            No dossier found yet. Run the generator (via quick add or the bird
            editor buttons) to seed the review flow.
          </p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <article
                className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4"
                data-ui-section="dossier-scientific-name"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Scientific name
                </p>
                <p className="text-lg font-semibold text-white">
                  {dossier.header.name_latin}
                </p>
                <p className="text-xs text-zinc-500">
                  Latin designation
                </p>
              </article>
            <article
              className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4"
              data-ui-section="dossier-summary-text"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Summary
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="Request change for summary"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white hover:border-white/40"
                  onClick={() => openOverlay("short_summary")}
                  disabled={!contentBlock}
                >
                  <Icon name="edit" size={16} />
                </Button>
              </div>
              <p className="mt-2 text-sm text-zinc-300">
                {dossier.header.short_summary}
              </p>
            </article>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {pillMetaItems.map((item) => (
                <article
                  key={item.label}
                  className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400">
                    {item.label}
                  </p>
                  <p className="text-sm text-zinc-200">{item.value}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-4">
              <article
                className="rounded-[14px] border border-white/5 bg-white/5 p-4"
                data-ui-section="dossier-short-options"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Short options
                </p>
                <ol className="mt-3 space-y-3 text-sm text-zinc-200">
                  {dossier.short_options.map((option, index) => (
                    <li key={`short-option-${index}`} className="space-y-2">
                      <span className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                        Option {index + 1}
                      </span>
                      <p>{option}</p>
                    </li>
                  ))}
                </ol>
              </article>
              <article
                className="rounded-[14px] border border-white/5 bg-white/5 p-4"
                data-ui-section="dossier-long-paragraphs"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                    Long paragraphs
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Request change for long paragraphs"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white hover:border-white/40"
                    onClick={() => openOverlay("long_paragraphs")}
                    disabled={!contentBlock}
                  >
                    <Icon name="edit" size={16} />
                  </Button>
                </div>
                <div className="mt-3 space-y-3 text-sm text-zinc-200">
                  {dossier.long_paragraphs.map((paragraph, index) => (
                    <p key={`long-paragraph-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </article>
            </div>

            <article
              className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4"
              data-ui-section="dossier-identification"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Identification
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="Request change for identification"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white hover:border-white/40"
                  onClick={() => openOverlay("identification")}
                  disabled={!contentBlock}
                >
                  <Icon name="edit" size={16} />
                </Button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {dossier.identification.key_features.map((feature, index) => (
                  <article
                    key={`${feature.title}-${index}`}
                    className="rounded-[12px] border border-white/10 bg-white/5 p-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                      {feature.title}
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-sm text-zinc-200">
                {dossier.identification.identification_paragraph}
              </p>
            </article>

            <article
              className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4"
              data-ui-section="dossier-distribution"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                Distribution
              </p>
              <dl className="mt-3 grid gap-2 text-[11px] uppercase tracking-[0.4em] text-zinc-400">
                <div className="flex justify-between">
                  <dt>Order</dt>
                  <dd className="text-right text-white">
                    {renderNullableValue(dossier.distribution.taxonomy.order)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Family</dt>
                  <dd className="text-right text-white">
                    {renderNullableValue(dossier.distribution.taxonomy.family)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Genus</dt>
                  <dd className="text-right text-white">
                    {renderNullableValue(dossier.distribution.taxonomy.genus)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Species</dt>
                  <dd className="text-right text-white">
                    {renderNullableValue(dossier.distribution.taxonomy.species)}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {dossier.distribution.distribution_regions.map((region, index) => (
                  <span
                    key={`${region}-${index}`}
                    className="rounded-full border border-white/20 px-3 py-0.5 text-xs uppercase tracking-[0.3em] text-zinc-300"
                  >
                    {region}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-zinc-200">
                {dossier.distribution.distribution_note}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.4em] text-zinc-400">
                IUCN status:{" "}
                <span className="text-white">
                  {renderNullableValue(dossier.distribution.iucn_status)}
                </span>
              </p>
            </article>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Nesting
                </p>
                <dl className="mt-3 space-y-2 text-sm text-zinc-200">
                  <div className="flex justify-between">
                    <dt>Nesting type</dt>
                    <dd>{renderNullableValue(dossier.nesting.nesting_type)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Nest site</dt>
                    <dd>{renderNullableValue(dossier.nesting.nest_site)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Breeding season</dt>
                    <dd>{renderNullableValue(dossier.nesting.breeding_season)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Clutch/chicks</dt>
                    <dd>
                      {renderNullableValue(
                        dossier.nesting.clutch_or_chicks_count,
                        "Unknown"
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-zinc-200">
                  {dossier.nesting.nesting_note}
                </p>
              </article>
              <article className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Migration
                </p>
                <dl className="mt-3 space-y-2 text-sm text-zinc-200">
                  <div className="flex justify-between">
                    <dt>Is migratory</dt>
                    <dd>{formatBoolean(dossier.migration.is_migratory)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Timing</dt>
                    <dd>{renderNullableValue(dossier.migration.timing)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Route</dt>
                    <dd>{renderNullableValue(dossier.migration.route)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-zinc-200">
                  {dossier.migration.migration_note}
                </p>
              </article>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <article
                className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4"
                data-ui-section="dossier-fun-fact"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                    Fun fact
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Request change for fun fact"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white hover:border-white/40"
                    onClick={() => openOverlay("fun_fact")}
                    disabled={!contentBlock}
                  >
                    <Icon name="edit" size={16} />
                  </Button>
                </div>
                <p className="mt-2 text-sm text-zinc-200">{dossier.fun_fact}</p>
              </article>
              <article
                className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4"
                data-ui-section="dossier-ethics-tip"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Ethics tip
                </p>
                <p className="mt-2 text-sm text-zinc-200">{dossier.ethics_tip}</p>
              </article>
              <article
                className="rounded-[14px] border border-white/5 bg-zinc-950/60 p-4"
                data-ui-section="dossier-typical-places"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Typical places
                </p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-200">
                  {dossier.typical_places.map((place, index) => (
                    <li
                      key={`${place}-${index}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-emerald-300">&bull;</span>
                      {place}
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            {reviewComment && (
              <blockquote className="rounded-[14px] border border-[#F1A11E]/30 bg-[#F1A11E]/10 p-4 text-sm text-[#F1A11E]">
                <p className="text-xs uppercase tracking-[0.3em] text-[#F1A11E]/70">
                  Last review note
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {reviewComment}
                </p>
                {reviewRequestedAt && (
                  <p className="text-[10px] text-zinc-400">
                    Requested on{" "}
                    {new Date(reviewRequestedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </blockquote>
            )}
          </>
        )}
      </Card>

      <Card
        className="flex flex-wrap items-center justify-between gap-4 text-sm"
        data-ui-section="review-actions"
      >
        <div className="space-y-2" data-ui-section="review-instructions">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">
            Need edits?
          </p>
          <p className="text-sm text-zinc-400">
            Tap the pencil icon in the panel you want revised, describe the change,
            and send the review note from the overlay.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          <Button
            type="button"
            onClick={handleApprove}
            disabled={approving || isApproved}
            variant="ghost"
            className="flex w-full items-center justify-center gap-2 border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="accept" size={16} />
            {approving
              ? "Approving..."
              : isApproved
              ? "Dossier approved"
              : "Accept dossier"}
          </Button>

          {statusMessage && (
            <p className="text-xs text-emerald-300" aria-live="polite">
              {statusMessage}
            </p>
          )}

          {error && (
            <p className="text-xs text-rose-400" aria-live="assertive">
              {error}
            </p>
          )}
        </div>
      </Card>

      <ReviewRequestOverlay
        open={overlayTarget !== null}
        title={overlayTarget ? SECTION_TITLES[overlayTarget] : ""}
        description={
          overlayTarget ? SECTION_DESCRIPTIONS[overlayTarget] : ""
        }
        comment={overlayComment}
        onCommentChange={setOverlayComment}
        onCancel={closeOverlay}
        onSubmit={handleRequestReview}
        submitting={overlaySubmitting}
        error={overlayError}
        submitLabel="Send review note"
      />
    </section>
  );
}
