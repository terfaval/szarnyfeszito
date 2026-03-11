import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById } from "@/lib/birdService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { getSignedImageUrl } from "@/lib/imageService";
import type { ImageRecord } from "@/types/image";
import { getSexComparisonStatus } from "@/lib/sexComparisonService";

const DUO_VARIANT = "main_habitat_pair_sexes_v1" as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const bird = await getBirdById(params.id);

  if (!bird) {
    return NextResponse.json({ error: "Bird not found." }, { status: 404 });
  }

  const { sex_comparison } = await getSexComparisonStatus({ birdId: bird.id });

  const { data, error } = await supabaseServerClient
    .from("images")
    .select("*")
    .eq("entity_type", "bird")
    .eq("entity_id", bird.id)
    .eq("variant", DUO_VARIANT)
    .eq("is_current", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to load current duo image." },
      { status: 400 }
    );
  }

  const image = (data ?? null) as ImageRecord | null;
  const previewUrl = image?.storage_path ? await getSignedImageUrl(image.storage_path) : null;

  return NextResponse.json({
    data: {
      bird: { id: bird.id, slug: bird.slug, name_hu: bird.name_hu, status: bird.status },
      sex_comparison,
      duo_image: image
        ? {
            id: image.id,
            review_status: image.review_status,
            preview_url: previewUrl,
          }
        : null,
    },
  });
}

