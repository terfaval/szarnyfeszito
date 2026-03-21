"use client";

import { useMemo, useState, useEffect } from "react";
import type { SpiritBook, SpiritLibrary, SpiritPill } from "@/lib/spiritSchema";
import styles from "./SpiritLibraryApp.module.css";

type Props = {
  library: SpiritLibrary;
};

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

const STATUS_OPTIONS = [
  { value: "olvasatlan", label: "Olvasatlan" },
  { value: "folyamatban", label: "Folyamatban" },
  { value: "befejezett", label: "Befejezett" },
  { value: "referencia", label: "Referencia" },
];

const LANGUAGE_OPTIONS = [
  { value: "hu", label: "HU" },
  { value: "en", label: "EN" },
  { value: "egyeb", label: "Egyeb" },
];

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function matchesSearch(book: SpiritBook, query: string) {
  if (!query) {
    return true;
  }
  const haystack = [
    book.title,
    book.author,
    book.summary_short,
    book.summary_long ?? "",
    ...(book.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function getThemeLabel(themes: SpiritPill[], slug: string) {
  return themes.find((theme) => theme.slug === slug)?.label ?? slug;
}

function deriveRelatedBooks(book: SpiritBook, books: SpiritBook[]) {
  if (book.related && book.related.length > 0) {
    return book.related
      .map((id) => books.find((candidate) => candidate.id === id))
      .filter((candidate): candidate is SpiritBook => Boolean(candidate));
  }

  const overlaps = books
    .filter((candidate) => candidate.id !== book.id)
    .filter((candidate) => candidate.tradition === book.tradition)
    .map((candidate) => {
      const shared = candidate.themes.filter((theme) => book.themes.includes(theme)).length;
      return { candidate, shared };
    })
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, 5)
    .map((entry) => entry.candidate);

  return overlaps;
}

export default function SpiritLibraryApp({ library }: Props) {
  const [selectedBook, setSelectedBook] = useState<SpiritBook | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tradition, setTradition] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [language, setLanguage] = useState<string>("");
  const [format, setFormat] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [themes, setThemes] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedBook) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedBook]);

  const themePills = library.thematic_pills;

  const filteredBooks = useMemo(() => {
    const query = normalizeText(searchQuery);
    return library.books.filter((book) => {
      if (tradition && book.tradition !== tradition) return false;
      if (level && book.level !== level) return false;
      if (language && book.language !== language) return false;
      if (format && book.format !== format) return false;
      if (status && book.status !== status) return false;
      if (themes.length > 0 && !themes.some((theme) => book.themes.includes(theme))) return false;
      return matchesSearch(book, query);
    });
  }, [library.books, tradition, level, language, format, status, themes, searchQuery]);

  const relatedBooks = useMemo(() => {
    if (!selectedBook) return [];
    return deriveRelatedBooks(selectedBook, library.books);
  }, [selectedBook, library.books]);

  const clearFilters = () => {
    setTradition("");
    setLevel("");
    setLanguage("");
    setFormat("");
    setStatus("");
    setThemes([]);
    setSearchQuery("");
  };

  const toggleTheme = (slug: string) => {
    setThemes((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
    );
  };

  return (
    <section className="admin-stack">
      <div className={`admin-card ${styles.hero}`}>
        <div>
          <p className="admin-heading__label">Spirit Library</p>
          <h1 className="admin-heading__title admin-heading__title--large">
            Konyvtar app
          </h1>
          <p className="admin-heading__description">
            Szures, bongeszes es konyvkartyak egyetlen JSON adatforrasbol.
          </p>
        </div>
        <div className={styles.heroMeta}>
          <div>
            <p className={styles.heroMetaLabel}>Verzio</p>
            <p className={styles.heroMetaValue}>{library.library_version}</p>
          </div>
          <div>
            <p className={styles.heroMetaLabel}>Konyvek</p>
            <p className={styles.heroMetaValue}>{library.books.length}</p>
          </div>
          <div>
            <p className={styles.heroMetaLabel}>Pillek</p>
            <p className={styles.heroMetaValue}>{library.thematic_pills.length}</p>
          </div>
        </div>
      </div>

      <div className={`admin-card ${styles.filtersCard}`}>
        <div className={styles.filtersHeader}>
          <h2 className="admin-heading__title">Szurok es kereses</h2>
          <button type="button" className="btn btn--ghost" onClick={clearFilters}>
            Szurok torlese
          </button>
        </div>

        <div className={styles.searchRow}>
          <input
            className="input"
            type="search"
            placeholder="Kereses cim, szerzo vagy kulcsszavak alapjan"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className={styles.filterGrid}>
          <label className="form-field">
            <span className="form-field__label">Tradicio</span>
            <select className="input" value={tradition} onChange={(event) => setTradition(event.target.value)}>
              <option value="">Mind</option>
              {TRADITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-field__label">Szint</span>
            <select className="input" value={level} onChange={(event) => setLevel(event.target.value)}>
              <option value="">Mind</option>
              {LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-field__label">Nyelv</span>
            <select className="input" value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="">Mind</option>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-field__label">Formatum</span>
            <select className="input" value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="">Mind</option>
              {FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span className="form-field__label">Statusz</span>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Mind</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.themeGrid}>
          {themePills.map((pill) => (
            <button
              key={pill.slug}
              type="button"
              className={`${styles.themePill} ${themes.includes(pill.slug) ? styles.themePillActive : ""}`}
              onClick={() => toggleTheme(pill.slug)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.resultsRow}>
        <p className="admin-text-muted">
          {filteredBooks.length} talalat
        </p>
      </div>

      <div className={styles.grid}>
        {filteredBooks.map((book) => (
          <button
            key={book.id}
            type="button"
            className={`${styles.card} admin-card`}
            onClick={() => setSelectedBook(book)}
          >
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>{book.title}</h3>
                <p className={styles.cardAuthor}>{book.author}</p>
              </div>
              <span className={styles.levelBadge}>{book.level}</span>
            </div>
            <p className={styles.cardSummary}>{book.summary_short}</p>
            <div className={styles.cardThemes}>
              {book.themes.slice(0, 5).map((theme) => (
                <span key={theme} className={styles.themeTag}>
                  {getThemeLabel(themePills, theme)}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {selectedBook && (
        <div className="admin-overlay-backdrop">
          <div className={`admin-overlay-panel ${styles.overlay}`}>
            <div className={styles.overlayHeader}>
              <div>
                <p className={styles.overlayMeta}>{selectedBook.author}</p>
                <h2 className={styles.overlayTitle}>{selectedBook.title}</h2>
              </div>
              <button type="button" className="btn btn--ghost" onClick={() => setSelectedBook(null)}>
                Bezárás
              </button>
            </div>

            <div className={styles.overlayBadges}>
              <span className={styles.overlayBadge}>{selectedBook.tradition}</span>
              <span className={styles.overlayBadge}>{selectedBook.level}</span>
              <span className={styles.overlayBadge}>{selectedBook.language}</span>
              <span className={styles.overlayBadge}>{selectedBook.format}</span>
              <span className={styles.overlayBadge}>{selectedBook.status}</span>
            </div>

            <div className={styles.overlaySection}>
              <h3>Ajánlás</h3>
              <p>{selectedBook.recommendation}</p>
            </div>

            {selectedBook.summary_long && (
              <div className={styles.overlaySection}>
                <h3>Részletesebb leírás</h3>
                <p>{selectedBook.summary_long}</p>
              </div>
            )}

            {selectedBook.prerequisites && selectedBook.prerequisites.length > 0 && (
              <div className={styles.overlaySection}>
                <h3>Előfeltételek</h3>
                <div className={styles.inlineList}>
                  {selectedBook.prerequisites.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedBook.cautions && (
              <div className={styles.overlaySection}>
                <h3>Figyelmeztetés</h3>
                <p>{selectedBook.cautions}</p>
              </div>
            )}

            {selectedBook.tags && selectedBook.tags.length > 0 && (
              <div className={styles.overlaySection}>
                <h3>Tag-ek</h3>
                <div className={styles.inlineList}>
                  {selectedBook.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedBook.notes && (
              <div className={styles.overlaySection}>
                <h3>Megjegyzés</h3>
                <p>{selectedBook.notes}</p>
              </div>
            )}

            {selectedBook.year && (
              <div className={styles.overlaySection}>
                <h3>Kiadás éve</h3>
                <p>{selectedBook.year}</p>
              </div>
            )}

            <div className={styles.overlaySection}>
              <h3>Temak</h3>
              <div className={styles.cardThemes}>
                {selectedBook.themes.map((theme) => (
                  <span key={theme} className={styles.themeTag}>
                    {getThemeLabel(themePills, theme)}
                  </span>
                ))}
              </div>
            </div>

            {relatedBooks.length > 0 && (
              <div className={styles.overlaySection}>
                <h3>Kapcsolodo konyvek</h3>
                <div className={styles.relatedGrid}>
                  {relatedBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      className={styles.relatedCard}
                      onClick={() => setSelectedBook(book)}
                    >
                      <strong>{book.title}</strong>
                      <span>{book.author}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
