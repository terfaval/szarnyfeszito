# Distribution region catalogs (D26)

These catalogs provide authoritative region geometries for **Bird distribution maps** (D24/D26).

Rule: the AI must **not** generate polygon coordinates. It only selects `region_id`s from these catalogs.
The server then expands those IDs into GeoJSON geometries deterministically.

## Where the catalogs live

Recommended (for large catalogs): store the catalogs in **Supabase** (`distribution_region_catalog_items`) and keep the
generated JSON files out of git.

Optional (small/local/dev): you can place repo catalogs here:

- `data/distribution-region-catalog/v1/globalRegions.json`
- `data/distribution-region-catalog/v1/hungaryRegions.json`

Catalog source selection is controlled by `DISTRIBUTION_REGION_CATALOG_SOURCE` (default: `supabase`).

Repo catalogs can also be gzip-compressed (`.json.gz`). If you keep catalogs outside git, set
`DISTRIBUTION_REGION_CATALOG_REPO_DIR` to the folder containing the files (the loader also checks
`TICKETS/leaflet shapefile builder/out/` as a fallback).

## How to build the JSON catalogs (manual Python run)

The builder script is:

- `TICKETS/leaflet shapefile builder/build_region_catalogs.py`

It reads local GIS layers (GeoJSON / SHP / GPKG) and writes `globalRegions.json` + `hungaryRegions.json`.

### Prereqs (Windows)

The script needs `geopandas`, `shapely`, `pandas`.

Recommended (least painful): conda

- `conda create -n regioncatalog python=3.11 geopandas`
- `conda activate regioncatalog`

### Run (from repo root)

Example using the SHP files you placed in `TICKETS/leaflet shapefile builder`:

- `python "TICKETS/leaflet shapefile builder/build_region_catalogs.py" --ecoregions "TICKETS/leaflet shapefile builder/Ecoregions2017.shp" --countries "TICKETS/leaflet shapefile builder/ne_10m_admin_0_countries.shp" --natura "TICKETS/leaflet shapefile builder/Natura2000_end2022_rev1_epsg4326.shp" --outdir "./out"`

If your Natura layer is split into multiple files, pass all of them after `--natura`:

- `python "TICKETS/leaflet shapefile builder/build_region_catalogs.py" --ecoregions ... --countries ... --natura natura_part1.shp natura_part2.shp --outdir "./out"`

If you also have HU admin / microregion polygons to ensure full country coverage, pass them via `--hu-microregions` (optional):

- `python "TICKETS/leaflet shapefile builder/build_region_catalogs.py" --ecoregions ... --countries ... --natura ... --hu-microregions hu_kisterseg.shp --outdir "./out"`

If you do want repo catalogs, then move/copy:

- `out/globalRegions.json` -> `data/distribution-region-catalog/v1/globalRegions.json`
- `out/hungaryRegions.json` -> `data/distribution-region-catalog/v1/hungaryRegions.json`

## Optional: import catalogs into Supabase

If you want the catalogs in Supabase as well, run the import script:

- `node scripts/import-region-catalog.mjs data/distribution-region-catalog/v1/globalRegions.json`
- `node scripts/import-region-catalog.mjs data/distribution-region-catalog/v1/hungaryRegions.json`

This upserts into `distribution_region_catalog_items`.
