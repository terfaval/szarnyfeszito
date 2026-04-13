# Dashboard Map Panel Refinements v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the dashboard floating panel UI (X-only close, header meta line, bird list with HU+Latin names and habitat backgrounds), add map-click close, and extend public/admin place detail payloads with Latin names and place habitat tile.

**Architecture:** Extend the two dashboard detail API routes to include `name_latin`, `iconic_src`, and `place.habitat_src` computed from place type. Update the dashboard map UI to use the new fields, swap bird rows to BirdIcon with place habitat background, and wire a map-level click handler to close the panel without blocking background interactions.

**Tech Stack:** Next.js (React), TypeScript, Leaflet/React-Leaflet, CSS Modules, Vitest.

---

## File Structure
- Create: `src/lib/placePanelMeta.ts`
- Create: `src/lib/__tests__/placePanelMeta.test.ts`
- Modify: `src/components/maps/PlacesMap.leaflet.tsx`
- Modify: `src/components/maps/PlacesRegionVisualization.tsx`
- Modify: `src/components/admin/DashboardPlacesMap.tsx`
- Modify: `src/components/admin/DashboardPlacesMap.module.css`
- Modify: `src/app/api/admin/dashboard/places/[slug]/route.ts`
- Modify: `src/app/api/public/dashboard/places/[slug]/route.ts`
- Modify: `src/lib/publicRead/placeDetailService.ts`
- Modify: `src/lib/placeBirdService.ts`

---

### Task 1: Place Meta Line Helper (TDD)

**Files:**
- Create: `src/lib/placePanelMeta.ts`
- Create: `src/lib/__tests__/placePanelMeta.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildPlaceMetaLine } from "../placePanelMeta";

describe("buildPlaceMetaLine", () => {
  it("formats type + county when available", () => {
    expect(buildPlaceMetaLine({ typeLabel: "Puszta", county: "Hajdú-Bihar", nearestCity: null }))
      .toBe("Puszta · Hajdú-Bihar");
  });

  it("falls back to nearest city if county missing", () => {
    expect(buildPlaceMetaLine({ typeLabel: "Vizes élõhely", county: null, nearestCity: "Szeged" }))
      .toBe("Vizes élõhely · Szeged");
  });

  it("returns type only when no region info", () => {
    expect(buildPlaceMetaLine({ typeLabel: "Erdõszél", county: null, nearestCity: null }))
      .toBe("Erdõszél");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- placePanelMeta`
Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
type PlaceMetaArgs = {
  typeLabel: string;
  county: string | null;
  nearestCity: string | null;
};

export function buildPlaceMetaLine({ typeLabel, county, nearestCity }: PlaceMetaArgs): string {
  const region = county?.trim() || nearestCity?.trim() || "";
  return region ? `${typeLabel} · ${region}` : typeLabel;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- placePanelMeta`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/placePanelMeta.ts src/lib/__tests__/placePanelMeta.test.ts
git commit -m "test: add place panel meta helper" 
```

---

### Task 2: Add Latin Names + Habitat Tile Data in Services

**Files:**
- Modify: `src/lib/placeBirdService.ts`
- Modify: `src/lib/publicRead/placeDetailService.ts`

- [ ] **Step 1: Update placeBirdService to include `name_latin`**

In `src/lib/placeBirdService.ts`, extend the select and returned bird object:

```ts
// select: add name_latin
"... bird:birds!place_birds_bird_id_fkey(id,slug,name_hu,name_latin,status)"

// map output:
 bird: row.bird ? { id: row.bird.id, slug: row.bird.slug, name_hu: row.bird.name_hu, name_latin: row.bird.name_latin ?? "" } : null,
```

- [ ] **Step 2: Add name_latin to public place detail birds**

In `src/lib/publicRead/placeDetailService.ts`, extend the birds select and output:

```ts
// select
"... bird:birds(id,slug,name_hu,name_latin,status)"

// in birds map output
name_latin: typeof bird.name_latin === "string" ? bird.name_latin : "",
```

- [ ] **Step 3: Add place habitat tile to public detail**

In `src/lib/publicRead/placeDetailService.ts`, compute habitat tile from place type:

```ts
import { listHabitatStockAssets, resolveHabitatStockAssetKeyForPlaceType, getSignedApprovedHabitatTileUrlsByAssetKeys } from "@/lib/habitatStockAssetService";

const habitatAssets = await listHabitatStockAssets();
const habitatKey = resolveHabitatStockAssetKeyForPlaceType({ placeType: place.place_type, assets: habitatAssets });
const habitatUrlByKey = habitatKey ? await getSignedApprovedHabitatTileUrlsByAssetKeys([habitatKey]) : new Map();
const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;

// include in output
place: { ... , habitat_src: habitatSrc },
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/placeBirdService.ts src/lib/publicRead/placeDetailService.ts
git commit -m "feat: add latin names and place habitat tile in services" 
```

---

### Task 3: Extend Admin/Public Dashboard Detail APIs

**Files:**
- Modify: `src/app/api/admin/dashboard/places/[slug]/route.ts`
- Modify: `src/app/api/public/dashboard/places/[slug]/route.ts`

- [ ] **Step 1: Admin route - add `name_latin` + `habitat_src`**

In admin route:

```ts
import { listHabitatStockAssets, resolveHabitatStockAssetKeyForPlaceType, getSignedApprovedHabitatTileUrlsByAssetKeys } from "@/lib/habitatStockAssetService";

const habitatAssets = await listHabitatStockAssets();
const habitatKey = resolveHabitatStockAssetKeyForPlaceType({ placeType: place.place_type, assets: habitatAssets });
const habitatUrlByKey = habitatKey ? await getSignedApprovedHabitatTileUrlsByAssetKeys([habitatKey]) : new Map();
const habitatSrc = habitatKey ? habitatUrlByKey.get(habitatKey) ?? null : null;

// include in payload
place: { ... , habitat_src: habitatSrc },

// include bird name_latin
name_latin: row.bird?.name_latin ?? "",
```

- [ ] **Step 2: Public route - add `name_latin` + `iconic_src` + `habitat_src`**

In public route, use detail from `getPublicPlaceDetailV1`:

```ts
place: {
  ...,
  habitat_src: detail.place.habitat_src ?? null,
},

birds: detail.birds.slice(0, 8).map((bird) => ({
  id: bird.id,
  slug: bird.slug,
  name_hu: bird.name_hu,
  name_latin: bird.name_latin ?? "",
  iconic_src: bird.iconicSrc ?? null,
})),
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/dashboard/places/[slug]/route.ts src/app/api/public/dashboard/places/[slug]/route.ts
git commit -m "feat: extend dashboard place detail payloads" 
```

---

### Task 4: Map Click Close + Panel UI Updates

**Files:**
- Modify: `src/components/maps/PlacesMap.leaflet.tsx`
- Modify: `src/components/maps/PlacesRegionVisualization.tsx`
- Modify: `src/components/admin/DashboardPlacesMap.tsx`
- Modify: `src/components/admin/DashboardPlacesMap.module.css`

- [ ] **Step 1: Add onMapClick prop to PlacesMap**

In `src/components/maps/PlacesMap.leaflet.tsx`:

```ts
export type PlacesMapProps = {
  // ...
  onMapClick?: (event: LeafletMouseEvent) => void;
};

function MapRefBinder({ onMap, onZoom, onMapClick }: { onMap: (map: LeafletMap) => void; onZoom: (zoom: number) => void; onMapClick?: (event: LeafletMouseEvent) => void; }) {
  const map = useMap();
  useEffect(() => {
    onMap(map);
    const handler = () => onZoom(map.getZoom());
    handler();
    map.on("zoomend", handler);
    if (onMapClick) {
      map.on("click", onMapClick);
    }
    return () => {
      map.off("zoomend", handler);
      if (onMapClick) {
        map.off("click", onMapClick);
      }
    };
  }, [map, onMap, onZoom, onMapClick]);
  return null;
}
```

Pass `onMapClick` down to `MapRefBinder`.

- [ ] **Step 2: Stop propagation on region/marker clicks**

In `src/components/maps/PlacesRegionVisualization.tsx`:

```ts
import { DomEvent } from "leaflet";

layer.on("click", (event) => {
  DomEvent.stopPropagation(event);
  regionEventHandlers.onClick?.(regionId, event as LeafletMouseEvent);
});
```

In `src/components/maps/PlacesMap.leaflet.tsx` marker click handler:

```ts
import { DomEvent } from "leaflet";

click: (event) => {
  DomEvent.stopPropagation(event);
  handlers?.click?.(event);
  onSelect?.(marker.slug, buildSelectMeta(event as LeafletMouseEvent, "marker"));
},
```

- [ ] **Step 3: Wire map click to close panel in DashboardPlacesMap**

In `DashboardPlacesMap.tsx`:

```ts
<PlacesMap
  ...
  onMapClick={() => {
    if (pinnedSlug) setPinnedSlug(null);
  }}
/>
```

Remove the floating panel backdrop button from the render (background remains clickable).

- [ ] **Step 4: Update panel header to X-only + meta line**

```tsx
import { Icon } from "@/ui/icons/Icon";
import { PLACE_TYPE_LABELS } from "@/lib/placeTypeMeta";
import { buildPlaceMetaLine } from "@/lib/placePanelMeta";

const typeLabel = PLACE_TYPE_LABELS[panelDetail?.place?.place_type ?? activeMarker?.place_type ?? "lake"] ?? "";
const metaLine = buildPlaceMetaLine({
  typeLabel,
  county: panelDetail?.place?.county ?? null,
  nearestCity: panelDetail?.place?.nearest_city ?? null,
});

<p className={styles.detailName}>{panelDetail?.place?.name ?? activeMarker?.name ?? ""}</p>
<p className={styles.detailMeta}>{metaLine}</p>

<button type="button" className={styles.detailClose} onClick={() => setPinnedSlug(null)} aria-label="Bezárás">
  <Icon name="x" size={18} />
</button>
```

- [ ] **Step 5: Use BirdIcon with place habitat background**

```tsx
import BirdIcon from "@/components/shared/BirdIcon";

const habitatSrc = panelDetail?.place?.habitat_src ?? null;

<div className={styles.detailBirdList}>
  {panelDetail.birds.slice(0, 6).map((bird) => (
    <Link key={bird.id} ... className={styles.detailBirdRow}>
      <BirdIcon
        iconicSrc={bird.iconic_src}
        habitatSrc={habitatSrc}
        showHabitatBackground
        size={44}
        className={styles.detailBirdIconShell}
      />
      <span className={styles.detailBirdText}>
        <span className={styles.detailBirdName}>{bird.name_hu}</span>
        <span className={styles.detailBirdLatin}>{bird.name_latin}</span>
      </span>
    </Link>
  ))}
</div>
```

- [ ] **Step 6: CSS updates**

In `DashboardPlacesMap.module.css`:

```css
.detailHeader {
  align-items: flex-start;
}

.detailMeta {
  margin-top: 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--muted);
}

.detailClose {
  border: 0;
  background: transparent;
  color: var(--brand-ink);
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.detailClose:hover { background: rgba(var(--brand-ink-rgb), 0.08); }

.detailBirdIconShell { flex-shrink: 0; }
.detailBirdLatin { font-size: 0.72rem; color: var(--muted); }
```

- [ ] **Step 7: Commit**

```bash
git add src/components/maps/PlacesMap.leaflet.tsx src/components/maps/PlacesRegionVisualization.tsx src/components/admin/DashboardPlacesMap.tsx src/components/admin/DashboardPlacesMap.module.css
git commit -m "feat: refine dashboard panel UI and map close" 
```

---

### Task 5: Manual Smoke

**Files:**
- No code changes.

- [ ] **Step 1: Run dev server**

Run: `npm run dev`
Expected: Server starts without errors.

- [ ] **Step 2: Smoke test**

Check in browser:
- Marker click opens panel; map click closes panel.
- X button closes; only X action present.
- Header shows name then type/region on second line.
- Bird rows show iconic image + HU/Latin names.
- Habitat background visible behind icons.
- Public `/public` and admin dashboard both render panel.

---

## Self-Review
- Spec coverage: X-only close, header meta line, bird list HU+Latin, place habitat background, map click close, payload updates in both routes. Covered in Tasks 2–4.
- Placeholder scan: none.
- Type consistency: `name_latin`, `habitat_src`, `iconic_src` fields referenced consistently.
