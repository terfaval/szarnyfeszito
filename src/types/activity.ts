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
    label: "Aktiváló rutin",
    category: "routine",
    focus: "10–12 perc · rövid idegrendszeri bekapcsolás jóga vagy futás előtt.",
    exercises: [
      {
        name: "Heel Dig Bridge",
        reps: "2×8",
        detail:
          "Kiinduló: hanyatt fekvés, térd hajlítva, sarkak a talajon.\nMozdulat: sarkak nyom, csípő emel lassan, 2 mp tartás, vissza.\nFókusz: combhát aktiválódjon, derék ne dolgozzon.",
      },
      {
        name: "Hamstring Walkout",
        reps: "2×5",
        detail:
          "Kiinduló: híd pozíció.\nMozdulat: csípő fent marad, sarkakkal 3–4 kis lépés előre, majd vissza.\nFókusz: combhát feszül, medence stabil.",
      },
      {
        name: "Kickstand Hinge",
        reps: "2×6/oldal",
        detail:
          "Kiinduló: testsúly az egyik lábon, másik hátul csak támasz.\nMozdulat: csípő hátra, törzs előre, visszaállás.\nFókusz: csípőből indul a mozgás, térd stabil.",
      },
      {
        name: "Wall Warrior III",
        reps: "3×20-30 mp/oldal",
        detail:
          "Kiinduló: egyik kéz a falon.\nMozdulat: csípőből előredőlés, hátsó láb emel.\nFókusz: medence nem fordul ki, apró egyensúlykorrekciók.",
      },
    ],
  },
  {
    id: "acl-stability-patch",
    label: "ACL fejlesztő",
    category: "block",
    focus: "20–25 perc · ACL stabilitás patch.",
    exercises: [
      {
        name: "Heel Dig Bridge",
        reps: "2×8",
        detail:
          "Kiinduló: hanyatt fekvés, térd hajlítva.\nMozdulat: sarkak nyom, csípő emel.\nFókusz: combhát + farizom, derék ne dolgozzon.",
      },
      {
        name: "Hamstring Walkout",
        reps: "2×5",
        detail:
          "Kiinduló: híd pozíció.\nMozdulat: csípő fent, 3–4 kis saroklépés előre és vissza.\nFókusz: combhát feszül, medence stabil.",
      },
      {
        name: "Kickstand Hinge",
        reps: "2×6/oldal",
        detail:
          "Kiinduló: egyik lábon terhelés, a másik csak támasz.\nMozdulat: csípő hátra, törzs előre, vissza.\nFókusz: csípőből indul, térd stabil.",
      },
      {
        name: "Fal melletti Warrior III",
        reps: "3×20 mp/oldal",
        detail:
          "Kiinduló: fal mellett könnyű támasz.\nMozdulat: csípőből dőlés, hátsó láb emel.\nFókusz: medence nem fordul, egyensúly kontroll.",
      },
    ],
  },
  {
    id: "single-leg-stability",
    label: "Egylábas stabilitás",
    category: "block",
    focus: "Egylábas stabilitás · egyensúly és propriocepció.",
    exercises: [
      {
        name: "Single Leg Balance",
        reps: "30 mp/oldal",
        detail:
          "Kiinduló: állás egy lábon.\nMozdulat: apró korrekciók, stabil légzés.\nFókusz: talp 3 pontja, csípő nem billen.",
      },
      {
        name: "Single Leg RDL",
        reps: "3×6/oldal",
        detail:
          "Kiinduló: testsúly egy lábon.\nMozdulat: csípő hátra, törzs előre, vissza.\nFókusz: lassú kontroll, térd stabil.",
      },
      {
        name: "Lateral Step",
        reps: "10/oldal",
        detail:
          "Kiinduló: félguggolás közeli helyzet.\nMozdulat: oldalra lépés, vissza.\nFókusz: csípő stabil, térd a lábfej irányát követi.",
      },
      {
        name: "Single Leg Mini Squat",
        reps: "6/oldal",
        detail:
          "Kiinduló: állás egy lábon.\nMozdulat: kis guggolás, lassú fel.\nFókusz: térd nem esik be, talp stabil.",
      },
    ],
  },
  {
    id: "squat-control",
    label: "Guggoló stabilitás",
    category: "block",
    focus: "Squat kontroll · guggolásmechanika javítása.",
    exercises: [
      {
        name: "Box Squat",
        reps: "3×6",
        detail:
          "Kiinduló: doboz/szék mögött.\nMozdulat: csípő hátra, érintés, fel.\nFókusz: kontrollált mélység, sarok lent.",
      },
      {
        name: "Goblet-style Bodyweight Squat",
        reps: "3×8",
        detail:
          "Kiinduló: kéz előre (mintha súlyt tartanál).\nMozdulat: guggolás, fel.\nFókusz: törzs függőleges, térd követi a lábujjat.",
      },
      {
        name: "Pause Squat",
        reps: "3×5",
        detail:
          "Mozdulat: guggolás alján 2 mp tartás.\nFókusz: stabil térd- és törzstartás.",
      },
      {
        name: "Heel Elevated Squat",
        reps: "3×6",
        detail:
          "Kiinduló: sarok megemelve (pl. könyv/törölköző).\nMozdulat: guggolás.\nFókusz: boka mobilitás támogatása, kontrollált térd.",
      },
    ],
  },
  {
    id: "hip-stability",
    label: "Csípő stabilitás",
    category: "block",
    focus: "Csípő stabilitás · glute med + glute max.",
    exercises: [
      {
        name: "Side Plank Hip Lift",
        reps: "3×8/oldal",
        detail:
          "Mozdulat: oldalsó plankben csípő le/fel.\nFókusz: törzs stabil, csípő oldala dolgozik.",
      },
      {
        name: "Lateral Walk",
        reps: "10/oldal",
        detail:
          "Kiinduló: enyhe térdhajlítás.\nMozdulat: oldalra lépés sorozat.\nFókusz: csípő nem billeg, lábfej stabil.",
      },
      {
        name: "Single Leg Bridge",
        reps: "3×8/oldal",
        detail:
          "Mozdulat: csípő emel egy lábon.\nFókusz: farizom dolgozik, medence nem fordul.",
      },
      {
        name: "Hip Airplane (egyszerűsített)",
        reps: "5/oldal",
        detail:
          "Kiinduló: csípőből döntött helyzet.\nMozdulat: medence finom nyit-zár.\nFókusz: stabil bokatérd, kontrollált mozgás.",
      },
    ],
  },
  {
    id: "core-posture",
    label: "Core stabilitás",
    category: "block",
    focus: "Core + testtartás · törzs stabilitás és hát aktiváció.",
    exercises: [
      {
        name: "Dead Bug",
        reps: "3×8/oldal",
        detail:
          "Kiinduló: hanyatt, derék neutrál.\nMozdulat: ellentétes kar-láb nyújt.\nFókusz: hát lent marad.",
      },
      {
        name: "Hollow Hold",
        reps: "3×20 mp",
        detail:
          "Mozdulat: bordák le, has aktív.\nFókusz: derék nem emelkedik el.",
      },
      {
        name: "Superman Hold",
        reps: "3×20 mp",
        detail:
          "Mozdulat: hason fekve kar-láb emel.\nFókusz: lapocka + farizom aktiváció.",
      },
      {
        name: "Bird Dog",
        reps: "3×10/oldal",
        detail:
          "Kiinduló: négykézláb.\nMozdulat: ellentétes kar-láb nyújt.\nFókusz: medence stabil, lassú kontroll.",
      },
      {
        name: "Plank Shoulder Tap",
        reps: "2×20 érintés",
        detail:
          "Kiinduló: plank.\nMozdulat: váll érintés váltott kézzel.\nFókusz: csípő nem billeg.",
      },
    ],
  },
];

export const STRENGTH_WORKOUTS: StrengthWorkout[] = [
  {
    id: "easy-a",
    label: "Csendes Acél",
    category: "easy",
    rounds: "3 kör",
    exercises: [
      { name: "Push-up", reps: "3×6-8", detail: "Váll alatt kéz, törzs egyenes, lassú leengedés." },
      { name: "Squat", reps: "3×8-10", detail: "Csípő hátra, sarok stabil." },
      { name: "Glute Bridge", reps: "3×12", detail: "Sarok nyom, csípő emel." },
      { name: "Dead Bug", reps: "3×8/oldal", detail: "Hát a talajon, ellentétes kar-láb nyújt." },
      { name: "Bird Dog", reps: "3×10/oldal", detail: "Négykézláb, ellentétes kar-láb nyújt." },
    ],
  },
  {
    id: "easy-b",
    label: "Farkaslépés",
    category: "easy",
    rounds: "3 kör",
    exercises: [
      { name: "Narrow Push-up", reps: "3×6-8", detail: "Kezek közelebb, tricepsz dolgozik." },
      { name: "Reverse Lunge", reps: "3×8/oldal", detail: "Hátralépés, kontrollált mozgás." },
      { name: "Single Leg Bridge", reps: "3×8/oldal", detail: "Farizom fókusz." },
      { name: "Side Plank", reps: "3×20 mp/oldal", detail: "Test egy vonalban." },
      { name: "Superman Hold", reps: "3×20 mp", detail: "Hason fekve, kar-láb emel." },
    ],
  },
  {
    id: "intense-a",
    label: "Viharverő",
    category: "intense",
    rounds: "4 kör",
    exercises: [
      { name: "Decline Push-up", reps: "3×6", detail: "Láb megemelve, váll erősítés." },
      { name: "Squat", reps: "3×10", detail: "Lassú ereszkedés." },
      { name: "Reverse Lunge", reps: "3×8/oldal", detail: "Stabil térd." },
      { name: "Single Leg Bridge", reps: "3×10/oldal", detail: "Farizom erő." },
      { name: "Hollow Hold", reps: "3×30 mp", detail: "Core feszítés." },
    ],
  },
  {
    id: "intense-b",
    label: "Hegylánc",
    category: "intense",
    rounds: "4 kör",
    exercises: [
      { name: "Pike Push-up", reps: "3×6-8", detail: "Csípő magas, váll tolóerő." },
      { name: "Wide Squat", reps: "3×10-12", detail: "Széles állás, térd kifelé." },
      { name: "Step Squat", reps: "3×10", detail: "Guggolás + oldal lépés." },
      { name: "Bridge Hold", reps: "3×30 mp", detail: "Csípő fent tart." },
      { name: "Bird Dog", reps: "3×12/oldal", detail: "Stabil törzs." },
    ],
  },
];

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  yoga: "#f97316",
  strength: "#0ea5e9",
  acl: "#14b8a6",
  running: "#facc15",
};
