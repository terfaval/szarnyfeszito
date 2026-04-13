# Dashboard Map Hover + Floating Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard map hover modal with a minimal tooltip and a floating, vertically centered click panel that shows icon+name bird rows.

**Architecture:** Add a tiny pure helper to determine which side the floating panel should appear on, pass click metadata from Leaflet to the dashboard map container, and update the dashboard component + CSS for new tooltip and panel styles.

**Tech Stack:** Next.js (React), TypeScript, Leaflet/React-Leaflet, CSS Modules, Vitest.

---

## File Structure
- Create: `src/lib/mapPanelSide.ts`
- Create: `src/lib/__tests__/mapPanelSide.test.ts`
- Modify: `src/components/maps/PlacesRegionVisualization.tsx`
- Modify: `src/components/maps/PlacesMap.leaflet.tsx`
- Modify: `src/components/admin/DashboardPlacesMap.tsx`
- Modify: `src/components/admin/DashboardPlacesMap.module.css`

---

### Task 1: Add Panel Side Helper + Tests

**Files:**
- Create: `src/lib/mapPanelSide.ts`
- Create: `src/lib/__tests__/mapPanelSide.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { resolvePanelSide } from "../mapPanelSide";

describe("resolvePanelSide", () => {
  it("returns right when click is on left half", () => {
    expect(resolvePanelSide({ containerX: 120, containerWidth: 600 })).toBe("right");
  });

  it("returns left when click is on right half", () => {
    expect(resolvePanelSide({ containerX: 420, containerWidth: 600 })).toBe("left");
  });

  it("falls back to default when width is invalid", () => {
    expect(resolvePanelSide({ containerX: 10, containerWidth: 0, defaultSide: "left" })).toBe("left");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- mapPanelSide`
Expected: FAIL with module not found or missing export.

- [ ] **Step 3: Write minimal implementation**

```ts
export type PanelSide = "left" | "right";

type PanelSideArgs = {
  containerX: number;
  containerWidth: number;
  defaultSide?: PanelSide;
};

export function resolvePanelSide({ containerX, containerWidth, defaultSide = "right" }: PanelSideArgs): PanelSide {
  if (!Number.isFinite(containerX) || !Number.isFinite(containerWidth) || containerWidth <= 0) {
    return defaultSide;
  }
  return containerX < containerWidth / 2 ? "right" : "left";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- mapPanelSide`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mapPanelSide.ts src/lib/__tests__/mapPanelSide.test.ts
git commit -m "test: add panel side helper" 
```

---

### Task 2: Pass Click Metadata From Leaflet

**Files:**
- Modify: `src/components/maps/PlacesRegionVisualization.tsx`
- Modify: `src/components/maps/PlacesMap.leaflet.tsx`

- [ ] **Step 1: Write the failing test (type-level)**

Add a small type check in `src/components/maps/PlacesMap.leaflet.tsx` after the props type, then remove it after implementation:

```ts
// TEMP type check: onSelect must accept meta
const __placesMapOnSelectTypeCheck: PlacesMapProps["onSelect"] = (slug, meta) => {
  void slug;
  void meta?.containerPoint;
  void meta?.mapSize;
};
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run: `npx tsc --noEmit`
Expected: FAIL because `meta` type does not exist yet.

- [ ] **Step 3: Update types and handlers to pass meta**

In `src/components/maps/PlacesRegionVisualization.tsx`, update the handler types and pass the Leaflet event:

```ts
import type { LeafletMouseEvent } from "leaflet";

export type RegionEventHandlers = {
  onClick?: (regionId: string, event: LeafletMouseEvent) => void;
  onMouseOver?: (regionId: string) => void;
  onMouseOut?: (regionId: string) => void;
};

const attachRegionEvents = (feature: Feature, layer: Layer) => {
  if (!regionEventHandlers) return;
  const regionId = resolveRegionId(feature);
  if (!regionId) return;
  if (regionEventHandlers.onClick) {
    layer.on("click", (event) => regionEventHandlers.onClick?.(regionId, event));
  }
  if (regionEventHandlers.onMouseOver) {
    layer.on("mouseover", () => regionEventHandlers.onMouseOver?.(regionId));
  }
  if (regionEventHandlers.onMouseOut) {
    layer.on("mouseout", () => regionEventHandlers.onMouseOut?.(regionId));
  }
};
```

In `src/components/maps/PlacesMap.leaflet.tsx`, extend `onSelect` to accept meta and pass `containerPoint` + map size:

```ts
import type { LeafletMouseEvent } from "leaflet";

export type PlaceSelectMeta = {
  containerPoint: { x: number; y: number };
  mapSize: { x: number; y: number };
  origin: "marker" | "region";
};

export type PlacesMapProps = {
  // ...
  onSelect?: (slug: string, meta?: PlaceSelectMeta) => void;
  // ...
};

const buildSelectMeta = (event: LeafletMouseEvent, origin: PlaceSelectMeta["origin"]): PlaceSelectMeta | undefined => {
  const map = mapRef.current;
  if (!map) return undefined;
  const size = map.getSize();
  return {
    containerPoint: event.containerPoint,
    mapSize: { x: size.x, y: size.y },
    origin,
  };
};

const handleRegionClick = useCallback(
  (regionId: string, event: LeafletMouseEvent) => {
    const slug = resolveSlugForRegion(regionId);
    if (!slug) return;
    onSelect?.(slug, buildSelectMeta(event, "region"));
  },
  [onSelect, resolveSlugForRegion]
);

// In marker click handler:
click: (event) => {
  handlers?.click?.(event);
  onSelect?.(marker.slug, buildSelectMeta(event, "marker"));
},
```

Remove the TEMP type check from Step 1 after updating types.

- [ ] **Step 4: Run typecheck to verify it passes**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/maps/PlacesRegionVisualization.tsx src/components/maps/PlacesMap.leaflet.tsx
git commit -m "feat: pass map click meta to dashboard" 
```

---

### Task 3: Update Dashboard Map Interaction + Tooltip

**Files:**
- Modify: `src/components/admin/DashboardPlacesMap.tsx`

- [ ] **Step 1: Update dashboard state + fetch behavior**

Update `DashboardPlacesMap.tsx`:

```ts
import { resolvePanelSide, type PanelSide } from "@/lib/mapPanelSide";

const [panelSide, setPanelSide] = useState<PanelSide>("right");

const activeSlug = pinnedSlug ?? hoveredSlug;
const shouldFetchDetail = Boolean(pinnedSlug);

useEffect(() => {
  if (!pinnedSlug) return;
  // existing fetch logic, keyed to pinnedSlug only
}, [detailApiBasePath, pinnedSlug]);

const activeDetail =
  detail && filteredActiveSlug && detail.place?.slug === filteredActiveSlug ? detail : null;
```

Update `onSelect` to compute side:

```ts
onSelect={(slug, meta) => {
  setPinnedSlug((prev) => (prev === slug ? null : slug));
  if (meta) {
    setPanelSide(resolvePanelSide({
      containerX: meta.containerPoint.x,
      containerWidth: meta.mapSize.x,
    }));
  }
}}
```

- [ ] **Step 2: Replace tooltip content with minimal info**

In the tooltip render, show name + region only, no sections or birds:

```tsx
const tooltipName = activeDetail?.place?.name ?? marker.name;
const tooltipRegion =
  activeDetail?.place?.county ?? activeDetail?.place?.nearest_city ?? "";

<p className={styles.tooltipName}>{tooltipName}</p>
{tooltipRegion ? <p className={styles.tooltipMeta}>{tooltipRegion}</p> : null}
```

- [ ] **Step 3: Run tests**

Run: `npm run test -- mapPanelSide`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/DashboardPlacesMap.tsx
git commit -m "feat: simplify hover tooltip and pin-only fetch" 
```

---

### Task 4: Floating Panel Content + Bird Rows

**Files:**
- Modify: `src/components/admin/DashboardPlacesMap.tsx`

- [ ] **Step 1: Add floating panel backdrop for outside click**

```tsx
{panelOpen && filteredActiveSlug ? (
  <>
    <button
      type="button"
      className={styles.floatingPanelBackdrop}
      onClick={() => setPinnedSlug(null)}
      aria-label="Bezárás"
    />
    <div
      className={`${styles.floatingPanel} ${panelSide === "left" ? styles.floatingPanelLeft : styles.floatingPanelRight}`}
      role="dialog"
      aria-modal="false"
      aria-label="Helyszín részletek"
    >
      <header className={styles.detailHeader}>...</header>
      <div className={styles.detailBody}>...</div>
    </div>
  </>
) : null}
```

- [ ] **Step 2: Update floating panel markup**

Replace the full-screen overlay with a floating panel container:

```tsx
{panelOpen && filteredActiveSlug ? (
  <div
    className={`${styles.floatingPanel} ${panelSide === "left" ? styles.floatingPanelLeft : styles.floatingPanelRight}`}
    role="dialog"
    aria-modal="false"
    aria-label="Helyszín részletek"
  >
    <header className={styles.detailHeader}>...</header>
    <div className={styles.detailBody}>...</div>
  </div>
) : null}
```

- [ ] **Step 3: Update bird list rows to icon + name**

```tsx
<div className={styles.detailBirdList}>
  {detail.birds.slice(0, 6).map((bird) => (
    <Link key={bird.id} className={styles.detailBirdRow} href={joinHref(...)}>
      {bird.iconic_src ? (
        <img src={bird.iconic_src} alt="" className={styles.detailBirdIcon} />
      ) : (
        <span className={styles.detailBirdFallback}>{bird.name_hu.slice(0, 1)}</span>
      )}
      <span className={styles.detailBirdText}>
        <span className={styles.detailBirdName}>{bird.name_hu}</span>
        <span className={styles.detailBirdMeta}>#{bird.rank} · {bird.frequency_band}</span>
      </span>
    </Link>
  ))}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/DashboardPlacesMap.tsx
git commit -m "feat: floating panel bird list with icons" 
```

---

### Task 5: CSS For Tooltip + Floating Panel

**Files:**
- Modify: `src/components/admin/DashboardPlacesMap.module.css`

- [ ] **Step 1: Add floating panel positioning + sizing**

```css
.floatingPanel {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: min(40vw, 520px);
  max-height: 85vh;
  overflow: auto;
  border-radius: 0;
  background: var(--panel-2);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  pointer-events: auto;
}

.floatingPanelLeft { left: clamp(16px, 3vw, 32px); }
.floatingPanelRight { right: clamp(16px, 3vw, 32px); }
```

- [ ] **Step 2: Add backdrop style**

```css
.floatingPanelBackdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: transparent;
  pointer-events: auto;
}
```

- [ ] **Step 3: Simplify tooltip styles**

```css
.tooltipCard {
  width: 220px;
  padding: 10px 12px;
  border-radius: 12px;
}

.tooltipMeta {
  margin-top: 4px;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
```

- [ ] **Step 4: Bird row styles**

```css
.detailBirdList { display: grid; gap: 10px; }
.detailBirdRow {
  display: grid;
  grid-template-columns: 36px 1fr;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  text-decoration: none;
  color: var(--foreground);
  background: rgba(var(--brand-ink-rgb), 0.04);
}
.detailBirdRow:hover { background: rgba(var(--brand-ink-rgb), 0.08); }
.detailBirdIcon { width: 32px; height: 32px; border-radius: 999px; object-fit: cover; }
.detailBirdFallback {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(var(--brand-ink-rgb), 0.1);
}
.detailBirdName { font-weight: 600; }
.detailBirdMeta { font-size: 0.72rem; color: var(--muted); }
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/DashboardPlacesMap.module.css
git commit -m "style: floating panel and compact tooltip" 
```

---

### Task 6: Manual Smoke

**Files:**
- No code changes.

- [ ] **Step 1: Run dev server**

Run: `npm run dev`
Expected: Server starts without errors.

- [ ] **Step 2: Smoke test**

Check in browser:
- Hover only shows name + region, no detailed content.
- Click opens floating panel on opposite side of click, centered vertically.
- Bird list shows icon + name, with fallback initial.
- Escape and close actions clear the panel.

---

## Self-Review
- Spec coverage: hover minimal, click floating panel, opposite side, centered; bird icons + name; no full-height; no hover fetch. Covered in Tasks 3–5.
- Placeholder scan: none.
- Type consistency: `PlaceSelectMeta` and `PanelSide` used consistently across Tasks 2–4.
