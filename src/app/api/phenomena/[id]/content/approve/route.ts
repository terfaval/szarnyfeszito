import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getPhenomenonById, updatePhenomenon } from "@/lib/phenomenonService";
import {
  getLatestContentBlockForPhenomenon,
  updatePhenomenonContentBlockMeta,
} from "@/lib/phenomenonContentService";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const phenomenon = await getPhenomenonById(id);
  if (!phenomenon) {
    return NextResponse.json({ error: "Phenomenon not found." }, { status: 404 });
  }

  const block = await getLatestContentBlockForPhenomenon(phenomenon.id);
  if (!block) {
    return NextResponse.json({ error: "No generated content block found for this phenomenon." }, { status: 404 });
  }

  const updatedBlock = await updatePhenomenonContentBlockMeta({
    block_id: block.id,
    review_status: "approved",
  });

  const updatedPhenomenon = await updatePhenomenon({
    id: phenomenon.id,
    status: phenomenon.status === "published" ? "published" : "reviewed",
  });

  return NextResponse.json({ data: { phenomenon: updatedPhenomenon, content_block: updatedBlock } });
}

