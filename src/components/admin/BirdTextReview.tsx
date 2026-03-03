"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Icon } from "@/ui/icons/Icon";
import type { BirdDossier } from "@/types/dossier";
import type { ContentBlock, GeneratedContent } from "@/types/content";
import ReviewRequestOverlay from "@/components/admin/ReviewRequestOverlay";
import styles from "./BirdTextReview.module.css";

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

type EditSlot = keyof EditableContent;

type TextReviewSection =
  | "short_summary"
  | "long_paragraphs"
  | "identification"
  | "fun_fact"
  | "did_you_know"
  | "ethics_tip";

const SECTION_TITLES: Record<TextReviewSection, string> = {
  short_summary: "Request changes for the Short Summary",
  long_paragraphs: "Request changes for the Long Description",
  identification: "Request changes for Identification",
  fun_fact: "Request changes for the Fun Fact",
  did_you_know: "Request changes for the Did You Know note",
  ethics_tip: "Request changes for the Ethics Tip",
};

const SECTION_DESCRIPTIONS: Record<TextReviewSection, string> = {
  short_summary:
    "Clarify which part of the summary should be rewritten before the next generation.",
  long_paragraphs:
    "Point out the paragraphs that need adjustments so AI can rephrase them.",
  identification:
    "Highlight the identification details that need more precision or clarity.",
  fun_fact: "Note what fun fact should change to match the tone or facts.",
  did_you_know:
    "Describe what additional curiosity or detail should be rewritten or expanded.",
  ethics_tip:
    "Explain how the ethics guidance should shift to encourage better stewardship.",
};

type HabitatIcon = {
  icon: string;
  label: string;
  keywords: string[];
};

const HABITAT_ICONS: HabitatIcon[] = [
  {
    icon: "/BIRDS/ICONS/BACKGROUND/ICON_FOREST.svg",
    label: "Forest",
    keywords: ["erdő", "nád", "liget", "erdős", "tölgy", "fás"],
  },
  {
    icon: "/BIRDS/ICONS/BACKGROUND/ICON_WATER.svg",
    label: "Water",
    keywords: ["tó", "folyó", "vizes", "csatorna", "mocsár", "part"],
  },
  {
    icon: "/BIRDS/ICONS/BACKGROUND/ICON_GRASSLAND.svg",
    label: "Grassland",
    keywords: ["rét", "mező", "puszta", "kaszáló", "szántó"],
  },
  {
    icon: "/BIRDS/ICONS/BACKGROUND/ICON_MOUNTAIN.svg",
    label: "Mountain",
    keywords: ["hegy", "szikla", "gerinc", "alpesi", "magas"],
  },
  {
    icon: "/BIRDS/ICONS/BACKGROUND/ICON_CITY.svg",
    label: "Urban",
    keywords: ["város", "település", "lakott", "utc", "tér"],
  },
];

const VULNERABILITY_VARIANTS: Record<string, string> = {
  least_concern: "Low",
  near_threatened: "Medium",
  vulnerable: "Medium",
  endangered: "High",
  critically_endangered: "Critical",
  unknown: "Unknown",
};

const VULNERABILITY_LABELS: Record<string, string> = {
  least_concern: "Least concern",
  near_threatened: "Near threatened",
  vulnerable: "Vulnerable",
  endangered: "Endangered",
  critically_endangered: "Critically endangered",
  unknown: "Unknown",
};

type HungarianSite = {
  name: string;
  description: string;
};

const splitIntoParagraphs = (value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length ? paragraphs : [trimmed];
};

const detectHabitatIcon = (dossier?: BirdDossier) => {
  if (!dossier) {
    return null;
  }

  const haystack = [
    dossier.signature_trait,
    dossier.header.subtitle,
    dossier.header.short_summary,
    dossier.distribution.distribution_note,
    dossier.long_paragraphs?.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    HABITAT_ICONS.find((hint) =>
      hint.keywords.some((keyword) => haystack.includes(keyword))
    ) ?? null
  );
};

const parseHungarianSites = (places: string[]): HungarianSite[] =>
  places
    .filter(Boolean)
    .map((value) => {
      const [name, ...rest] = value.split(/[–-:]/);
      const description = rest.join(" ").trim() || value;

      return {
        name: name?.trim() || value,
        description,
      };
    });

const capitalizeFirstLetter = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const applyDossierEdit = (
  dossier: BirdDossier | null,
  slot: EditSlot,
  value: string
): BirdDossier | null => {
  if (!dossier) {
    return null;
  }

  if (slot === "short") {
    return {
      ...dossier,
      header: { ...dossier.header, short_summary: value },
    };
  }

  if (slot === "long") {
    const paragraphs = splitIntoParagraphs(value);
    return {
      ...dossier,
      long_paragraphs: paragraphs.length ? paragraphs : [value],
    };
  }

  if (slot === "ethics_tip") {
    return {
      ...dossier,
      ethics_tip: value,
    };
  }

  if (slot === "did_you_know") {
    return {
      ...dossier,
      fun_fact: dossier.fun_fact,
      did_you_know: value,
    };
  }

  return dossier;
};

export default function BirdTextReview({
  birdId,
  contentBlock: initialBlock,
}: BirdTextReviewProps) {
  const router = useRouter();
  const [contentBlock, setContentBlock] = useState(initialBlock);
  const [dossier, setDossier] = useState<BirdDossier | null>(
    initialBlock?.blocks_json ?? null
  );
  const [approving, setApproving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
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
  const [editingSlot, setEditingSlot] = useState<EditSlot | null>(null);
  const [editBuffer, setEditBuffer] = useState("");
  const [selectedParagraphIndex, setSelectedParagraphIndex] = useState(0);

  useEffect(() => {
    setEditableContent({
      short: contentBlock?.short ?? "",
      long: contentBlock?.long ?? "",
      did_you_know: contentBlock?.did_you_know ?? "",
      ethics_tip: contentBlock?.ethics_tip ?? "",
    });
    setDossier(contentBlock?.blocks_json ?? null);
    setSelectedParagraphIndex(0);
  }, [contentBlock?.id, contentBlock?.updated_at]);

  useEffect(() => {
    if (!dossier) {
      return;
    }
    const paragraphCount = dossier.long_paragraphs?.length ?? 0;
    if (paragraphCount === 0) {
      setSelectedParagraphIndex(0);
      return;
    }
    if (selectedParagraphIndex >= paragraphCount) {
      setSelectedParagraphIndex(paragraphCount - 1);
    }
  }, [dossier, selectedParagraphIndex]);

  const meta = contentBlock?.generation_meta;
  const reviewComment = meta?.review_comment;
  const reviewRequestedAt = meta?.review_requested_at;
  const isApproved = contentBlock?.review_status === "approved";

  const habitatIcon = useMemo(() => detectHabitatIcon(dossier ?? undefined), [
    dossier,
  ]);
  const vulnerabilityStatus =
    dossier?.distribution.iucn_status?.toLowerCase() ?? "unknown";
  const vulnerabilityVariant =
    VULNERABILITY_VARIANTS[vulnerabilityStatus] ?? "Unknown";
  const vulnerabilityLabel =
    VULNERABILITY_LABELS[vulnerabilityStatus] ?? "Unknown";
  const vulnerabilityClass =
    styles[
      `vulnerability${capitalizeFirstLetter(vulnerabilityVariant)}`
    ] ?? styles.vulnerabilityUnknown;
  const hungarianSites = useMemo(
    () => parseHungarianSites(dossier?.typical_places ?? []),
    [dossier?.typical_places]
  );
  const paragraphs = dossier?.long_paragraphs ?? [];
  const selectedParagraphText =
    paragraphs[selectedParagraphIndex] ?? "Awaiting generated paragraph.";

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

  const handleRegenerate = async () => {
    if (!contentBlock) {
      setError("Generate the dossier before regenerating it.");
      return;
    }

    setRegenerating(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `/api/birds/${birdId}/text-review/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.content_block) {
        throw new Error(payload?.error ?? "Unable to regenerate the dossier.");
      }

      setContentBlock(payload.data.content_block);
      setStatusMessage(
        "Regenerated the dossier draft using the Latin/Hungarian identity lock and any review note."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to regenerate the dossier right now."
      );
    } finally {
      setRegenerating(false);
    }
  };

  const beginEditing = (slot: EditSlot, value: string) => {
    setEditingSlot(slot);
    setEditBuffer(value);
  };

  const cancelEditing = () => {
    setEditingSlot(null);
    setEditBuffer("");
  };

  const applyEdit = () => {
    if (!editingSlot) {
      return;
    }

    const value = editBuffer;
    setEditableContent((previous) => ({
      ...previous,
      [editingSlot]: value,
    }));

    setContentBlock((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        [editingSlot]: value,
        blocks_json:
          applyDossierEdit(previous.blocks_json, editingSlot, value) ??
          previous.blocks_json,
      };
    });

    setDossier((previous) => applyDossierEdit(previous, editingSlot, value));

    if (editingSlot === "long") {
      setSelectedParagraphIndex(0);
    }

    cancelEditing();
  };

  const renderEditor = (
    slot: EditSlot,
    label: string,
    placeholder: string
  ) => {
    if (editingSlot !== slot) {
      return null;
    }

    return (
      <div className={styles.editorPanel}>
        <label className={styles.editorLabel}>{label}</label>
        <textarea
          className={styles.editorTextarea}
          value={editBuffer}
          placeholder={placeholder}
          onChange={(event) => setEditBuffer(event.target.value)}
        />
        <div className={styles.editorActions}>
          <Button
            type="button"
            variant="ghost"
            className="px-4"
            onClick={cancelEditing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={applyEdit}
            className="px-4"
            disabled={!editBuffer.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    );
  };

  const pillMetaItems = dossier
    ? [
        { label: "Size", value: formatRange(dossier.pill_meta.size_cm) },
        { label: "Wingspan", value: formatRange(dossier.pill_meta.wingspan_cm) },
        { label: "Diet", value: dossier.pill_meta.diet_short },
        { label: "Lifespan", value: formatRange(dossier.pill_meta.lifespan_years, "év") },
      ]
    : [];

  return (
    <section className={styles.page}>
      <Card className={styles.dossierCard}>
        {dossier ? (
          <>
            <header className={styles.header}>
              <div className={styles.headerText}>
                <p className={styles.tag}>Text dossier</p>
                <h1 className={styles.birdTitle}>{dossier.header.name_hu}</h1>
                <p className={styles.subtitle}>{dossier.header.subtitle}</p>
                <div className={`${styles.summaryWrapper} ${styles.reviewable}`}>
                  <p className={styles.summaryText}>
                    {dossier.header.short_summary ||
                      "The summary will populate once the dossier is generated."}
                  </p>
                  <div className={styles.reviewButtons}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => beginEditing("short", editableContent.short)}
                      aria-label="Manually edit short summary"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => openOverlay("short_summary")}
                      aria-label="Request review note for short summary"
                    >
                      <Icon name="generate" size={16} />
                    </button>
                  </div>
                </div>
                {renderEditor(
                  "short",
                  "Edit short summary",
                  "Keep it to 1-2 sentences with a concrete trait."
                )}
              </div>

              <div className={styles.headerExtras}>
                {habitatIcon && (
                  <div className={styles.habitat}>
                    <img
                      src={habitatIcon.icon}
                      alt={`${habitatIcon.label} habitat icon`}
                      className={styles.habitatIcon}
                    />
                    <span className={styles.habitatLabel}>
                      {habitatIcon.label}
                    </span>
                  </div>
                )}
                <span className={`${styles.vulnerabilityPill} ${vulnerabilityClass}`}>
                  {vulnerabilityLabel}
                </span>
                <span className={`text-[11px] text-zinc-500 ${styles.statusBadge}`}>
                  {contentBlock?.review_status}
                </span>
              </div>
            </header>

            <div className={styles.regionRow}>
              <div className={styles.mapColumn}>
                <p className={styles.mapLabel}>Global range</p>
                <div className={styles.mapPlaceholder}>
                  <span>Leaflet placeholder</span>
                </div>
              </div>
              <div className={styles.mapColumn}>
                <p className={styles.mapLabel}>Magyarországi elterjedés</p>
                <div className={styles.mapPlaceholder}>
                  <span>Leaflet placeholder</span>
                </div>
              </div>
              <div className={styles.statsColumn}>
                <p className={styles.mapLabel}>Region</p>
                <p className={styles.regionTeaser}>
                  {dossier.pill_meta.region_teaser ||
                    "Region teaser is pending generation."}
                </p>
                <div className={styles.statPills}>
                  {pillMetaItems.map((item) => (
                    <div key={item.label} className={styles.statPill}>
                      <span className={styles.statLabel}>{item.label}</span>
                      <span className={styles.statValue}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.layerStack}>
              <div className={styles.backgroundLayer}>
                <div className={styles.fullBodyPlaceholder}>
                  <p>Full-body scientific illustration placeholder</p>
                </div>
              </div>
              <div className={styles.overlayLayer}>
                {dossier.identification.key_features.map((feature, index) => (
                  <article key={`${feature.title}-${index}`} className={styles.overlayItem}>
                    <div className={styles.overlayButtons}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => beginEditing("long", editableContent.long)}
                        aria-label="Manual edit identification text"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => openOverlay("identification")}
                        aria-label="Request review note for identification"
                      >
                        <Icon name="generate" size={16} />
                      </button>
                    </div>
                    <h3 className={styles.overlayTitle}>{feature.title}</h3>
                    <p className={styles.overlayDescription}>
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.taxonomyParagraphRow}>
              <article className={styles.taxonomyColumn}>
                <p className={styles.sectionLabel}>Taxonomy</p>
                <div className={styles.taxonomyList}>
                  {[
                    ["Order", dossier.distribution.taxonomy.order],
                    ["Family", dossier.distribution.taxonomy.family],
                    ["Genus", dossier.distribution.taxonomy.genus],
                    ["Species", dossier.distribution.taxonomy.species],
                  ].map(([label, value]) => (
                    <div key={label} className={styles.taxonomyLine}>
                      <span>{label}</span>
                      <span>{renderNullableValue(value)}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.regionTags}>
                  {dossier.distribution.distribution_regions.map((region, index) => (
                    <span key={`${region}-${index}`} className={styles.regionTag}>
                      {region}
                    </span>
                  ))}
                </div>
                <p className={styles.distributionNote}>
                  {dossier.distribution.distribution_note}
                </p>
                <p className={styles.iucnNote}>
                  IUCN status:{" "}
                  <span className={styles.iucnValue}>
                    {renderNullableValue(dossier.distribution.iucn_status)}
                  </span>
                </p>
              </article>

              <article className={styles.paragraphColumn}>
                <div className={`${styles.reviewable} ${styles.paragraphReviewable}`}>
                  <div className={styles.cardHeader}>
                    <p className={styles.sectionLabel}>Long paragraphs</p>
                    <div className={styles.reviewButtons}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => beginEditing("long", editableContent.long)}
                        aria-label="Manually edit long paragraphs"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() => openOverlay("long_paragraphs")}
                        aria-label="Request review note for long paragraphs"
                      >
                        <Icon name="generate" size={16} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.paragraphSelector}>
                    {paragraphs.map((_, index) => (
                      <button
                        key={`paragraph-tab-${index}`}
                        type="button"
                        className={`${styles.paragraphTab} ${
                          selectedParagraphIndex === index ? styles.paragraphTabActive : ""
                        }`}
                        onClick={() => setSelectedParagraphIndex(index)}
                      >
                        Paragraph {index + 1}
                      </button>
                    ))}
                  </div>
                  <p className={styles.paragraphText}>{selectedParagraphText}</p>
                </div>
                <div className={styles.paragraphPlaceholder}>
                  <p className={styles.placeholderLabel}>Choose the long paragraph</p>
                  <p className={styles.placeholderText}>
                    Use the buttons above to highlight the paragraph you want to surface for the next stage.
                  </p>
                </div>
                {renderEditor(
                  "long",
                  "Edit long paragraphs",
                  "Use blank lines to separate paragraphs."
                )}
              </article>
            </div>

            <div className={styles.funFactGrid}>
              <article className={styles.funFactCard}>
                <div className={styles.cardHeader}>
                  <p className={styles.sectionLabel}>Fun fact</p>
                  <div className={styles.reviewButtons}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => openOverlay("fun_fact")}
                      aria-label="Request review note for fun fact"
                    >
                      <Icon name="generate" size={16} />
                    </button>
                  </div>
                </div>
                <p className={styles.cardText}>
                  {dossier.fun_fact ?? "Fun fact pending generation."}
                </p>
              </article>

              <article className={styles.funFactCard}>
                <div className={styles.cardHeader}>
                  <p className={styles.sectionLabel}>Typical places</p>
                </div>
                <ul className={styles.typicalPlacesList}>
                  {dossier.typical_places.map((place, index) => (
                    <li key={`${place}-${index}`}>{place}</li>
                  ))}
                </ul>
              </article>

              <article className={styles.funFactCard}>
                <div className={styles.cardHeader}>
                  <p className={styles.sectionLabel}>Ethics tip</p>
                  <div className={styles.reviewButtons}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => beginEditing("ethics_tip", editableContent.ethics_tip)}
                      aria-label="Manually edit ethics tip"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => openOverlay("ethics_tip")}
                      aria-label="Request review note for ethics tip"
                    >
                      <Icon name="generate" size={16} />
                    </button>
                  </div>
                </div>
                <p className={styles.cardText}>
                  {dossier.ethics_tip ?? "Offer a stewardship reminder."}
                </p>
                {renderEditor(
                  "ethics_tip",
                  "Edit the ethics tip",
                  "Guide readers to protect this species."
                )}
              </article>
            </div>

            <div className={styles.mediaRow}>
              <div className={styles.flightColumn}>
                <div className={styles.imagePlaceholderLarge}>
                  <p>Flight illustration placeholder</p>
                </div>
              </div>
              <article className={styles.migrationColumn}>
                <p className={styles.sectionLabel}>Migration</p>
                <div className={styles.migrationList}>
                  <div className={styles.migrationItem}>
                    <span>Is migratory</span>
                    <span>{formatBoolean(dossier.migration.is_migratory)}</span>
                  </div>
                  <div className={styles.migrationItem}>
                    <span>Timing</span>
                    <span>{renderNullableValue(dossier.migration.timing)}</span>
                  </div>
                  <div className={styles.migrationItem}>
                    <span>Route</span>
                    <span>{renderNullableValue(dossier.migration.route)}</span>
                  </div>
                </div>
                <p className={styles.migrationNote}>
                  {dossier.migration.migration_note}
                </p>
              </article>
            </div>

            {hungarianSites.length > 0 && (
              <div
                className={styles.siteGrid}
                style={{
                  gridTemplateColumns: `repeat(${hungarianSites.length}, minmax(240px, 1fr))`,
                }}
              >
                {hungarianSites.map((site, index) => (
                  <article key={`${site.name}-${index}`} className={styles.siteCard}>
                    <p className={styles.siteName}>{site.name}</p>
                    <p className={styles.siteDescription}>{site.description}</p>
                  </article>
                ))}
              </div>
            )}

            <div className={styles.nestingBlock}>
              <div className={styles.nestingText}>
                <p className={styles.sectionLabel}>Nesting</p>
                <div className={styles.nestingList}>
                  <div className={styles.nestingLine}>
                    <span>Type</span>
                    <span>{renderNullableValue(dossier.nesting.nesting_type)}</span>
                  </div>
                  <div className={styles.nestingLine}>
                    <span>Site</span>
                    <span>{renderNullableValue(dossier.nesting.nest_site)}</span>
                  </div>
                  <div className={styles.nestingLine}>
                    <span>Season</span>
                    <span>{renderNullableValue(dossier.nesting.breeding_season)}</span>
                  </div>
                  <div className={styles.nestingLine}>
                    <span>Clutch</span>
                    <span>
                      {renderNullableValue(dossier.nesting.clutch_or_chicks_count)}
                    </span>
                  </div>
                </div>
                <p className={styles.nestingNote}>
                  {dossier.nesting.nesting_note}
                </p>
              </div>
              <div className={styles.nestingImage}>
                <div className={styles.imagePlaceholder}>
                  <p>Nesting illustration placeholder</p>
                </div>
              </div>
            </div>

            {reviewComment && (
              <blockquote className="admin-review-note">
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
        ) : (
          <div className="admin-panel admin-panel--muted text-sm text-zinc-400">
            No dossier found yet. Run the generator (via quick add or the bird
            editor buttons) to seed the review flow.
          </div>
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
            onClick={handleRegenerate}
            disabled={!contentBlock || regenerating || approving || isApproved}
            variant="ghost"
            className="flex w-full items-center justify-center gap-2 border border-white/10 bg-zinc-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="sync" size={16} />
            {regenerating ? "Regenerating…" : "Regenerate draft"}
          </Button>
          <p className="text-[10px] text-zinc-500">
            Regenerate re-runs the Field-Guide prompt using the identity-locked names and any review note you saved.
          </p>
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
