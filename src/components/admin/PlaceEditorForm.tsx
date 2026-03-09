"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
import {
  PLACE_STATUS_VALUES,
  PLACE_TYPE_VALUES,
  type Place,
  type PlaceLocationPrecision,
  type PlaceMarker,
  type PlaceSensitivityLevel,
  type PlaceStatus,
  type PlaceType,
} from "@/types/place";
import PlaceLocationPicker from "@/components/maps/PlaceLocationPicker";

type PlaceEditorFormProps = {
  place: Place;
  marker: PlaceMarker | null;
};

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function PlaceEditorForm({ place, marker }: PlaceEditorFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(() => ({
    slug: place.slug,
    name: place.name,
    place_type: place.place_type,
    place_types:
      place.place_types && place.place_types.length > 0
        ? Array.from(new Set(place.place_types))
        : [place.place_type],
    status: place.status,
    region_landscape: place.region_landscape ?? "",
    county: place.county ?? "",
    district: place.district ?? "",
    nearest_city: place.nearest_city ?? "",
    distance_from_nearest_city_km:
      place.distance_from_nearest_city_km === null ? "" : String(place.distance_from_nearest_city_km),
    settlement: place.settlement ?? "",
    location_precision: place.location_precision as PlaceLocationPrecision,
    sensitivity_level: place.sensitivity_level as PlaceSensitivityLevel,
    is_beginner_friendly: place.is_beginner_friendly,
    lat: typeof marker?.lat === "number" ? String(marker.lat) : "",
    lng: typeof marker?.lng === "number" ? String(marker.lng) : "",
    access_note: place.access_note ?? "",
    parking_note: place.parking_note ?? "",
    best_visit_note: place.best_visit_note ?? "",
    generation_input: place.generation_input ?? "",
    notable_units_json: place.notable_units_json ? JSON.stringify(place.notable_units_json, null, 2) : "",
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const derivedLocationWkt = useMemo(() => {
    const lat = toNumberOrNull(values.lat);
    const lng = toNumberOrNull(values.lng);
    if (values.location_precision === "hidden") {
      return null;
    }
    if (lat === null || lng === null) {
      return undefined;
    }
    return `POINT(${lng} ${lat})`;
  }, [values.lat, values.lng, values.location_precision]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    let notableUnitsJson: unknown | null | undefined = undefined;
    if (values.notable_units_json.trim()) {
      try {
        notableUnitsJson = JSON.parse(values.notable_units_json);
      } catch {
        setError("notable_units_json must be valid JSON.");
        setSaving(false);
        return;
      }
    } else {
      notableUnitsJson = null;
    }

    const response = await fetch(`/api/places/${place.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: values.slug.trim(),
        name: values.name.trim(),
        place_type: values.place_type,
        place_types: values.place_types,
        status: values.status,
        region_landscape: values.region_landscape.trim() || null,
        county: values.county.trim() || null,
        district: values.district.trim() || null,
        nearest_city: values.nearest_city.trim() || null,
        distance_from_nearest_city_km: toNumberOrNull(values.distance_from_nearest_city_km),
        settlement: values.settlement.trim() || null,
        location_precision: values.location_precision,
        sensitivity_level: values.sensitivity_level,
        is_beginner_friendly: values.is_beginner_friendly,
        location_wkt: derivedLocationWkt,
        access_note: values.access_note.trim() || null,
        parking_note: values.parking_note.trim() || null,
        best_visit_note: values.best_visit_note.trim() || null,
        generation_input: values.generation_input.trim() || null,
        notable_units_json: notableUnitsJson,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save place.");
      setSaving(false);
      return;
    }

    setMessage("Place updated. Refreshing data…");
    router.refresh();
    setSaving(false);
  };

  const currentLat = toNumberOrNull(values.lat);
  const currentLng = toNumberOrNull(values.lng);

  return (
    <form className="place-panel space-y-6" onSubmit={handleSubmit}>
      <section className="place-meta space-y-4">
        <p className="admin-subheading">Basic data</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Slug"
            value={values.slug}
            required
            onChange={(event) => setValues((p) => ({ ...p, slug: event.target.value }))}
          />
          <Input
            label="Name"
            value={values.name}
            required
            onChange={(event) => setValues((p) => ({ ...p, name: event.target.value }))}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="form-field">
            <span className="form-field__label">Type</span>
            <div className="form-field__row">
              <select
                className="input"
                value={values.place_type}
                onChange={(event) => setValues((p) => ({ ...p, place_type: event.target.value as PlaceType }))}
              >
                {PLACE_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="form-field">
            <span className="form-field__label">Status</span>
            <div className="form-field__row">
              <select
                className="input"
                value={values.status}
                onChange={(event) => setValues((p) => ({ ...p, status: event.target.value as PlaceStatus }))}
              >
                {PLACE_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <div className="space-y-2">
          <p className="form-field__label">Additional place types</p>
          <p className="admin-note-small">
            Primary type is the dropdown above. Check any extra types if the place legitimately fits multiple categories.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {PLACE_TYPE_VALUES.map((value) => {
              const checked = values.place_types.includes(value);
              const isPrimary = value === values.place_type;
              return (
                <label key={value} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isPrimary}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? Array.from(new Set([...values.place_types, value]))
                        : values.place_types.filter((t) => t !== value);
                      setValues((p) => ({ ...p, place_types: next }));
                    }}
                  />
                  {value}
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="place-meta space-y-4">
        <p className="admin-subheading">Region</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Region / landscape"
            value={values.region_landscape}
            onChange={(event) => setValues((p) => ({ ...p, region_landscape: event.target.value }))}
            placeholder="Fertő–Hanság"
          />
          <Input
            label="County"
            value={values.county}
            onChange={(event) => setValues((p) => ({ ...p, county: event.target.value }))}
            placeholder="Győr-Moson-Sopron"
          />
          <Input
            label="District"
            value={values.district}
            onChange={(event) => setValues((p) => ({ ...p, district: event.target.value }))}
            placeholder="Soproni járás"
          />
          <Input
            label="Nearest city"
            value={values.nearest_city}
            onChange={(event) => setValues((p) => ({ ...p, nearest_city: event.target.value }))}
            placeholder="Sopron"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Distance from nearest city (km)"
            value={values.distance_from_nearest_city_km}
            onChange={(event) => setValues((p) => ({ ...p, distance_from_nearest_city_km: event.target.value }))}
            placeholder="10"
          />
          <Input
            label="Settlement (optional)"
            value={values.settlement}
            onChange={(event) => setValues((p) => ({ ...p, settlement: event.target.value }))}
            placeholder="Tata"
          />
        </div>
      </section>

      <section className="place-meta space-y-4">
        <p className="admin-subheading">Ethics & visibility</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="form-field">
            <span className="form-field__label">Location precision</span>
            <div className="form-field__row">
              <select
                className="input"
                value={values.location_precision}
                onChange={(event) =>
                  setValues((p) => ({ ...p, location_precision: event.target.value as PlaceLocationPrecision }))
                }
              >
                <option value="approximate">approximate</option>
                <option value="exact">exact</option>
                <option value="hidden">hidden</option>
              </select>
            </div>
          </label>

          <label className="form-field">
            <span className="form-field__label">Sensitivity</span>
            <div className="form-field__row">
              <select
                className="input"
                value={values.sensitivity_level}
                onChange={(event) =>
                  setValues((p) => ({ ...p, sensitivity_level: event.target.value as PlaceSensitivityLevel }))
                }
              >
                <option value="normal">normal</option>
                <option value="sensitive">sensitive</option>
              </select>
            </div>
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={values.is_beginner_friendly}
            onChange={(event) => setValues((p) => ({ ...p, is_beginner_friendly: event.target.checked }))}
          />
          Beginner friendly
        </label>
      </section>

      <section className="place-meta space-y-4">
        <p className="admin-subheading">Location (destination-level)</p>
        <p className="admin-note-small">
          Marker is for a general destination point only. Avoid sensitive micro-locations; use <code className="rounded bg-zinc-100 px-1 text-xs">hidden</code> to keep it off the public map.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Latitude"
            value={values.lat}
            onChange={(event) => setValues((p) => ({ ...p, lat: event.target.value }))}
            placeholder="47.65"
            helperText={values.location_precision === "hidden" ? "Hidden locations must not have a marker." : undefined}
          />
          <Input
            label="Longitude"
            value={values.lng}
            onChange={(event) => setValues((p) => ({ ...p, lng: event.target.value }))}
            placeholder="18.33"
          />
        </div>

        <PlaceLocationPicker
          lat={currentLat}
          lng={currentLng}
          onPick={({ lat, lng }) =>
            setValues((p) => ({ ...p, lat: lat.toFixed(6), lng: lng.toFixed(6) }))
          }
        />
      </section>

      <section className="place-meta space-y-4">
        <p className="admin-subheading">Practical info</p>
        <Input
          label="Access note"
          value={values.access_note}
          onChange={(event) => setValues((p) => ({ ...p, access_note: event.target.value }))}
          placeholder="Public footpaths from the north side…"
        />
        <Input
          label="Parking note"
          value={values.parking_note}
          onChange={(event) => setValues((p) => ({ ...p, parking_note: event.target.value }))}
          placeholder="Parking near the visitor center…"
        />
        <Input
          label="Best visit note"
          value={values.best_visit_note}
          onChange={(event) => setValues((p) => ({ ...p, best_visit_note: event.target.value }))}
          placeholder="Early morning in autumn migration…"
        />
      </section>

      <section className="place-meta space-y-4">
        <p className="admin-subheading">Generation input</p>
        <Input
          label="Admin description"
          value={values.generation_input}
          onChange={(event) => setValues((p) => ({ ...p, generation_input: event.target.value }))}
          placeholder="Large fishpond system near Fertő lake, important migration stopover."
        />
      </section>

      <section className="place-meta space-y-4">
        <p className="admin-subheading">Notable units (JSON)</p>
        <p className="admin-note-small">
          Informational sub-units only (not separate Places in v1). Stored as JSON.
        </p>
        <label className="form-field">
          <span className="form-field__label">notable_units_json</span>
          <div className="form-field__row">
            <textarea
              className="input min-h-[160px] font-mono text-xs"
              value={values.notable_units_json}
              onChange={(event) => setValues((p) => ({ ...p, notable_units_json: event.target.value }))}
              placeholder='[{"name":"Nyirkai-Hany","type":"wetland","distance_km":5,"note":"Important restoration site."}]'
            />
          </div>
        </label>
      </section>

      <Button type="submit" disabled={saving} variant="primary" className="w-full justify-center">
        {saving ? "Saving…" : "Save changes"}
      </Button>

      {error && (
        <p className="admin-message admin-message--error" aria-live="assertive">
          {error}
        </p>
      )}
      {message && (
        <p className="admin-message admin-message--success" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}
