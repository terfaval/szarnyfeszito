import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { deleteBirdById, getBirdById, updateBird } from "@/lib/birdService";
import { supabaseServerClient } from "@/lib/supabaseServerClient";
import { BirdColorTag } from "@/types/bird";

const BIRD_COLOR_TAGS: BirdColorTag[] = [
  "white",
  "black",
  "grey",
  "brown",
  "yellow",
  "orange",
  "red",
  "green",
  "blue",
];

function parseColorTags(value: unknown): BirdColorTag[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const cleaned = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => BIRD_COLOR_TAGS.includes(item as BirdColorTag)) as BirdColorTag[];

  return Array.from(new Set(cleaned));
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const body = await request.json().catch(() => ({}));

  const existing = await getBirdById(params.id);

  if (!existing) {
    return NextResponse.json({ error: "Bird not found." }, { status: 404 });
  }

  const requestedStatus = typeof body.status === "string" ? body.status : undefined;

  if (existing.status === "published" && requestedStatus && requestedStatus !== "published") {
    return NextResponse.json(
      { error: "Published birds cannot be moved back to an earlier status." },
      { status: 400 }
    );
  }

  if (requestedStatus === "published") {
    if (existing.status !== "images_approved" && existing.status !== "published") {
      return NextResponse.json(
        { error: "Bird must reach images_approved before publishing." },
        { status: 400 }
      );
    }

    const requiredVariants = ["main_habitat", "fixed_pose_icon_v1"] as const;

    const { data, error } = await supabaseServerClient
      .from("images")
      .select("variant, review_status")
      .eq("entity_type", "bird")
      .eq("entity_id", params.id)
      .eq("is_current", true)
      .in("variant", [...requiredVariants]);

    if (error) {
      return NextResponse.json(
        { error: (error as Error)?.message ?? "Unable to validate publish gate." },
        { status: 400 }
      );
    }

    const approvedByVariant = new Map<string, boolean>();
    (data ?? []).forEach((row) => {
      approvedByVariant.set(row.variant, row.review_status === "approved");
    });

    const gateOk = requiredVariants.every((variant) => approvedByVariant.get(variant) === true);

    if (!gateOk) {
      return NextResponse.json(
        { error: "Publish gate locked: required images must be approved." },
        { status: 400 }
      );
    }
  }

  const payload = {
    id: params.id,
    slug: body.slug,
    name_hu: body.name_hu,
    name_latin: body.name_latin,
    status: requestedStatus,
    color_tags: parseColorTags(body.color_tags),
    published_at:
      requestedStatus === "published" ? new Date().toISOString() : undefined,
    published_revision:
      requestedStatus === "published"
        ? (existing.published_revision ?? 0) + 1
        : undefined,
  };

  try {
    const bird = await updateBird(payload);
    return NextResponse.json({ data: bird });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to update bird." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const existing = await getBirdById(params.id);

  if (!existing) {
    return NextResponse.json({ error: "Bird not found." }, { status: 404 });
  }

  if (existing.status === "published") {
    return NextResponse.json(
      { error: "Published birds cannot be deleted." },
      { status: 400 }
    );
  }

  try {
    await deleteBirdById(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to delete bird." },
      { status: 400 }
    );
  }
}
