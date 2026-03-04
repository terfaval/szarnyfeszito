import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import { listActivityLogs, upsertActivityLog } from "@/lib/activityService";
import type { ActivityType } from "@/types/activity";

const VALID_TYPES: ActivityType[] = ["yoga", "strength", "acl", "running"];

const VALID_CATEGORIES: Record<ActivityType, string[]> = {
  yoga: ["relax", "strong"],
  strength: ["easy", "intense"],
  acl: ["routine", "block"],
  running: ["run"],
};

function buildMonthFilters(month?: string) {
  if (!month) {
    return {};
  }

  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  if (
    Number.isNaN(year) ||
    Number.isNaN(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return {};
  }

  const startDate = `${yearPart}-${monthPart.padStart(2, "0")}-01`;
  const endDay = new Date(year, monthIndex + 1, 0).getDate();
  const endDate = `${yearPart}-${monthPart.padStart(2, "0")}-${String(
    endDay
  ).padStart(2, "0")}`;

  return {
    startDate,
    endDate,
  };
}

export async function GET(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? undefined;
  const filters = buildMonthFilters(month);

  const logs = await listActivityLogs(filters);
  return NextResponse.json({ data: logs });
}

export async function POST(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    date,
    activityType,
    category,
    label,
    exerciseId,
    durationMinutes,
    distanceKm,
    intensity,
    notes,
    metadata,
  } = body;

  if (
    !date ||
    !activityType ||
    !label ||
    !category ||
    !VALID_TYPES.includes(activityType)
  ) {
    return NextResponse.json(
      { error: "date, activityType, category and label are required." },
      { status: 400 }
    );
  }

  if (!VALID_CATEGORIES[activityType].includes(category)) {
    return NextResponse.json(
      { error: `Invalid category for ${activityType}.` },
      { status: 400 }
    );
  }

  const log = await upsertActivityLog({
    date,
    activityType,
    category,
    exerciseId: exerciseId ?? null,
    label,
    durationMinutes:
      typeof durationMinutes === "number" ? durationMinutes : null,
    distanceKm:
      typeof distanceKm === "number" ? distanceKm : null,
    intensity: typeof intensity === "number" ? intensity : null,
    notes: typeof notes === "string" ? notes : null,
    metadata: metadata ?? null,
  });

  return NextResponse.json({ data: log }, { status: 201 });
}
