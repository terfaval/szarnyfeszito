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
    .order("date", { ascending: false });

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

export async function upsertActivityLog(payload: ActivityLogPayload) {
  const { data, error } = await supabaseServerClient
    .from("activity_logs")
    .upsert(
      {
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
      },
      { onConflict: "date,activity_type" }
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as ActivityLogRow;
}
