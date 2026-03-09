import type { ChefRecipeRecord } from "@/types/chef";
import type { ReviewStatus } from "@/types/content";
import { supabaseServerClient } from "@/lib/supabaseServerClient";

type ChefRecipeRow = ChefRecipeRecord;

const asRecord = (value: unknown) => value as ChefRecipeRow;

export async function listApprovedChefRecipes(): Promise<ChefRecipeRecord[]> {
  const { data, error } = await supabaseServerClient
    .from("chef_recipes")
    .select("*")
    .eq("review_status", "approved" as ReviewStatus)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(asRecord);
}

export async function getChefRecipeById(id: string): Promise<ChefRecipeRecord | null> {
  const { data, error } = await supabaseServerClient
    .from("chef_recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? asRecord(data) : null;
}

export async function createChefRecipeDraft(input: {
  title: string;
  short_description: string;
  servings: number;
  cook_time_minutes: number;
  recipe_json: ChefRecipeRecord["recipe_json"];
  generation_meta: ChefRecipeRecord["generation_meta"];
}): Promise<ChefRecipeRecord> {
  const now = new Date().toISOString();
  const payload = {
    title: input.title,
    short_description: input.short_description,
    servings: input.servings,
    cook_time_minutes: input.cook_time_minutes,
    recipe_json: input.recipe_json,
    generation_meta: input.generation_meta,
    review_status: "draft" as ReviewStatus,
    last_review_note: null,
    updated_at: now,
  };

  const { data, error } = await supabaseServerClient
    .from("chef_recipes")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Unable to create chef recipe draft.");
  return asRecord(data);
}

export async function acceptChefRecipe(id: string): Promise<ChefRecipeRecord> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseServerClient
    .from("chef_recipes")
    .update({ review_status: "approved" as ReviewStatus, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Unable to accept recipe.");
  return asRecord(data);
}

export async function regenerateChefRecipeFromNote(input: {
  id: string;
  last_review_note: string;
  servings: number;
  cook_time_minutes: number;
  recipe_json: ChefRecipeRecord["recipe_json"];
  generation_meta: ChefRecipeRecord["generation_meta"];
}): Promise<ChefRecipeRecord> {
  const now = new Date().toISOString();
  const payload = {
    last_review_note: input.last_review_note,
    servings: input.servings,
    cook_time_minutes: input.cook_time_minutes,
    recipe_json: input.recipe_json,
    generation_meta: input.generation_meta,
    review_status: "draft" as ReviewStatus,
    updated_at: now,
  };

  const { data, error } = await supabaseServerClient
    .from("chef_recipes")
    .update(payload)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Unable to update recipe draft.");
  return asRecord(data);
}

