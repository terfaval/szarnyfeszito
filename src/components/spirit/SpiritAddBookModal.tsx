"use client";

import { useMemo, useState } from "react";
import { Plus, X, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SpiritBook, SpiritLibrary, SpiritPill } from "@/lib/spiritSchema";
import type { SpiritDraftResponse, SpiritDraft } from "@/lib/spiritDraftSchema";
import styles from "./SpiritLibraryApp.module.css";

const TRADITION_OPTIONS = [
  { value: "taoizmus", label: "Taoizmus" },
  { value: "buddhizmus", label: "Buddhizmus" },
  { value: "vegyes", label: "Vegyes" },
];

const LEVEL_OPTIONS = [
  { value: "kezdo", label: "Kezdo" },
  { value: "kozep-halado", label: "Kozep-halado" },
  { value: "halado", label: "Halado" },
];

const FORMAT_OPTIONS = [
  { value: "konyv", label: "Konyv" },
  { value: "kommentar", label: "Kommentar" },
  { value: "valogatas", label: "Valogatas" },
  { value: "szutra", label: "Szutra" },
  { value: "essze", label: "Essze" },
];

const LANGUAGE_OPTIONS = [
  { value: "hu", label: "HU" },
  { value: "en", label: "EN" },
  { value: "egyeb", label: "Egyeb" },
];

const STATUS_OPTIONS = [
  { value: "olvasatlan", label: "Olvasatlan" },
  { value: "folyamatban", label: "Folyamatban" },
  { value: "befejezett", label: "Befejezett" },
  { value: "referencia", label: "Referencia" },
];

type DuplicateHit = {
  book: SpiritBook;
  reason: string;
};

type Props = {
  library: SpiritLibrary;
  onOpenBook: (book: SpiritBook) => void;
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "_")
    .toLowerCase();
}

function findDuplicates(library: SpiritLibrary, title: string, author: string): DuplicateHit[] {
  const normalizedTitle = normalize(title);
  const normalizedAuthor = normalize(author);
  const slug = slugify(title);

  const hits: DuplicateHit[] = [];
  library.books.forEach((book) => {
    const bookTitle = normalize(book.title);
    const bookAuthor = normalize(book.author);
    if (bookTitle === normalizedTitle && bookAuthor === normalizedAuthor) {
      hits.push({ book, reason: "exact title + author" });
      return;
    }
    if (book.id === slug) {
      hits.push({ book, reason: "slug match" });
      return;
    }
    if (bookAuthor === normalizedAuthor) {
      if (bookTitle.includes(normalizedTitle) || normalizedTitle.includes(bookTitle)) {
        hits.push({ book, reason: "fuzzy title match" });
      }
    }
  });
  return hits;
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toCsv(value: string[] | undefined) {
  if (!value || value.length === 0) return "";
  return value.join(", ");
}

export default function SpiritAddBookModal({ library, onOpenBook }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "duplicates" | "drafting" | "preview">("input");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateHit[]>([]);
  const [draftResponse, setDraftResponse] = useState<SpiritDraftResponse | null>(null);
  const [draft, setDraft] = useState<SpiritDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const themePills = library.thematic_pills;

  const close = () => {
    setOpen(false);
    setStep("input");
    setTitle("");
    setAuthor("");
    setPublisher("");
    setDuplicates([]);
    setDraftResponse(null);
    setDraft(null);
    setError(null);
    setSaving(false);
  };

  const startDraft = async () => {
    setError(null);
    setStep("drafting");
    try {
      const response = await fetch("/api/admin/spirit/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, publisher: publisher || null }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Draft failed");
      }
      setDraftResponse(payload as SpiritDraftResponse);
      setDraft((payload as SpiritDraftResponse).draft);
      setStep("preview");
    } catch (err) {
      setError((err as Error)?.message ?? "Draft failed");
      setStep("input");
    }
  };

  const onAnalyze = () => {
    const hits = findDuplicates(library, title, author);
    setDuplicates(hits);
    setStep("duplicates");
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/spirit/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Save failed");
      }
      router.refresh();
      close();
    } catch (err) {
      setError((err as Error)?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleTheme = (slug: string) => {
    if (!draft) return;
    const next = draft.themes.includes(slug)
      ? draft.themes.filter((item) => item !== slug)
      : [...draft.themes, slug];
    setDraft({ ...draft, themes: next });
  };

  const content = useMemo(() => {
    if (!open) return null;

    if (step === "drafting") {
      return (
        <div className={styles.addModalBody}>
          <Loader2 className={styles.spinner} />
          <p>External search + AI draft folyamatban...</p>
        </div>
      );
    }

    if (step === "duplicates") {
      return (
        <div className={styles.addModalBody}>
          <h3>Duplikatum ellenorzes</h3>
          {duplicates.length === 0 ? (
            <p>Nincs talalat, mehetsz tovabb.</p>
          ) : (
            <div className={styles.duplicateList}>
              {duplicates.map((hit) => (
                <div key={hit.book.id} className={styles.duplicateCard}>
                  <div>
                    <p className={styles.duplicateTitle}>{hit.book.title}</p>
                    <p className={styles.duplicateMeta}>{hit.book.author}</p>
                    <p className={styles.duplicateMeta}>Ok: {hit.reason}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      onOpenBook(hit.book);
                      close();
                    }}
                  >
                    Meglevo megnyitasa
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.addModalActions}>
            <button type="button" className="btn btn--ghost" onClick={() => setStep("input")}>Vissza</button>
            <button type="button" className="btn btn--primary" onClick={startDraft}>
              Megis uj konyv
            </button>
          </div>
        </div>
      );
    }

    if (step === "preview" && draft) {
      return (
        <div className={styles.addModalBody}>
          <div className={styles.previewGrid}>
            <label className="form-field">
              <span className="form-field__label">Cim</span>
              <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label className="form-field">
              <span className="form-field__label">Szerzo</span>
              <input className="input" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
            </label>
            <label className="form-field">
              <span className="form-field__label">Tradicio</span>
              <select className="input" value={draft.tradition} onChange={(e) => setDraft({ ...draft, tradition: e.target.value })}>
                {TRADITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field__label">Szint</span>
              <select className="input" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}>
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field__label">Nyelv</span>
              <select className="input" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field__label">Formatum</span>
              <select className="input" value={draft.format} onChange={(e) => setDraft({ ...draft, format: e.target.value })}>
                {FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span className="form-field__label">Statusz</span>
              <select className="input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span className="form-field__label">Summary short</span>
            <textarea className="input" rows={2} value={draft.summary_short} onChange={(e) => setDraft({ ...draft, summary_short: e.target.value })} />
          </label>
          <label className="form-field">
            <span className="form-field__label">Summary long</span>
            <textarea className="input" rows={5} value={draft.summary_long} onChange={(e) => setDraft({ ...draft, summary_long: e.target.value })} />
          </label>
          <label className="form-field">
            <span className="form-field__label">Recommendation</span>
            <textarea className="input" rows={3} value={draft.recommendation} onChange={(e) => setDraft({ ...draft, recommendation: e.target.value })} />
          </label>
          <label className="form-field">
            <span className="form-field__label">Cautions</span>
            <textarea className="input" rows={2} value={draft.cautions ?? ""} onChange={(e) => setDraft({ ...draft, cautions: e.target.value })} />
          </label>

          <div className={styles.themePicker}>
            <p className="form-field__label">Tematikus pillek</p>
            <div className={styles.themeGrid}>
              {themePills.map((pill) => {
                const active = draft.themes.includes(pill.slug);
                return (
                  <button
                    key={pill.slug}
                    type="button"
                    className={`${styles.themePill} ${active ? styles.themePillActive : ""}`}
                    onClick={() => toggleTheme(pill.slug)}
                    style={{
                      borderColor: pill.color,
                      color: active ? "#fff" : pill.color,
                      background: active ? pill.color : "rgba(0,0,0,0.06)",
                    }}
                  >
                    {pill.short_label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="form-field">
            <span className="form-field__label">Prerequisites (slug, vesszo)</span>
            <input
              className="input"
              value={toCsv(draft.prerequisites)}
              onChange={(e) => setDraft({ ...draft, prerequisites: parseCsv(e.target.value) })}
            />
          </label>
          <label className="form-field">
            <span className="form-field__label">Related (book id, vesszo)</span>
            <input
              className="input"
              value={toCsv(draft.related)}
              onChange={(e) => setDraft({ ...draft, related: parseCsv(e.target.value) })}
            />
          </label>
          <label className="form-field">
            <span className="form-field__label">Tags (slug, vesszo)</span>
            <input
              className="input"
              value={toCsv(draft.tags)}
              onChange={(e) => setDraft({ ...draft, tags: parseCsv(e.target.value) })}
            />
          </label>

          {draftResponse && (
            <div className={styles.draftMeta}>
              <div>
                <p className="form-field__label">Warnings</p>
                {draftResponse.warnings.length === 0 ? (
                  <p className={styles.metaEmpty}><CheckCircle2 size={16} /> OK</p>
                ) : (
                  <ul className={styles.metaList}>
                    {draftResponse.warnings.map((item) => (
                      <li key={item}><AlertTriangle size={14} /> {item}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="form-field__label">Uncertain fields</p>
                {draftResponse.uncertain_fields.length === 0 ? (
                  <p className={styles.metaEmpty}><CheckCircle2 size={16} /> OK</p>
                ) : (
                  <ul className={styles.metaList}>
                    {draftResponse.uncertain_fields.map((item) => (
                      <li key={item}><AlertTriangle size={14} /> {item}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="form-field__label">Sources</p>
                {draftResponse.sources.length === 0 ? (
                  <p className={styles.metaEmpty}>-</p>
                ) : (
                  <ul className={styles.metaList}>
                    {draftResponse.sources.map((item) => (
                      <li key={`${item.title}-${item.url}`}>{item.title}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {error && <p className="admin-message admin-message--error">{error}</p>}
          <div className={styles.addModalActions}>
            <button type="button" className="btn btn--ghost" onClick={() => setStep("input")}>
              Vissza
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? "Mentes..." : "Ment?s"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.addModalBody}>
        <label className="form-field">
          <span className="form-field__label">Cim</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="form-field">
          <span className="form-field__label">Szerzo</span>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>
        <label className="form-field">
          <span className="form-field__label">Publisher (opcionalis)</span>
          <input className="input" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
        </label>
        {error && <p className="admin-message admin-message--error">{error}</p>}
        <div className={styles.addModalActions}>
          <button type="button" className="btn btn--ghost" onClick={close}>Bez?r</button>
          <button type="button" className="btn btn--primary" onClick={onAnalyze} disabled={!title || !author}>
            Elemzes es draft keszitese
          </button>
        </div>
      </div>
    );
  }, [open, step, title, author, publisher, duplicates, draftResponse, draft, error, saving, themePills]);

  return (
    <>
      <button
        type="button"
        className={styles.addFab}
        aria-label="Uj konyv hozzaadasa"
        onClick={() => setOpen(true)}
      >
        <Plus size={22} />
      </button>

      {open && (
        <div className="admin-overlay-backdrop">
          <div className={`admin-overlay-panel ${styles.addModal}`}>
            <div className={styles.addModalHeader}>
              <div>
                <p className={styles.overlayMeta}>Add Book with AI</p>
                <h2 className={styles.overlayTitle}>Uj konyv</h2>
              </div>
              <button type="button" className="btn btn--ghost" onClick={close}>
                <X size={16} />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
