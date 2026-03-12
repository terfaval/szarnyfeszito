-- D55 — Birds: persist habitat stock asset candidate keys (ordered).
-- Used for deterministic habitat-tile background selection in Studio surfaces.
alter table birds
  add column if not exists habitat_stock_asset_keys text[] not null default '{}'::text[];

