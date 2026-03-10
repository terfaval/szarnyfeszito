import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { listBirds, createBird } from "@/lib/birdService";
import {
  BIRD_STATUS_VALUES,
  BirdColorTag,
  BirdSizeCategory,
  BirdStatus,
  BirdVisibilityCategory,
} from "@/types/bird";

const BIRD_SIZE_CATEGORIES: BirdSizeCategory[] = [
  "very_small",
  "small",
  "medium",
  "large",
];

const BIRD_VISIBILITY_CATEGORIES: BirdVisibilityCategory[] = [
  "common_hu",
  "localized_hu",
  "seasonal_hu",
  "rare_hu",
  "not_in_hu",
];

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

function parseColorTags(url: URL): BirdColorTag[] {
  const raw = [
    ...url.searchParams.getAll("color"),
    ...(url.searchParams.get("colors")?.split(",") ?? []),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  const tags = raw.filter((value) => BIRD_COLOR_TAGS.includes(value as BirdColorTag)) as BirdColorTag[];
  return Array.from(new Set(tags));
}

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

  const sizeParam = url.searchParams.get("size_category") ?? undefined;
  const sizeCategory =
    sizeParam && BIRD_SIZE_CATEGORIES.includes(sizeParam as BirdSizeCategory)
      ? (sizeParam as BirdSizeCategory)
      : undefined;

  const visibilityParam = url.searchParams.get("visibility_category") ?? undefined;
  const visibilityCategory =
    visibilityParam &&
    BIRD_VISIBILITY_CATEGORIES.includes(visibilityParam as BirdVisibilityCategory)
      ? (visibilityParam as BirdVisibilityCategory)
      : undefined;

  const colorTags = parseColorTags(url);

  const birds = await listBirds({
    search,
    status,
    sizeCategory,
    visibilityCategory,
    colorTags,
  });

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
