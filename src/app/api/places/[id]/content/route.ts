import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPlaceById } from "@/lib/placeService";
import { createPlaceUiVariantsBlock, getLatestContentBlockForPlace } from "@/lib/placeContentService";
import { placeUiVariantsSchemaV1 } from "@/lib/placeContentSchema";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const place = await getPlaceById(id);
  if (!place) {
    return NextResponse.json({ error: "Place not found." }, { status: 404 });
  }

  const existing = await getLatestContentBlockForPlace(place.id);
  if (!existing || !existing.blocks_json) {
    return NextResponse.json({ error: "No place content exists yet." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const incomingVariants = typeof body?.variants === "object" && body.variants ? body.variants : null;
  if (!incomingVariants) {
    return NextResponse.json({ error: "variants is required." }, { status: 400 });
  }

  const merged = {
    ...existing.blocks_json,
    variants: {
      ...(existing.blocks_json as any).variants,
      ...(incomingVariants as any),
      seasonal_snippet: {
        ...((existing.blocks_json as any).variants?.seasonal_snippet ?? {}),
        ...((incomingVariants as any)?.seasonal_snippet ?? {}),
      },
    },
  };

  const parsed = placeUiVariantsSchemaV1.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Place content validation failed.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const meta = existing.generation_meta ?? {
    model: "manual",
    prompt_hash: "manual",
    generated_at: new Date().toISOString(),
  };

  const nextMeta = {
    ...meta,
    generated_at: new Date().toISOString(),
  };

  const newBlock = await createPlaceUiVariantsBlock({
    place_id: place.id,
    payload: parsed.data,
    generation_meta: nextMeta as any,
    review_status: "draft",
  });

  return NextResponse.json({ data: { place, content_block: newBlock } });
}

