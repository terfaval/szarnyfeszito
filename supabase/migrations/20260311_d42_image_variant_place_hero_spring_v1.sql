-- D42 - Add missing Place hero image variant to DB enum
--
-- Fixes: `invalid input value for enum image_variant: "place_hero_spring_v1"`
-- when inserting generated place hero images into `public.images.variant`.

alter type image_variant add value if not exists 'place_hero_spring_v1';
