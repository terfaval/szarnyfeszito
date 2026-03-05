import { supabaseServerClient } from "@/lib/supabaseServerClient";
import type { ActivityLogRow, ActivityType } from "@/types/activity";

export type ActivityLogFilters = {
  startDate?: string;
  endDate?: string;
};

export async function listActivityLogs(filters: ActivityLogFilters = {}) {
  const query = supabaseServerClient
    .from("activity_logs")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.startDate) {
    query.gte("date", filters.startDate);
  }

  if (filters.endDate) {
    query.lte("date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as ActivityLogRow[];
}

export type ActivityLogPayload = {
  date: string;
  activityType: ActivityType;
  category: string;
  label: string;
  exerciseId?: string | null;
  durationMinutes?: number | null;
  distanceKm?: number | null;
  intensity?: number | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function createActivityLog(payload: ActivityLogPayload) {
  const { data, error } = await supabaseServerClient
    .from("activity_logs")
    .insert({
      date: payload.date,
      activity_type: payload.activityType,
      category: payload.category,
      label: payload.label,
      exercise_id: payload.exerciseId ?? null,
      duration_minutes: payload.durationMinutes ?? null,
      distance_km: payload.distanceKm ?? null,
      intensity: payload.intensity ?? null,
      notes: payload.notes ?? null,
      metadata: payload.metadata ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ActivityLogRow;
}

export async function updateActivityLog(id: string, payload: ActivityLogPayload) {
  const { data, error } = await supabaseServerClient
    .from("activity_logs")
    .update({
      date: payload.date,
      activity_type: payload.activityType,
      category: payload.category,
      label: payload.label,
      exercise_id: payload.exerciseId ?? null,
      duration_minutes: payload.durationMinutes ?? null,
      distance_km: payload.distanceKm ?? null,
      intensity: payload.intensity ?? null,
      notes: payload.notes ?? null,
      metadata: payload.metadata ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ActivityLogRow;
}

export async function deleteActivityLog(id: string) {
  const { error } = await supabaseServerClient.from("activity_logs").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export type YogaTemplate = {
  id: string;
  category: "relax" | "strong";
  label: string;
  durationMinutes: number | null;
  intensity: number | null;
  link: string | null;
  lastUsedDate: string;
};

export async function listYogaTemplates(limit = 500) {
  const { data, error } = await supabaseServerClient
    .from("activity_logs")
    .select("date, category, label, duration_minutes, intensity, metadata, activity_type")
    .eq("activity_type", "yoga")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const templatesByKey = new Map<string, YogaTemplate>();

  (data ?? []).forEach((row: any) => {
    const category = row.category === "strong" ? "strong" : "relax";
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) {
      return;
    }

    const durationMinutes = typeof row.duration_minutes === "number" ? row.duration_minutes : null;
    const intensity = typeof row.intensity === "number" ? row.intensity : null;
    const link =
      row.metadata && typeof row.metadata === "object" && typeof row.metadata.link === "string"
        ? row.metadata.link
        : null;

    const key = JSON.stringify({
      category,
      label,
      durationMinutes,
      intensity,
      link,
    });

    if (templatesByKey.has(key)) {
      return;
    }

    templatesByKey.set(key, {
      id: key,
      category,
      label,
      durationMinutes,
      intensity,
      link,
      lastUsedDate: typeof row.date === "string" ? row.date : "",
    });
  });

  return Array.from(templatesByKey.values()) as YogaTemplate[];
}
