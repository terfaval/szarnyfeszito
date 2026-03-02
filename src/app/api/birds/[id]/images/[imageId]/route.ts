import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { updateImageReviewStatus } from "@/lib/imageService";
import { ImageReviewStatus } from "@/types/image";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; imageId: string }> }
) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = body.review_status as ImageReviewStatus | undefined;

  if (!status) {
    return NextResponse.json(
      { error: "review_status is required." },
      { status: 400 }
    );
  }

  try {
    const image = await updateImageReviewStatus(params.imageId, status);

    if (image.entity_id !== params.id) {
      return NextResponse.json(
        { error: "Image does not belong to this bird." },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: image });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to update image status." },
      { status: 400 }
    );
  }
}
