"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChefIngredientV1, ChefRecipeRecord } from "@/types/chef";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import { ReviewStatusPill } from "@/ui/components/ReviewStatusPill";

type ChefRecipeEditorProps =
  | { mode: "create"; initialRecipe?: undefined }
  | { mode: "edit"; initialRecipe: ChefRecipeRecord };

function roundTo(value: number, decimals: number) {
  const pow = 10 ** decimals;
  return Math.round(value * pow) / pow;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("hu-HU", {
    maximumFractionDigits: 2,
  }).format(value);
}

function ingredientLine(ingredient: ChefIngredientV1, factor: number) {
  const scaled =
    typeof ingredient.amount === "number"
      ? roundTo(ingredient.amount * factor, 2)
      : null;

  const amountPart =
    scaled === null
      ? ""
      : ingredient.unit
      ? `${formatNumber(scaled)} ${ingredient.unit}`
      : formatNumber(scaled);

  const note = ingredient.note ? ` (${ingredient.note})` : "";
  const prefix = amountPart ? `${amountPart} ` : "";
  return `${prefix}${ingredient.name}${note}`.trim();
}

export default function ChefRecipeEditor(props: ChefRecipeEditorProps) {
  const router = useRouter();

  const [title, setTitle] = useState(
    props.mode === "edit" ? props.initialRecipe.title : ""
  );
  const [shortDescription, setShortDescription] = useState(
    props.mode === "edit" ? props.initialRecipe.short_description : ""
  );
  const [recipe, setRecipe] = useState<ChefRecipeRecord | null>(
    props.mode === "edit" ? props.initialRecipe : null
  );

  const [desiredServings, setDesiredServings] = useState<number>(() => {
    const base = props.mode === "edit" ? props.initialRecipe.servings : 2;
    return base || 2;
  });

  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const baseServings = recipe?.recipe_json?.servings ?? recipe?.servings ?? 2;
  const servingsFactor = desiredServings / Math.max(1, baseServings);

  const scaledIngredients = useMemo(() => {
    const ingredients = recipe?.recipe_json?.ingredients ?? [];
    return ingredients.map((ingredient) => ingredientLine(ingredient, servingsFactor));
  }, [recipe, servingsFactor]);

  const canGenerate = useMemo(() => {
    if (busy) return false;
    return title.trim().length > 0 && shortDescription.trim().length > 0;
  }, [busy, title, shortDescription]);

  const canAccept = useMemo(() => {
    if (!recipe) return false;
    if (busy) return false;
    return recipe.review_status !== "approved";
  }, [recipe, busy]);

  const handleGenerate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/chef/recipes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        short_description: shortDescription.trim(),
      }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to generate recipe.");
      setBusy(false);
      return;
    }

    const nextRecipe = body?.data?.recipe as ChefRecipeRecord | undefined;
    if (!nextRecipe?.id) {
      setError("Recipe was generated but no id was returned.");
      setBusy(false);
      return;
    }

    setMessage("Recipe draft generated. Redirecting…");
    router.push(`/admin/chef/${nextRecipe.id}`);
    setBusy(false);
  };

  const handleAccept = async () => {
    if (!recipe) return;
    setBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/chef/recipes/${recipe.id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to accept recipe.");
      setBusy(false);
      return;
    }

    setRecipe(body?.data?.recipe ?? recipe);
    setMessage("Recipe accepted.");
    setBusy(false);
    router.refresh();
  };

  const handleImprove = async () => {
    if (!recipe) return;
    const note = reviewNote.trim();
    if (!note) {
      setError("Write a review note first.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/chef/recipes/${recipe.id}/review-note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error ?? "Unable to improve recipe.");
      setBusy(false);
      return;
    }

    const nextRecipe = body?.data?.recipe as ChefRecipeRecord | undefined;
    if (nextRecipe) {
      setRecipe(nextRecipe);
      setDesiredServings(nextRecipe.recipe_json?.servings ?? nextRecipe.servings ?? 2);
    }
    setReviewNote("");
    setMessage("Draft regenerated from review note. Accept to save.");
    setBusy(false);
  };

  if (props.mode === "create") {
    return (
      <form className="space-y-4" onSubmit={handleGenerate}>
        <Input
          label="Recept név"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Citromos csirke egytál"
        />
        <label className="form-field">
          <span className="form-field__label">Rövid leírás</span>
          <textarea
            className="admin-code-textarea"
            rows={4}
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
            placeholder="Mit szeretnél? Ízek, stílus, alapanyagok, konyha, gyors/ünnepi, stb."
          />
          <span className="form-helper">
            Szabad szöveg. A rendszer ebből generál pontos hozzávalólistát és lépéseket.
          </span>
        </label>
        <Button type="submit" disabled={!canGenerate} variant="accent" className="w-full justify-center">
          {busy ? "Generating…" : "Generate recipe draft"}
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

  if (!recipe) {
    return null;
  }

  return (
    <Card className="stack">
      <header className="admin-header-row">
        <div>
          <p className="admin-heading__label">Chef</p>
          <h1 className="admin-heading__title admin-heading__title--large">
            {recipe.title}
          </h1>
          <p className="admin-heading__description">{recipe.short_description}</p>
        </div>
        <div className="admin-inline-actions">
          <ReviewStatusPill status={recipe.review_status} />
          <span className="status-pill">{recipe.cook_time_minutes} MIN</span>
        </div>
      </header>

      <Input
        label="Adag (servings) – újraszámolás"
        type="number"
        min={1}
        max={20}
        value={desiredServings}
        onChange={(event) => setDesiredServings(Number(event.target.value) || 1)}
        helperText={`Alap recept: ${baseServings} adag. Csak a mennyiségek skálázódnak.`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="admin-subheading">Hozzávalók</p>
          <ul className="space-y-2 text-sm">
            {scaledIngredients.map((line, index) => (
              <li key={`${index}-${line}`} className="admin-panel admin-panel--muted">
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="admin-subheading">Elkészítés</p>
          <ol className="space-y-2 text-sm list-decimal pl-5">
            {(recipe.recipe_json?.steps ?? []).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>

      <div className="admin-inline-actions">
        <Button onClick={handleAccept} disabled={!canAccept} variant="accent">
          {busy ? "Working…" : recipe.review_status === "approved" ? "Accepted" : "Accept"}
        </Button>
      </div>

      <div className="space-y-3">
        <p className="admin-subheading">Review note</p>
        {recipe.last_review_note ? (
          <p className="admin-review-note">
            Last note: {recipe.last_review_note}
          </p>
        ) : null}
        <textarea
          className="admin-code-textarea"
          rows={4}
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          placeholder="Mit javítson a recepten? (pl. kevesebb cukor, gyorsabb, csípősebb, más köret, stb.)"
          disabled={busy}
        />
        <div className="admin-inline-actions">
          <Button onClick={handleImprove} disabled={busy || !reviewNote.trim()} variant="secondary">
            {busy ? "Improving…" : "Improve (regenerate draft)"}
          </Button>
        </div>
      </div>

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
    </Card>
  );
}
