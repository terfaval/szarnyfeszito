import { NextResponse } from "next/server";
import { listPublishedPlaceMarkers } from "@/lib/placeService";

export async function GET() {
  const markers = await listPublishedPlaceMarkers();
  return NextResponse.json({ data: { markers } });
}

