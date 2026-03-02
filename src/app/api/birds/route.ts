import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { listBirds, createBird } from "@/lib/birdService";
import { BIRD_STATUS_VALUES, BirdStatus } from "@/types/bird";

export async function GET(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const statusParam = url.searchParams.get("status") ?? undefined;
  const status =
    statusParam && BIRD_STATUS_VALUES.includes(statusParam as BirdStatus)
      ? (statusParam as BirdStatus)
      : undefined;

  const birds = await listBirds({ search, status });

  return NextResponse.json({ data: birds });
}

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { slug, name_hu, name_latin } = body;

  if (!slug || !name_hu) {
    return NextResponse.json(
      { error: "slug and name_hu are required." },
      { status: 400 }
    );
  }

  const bird = await createBird({ slug, name_hu, name_latin });
  return NextResponse.json({ data: bird }, { status: 201 });
}
