"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Icon } from "@/ui/icons/Icon";
import { ReviewStatusPill } from "@/ui/components/ReviewStatusPill";
import type { BirdDossier } from "@/types/dossier";
import type { ContentBlock, GeneratedContent } from "@/types/content";
import type { ImageVariant } from "@/types/image";
import type { BirdDistributionMapRecord, DistributionStatus, DistributionRange } from "@/types/distributionMap";
import ReviewRequestOverlay from "@/components/admin/ReviewRequestOverlay";
import BirdIcon from "@/components/admin/BirdIcon";
import BirdDistributionMap, {
  type DistributionMapHoverInfo,
} from "@/components/maps/BirdDistributionMap";
import DistributionLegend from "@/components/maps/DistributionLegend";
import { distributionRangeSchema } from "@/lib/distributionMapSchema";
import styles from "./BirdTextReview.module.css";

const DISTRIBUTION_STATUS_LABELS: Record<DistributionStatus, string> = {
  resident: "Állandó",
  breeding: "Költő",
  wintering: "Telelő",
  passage: "Átvonuló",
};

const DISTRIBUTION_STATUS_COLORS: Record<DistributionStatus, string> = {
  resident: "#BE2D12",
  breeding: "#D9480F",
  wintering: "#F76707",
  passage: "#FFD43B",
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
  mode?: "review" | "publish";
  images?: { variant: ImageVariant; previewUrl: string | null }[];
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

const applyDossierEdit = (
  dossier: BirdDossier | null | undefined,
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
  mode = "review",
  images,
}: BirdTextReviewProps) {
  const isPublishMode = mode === "publish";
  const router = useRouter();
  const [contentBlock, setContentBlock] = useState(initialBlock);
  const [dossier, setDossier] = useState<BirdDossier | null>(
    initialBlock?.blocks_json ?? null
  );
  const [approving, setApproving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingTraits, setRegeneratingTraits] = useState(false);
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
  const [distributionMap, setDistributionMap] =
    useState<BirdDistributionMapRecord | null>(null);
  const [distributionLoading, setDistributionLoading] = useState(false);
  const [distributionGenerating, setDistributionGenerating] = useState(false);
  const [distributionError, setDistributionError] = useState<string | null>(null);
  const [activeStatuses, setActiveStatuses] = useState<
    Record<DistributionStatus, boolean>
  >({
    resident: true,
    breeding: true,
    wintering: true,
    passage: true,
  });
  const [distributionHover, setDistributionHover] =
    useState<DistributionMapHoverInfo | null>(null);
  const [sexComparisonBusy, setSexComparisonBusy] = useState(false);
  const [sexComparisonNote, setSexComparisonNote] = useState("");
  const [sexComparisonError, setSexComparisonError] = useState<string | null>(null);
  const [sexComparisonMessage, setSexComparisonMessage] = useState<string | null>(null);

  useEffect(() => {
    setEditableContent({
      short: contentBlock?.short ?? "",
      long: contentBlock?.long ?? "",
      did_you_know: contentBlock?.did_you_know ?? "",
      ethics_tip: contentBlock?.ethics_tip ?? "",
    });
    setDossier(contentBlock?.blocks_json ?? null);
  }, [contentBlock?.id, contentBlock?.updated_at]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setDistributionLoading(true);
      setDistributionError(null);

      try {
        const response = await fetch(`/api/birds/${birdId}/distribution-map`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to load distribution map.");
        }

        if (!cancelled) {
          setDistributionMap(payload?.data?.distribution_map ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setDistributionError(
            err instanceof Error ? err.message : "Unable to load distribution map."
          );
        }
      } finally {
        if (!cancelled) {
          setDistributionLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [birdId]);

  const meta = contentBlock?.generation_meta;
  const reviewComment = meta?.review_comment;
  const reviewRequestedAt = meta?.review_requested_at;
  const isApproved = contentBlock?.review_status === "approved";

  const habitatIcon = useMemo(() => detectHabitatIcon(dossier ?? undefined), [
    dossier,
  ]);
  const iucnStatusRaw = dossier?.distribution.iucn_status ?? null;
  const iucnStatus = iucnStatusRaw ? iucnStatusRaw.trim().toUpperCase() : null;
  const iucnPillClass = (() => {
    switch (iucnStatus) {
      case "LC":
        return styles.iucnLC;
      case "NT":
        return styles.iucnNT;
      case "VU":
        return styles.iucnVU;
      case "EN":
        return styles.iucnEN;
      case "CR":
        return styles.iucnCR;
      case "EW":
        return styles.iucnEW;
      case "EX":
        return styles.iucnEX;
      case "DD":
        return styles.iucnDD;
      case "NE":
        return styles.iucnNE;
      default:
        return styles.iucnUnknown;
    }
  })();
  const speciesSummary =
    dossier?.header.short_summary?.trim() ||
    dossier?.header.subtitle?.trim() ||
    "Species summary pending.";
  const distributionRanges = useMemo<DistributionRange[]>(() => {
    if (!distributionMap) {
      return [];
    }
    const parsed = distributionRangeSchema.array().safeParse(distributionMap.ranges);
    return parsed.success ? parsed.data : [];
  }, [distributionMap]);
  const usedDistributionStatuses = useMemo(() => {
    const set = new Set<DistributionStatus>();
    distributionRanges.forEach((range) => set.add(range.status));
    const order: DistributionStatus[] = ["resident", "breeding", "wintering", "passage"];
    return order.filter((status) => set.has(status));
  }, [distributionRanges]);
  const paragraphs = dossier?.long_paragraphs ?? [];
  const paragraph1 = paragraphs[0] ?? "Awaiting generated paragraph.";
  const paragraph2 = paragraphs[1] ?? "Awaiting generated paragraph.";

  const previewByVariant = useMemo(() => {
    const map = new Map<ImageVariant, string>();
    (images ?? []).forEach((image) => {
      if (image.previewUrl) {
        map.set(image.variant, image.previewUrl);
      }
    });
    return map;
  }, [images]);

  const iconicPreviewUrl = previewByVariant.get("fixed_pose_icon_v1") ?? null;
  const mainHabitatPreviewUrl = previewByVariant.get("main_habitat") ?? null;
  const flightPreviewUrl = previewByVariant.get("flight_clean") ?? null;
  const nestingPreviewUrl = previewByVariant.get("nesting_clean") ?? null;
  const sexPairPreviewUrl = previewByVariant.get("main_habitat_pair_sexes_v1") ?? null;

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
      setStatusMessage("Text approved. Redirecting to image generation…");
      router.push(`/admin/birds/${birdId}/images`);
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

  const handleRegenerateTraits = async () => {
    if (!contentBlock) {
      setError("Generate the dossier before regenerating traits.");
      return;
    }

    setRegeneratingTraits(true);
    setError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `/api/birds/${birdId}/text-review/regenerate-identification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.content_block) {
        throw new Error(
          payload?.error ?? "Unable to regenerate identification traits."
        );
      }

      setContentBlock(payload.data.content_block);
      setStatusMessage("Regenerated identification traits.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to regenerate identification traits right now."
      );
    } finally {
      setRegeneratingTraits(false);
    }
  };

  const toggleDistributionStatus = (status: DistributionStatus) => {
    setActiveStatuses((previous) => ({
      ...previous,
      [status]: !previous[status],
    }));
  };

  const handleGenerateDistributionMap = async () => {
    setDistributionGenerating(true);
    setDistributionError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(
        `/api/birds/${birdId}/distribution-map/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.distribution_map) {
        throw new Error(payload?.error ?? "Unable to generate distribution map.");
      }

      setDistributionMap(payload.data.distribution_map);
      setStatusMessage("Distribution map generated.");
    } catch (err) {
      setDistributionError(
        err instanceof Error
          ? err.message
          : "Unable to generate distribution map right now."
      );
    } finally {
      setDistributionGenerating(false);
    }
  };

  const handleGenerateSexComparison = async () => {
    if (!contentBlock) {
      setError("Generate the dossier before generating sex comparison.");
      return;
    }

    setSexComparisonBusy(true);
    setSexComparisonError(null);
    setSexComparisonMessage(null);

    try {
      const response = await fetch(`/api/birds/${birdId}/sex-comparison/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.content_block) {
        throw new Error(payload?.error ?? "Unable to generate sex comparison.");
      }

      setContentBlock(payload.data.content_block);
      setSexComparisonMessage("Generated sex comparison draft.");
    } catch (err) {
      setSexComparisonError(
        err instanceof Error
          ? err.message
          : "Unable to generate sex comparison right now."
      );
    } finally {
      setSexComparisonBusy(false);
    }
  };

  const handleRequestSexComparisonFix = async () => {
    const sc = contentBlock?.blocks_json?.sex_comparison;
    if (!sc) {
      setSexComparisonError("Generate sex comparison before requesting changes.");
      return;
    }

    const trimmed = sexComparisonNote.trim();
    if (!trimmed) {
      setSexComparisonError("Add a short note before requesting changes.");
      return;
    }

    setSexComparisonBusy(true);
    setSexComparisonError(null);
    setSexComparisonMessage(null);

    try {
      const response = await fetch(`/api/birds/${birdId}/sex-comparison/request-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: trimmed }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.content_block) {
        throw new Error(payload?.error ?? "Unable to request changes.");
      }

      setContentBlock(payload.data.content_block);
      setSexComparisonNote("");
      setSexComparisonMessage("Sex comparison marked for fixes.");
    } catch (err) {
      setSexComparisonError(
        err instanceof Error ? err.message : "Unable to request changes right now."
      );
    } finally {
      setSexComparisonBusy(false);
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

  const physicalPills: { label: string; value: string; className?: string }[] = dossier
    ? [
        {
          label: "IUCN",
          value: iucnStatus ?? "Unknown",
          className: iucnPillClass,
        },
        {
          label: "Lifespan",
          value: formatRange(dossier.pill_meta.lifespan_years, "év"),
        },
        { label: "Size", value: formatRange(dossier.pill_meta.size_cm) },
        { label: "Wingspan", value: formatRange(dossier.pill_meta.wingspan_cm) },
      ]
    : [];

  const dietPills = dossier
    ? [
        {
          label: "Diet",
          value: dossier.pill_meta.diet_short || "Pending",
        },
      ]
    : [];

  return (
    <section className={styles.page}>
      <Card className={styles.dossierCard}>
        {dossier ? (
          <>
            <header className={styles.header}>
              <div className={styles.headerBadgeColumn}>
                <BirdIcon
                  habitatSrc={habitatIcon?.icon ?? null}
                  iconicSrc={iconicPreviewUrl}
                  showHabitatBackground
                  background={dossier.pill_meta.color_bg}
                  size={120}
                />
              </div>

              <div className={styles.headerMain}>
                <div className={styles.headerMainTop}>
                  <div className={styles.headerTitleBlock}>
                    <h1 className={styles.birdTitle}>{dossier.header.name_hu}</h1>
                    <p className={styles.subtitle}>{dossier.header.subtitle}</p>
                    {!isPublishMode ? (
                      <>
                        <div className={`${styles.shortSummaryRow} ${styles.reviewable}`}>
                          <p className={styles.shortSummaryText}>
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
                      </>
                    ) : null}
                  </div>

                  {contentBlock?.review_status && (
                    <span className={styles.statusBadge}>
                      <ReviewStatusPill status={contentBlock.review_status} />
                    </span>
                  )}
                </div>
              </div>
            </header>

            {isPublishMode ? (
              <div className={styles.publishSummaryBlock} aria-label="Approved summary">
                <p className={styles.publishSummaryText}>
                  {dossier.header.short_summary ||
                    "The summary will populate once the dossier is generated."}
                </p>
              </div>
            ) : null}

              <div
                className={`${styles.layerStack} ${
                  isPublishMode ? styles.layerStackPublish : ""
                }`}
              >
                <div className={styles.backgroundLayer}>
                  <div className={styles.mainImageFrame}>
                    {mainHabitatPreviewUrl ? (
                      <div
                        className={`${styles.fullBodyImage} ${
                          isPublishMode ? styles.fullBodyImagePublish : ""
                        }`}
                      >
                        <img
                          src={mainHabitatPreviewUrl}
                          alt="Main bird image"
                          className={styles.fullBodyImageImg}
                        />
                      </div>
                    ) : (
                      <div
                        className={`${styles.fullBodyPlaceholder} ${
                          isPublishMode ? styles.fullBodyPlaceholderPublish : ""
                        }`}
                      >
                        <p>Main bird image</p>
                      </div>
                    )}
                  </div>
                </div>
              <div className={styles.overlayLayer}>
                {dossier.identification.key_features.map((feature, index) => (
                  <article
                    key={`${feature.title}-${index}`}
                    className={`${styles.overlayItem} ${styles.reviewable}`}
                  >
                    <div className={styles.overlayHeading}>
                      <h3 className={styles.overlayTitle}>{feature.title}</h3>
                      {!isPublishMode && (
                        <div
                          className={`${styles.reviewButtons} ${styles.overlayButtons}`}
                        >
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
                      )}
                    </div>
                    <p className={styles.overlayDescription}>
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            {isPublishMode ? (
              dossier.sex_comparison?.review_status === "approved" ? (
                <div className={styles.mediaRow}>
                  <article className={styles.migrationColumn}>
                    <p className={styles.sectionLabel}>Male vs female</p>
                    <div className={styles.migrationList}>
                      {dossier.sex_comparison.key_differences.map((diff, idx) => (
                        <div key={`${idx}-${diff}`} className={styles.migrationItem}>
                          <span>{diff}</span>
                        </div>
                      ))}
                    </div>
                    <p className={styles.migrationNote} style={{ whiteSpace: "pre-wrap" }}>
                      {dossier.sex_comparison.summary}
                    </p>
                  </article>
                  <div className={styles.flightColumn}>
                    <div className={styles.imageFrameLarge}>
                      {sexPairPreviewUrl ? (
                        <img
                          src={sexPairPreviewUrl}
                          alt="Male + female duo illustration"
                          className={styles.imageFrameImageContain}
                        />
                      ) : (
                        <div className={styles.imageFramePlaceholder}>
                          <p>No approved duo image yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <article className={styles.migrationColumn}>
                  <p className={styles.sectionLabel}>Male vs female</p>
                  <p className={styles.migrationNote}>Missing approved sex comparison.</p>
                </article>
              )
            ) : null}

            {!isPublishMode ? (
              <div className="admin-stat-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="admin-stat-label">Sex comparison (male vs female)</p>
                    <p className="admin-stat-note">
                      Status: {dossier.sex_comparison?.review_status ?? "missing"} (auto-approved with bird text)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleGenerateSexComparison}
                      disabled={sexComparisonBusy || regenerating || approving}
                    >
                      <Icon name="generate" size={16} />
                      {dossier.sex_comparison ? "Regenerate" : "Generate"}
                    </Button>
                  </div>
                </div>

                {dossier.sex_comparison ? (
                  <div className="mt-3">
                    <p className="admin-stat-note" style={{ whiteSpace: "pre-wrap" }}>
                      {dossier.sex_comparison.summary}
                    </p>
                    <ul className="admin-stat-note" style={{ paddingLeft: 18, listStyleType: "disc" }}>
                      {dossier.sex_comparison.key_differences.map((diff, idx) => (
                        <li key={`${idx}-${diff}`}>{diff}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="admin-stat-note mt-3">
                    No sex comparison yet. Generate it to backfill this optional section.
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="form-field flex-1">
                    <span className="form-field__label">Review note</span>
                    <div className="form-field__row">
                      <input
                        className="input flex-1"
                        value={sexComparisonNote}
                        onChange={(event) => setSexComparisonNote(event.target.value)}
                        placeholder="What should change in the next generation?"
                      />
                    </div>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRequestSexComparisonFix}
                    disabled={sexComparisonBusy || !dossier.sex_comparison}
                  >
                    Request changes
                  </Button>
                </div>

                {sexComparisonMessage ? (
                  <p className="admin-message admin-message--success mt-3" aria-live="polite">
                    {sexComparisonMessage}
                  </p>
                ) : null}
                {sexComparisonError ? (
                  <p className="admin-message admin-message--error mt-3" aria-live="assertive">
                    {sexComparisonError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 flex flex-col items-end gap-2">
              <Button
                type="button"
                onClick={handleRegenerateTraits}
                disabled={!contentBlock || regeneratingTraits || regenerating || approving}
                variant="ghost"
              >
                <Icon name="generate" size={16} />
                {regeneratingTraits ? "Regenerating traits…" : "Regenerate traits"}
              </Button>
              {isPublishMode && statusMessage && (
                <p className="admin-message admin-message--success" aria-live="polite">
                  {statusMessage}
                </p>
              )}
              {isPublishMode && error && (
                <p className="admin-message admin-message--error" aria-live="assertive">
                  {error}
                </p>
              )}
            </div>

            <div className={styles.regionRow}>
              <div className={styles.mapColumn}>
                <div className={styles.mapHeader}>
                  <p className={styles.mapLabel}>Elterjedés</p>
                  {!isPublishMode ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className={styles.leafletsButton}
                      onClick={handleGenerateDistributionMap}
                      disabled={distributionGenerating || distributionLoading}
                    >
                      {distributionGenerating
                        ? "Generálás…"
                        : distributionMap
                          ? "Újragenerálás"
                          : "Generálás"}
                    </Button>
                  ) : (
                    <span className={styles.mapHeaderSpacer} aria-hidden="true" />
                  )}
                </div>
                <div className={styles.mapFrame}>
                  {distributionRanges.length > 0 ? (
                    <BirdDistributionMap
                      mapType="global"
                      ranges={distributionRanges}
                      activeStatuses={activeStatuses}
                      speciesSummary={speciesSummary}
                      onHover={setDistributionHover}
                    />
                  ) : (
                    <div className={styles.mapPlaceholder}>
                      <div className={styles.mapPlaceholderEmpty}>
                        <span>Nincs elterjedési adat</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.mapColumn}>
                <div className={styles.mapHeader}>
                  <p className={styles.mapLabel}>Magyarország</p>
                  <span className={styles.mapHeaderSpacer} aria-hidden="true" />
                </div>
                <div className={styles.mapFrame}>
                  {distributionRanges.length > 0 ? (
                    <BirdDistributionMap
                      mapType="hungary"
                      ranges={distributionRanges}
                      activeStatuses={activeStatuses}
                      speciesSummary={speciesSummary}
                      onHover={setDistributionHover}
                    />
                  ) : (
                    <div className={styles.mapPlaceholder}>
                      <div className={styles.mapPlaceholderEmpty}>
                        <span>Nincs elterjedési adat</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.statsColumn}>
                <div className={styles.mapHeader}>
                  <p className={styles.mapLabel}>Jelmagyarázat</p>
                  <span className={styles.mapHeaderSpacer} aria-hidden="true" />
                </div>
                {distributionLoading && (
                  <p className={styles.distributionNote}>Elterjedés betöltése…</p>
                )}
                {distributionError && (
                  <p className={styles.distributionError}>{distributionError}</p>
                )}
                <div className={styles.legendFrame}>
                  {usedDistributionStatuses.length ? (
                    <DistributionLegend
                      active={activeStatuses}
                      onToggle={toggleDistributionStatus}
                      items={usedDistributionStatuses}
                    />
                  ) : (
                    <p className={styles.distributionNote}>Nincs elérhető jelmagyarázat.</p>
                  )}
                </div>
              </div>

              <div className={styles.distributionInfoRowFull}>
                <div className={styles.distributionInfo}>
                  <p className={styles.distributionInfoTitle}>Infó</p>
                  <p className={styles.distributionInfoSummary}>{speciesSummary}</p>
                  {distributionHover ? (
                    <div className={styles.distributionInfoBody}>
                      <div className={styles.distributionInfoRow}>
                        <span className={styles.distributionInfoLabel}>Státusz</span>
                        <span className={styles.distributionInfoValue}>
                          <span
                            className={styles.distributionInfoSwatch}
                            style={{
                              backgroundColor:
                                DISTRIBUTION_STATUS_COLORS[distributionHover.status],
                            }}
                            aria-hidden="true"
                          />
                          {DISTRIBUTION_STATUS_LABELS[distributionHover.status]}
                        </span>
                      </div>
                      <div className={styles.distributionInfoRow}>
                        <span className={styles.distributionInfoLabel}>Bizonyosság</span>
                        <span className={styles.distributionInfoValue}>
                          {distributionHover.confidence == null
                            ? "—"
                            : `${Math.round(distributionHover.confidence * 100)}%`}
                        </span>
                      </div>
                      <div className={styles.distributionInfoRow}>
                        <span className={styles.distributionInfoLabel}>Megjegyzés</span>
                        <span className={styles.distributionInfoValue}>
                          {distributionHover.note?.trim() ? distributionHover.note : "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.distributionInfoHint}>
                      Vidd az egeret egy színes terület fölé a részletekért.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.statPillsBelow}>
              <div className={styles.statPills}>
                {physicalPills.length > 0 && (
                  <div className={styles.statRow}>
                    {physicalPills.map((item) => (
                      <div
                        key={item.label}
                        className={`${styles.statPill} ${item.className ?? ""}`}
                      >
                        <span className={styles.statLabel}>{item.label}</span>
                        <span className={styles.statValue}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {dietPills.length > 0 && (
                  <div className={`${styles.statRow} ${styles.statRowDiet}`}>
                    {dietPills.map((item) => (
                      <div key={item.label} className={styles.statPill}>
                        <span className={styles.statLabel}>{item.label}</span>
                        <span className={styles.statValue}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
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
              </article>

              <article className={styles.paragraphColumn}>
                <div className={styles.reviewable}>
                  <div className={styles.cardHeader}>
                    <p className={styles.sectionLabel}>Paragraph 1</p>
                    {!isPublishMode && (
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
                    )}
                  </div>
                  <p className={styles.paragraphText}>{paragraph1}</p>
                </div>
                {!isPublishMode &&
                  renderEditor(
                    "long",
                    "Edit long paragraphs",
                    "Use blank lines to separate paragraphs."
                  )}
              </article>
            </div>

            <div className={styles.funFactGrid}>
              <article className={`${styles.funFactCard} ${styles.reviewable}`}>
                <div className={styles.cardHeader}>
                  <p className={styles.sectionLabel}>Fun fact</p>
                  {!isPublishMode && (
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
                  )}
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

              <article className={`${styles.funFactCard} ${styles.reviewable}`}>
                <div className={styles.cardHeader}>
                  <p className={styles.sectionLabel}>Ethics tip</p>
                  {!isPublishMode && (
                    <div className={styles.reviewButtons}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() =>
                          beginEditing("ethics_tip", editableContent.ethics_tip)
                        }
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
                  )}
                </div>
                <p className={styles.cardText}>
                  {dossier.ethics_tip ?? "Offer a stewardship reminder."}
                </p>
                {!isPublishMode &&
                  renderEditor(
                    "ethics_tip",
                    "Edit the ethics tip",
                    "Guide readers to protect this species."
                  )}
              </article>
            </div>

            <div className={styles.mediaRow}>
              <div className={styles.flightColumn}>
                <div className={styles.imageFrameLarge}>
                  {flightPreviewUrl ? (
                    <img
                      src={flightPreviewUrl}
                      alt="Scientific flight illustration"
                      className={styles.imageFrameImageContain}
                    />
                  ) : (
                    <div className={styles.imageFramePlaceholder}>
                      <p>Scientific (flight_clean)</p>
                    </div>
                  )}
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

            <article className={styles.paragraphBlock}>
              <p className={styles.sectionLabel}>Paragraph 2</p>
              <p className={styles.paragraphText}>{paragraph2}</p>
            </article>

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
                <div className={styles.imageFrame}>
                  {nestingPreviewUrl ? (
                    <img
                      src={nestingPreviewUrl}
                      alt="Scientific nesting illustration"
                      className={styles.imageFrameImageContain}
                    />
                  ) : (
                    <div className={styles.imageFramePlaceholder}>
                      <p>Scientific (nesting_clean)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {reviewComment && (
              <blockquote className="admin-review-note">
                <p className="admin-subheading">Last review note</p>
                <p className="mt-1 text-sm font-semibold">{reviewComment}</p>
                {reviewRequestedAt && (
                  <p className="text-xs admin-text-muted">
                    Requested on{" "}
                    <time dateTime={reviewRequestedAt} suppressHydrationWarning>
                      {new Date(reviewRequestedAt).toLocaleString("hu-HU", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Europe/Budapest",
                      })}
                    </time>
                  </p>
                )}
              </blockquote>
            )}
          </>
        ) : (
          <div className="admin-panel admin-panel--muted">
            <p className="admin-note-small">
            No dossier found yet. Run the generator (via quick add or the bird
            editor buttons) to seed the review flow.
            </p>
          </div>
        )}
      </Card>

      {!isPublishMode && (
        <>
          <Card
            className="flex flex-wrap items-center justify-between gap-4 text-sm"
            data-ui-section="review-actions"
          >
            <div className="space-y-2" data-ui-section="review-instructions">
              <p className="admin-subheading">Need edits?</p>
              <p className="admin-note-small">
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
                className="w-full justify-center"
              >
                <Icon name="sync" size={16} />
                {regenerating ? "Regenerating…" : "Regenerate draft"}
              </Button>
              <p className="text-xs admin-text-muted">
                Regenerate re-runs the Field-Guide prompt using the identity-locked names and any review note you saved.
              </p>
              <Button
                type="button"
                onClick={handleApprove}
                disabled={approving || isApproved}
                variant="accent"
                className="w-full justify-center"
              >
                <Icon name="accept" size={16} />
                {approving
                  ? "Approving..."
                  : isApproved
                    ? "Dossier approved"
                    : "Accept dossier"}
              </Button>

              {statusMessage && (
                <p className="admin-message admin-message--success" aria-live="polite">
                  {statusMessage}
                </p>
              )}

              {error && (
                <p className="admin-message admin-message--error" aria-live="assertive">
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
        </>
      )}
    </section>
  );
}
