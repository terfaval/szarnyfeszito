import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUserFromCookies } from "@/lib/auth";
import { getBirdById } from "@/lib/birdService";
import { approveBirdClassification } from "@/lib/birdClassificationService";

const approveSchema = z.object({
  size_category: z
    .enum(["very_small", "small", "medium", "large"])
    .nullable()
    .optional(),
  visibility_category: z.enum(["frequent", "seasonal", "rare"]).nullable().optional(),
  approved_source: z.enum(["manual", "ai_suggestion"]).optional(),
});

const normalizeNullableEnum = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
};

export async function POST(
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
  const bird = await getBirdById(params.id);

  if (!bird) {
    return NextResponse.json({ error: "Bird not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  const parsed = approveSchema.safeParse({
    size_category: normalizeNullableEnum(body?.size_category),
    visibility_category: normalizeNullableEnum(body?.visibility_category),
    approved_source: normalizeNullableEnum(body?.approved_source) ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await approveBirdClassification({
      bird,
      sizeCategory: parsed.data.size_category ?? null,
      visibilityCategory: parsed.data.visibility_category ?? null,
      approvedBy: user.id,
      approvedByLabel: user.email,
      approvedSource: parsed.data.approved_source ?? "manual",
    });
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to approve classification." },
      { status: 400 }
    );
  }
}

