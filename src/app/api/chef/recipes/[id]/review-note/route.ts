import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { generateChefRecipeV1 } from "@/lib/chefRecipeGeneration";
import { getChefRecipeById, regenerateChefRecipeFromNote } from "@/lib/chefRecipeService";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminUser = await getAdminUserFromCookies();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!note) {
    return NextResponse.json({ error: "note is required (string)" }, { status: 400 });
  }

  const existing = await getChefRecipeById(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  try {
    const generation = await generateChefRecipeV1({
      title: existing.title,
      short_description: existing.short_description,
      servings: existing.recipe_json?.servings ?? existing.servings ?? 2,
      existing_recipe: existing.recipe_json,
      review_note: note,
    });

    const recipe = await regenerateChefRecipeFromNote({
      id: existing.id,
      last_review_note: note,
      servings: generation.payload.servings,
      cook_time_minutes: generation.payload.cook_time_minutes,
      recipe_json: generation.payload,
      generation_meta: {
        model: generation.model,
        prompt_hash: generation.prompt_hash,
        generated_at: new Date().toISOString(),
        review_comment: note,
        request_id: generation.request_id,
        finish_reason: generation.finish_reason,
      },
    });

    return NextResponse.json({ data: { recipe } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to regenerate recipe." },
      { status: 502 }
    );
  }
}

