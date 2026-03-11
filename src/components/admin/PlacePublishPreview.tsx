import Link from "next/link";
import Image from "next/image";
import type { PlacesMapLayersV1 } from "@/types/placesMap";
import type { Place, PlaceFrequencyBand, PlaceMarker, PlaceNotableUnit, PlaceNotableUnitType } from "@/types/place";
import type { PlaceUiVariantsV1 } from "@/lib/placeContentSchema";
import type { SeasonKey } from "@/lib/season";
import BirdIcon from "@/components/admin/BirdIcon";
import PlacesMap from "@/components/maps/PlacesMap";
import { Card } from "@/ui/components/Card";
import styles from "./PlacePublishPreview.module.css";

type PlacePublishBird = {
  id: string;
  slug: string;
  name_hu: string;
  iconicSrc: string | null;
  rank: number;
  frequency_band: PlaceFrequencyBand;
};

const SEASON_LABEL_HU: Record<SeasonKey, string> = {
  spring: "Tavasz",
  summer: "Nyár",
  autumn: "Ősz",
  winter: "Tél",
};

const NOTABLE_UNIT_TYPE_LABEL_HU: Record<PlaceNotableUnitType, string> = {
  wetland: "vizes élőhely",
  fishpond: "halastó",
  lake_section: "tórész",
  reedbed: "nádas",
  lookout: "kilátó",
  trail: "ösvény",
  island: "sziget",
  shoreline: "partszakasz",
  grassland_section: "gyepes rész",
  forest_section: "erdős rész",
  other: "egyéb",
};

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function unitTypeLabelHu(value: PlaceNotableUnitType | null) {
  if (!value) return "";
  return NOTABLE_UNIT_TYPE_LABEL_HU[value] ?? value.replaceAll("_", " ");
}

function unitKey(unit: PlaceNotableUnit) {
  return `${unit.order_index}:${unit.name}:${unit.unit_type ?? "none"}`;
}

const FREQUENCY_LABEL_HU: Record<PlaceFrequencyBand, string> = {
  very_common: "nagyon gyakori",
  common: "gyakori",
  regular: "rendszeres",
  occasional: "alkalmi",
  special: "különleges",
};

function frequencyLabelHu(value: PlaceFrequencyBand) {
  return FREQUENCY_LABEL_HU[value] ?? value.replaceAll("_", " ");
}

export default function PlacePublishPreview({
  place,
  marker,
  layers,
  content,
  heroImageUrl,
  currentSeason,
  birds,
  showSeasonal,
}: {
  place: Place;
  marker: { lat: number | null; lng: number | null } | null;
  layers: PlacesMapLayersV1 | null;
  content: PlaceUiVariantsV1 | null;
  heroImageUrl?: string | null;
  currentSeason: SeasonKey;
  birds: PlacePublishBird[];
  showSeasonal: boolean;
}) {
  const variants = content?.variants ?? null;
  const seasonalText = variants?.seasonal_snippet?.[currentSeason] ?? "";
  const seasonLabel = SEASON_LABEL_HU[currentSeason];

  const hasExtras =
    !!variants &&
    (nonEmpty(variants.who_is_it_for) || nonEmpty(variants.when_to_go) || nonEmpty(variants.practical_tip));
  const hasDidYouKnow = !!variants && nonEmpty(variants.did_you_know);
  const hasNearbyProtection = !!variants && nonEmpty(variants.nearby_protection_context);

  const shouldOverlayDidYouKnow = hasDidYouKnow && place.location_precision !== "hidden";
  const notableUnits = (place.notable_units_json ?? []) as PlaceNotableUnit[];
  const hasNotableUnits = notableUnits.length > 0;

  const subtitle = variants && nonEmpty(variants.teaser) ? variants.teaser : "";
  const localizationPills = [
    place.place_type,
    place.county ? place.county : "",
    place.nearest_city ? place.nearest_city : "",
  ].filter((value) => nonEmpty(value));

  const markerSlug = nonEmpty(place.slug) ? place.slug : place.id;
  const hasMarker = Boolean(marker && Number.isFinite(marker.lat) && Number.isFinite(marker.lng));
  const placeMarker: PlaceMarker = {
    id: place.id,
    slug: markerSlug,
    name: place.name || place.slug || "Untitled place",
    place_type: place.place_type,
    status: place.status,
    location_precision: place.location_precision,
    sensitivity_level: place.sensitivity_level,
    is_beginner_friendly: place.is_beginner_friendly,
    leaflet_region_id: place.leaflet_region_id,
    lat: hasMarker ? (marker!.lat as number) : null,
    lng: hasMarker ? (marker!.lng as number) : null,
    updated_at: place.updated_at,
  };

  return (
    <section className={styles.previewRoot} aria-label="Place publish preview">
      <header className="admin-heading">
        <p className="admin-heading__label">Preview</p>
        <h2 className="admin-heading__title admin-heading__title--large">Place card</h2>
        <p className="admin-heading__description">
          What the public panel will primarily render (UI variants contract), plus the currently linked birds.
        </p>
      </header>

      <Card className="stack">
        {heroImageUrl ? (
          <div className={styles.heroImageFrame} aria-label="Approved hero image">
            <img src={heroImageUrl} alt="" className={styles.heroImage} />
            <div className={styles.heroOverlay} aria-label="Hero overlay">
              <div className={styles.heroPills}>
                <span className={styles.heroPillTitle}>{place.name || place.slug || "Untitled place"}</span>
                {subtitle ? <span className={styles.heroPill}>{subtitle}</span> : null}
                {localizationPills.map((pill) => (
                  <span key={pill} className={styles.heroPill}>
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <header className={styles.placeHeader}>
          <p className={styles.placeMetaLine}>
            {place.place_type}
            {place.county ? ` · ${place.county}` : ""}
            {place.nearest_city ? ` · ${place.nearest_city}` : ""}
          </p>
          {!heroImageUrl ? <h3 className={styles.placeName}>{place.name || place.slug || "Untitled place"}</h3> : null}
          {!heroImageUrl && variants && nonEmpty(variants.teaser) ? <p className={styles.teaser}>{variants.teaser}</p> : null}
        </header>

        {variants ? (
          <>
            {nonEmpty(variants.short) ? (
              <p className={styles.shortHighlight} aria-label="Place short">
                {variants.short}
              </p>
            ) : (
              <p className="admin-note-small">No approved `variants.short` yet.</p>
            )}

            <div className={styles.heroMap}>
              {place.location_precision === "hidden" ? (
                <div className="admin-panel admin-panel--muted">
                  <p className="admin-note-small">Location is hidden for this place.</p>
                </div>
              ) : (
                <div className={styles.placeMapStack} aria-label="Place map">
                  {!hasMarker ? <div className={styles.mapOverlayNote}>No location marker set yet.</div> : null}
                  <PlacesMap
                    markers={hasMarker ? [placeMarker] : []}
                    selectedSlug={hasMarker ? markerSlug : null}
                    selectedRegionId={place.leaflet_region_id}
                    layers={layers}
                    basemap="bird"
                    regionVisualization="places_regions_v1"
                    markerColorMode="water_highlight_v1"
                    interactionMode="bounded_hu_v1"
                    toolBarVariant="bottom_right_v1"
                    defaultCenter={
                      hasMarker ? ([placeMarker.lat as number, placeMarker.lng as number] as [number, number]) : undefined
                    }
                    defaultZoom={8}
                  />
                  {shouldOverlayDidYouKnow ? (
                    <div className={styles.didYouKnowOverlay} aria-label="Tudtad-e (overlay)">
                      <div className={styles.didYouKnowCard} aria-label="Tudtad-e">
                        <div className={styles.didYouKnowBadge} aria-hidden="true">
                          <Image
                            src="/icon_didyouknow.svg"
                            alt=""
                            className={styles.didYouKnowIcon}
                            width={44}
                            height={44}
                          />
                        </div>
                        <p className={styles.didYouKnowText}>{variants?.did_you_know}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {nonEmpty(variants.long) ? <p className={styles.copyBlock}>{variants.long}</p> : null}
            {nonEmpty(variants.ethics_tip) ? (
              <p className={styles.ethicsTip} aria-label="Ethics tip">
                {variants.ethics_tip}
              </p>
            ) : null}

            {showSeasonal ? (
              <div className="stack">
                {nonEmpty(seasonalText) ? (
                  <p className={styles.seasonalSnippet} aria-label={`Seasonal snippet for ${seasonLabel}`}>
                    {seasonalText}
                  </p>
                ) : (
                  <p className="admin-note-small">No approved seasonal snippet for {seasonLabel} yet.</p>
                )}

                {birds.length ? (
                  <div className={styles.birdGrid} aria-label="Linked birds">
                    {birds.map((bird) => (
                      <Link
                        key={bird.id}
                        href={`/admin/birds/${bird.id}`}
                        className={styles.birdCard}
                        aria-label={`Open bird: ${bird.name_hu}`}
                      >
                        <BirdIcon iconicSrc={bird.iconicSrc} showHabitatBackground={false} size={64} />
                        <div className={styles.birdText}>
                          <span className={styles.birdName}>{bird.name_hu}</span>
                          <span className={styles.birdFrequency}>{frequencyLabelHu(bird.frequency_band)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="admin-note-small">No published birds linked to this place for {seasonLabel}.</p>
                )}
              </div>
            ) : null}

            {hasExtras ? (
              <div className={styles.extrasGrid} aria-label="Extras">
                {nonEmpty(variants.who_is_it_for) ? (
                  <div className={`admin-panel ${styles.extrasPanel}`}>
                    <p className="admin-subheading">Kinek való?</p>
                    <p className={styles.copyBlock}>{variants.who_is_it_for}</p>
                  </div>
                ) : null}
                {nonEmpty(variants.when_to_go) ? (
                  <div className={`admin-panel ${styles.extrasPanel}`}>
                    <p className="admin-subheading">Mikor menj?</p>
                    <p className={styles.copyBlock}>{variants.when_to_go}</p>
                  </div>
                ) : null}
                {nonEmpty(variants.practical_tip) ? (
                  <div className={`admin-panel ${styles.extrasPanel}`}>
                    <p className="admin-subheading">Gyakorlati tipp</p>
                    <p className={styles.copyBlock}>{variants.practical_tip}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className={styles.practicalAfterGrid} aria-label="Practical notes and notable units">
              <div className={`admin-panel ${styles.generalPracticalPanel}`} aria-label="General practical notes">
                <p className="admin-subheading">General practical info</p>
                <div className={styles.generalPracticalRows}>
                  <div className={styles.generalPracticalRow}>
                    <p className={styles.generalPracticalLabel}>Megközelítés</p>
                    {nonEmpty(place.access_note) ? (
                      <p className={styles.generalPracticalValue}>{place.access_note}</p>
                    ) : (
                      <p className={styles.generalPracticalEmpty}>Nincs kitöltve.</p>
                    )}
                  </div>
                  <div className={styles.generalPracticalRow}>
                    <p className={styles.generalPracticalLabel}>Parkolás</p>
                    {nonEmpty(place.parking_note) ? (
                      <p className={styles.generalPracticalValue}>{place.parking_note}</p>
                    ) : (
                      <p className={styles.generalPracticalEmpty}>Nincs kitöltve.</p>
                    )}
                  </div>
                  <div className={styles.generalPracticalRow}>
                    <p className={styles.generalPracticalLabel}>Mikor a legjobb?</p>
                    {nonEmpty(place.best_visit_note) ? (
                      <p className={styles.generalPracticalValue}>{place.best_visit_note}</p>
                    ) : (
                      <p className={styles.generalPracticalEmpty}>Nincs kitöltve.</p>
                    )}
                  </div>
                  <div className={styles.generalPracticalRow}>
                    <p className={styles.generalPracticalLabel}>Helyi védelem</p>
                    {hasNearbyProtection ? (
                      <p className={styles.generalPracticalValue}>{variants.nearby_protection_context}</p>
                    ) : (
                      <p className={styles.generalPracticalEmpty}>Nincs kitöltve.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={`admin-panel ${styles.notableUnitsPanel}`} aria-label="Notable units">
                <p className="admin-subheading">Notable units</p>
                {hasNotableUnits ? (
                  <div className={styles.notableUnitsScroll}>
                    {notableUnits.map((unit) => {
                      const unitType = unitTypeLabelHu(unit.unit_type);
                      return (
                        <article key={unitKey(unit)} className={styles.notableUnitCard}>
                          <header className={styles.notableUnitHeader}>
                            <p className={styles.notableUnitName}>{unit.name}</p>
                            {unitType ? <span className={styles.notableUnitType}>{unitType}</span> : null}
                          </header>
                          <p className={styles.notableUnitNote}>{unit.short_note}</p>
                          {unit.distance_text ? <p className={styles.notableUnitDistance}>{unit.distance_text}</p> : null}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="admin-note-small">No notable units yet.</p>
                )}
              </div>
            </div>

            {hasDidYouKnow && !shouldOverlayDidYouKnow ? (
              <div className={styles.didYouKnowCard} aria-label="Tudtad-e">
                <div className={styles.didYouKnowBadge} aria-hidden="true">
                  <Image
                    src="/icon_didyouknow.svg"
                    alt=""
                    className={styles.didYouKnowIcon}
                    width={44}
                    height={44}
                  />
                </div>
                <p className={styles.didYouKnowText}>{variants.did_you_know}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="admin-panel admin-panel--muted">
            <p className="admin-note-small">
              No approved content block yet. Approve Place UI variants first, then return here to preview.
            </p>
          </div>
        )}
      </Card>
    </section>
  );
}
