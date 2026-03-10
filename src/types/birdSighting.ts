export type BirdSightingBird = {
  id: string;
  slug: string;
  name_hu: string;
};

export type BirdSighting = {
  id: string;
  place_id: string | null;
  seen_at: string;
  notes: string | null;
  birds: BirdSightingBird[];
};

export type BirdSightingCreateInput = {
  createdBy: string;
  placeId: string;
  birdIds: string[];
  seenAt?: string;
  notes?: string | null;
};
