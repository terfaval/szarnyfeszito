import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { updateBird } from "@/lib/birdService";

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

  const payload = {
    id: params.id,
    slug: body.slug,
    name_hu: body.name_hu,
    name_latin: body.name_latin,
    status: body.status,
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
