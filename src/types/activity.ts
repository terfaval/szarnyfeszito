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
  created_at?: string;
  updated_at?: string;
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
    focus: "Rövid idegrendszeri bekapcsolás jóga vagy futás előtt.",
    exercises: [
      {
        name: "Heel Dig Bridge",
        reps: "2×8",
        detail:
          "Kiinduló: hanyatt fekvés, térd hajlítva, sarkak a talajon. Mozdulat: sarkak nyom, csípő emel lassan, 2 mp tartás, vissza. Fókusz: combhát aktiválódjon, derék ne dolgozzon.",
      },
      {
        name: "Hamstring Walkout",
        reps: "2×5",
        detail:
          "Kiinduló: híd pozíció. Mozdulat: csípő fent marad, sarkakkal 3–4 kis lépés előre, majd vissza. Fókusz: combhát feszül, medence stabil.",
      },
      {
        name: "Kickstand Hinge",
        reps: "2×6/oldal",
        detail:
          "Kiinduló: testsúly az egyik lábon, másik hátul csak támasz. Mozdulat: csípő hátra, törzs előre, visszaállás. Fókusz: csípőből indul a mozgás, térd stabil.",
      },
      {
        name: "Wall Warrior III",
        reps: "3×20-30 mp/oldal",
        detail:
          "Kiinduló: egyik kéz a falon. Mozdulat: csípőből előredőlés, hátsó láb emel. Fókusz: medence nem fordul ki, apró egyensúlykorrekciók.",
      },
      {
        name: "Kontrollált Squat",
        reps: "2×6",
        detail:
          "Mozdulat: csípő hátra, lassú ereszkedés, sarok lent marad. Tempó: 3 mp le. Fókusz: térd követi a lábujjakat.",
      },
    ],
  },
  {
    id: "stability-block",
    label: "Stabilitási blokk (20–25 perc)",
    category: "block",
    focus: "Célzott térdstabilitás, heti 2×.",
    exercises: [
      {
        name: "Single Leg RDL",
        reps: "3×6/oldal",
        detail:
          "Mozdulat: testsúly egy lábon, csípő hátra, törzs előre. Fókusz: talp három pontja stabil, lassú mozgás.",
      },
      {
        name: "Single Leg Bridge",
        reps: "3×8/oldal",
        detail:
          "Mozdulat: egyik láb talajon, másik felemelve, csípő emel. Fókusz: farizom dolgozik, csípő nem billen.",
      },
      {
        name: "Step Back Lunge",
        reps: "3×6/oldal",
        detail:
          "Mozdulat: hátralépés, lassú ereszkedés, visszaállás. Fókusz: elöl lévő térd stabil, törzs egyenes.",
      },
      {
        name: "Side Plank Hip Lift",
        reps: "3×8/oldal",
        detail:
          "Mozdulat: oldalsó plank, csípő le és fel. Fókusz: csípő oldala dolgozik, törzs stabil.",
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
      { name: "Push-up", reps: "3×6-8", detail: "Váll alatt kéz, törzs egyenes, lassú leengedés." },
      { name: "Squat", reps: "3×8-10", detail: "Csípő hátra, sarok stabil." },
      { name: "Glute Bridge", reps: "3×12", detail: "Sarok nyom, csípő emel." },
      { name: "Dead Bug", reps: "3×8/oldal", detail: "Hát a talajon, ellentétes kar-láb nyújt." },
      { name: "Bird Dog", reps: "3×10/oldal", detail: "Négykézláb, ellentétes kar-láb nyújt." },
      { name: "Side Plank", reps: "2×20 mp", detail: "Test egy vonalban." },
    ],
  },
  {
    id: "easy-b",
    label: "Enyhébb teljes testes edzés B",
    category: "easy",
    rounds: "3 kör",
    exercises: [
      { name: "Narrow Push-up", reps: "3×6-8", detail: "Kezek közelebb, tricepsz dolgozik." },
      { name: "Reverse Lunge", reps: "3×8/oldal", detail: "Hátralépés, kontrollált mozgás." },
      { name: "Single-Leg Bridge", reps: "3×8/oldal", detail: "Farizom aktiváció." },
      { name: "Hollow Hold", reps: "3×20 mp", detail: "Hát alsó része talajon, has aktív." },
      { name: "Superman Hold", reps: "3×20 mp", detail: "Hason fekve, kar-láb emel." },
      { name: "Plank Shoulder Tap", reps: "2×20 érintés", detail: "Plank, váll érintés." },
    ],
  },
  {
    id: "intense-a",
    label: "Intenzív teljes testes edzés A",
    category: "intense",
    rounds: "4 kör",
    exercises: [
      { name: "Decline Push-up", reps: "3×6", detail: "Láb megemelve, váll erősítés." },
      { name: "Squat", reps: "3×10", detail: "Lassú ereszkedés." },
      { name: "Reverse Lunge", reps: "3×8/oldal", detail: "Stabil térd." },
      { name: "Single-Leg Bridge", reps: "3×10", detail: "Farizom fókusz." },
      { name: "Side Plank Hip Lift", reps: "3×10", detail: "Csípő emelés." },
      { name: "Superman Hold", reps: "3×30 mp", detail: "Hason fekve, kar-láb emel." },
    ],
  },
  {
    id: "intense-b",
    label: "Intenzív teljes testes edzés B",
    category: "intense",
    rounds: "4 kör",
    exercises: [
      { name: "Pike Push-up", reps: "3×6-8", detail: "Csípő magas, váll tolóerő." },
      { name: "Wide Squat", reps: "3×10-12", detail: "Széles állás, térd kifelé." },
      { name: "Step Squat", reps: "3×10", detail: "Guggolás + oldal lépés." },
      { name: "Glute Bridge Hold", reps: "3×30 mp", detail: "Csípő fent tart." },
      { name: "Hollow Hold", reps: "3×30 mp", detail: "Hát alsó része talajon, has aktív." },
      { name: "Bird Dog", reps: "3×12/oldal", detail: "Négykézláb, ellentétes kar-láb nyújt." },
    ],
  },
];

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  yoga: "#f97316",
  strength: "#0ea5e9",
  acl: "#14b8a6",
  running: "#facc15",
};
