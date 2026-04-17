# Public Place Hero Title Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/public/places/[slug]`, render the place title + subtitle centered on the hero cover image, and make the hero image less tall (cropping allowed).

**Architecture:** Implement a dedicated hero overlay layer inside `PlacePublishPreview` when `layoutVariant="public_place_v1"`, styled via CSS module. Keep existing non-public preview unchanged.

**Tech Stack:** Next.js (app router), React, CSS Modules.

---

## File Map (Write Set)

**Modify:**
- `src/components/admin/PlacePublishPreview.tsx`
- `src/components/admin/PlacePublishPreview.module.css`

**No new runtime dependencies.**

---

### Task 1: Add Public Hero Overlay Markup

**Files:**
- Modify: `src/components/admin/PlacePublishPreview.tsx`

- [ ] **Step 1: Add a `publicHeroOverlay` block inside the hero frame**

Locate the hero image render:

```tsx
{heroImageUrl ? (
  <div className={styles.heroImageFrame} aria-label="Approved hero image">
    <img src={heroImageUrl} alt="" className={styles.heroImage} />
    ...
  </div>
) : null}
```

Change it so that when `isPublicPlace` is true, we also render an overlay that contains:
- title: `place.name || place.slug || "Untitled place"`
- subtitle: `variants?.teaser` if non-empty

Concrete patch shape:

```tsx
{heroImageUrl ? (
  <div className={styles.heroImageFrame} aria-label="Approved hero image">
    <img src={heroImageUrl} alt="" className={styles.heroImage} />
    {isPublicPlace ? (
      <div className={styles.publicHeroOverlay} aria-label="Title overlay">
        <div className={styles.publicHeroOverlayInner}>
          <h1 className={styles.publicHeroTitle}>{place.name || place.slug || "Untitled place"}</h1>
          {variants && nonEmpty(variants.teaser) ? (
            <p className={styles.publicHeroSubtitle}>{variants.teaser}</p>
          ) : null}
        </div>
      </div>
    ) : null}
    {isPublicPlace ? (
      <div className={styles.heroTopRight} aria-label="Habitat thumbnail">
        <div className={styles.habitatThumb} aria-label="Habitat tile">
          {habitatSrc ? <img src={habitatSrc} alt="" className={styles.habitatThumbImage} /> : null}
        </div>
      </div>
    ) : null}
  </div>
) : null}
```

Notes:
- Keep the existing habitat thumb in the top-right.
- Use `h1` for the public page title (it’s a full page).

- [ ] **Step 2: Avoid duplicated title/subtitle below the hero on public pages**

In the `<header className={styles.placeHeader}>` block, conditionally skip rendering the public title + teaser when `isPublicPlace` is true, because it’s now on the hero.

Concrete intent:
- For public pages:
  - keep the header container for spacing if needed
  - do **not** render `placeName` + `teaser` there
  - keep the “habitat thumb row when no hero image” path as-is (should be rare)

Minimal change example:

```tsx
<header className={styles.placeHeader}>
  {!isPublicPlace ? (
    <>
      <p className={styles.placeMetaLine}>...</p>
      <h3 className={styles.placeName}>...</h3>
      {variants && nonEmpty(variants.teaser) ? <p className={styles.teaser}>{variants.teaser}</p> : null}
    </>
  ) : (
    isPublicPlace && !heroImageUrl ? (
      <div className={styles.headerThumbRow} aria-label="Habitat thumbnail">...</div>
    ) : null
  )}
</header>
```

- [ ] **Step 3: Smoke-check in dev**

Run: `npm run dev`

Navigate: `/public/places/<some-slug>`

Expected:
- Title/subtitle appear centered on the hero image.
- No duplicated title/subtitle below.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: center public place title on hero cover"
```

---

### Task 2: Make Hero Less Tall + Typography Scaling

**Files:**
- Modify: `src/components/admin/PlacePublishPreview.module.css`

- [ ] **Step 1: Reduce hero height for public pages only**

Currently `.heroImageFrame` sets:

```css
height: min(86vh, 760px);
```

Change to:
- Keep default (non-public) the same
- Add a modifier class for public to reduce height, e.g. `min(52vh, 420px)`

Concrete patch:

```css
.heroImageFrame {
  ...
  height: min(86vh, 760px);
  ...
}

.publicHeroImageFrame {
  height: min(52vh, 420px);
}
```

Then in JSX, apply it:

```tsx
<div className={[styles.heroImageFrame, isPublicPlace ? styles.publicHeroImageFrame : ""].filter(Boolean).join(" ")} ...>
```

- [ ] **Step 2: Add centered overlay styles with legibility scrim**

Add new classes:

```css
.publicHeroOverlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: clamp(1rem, 4vw, 2.5rem);
  z-index: 1;
  pointer-events: none;
}

.publicHeroOverlayInner {
  width: min(920px, 100%);
  text-align: center;
  color: var(--brand-paper);
  text-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}

.publicHeroOverlay::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(closest-side at 50% 50%, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0) 72%);
  z-index: -1;
}

.publicHeroTitle {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 0.98;
  font-size: clamp(2.2rem, 5.8vw, 4rem);
  margin: 0;
}

.publicHeroSubtitle {
  margin: 0.75rem auto 0;
  max-width: 56ch;
  font-size: clamp(1.05rem, 2.2vw, 1.4rem);
  line-height: 1.35;
  opacity: 0.92;
}
```

- [ ] **Step 3: Ensure overlay sits above image but below habitat thumb**

If needed, increase `.heroTopRight { z-index: 2; }` (already `2`).
Overlay uses `z-index: 1`, so it stays below the top-right thumb.

- [ ] **Step 4: Smoke-check in dev**

Run: `npm run dev`

Expected:
- Hero is shorter on public place detail.
- Title is clearly larger than prior “placeName” header and visually matches/exceeds other large headings on the page.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style: public place hero overlay and shorter cover"
```

---

## Plan Self-Review Checklist
- Covers spec: overlay on-image, centered; shorter hero; bigger title.
- No placeholder/TBD sections.
- Touches only the intended files and scopes to `public_place_v1`.

