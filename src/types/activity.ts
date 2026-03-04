export type ActivityType = "yoga" | "strength" | "acl" | "running";
export type YogaCategory = "relax" | "strong";
export type StrengthCategory = "easy" | "intense";
export type ACLCategory = "routine" | "block";

export type ExerciseEntry = {
  name: string;
  reps: string;
  detail?: string;
};

export type YogaLibraryEntry = {
  id: string;
  label: string;
  description: string;
  durationMinutes: number;
  intensity: 1 | 2 | 3;
  category: YogaCategory;
  icon: string;
};

export type ACLRoutine = {
  id: string;
  label: string;
  category: ACLCategory;
  exercises: ExerciseEntry[];
  focus: string;
};

export type StrengthWorkout = {
  id: string;
  label: string;
  category: StrengthCategory;
  rounds: string;
  exercises: ExerciseEntry[];
};

export type ActivityLogRow = {
  id: string;
  date: string;
  activity_type: ActivityType;
  category: string;
  exercise_id: string | null;
  label: string;
  duration_minutes: number | null;
  distance_km: number | null;
  intensity: number | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

export const YOGA_LIBRARY: YogaLibraryEntry[] = [
  {
    id: "calm-waters",
    label: "Calm Waters Flow",
    description: "Lassú, hullámzó mozdulatok a mellkas és gerinc megnyitásához.",
    durationMinutes: 12,
    intensity: 1,
    category: "relax",
    icon: "waves",
  },
  {
    id: "grounded-lullaby",
    label: "Grounded Lullaby",
    description: "Széles állás, tartott hip stretch és mély hasi légzés.",
    durationMinutes: 10,
    intensity: 1,
    category: "relax",
    icon: "lotus",
  },
  {
    id: "iron-hold",
    label: "Iron Hold",
    description: "Fokozott tartású kitartások és erősítő flow, amiben a láb és core dolgozik.",
    durationMinutes: 16,
    intensity: 3,
    category: "strong",
    icon: "shield",
  },
  {
    id: "sun-ascend",
    label: "Sun Ascend",
    description: "Dinamikus napüdvözletek és lendületes állások, melyek intelligens tartást igényelnek.",
    durationMinutes: 14,
    intensity: 2,
    category: "strong",
    icon: "sun",
  },
];

export const ACL_ROUTINES: ACLRoutine[] = [
  {
    id: "activation-routine",
    label: "Aktiváló rutin (10–12 perc)",
    category: "routine",
    focus: "Kezdőrutin futás vagy jóga előtt az alsótest aktiválására.",
    exercises: [
      {
        name: "Heel Dig Bridge",
        reps: "2×8",
        detail: "Nyomd a sarkakat, emeld a csípőt, tartsd 2 mp-ig, lassan engedd vissza (tempó 3-2-3).",
      },
      {
        name: "Hamstring Walkout",
        reps: "2×5",
        detail: "Híd pozícióból 3-4 lépés előre a sarkakkal, majd vissza; csípő marad magas.",
      },
      {
        name: "Kickstand Hinge",
        reps: "2×6/oldal",
        detail: "Testsúly 80% az előre lévő lábon, hingelj vissza, majd vissza; tempó 3 mp le – 2 mp fel.",
      },
      {
        name: "Wall Warrior III",
        reps: "3×20-30 mp/oldal",
        detail: "Egymás mellett a fal, csípőből előrelendülés, hátulsó láb emel; fókusz a finom korrekciók.",
      },
      {
        name: "Kontrollált Squat",
        reps: "2×6",
        detail: "Csípőszélesség, lassú guggolás, sarok a talajon marad; tempó 3 mp le – 1 mp fel.",
      },
    ],
  },
  {
    id: "stability-block",
    label: "Stabilitási blokk (20–25 perc)",
    category: "block",
    focus: "Heti két alkalommal végezhető stabilitásépítő szett.",
    exercises: [
      {
        name: "Single Leg RDL",
        reps: "3×6/oldal",
        detail: "Tempó 4 mp le – 1 mp fel, csípő hátra, hárompontos talp stabilitás.",
      },
      {
        name: "Single Leg Bridge",
        reps: "3×8/oldal",
        detail: "Nyomd a sarkat, emeld a csípőt, fókusz a kontrollált lenyomásra.",
      },
      {
        name: "Step Back Lunge",
        reps: "3×6/oldal",
        detail: "Hátralépéses kitörés, elülső térd stabilan marad, nem esik befelé.",
      },
      {
        name: "Side Plank Hip Lift",
        reps: "3×8/oldal",
        detail: "Oldalsó plankből csípőemelés, kontrollált mozdulat.",
      },
    ],
  },
];

export const STRENGTH_WORKOUTS: StrengthWorkout[] = [
  {
    id: "easy-a",
    label: "Enyhébb teljes testes edzés A",
    category: "easy",
    rounds: "3 kör",
    exercises: [
      { name: "Push-up", reps: "3×6-8" },
      { name: "Squat", reps: "3×8-10" },
      { name: "Glute Bridge", reps: "3×12" },
      { name: "Dead Bug", reps: "3×8/oldal" },
      { name: "Bird Dog", reps: "3×10/oldal" },
      { name: "Side Plank", reps: "2×20 mp" },
    ],
  },
  {
    id: "easy-b",
    label: "Enyhébb teljes testes edzés B",
    category: "easy",
    rounds: "3 kör",
    exercises: [
      { name: "Narrow Push-up", reps: "3×6-8" },
      { name: "Reverse Lunge", reps: "3×8/oldal" },
      { name: "Single-Leg Bridge", reps: "3×8/oldal" },
      { name: "Hollow Hold", reps: "3×20 mp" },
      { name: "Superman Hold", reps: "3×20 mp" },
      { name: "Plank Shoulder Tap", reps: "2×20 érintés" },
    ],
  },
  {
    id: "intense-a",
    label: "Intenzív teljes testes edzés A",
    category: "intense",
    rounds: "4 kör",
    exercises: [
      { name: "Decline Push-up", reps: "3×6" },
      { name: "Squat", reps: "3×10" },
      { name: "Reverse Lunge", reps: "3×8/oldal" },
      { name: "Single-Leg Bridge", reps: "3×10" },
      { name: "Side Plank Hip Lift", reps: "3×10" },
      { name: "Superman Hold", reps: "3×30 mp" },
    ],
  },
  {
    id: "intense-b",
    label: "Intenzív teljes testes edzés B",
    category: "intense",
    rounds: "4 kör",
    exercises: [
      { name: "Pike Push-up", reps: "3×6-8" },
      { name: "Wide Squat", reps: "3×10-12" },
      { name: "Step Squat", reps: "3×10" },
      { name: "Glute Bridge Hold", reps: "3×30 mp" },
      { name: "Hollow Hold", reps: "3×30 mp" },
      { name: "Bird Dog", reps: "3×12/oldal" },
    ],
  },
];

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  yoga: "#f97316",
  strength: "#0ea5e9",
  acl: "#14b8a6",
  running: "#facc15",
};
