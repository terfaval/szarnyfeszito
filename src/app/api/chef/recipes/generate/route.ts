import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { generateChefRecipeV1 } from "@/lib/chefRecipeGeneration";
import { createChefRecipeDraft } from "@/lib/chefRecipeService";

export async function POST(request: NextRequest) {
  const adminUser = await getAdminUserFromCookies();
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const shortDescription =
    typeof body?.short_description === "string"
      ? body.short_description.trim()
      : "";

  if (!title) {
    return NextResponse.json({ error: "title is required (string)" }, { status: 400 });
  }
  if (!shortDescription) {
    return NextResponse.json(
      { error: "short_description is required (string)" },
      { status: 400 }
    );
  }

  const servings = 2;

  try {
    const generation = await generateChefRecipeV1({
      title,
      short_description: shortDescription,
      servings,
    });

    const recipe = await createChefRecipeDraft({
      title,
      short_description: shortDescription,
      servings: generation.payload.servings,
      cook_time_minutes: generation.payload.cook_time_minutes,
      recipe_json: generation.payload,
      generation_meta: {
        model: generation.model,
        prompt_hash: generation.prompt_hash,
        generated_at: new Date().toISOString(),
        request_id: generation.request_id,
        finish_reason: generation.finish_reason,
      },
    });

    return NextResponse.json({ data: { recipe } });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to generate recipe." },
      { status: 502 }
    );
  }
}

