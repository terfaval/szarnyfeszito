import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPhenomenonById } from "@/lib/phenomenonService";
import {
  createPhenomenonUiVariantsBlock,
  getLatestContentBlockForPhenomenon,
} from "@/lib/phenomenonContentService";
import { phenomenonUiVariantsSchemaV1 } from "@/lib/phenomenonContentSchema";
import type { GenerationMeta } from "@/types/dossier";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) {
    return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });
  }

  const existing = await getLatestContentBlockForPhenomenon(phenomenon.id);
  if (!existing || !existing.blocks_json) {
    return NextResponse.json({ error: "No phenomenon content exists yet." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const incomingVariants = typeof body?.variants === "object" && body.variants ? body.variants : null;
  if (!incomingVariants) {
    return NextResponse.json({ error: "variants is required." }, { status: 400 });
  }

  const incoming = incomingVariants as Record<string, unknown>;
  const merged = {
    ...existing.blocks_json,
    variants: {
      ...existing.blocks_json.variants,
      ...incoming,
    },
  };

  const parsed = phenomenonUiVariantsSchemaV1.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Phenomenon content validation failed.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const meta: GenerationMeta =
    existing.generation_meta && typeof existing.generation_meta === "object"
      ? (existing.generation_meta as GenerationMeta)
      : { model: "manual", prompt_hash: "manual", generated_at: new Date().toISOString() };

  const nextMeta: GenerationMeta = { ...meta, generated_at: new Date().toISOString() };

  const newBlock = await createPhenomenonUiVariantsBlock({
    phenomenon_id: phenomenon.id,
    payload: parsed.data,
    generation_meta: nextMeta,
    review_status: "draft",
  });

  return NextResponse.json({ data: { phenomenon, content_block: newBlock } });
}
