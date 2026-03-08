import { NextRequest, NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { uploadManualBirdImageVariant } from "@/lib/imageService";
import type { ImageStyleFamily, ImageVariant } from "@/types/image";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const formData = await request.formData();

  const styleFamily = formData.get("style_family");
  const variant = formData.get("variant");
  const file = formData.get("file");

  if (typeof styleFamily !== "string" || typeof variant !== "string") {
    return NextResponse.json(
      { error: "style_family and variant are required." },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file is required." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const image = await uploadManualBirdImageVariant({
      birdId: params.id,
      styleFamily: styleFamily as ImageStyleFamily,
      variant: variant as ImageVariant,
      pngBuffer: buffer,
      createdBy: user.email,
    });

    return NextResponse.json({ data: image });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Unable to upload image." },
      { status: 400 }
    );
  }
}

