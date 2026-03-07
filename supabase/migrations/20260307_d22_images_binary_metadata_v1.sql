-- D22 — Images: binary metadata columns for provider-based generation

alter table images
  add column if not exists style_config_id text,
  add column if not exists seed integer,
  add column if not exists width_px integer,
  add column if not exists height_px integer,
  add column if not exists provider_model text,
  add column if not exists spec_hash text,
  add column if not exists prompt_hash text,
  add column if not exists created_by text not null default 'script';

