import { NextResponse } from "next/server";
import { getAdminUserFromCookies } from "@/lib/auth";
import {
  createActivityLog,
  deleteActivityLog,
  listActivityLogs,
  updateActivityLog,
} from "@/lib/activityService";
import type { ActivityType } from "@/types/activity";

const VALID_TYPES: ActivityType[] = ["yoga", "strength", "acl", "running"];

const VALID_CATEGORIES: Record<ActivityType, string[]> = {
  yoga: ["relax", "strong"],
  strength: ["easy", "intense"],
  acl: ["routine", "block"],
  running: ["run"],
};

function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && VALID_TYPES.includes(value as ActivityType);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (Array.isArray(value)) {
    return false;
  }

  return true;
}

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

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const {
    date: dateRaw,
    activityType: activityTypeRaw,
    category: categoryRaw,
    label: labelRaw,
    exerciseId,
    durationMinutes,
    distanceKm,
    intensity,
    notes,
    metadata,
  } = body;

  if (
    typeof dateRaw !== "string" ||
    typeof labelRaw !== "string" ||
    !isActivityType(activityTypeRaw) ||
    typeof categoryRaw !== "string"
  ) {
    return NextResponse.json(
      { error: "date, activityType, category and label are required." },
      { status: 400 }
    );
  }

  const activityType = activityTypeRaw;
  const category = categoryRaw;
  const date = dateRaw;
  const label = labelRaw;
  const safeExerciseId = typeof exerciseId === "string" ? exerciseId : null;
  const safeMetadata = isPlainObject(metadata) ? (metadata as Record<string, unknown>) : null;

  if (!VALID_CATEGORIES[activityType].includes(category)) {
    return NextResponse.json(
      { error: `Invalid category for ${activityType}.` },
      { status: 400 }
    );
  }

  const log = await createActivityLog({
    date,
    activityType,
    category,
    exerciseId: safeExerciseId,
    label,
    durationMinutes:
      typeof durationMinutes === "number" ? durationMinutes : null,
    distanceKm:
      typeof distanceKm === "number" ? distanceKm : null,
    intensity: typeof intensity === "number" ? intensity : null,
    notes: typeof notes === "string" ? notes : null,
    metadata: safeMetadata,
  });

  return NextResponse.json({ data: log }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const {
    id,
    date: dateRaw,
    activityType: activityTypeRaw,
    category: categoryRaw,
    label: labelRaw,
    exerciseId,
    durationMinutes,
    distanceKm,
    intensity,
    notes,
    metadata,
  } = body;

  if (
    typeof id !== "string" ||
    typeof dateRaw !== "string" ||
    typeof labelRaw !== "string" ||
    !isActivityType(activityTypeRaw) ||
    typeof categoryRaw !== "string"
  ) {
    return NextResponse.json(
      { error: "id, date, activityType, category and label are required." },
      { status: 400 }
    );
  }

  const activityType = activityTypeRaw;
  const category = categoryRaw;
  const date = dateRaw;
  const label = labelRaw;
  const safeExerciseId = typeof exerciseId === "string" ? exerciseId : null;
  const safeMetadata = isPlainObject(metadata) ? (metadata as Record<string, unknown>) : null;

  if (!VALID_CATEGORIES[activityType].includes(category)) {
    return NextResponse.json(
      { error: `Invalid category for ${activityType}.` },
      { status: 400 }
    );
  }

  const log = await updateActivityLog(id, {
    date,
    activityType,
    category,
    exerciseId: safeExerciseId,
    label,
    durationMinutes: typeof durationMinutes === "number" ? durationMinutes : null,
    distanceKm: typeof distanceKm === "number" ? distanceKm : null,
    intensity: typeof intensity === "number" ? intensity : null,
    notes: typeof notes === "string" ? notes : null,
    metadata: safeMetadata,
  });

  return NextResponse.json({ data: log }, { status: 200 });
}

export async function DELETE(request: Request) {
  const user = await getAdminUserFromCookies();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const { id } = body;

  if (typeof id !== "string") {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  await deleteActivityLog(id);
  return NextResponse.json({ ok: true }, { status: 200 });
}
