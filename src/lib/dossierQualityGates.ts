import { normalizeHungarianName } from "@/lib/stringUtils";
import type { Bird } from "@/types/bird";
import type { BirdDossier } from "@/types/dossier";

export const SHORT_OPTION_SENSORY_SUFFIXES = [
  "hangja selymes, mintha a nádas suttog a szélben",
  "sziluettje kisimul a pircspuha fényben, mintha árnyékból emelkedne",
  "mozgását susogó, roppant hullámzik a lombok között",
  "élőhelye nádas peremén rezzen, ahol a víz és az avar találkozik",
];

const AXIS_KEYWORD_MAP: Record<string, string[]> = {
  morphology: ["sziluett", "alak", "kontúr", "vonala", "testvonal"],
  plumage: ["tollazat", "toll", "mintázat", "rajzolat", "színkombináció"],
  beak: ["csőr", "csőre", "csőrforma", "lábszár", "láb"],
  sound: ["hang", "dal", "csicsergés", "kiáltás", "fütty"],
  movement: ["repülés", "szárny", "mozgás", "szökken", "suhanás"],
  habitat: ["élőhely", "nádas", "erdő", "mező", "part", "tó", "folyó", "vizes"],
  behavior: ["viselkedés", "szokás", "táplálkozás", "territórium", "őrködik", "vonulás"],
};

const GENERIC_SUMMARY_PATTERNS = ["különleges madár", "lenyűgöző faj"];
const LONG_PARAGRAPH_BLOCKLIST = [
  "a helyiek szerint",
  "gyakran nevezik",
  "úgy tartják",
  "a legendák szerint",
  "nem kevesen mondják",
  "rekord",
  "világrekord",
  "legtöbb",
  "leggyorsab",
];

type StructuredRangeField = "size_cm" | "wingspan_cm" | "lifespan_years";

const STRUCTURED_CAPS: Record<StructuredRangeField, { max: number; min: number; minSpread: number }> = {
  size_cm: { min: 10, max: 250, minSpread: 2 },
  wingspan_cm: { min: 10, max: 420, minSpread: 2 },
  lifespan_years: { min: 1, max: 80, minSpread: 2 },
};

export class QualityGateError extends Error {
  constructor(public readonly issues: string[]) {
    super("Quality gate failed");
  }
}

const axisKeywords = Object.entries(AXIS_KEYWORD_MAP).map(([axis, keywords]) => ({
  axis,
  keywords,
}));

const normalizeText = (value: string) => value.toLowerCase().replace(/\s+/g, " ");

const findAxes = (value: string) => {
  const normalized = normalizeText(value);
  return axisKeywords
    .filter(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(({ axis }) => axis);
};

const containsSensorySuffix = (text: string) => {
  const normalized = normalizeText(text);
  return SHORT_OPTION_SENSORY_SUFFIXES.some((suffix) =>
    normalized.includes(suffix.toLowerCase().slice(0, 24))
  );
};

export function buildQualityGateHint(error: QualityGateError) {
  return [
    "Quality gate failure: the dossier matched schema but violated the post-parse rules below.",
    ...error.issues.map((issue) => `- ${issue}`),
    "Reply with the same JSON shape, obey the identity lock, and improve the highlighted sections.",
  ].join("\n");
}

export function runQualityGates(dossier: BirdDossier, bird: Bird) {
  const issues: string[] = [];
  const canonicalHungarianName = normalizeHungarianName(bird.name_hu);
  if (dossier.header.name_hu !== canonicalHungarianName) {
    issues.push(
      `Gate A: header.name_hu must equal the normalized input name ("${canonicalHungarianName}").`
    );
  }

  const expectedLatin = (bird.name_latin ?? "").trim();
  if (dossier.header.name_latin !== expectedLatin) {
    issues.push(`Gate A: header.name_latin must equal the provided Latin name ("${expectedLatin}").`);
  }

  // Gate B — short_options integrity
  const shortOptions = dossier.short_options;
  const heads = new Set<string>();
  const axisPerOption: string[][] = [];

  shortOptions.forEach((option, index) => {
    const trimmed = option.trim();
    const lower = normalizeText(trimmed);
    const head = lower.slice(0, 15);
    if (trimmed.length < 90 || trimmed.length > 170) {
      issues.push(
        `Gate B: short_options[${index}] must be 90-170 characters; got ${trimmed.length}.`
      );
    }
    if (!/[.!?]$/.test(trimmed)) {
      issues.push(`Gate B: short_options[${index}] must be a complete sentence ending in punctuation.`);
    }
    if (/(mint|mintha|amely|és|hogy)$/i.test(trimmed)) {
      issues.push(`Gate B: short_options[${index}] must not end with a trailing conjunction.`);
    }
    if (containsSensorySuffix(trimmed)) {
      issues.push(
        `Gate B: short_options[${index}] must not be dominated by sensory suffix templates (${SHORT_OPTION_SENSORY_SUFFIXES.join(
          " / "
        )}).`
      );
    }
    heads.add(head);
    const axes = findAxes(trimmed);
    axisPerOption.push(axes);
  });

  if (heads.size !== shortOptions.length) {
    issues.push("Gate B: short_options must not start with the same 12-15 characters.");
  }

  const axisUnion = new Set(axisPerOption.flat());
  if (axisUnion.size < 2) {
    issues.push(
      "Gate B: short_options must cover at least two different axes across the three sentences."
    );
  }

  // Gate C — short_summary
  const summaryRaw = dossier.header.short_summary.trim();
  const summary = normalizeText(summaryRaw);
  const sentenceEnds = summaryRaw.match(/[.!?]/g) ?? [];
  if (sentenceEnds.length === 0 || sentenceEnds.length > 2) {
    issues.push("Gate C: short_summary must be 1–2 sentences (roughly: max 2 of .!?).");
  }
  const concreteHints = [
    "hang",
    "nyak",
    "szárny",
    "csőr",
    "toll",
    "sziluett",
    "nádas",
    "vonul",
    "part",
    "erdő",
    "mocsár",
    "repül",
  ];
  const hasConcreteHint = concreteHints.some((hint) => summary.includes(hint));
  if (GENERIC_SUMMARY_PATTERNS.some((pattern) => summary.includes(pattern)) && !hasConcreteHint) {
    issues.push("Gate C: avoid generic phrases unless paired with a concrete observable detail.");
  }

  // Gate D — long_paragraphs tone safety
  dossier.long_paragraphs.forEach((paragraph, index) => {
    const normalized = normalizeText(paragraph);
    if (/\d/.test(paragraph)) {
      issues.push(`Gate D: long_paragraphs[${index}] must avoid invented digits or measurements.`);
    }
    if (LONG_PARAGRAPH_BLOCKLIST.some((phrase) => normalized.includes(phrase))) {
      issues.push(`Gate D: long_paragraphs[${index}] must avoid hearsay/record phrases.`);
    }
  });

  // Gate E — identification usefulness
  const titles = dossier.identification.key_features.map((feature) => feature.title.toLowerCase());
  if (new Set(titles).size !== titles.length) {
    issues.push("Gate E: identification.key_features titles must be unique (case insensitive).");
  }
  const identificationAxes = new Set<string>();
  dossier.identification.key_features.forEach((feature) => {
    const title = feature.title;
    const descriptionRaw = feature.description.trim();
    const description = normalizeText(descriptionRaw);
    if (descriptionRaw.length < 40) {
      issues.push(
        `Gate E: identification.key_features description for "${title}" must be at least 40 characters (got ${descriptionRaw.length}).`
      );
    }
    const genericPhrases = ["könnyen felismerhető", "jellegzetes", "különösen"];
    const genericHits = genericPhrases.filter((phrase) => description.includes(phrase)).length;
    if (genericHits >= 2 || (genericHits >= 1 && descriptionRaw.length < 70)) {
      issues.push(
        `Gate E: identification.key_features description for "${title}" reads generic; add concrete field cues.`
      );
    }
    const axis =
      "axis" in feature && typeof feature.axis === "string"
        ? feature.axis
        : normalizeText(title) === "csőr"
          ? "csor"
          : normalizeText(title) === "tollazat"
            ? "tollazat"
            : normalizeText(title) === "hang"
              ? "hang"
              : normalizeText(title) === "mozgás"
                ? "mozgas"
                : title;
    identificationAxes.add(axis);
  });
  if (identificationAxes.size < 3) {
    issues.push("Gate E: identification must cover at least three different axes.");
  }

  // Gate F — structured sanity
  (Object.entries(STRUCTURED_CAPS) as Array<
    [StructuredRangeField, { max: number; min: number; minSpread: number }]
  >).forEach(([field, { min, max, minSpread }]) => {
    const value = dossier.pill_meta[field];
    if (!value) return;
    const { min: minValue, max: maxValue } = value as { min: number | null; max: number | null };
    const path = `pill_meta.${field}`;
    if (typeof minValue === "number" && typeof maxValue === "number") {
      if (maxValue < minValue) {
        issues.push(`Gate F: ${path} has max < min (${maxValue} < ${minValue}).`);
      }
      if (maxValue - minValue < minSpread) {
        issues.push(`Gate F: ${path} range is too narrow (${maxValue} - ${minValue} < ${minSpread}).`);
      }
    }
    if (typeof minValue === "number" && minValue < min) {
      issues.push(`Gate F: ${path} min (${minValue}) is below conservative lower bound (${min}).`);
    }
    if (typeof maxValue === "number" && maxValue > max) {
      issues.push(`Gate F: ${path} max (${maxValue}) exceeds upper limit (${max}).`);
    }
  });

  if (issues.length) {
    throw new QualityGateError(issues);
  }
}
