-- D50 — Bird image variant: main_habitat_pair_sexes_v1 (optional)
-- Adds a scientific duo composition variant for "male vs female" comparisons.

alter type image_variant add value if not exists 'main_habitat_pair_sexes_v1';

