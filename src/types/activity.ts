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
  baseRounds?: number;
  progression?: {
    repEvery: number;
    roundEvery: number;
    timeIncrementSeconds: number;
  };
  isPrimary?: boolean;
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
  user_id?: string | null;
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
    id: "strength-a",
    label: "Er?s?t?s A",
    category: "easy",
    rounds: "3 k?r",
    baseRounds: 3,
    progression: {
      repEvery: 2,
      roundEvery: 5,
      timeIncrementSeconds: 5,
    },
    isPrimary: true,
    exercises: [
      {
        name: "Single Leg RDL",
        reps: "3?6/oldal",
        detail: `Kiindul?: tests?ly egy l?bon.
Mozdulat: cs?p? h?tra, t?rzs el?re, vissza.
F?kusz: lass? kontroll, t?rd stabil.`,
      },
      {
        name: "Reverse Lunge",
        reps: "3?8/oldal",
        detail: "H?tral?p?s, kontroll?lt mozg?s.",
      },
      {
        name: "Squat",
        reps: "3?10",
        detail: "Lass? ereszked?s.",
      },
      {
        name: "Single Leg Bridge",
        reps: "3?10/oldal",
        detail: "Farizom er?.",
      },
      {
        name: "Side Plank Hip Lift",
        reps: "3?10/oldal",
        detail: `Mozdulat: oldals? plankben cs?p? le/fel.
F?kusz: t?rzs stabil, cs?p? oldala dolgozik.`,
      },
      {
        name: "Hollow Hold",
        reps: "3?20-30 mp",
        detail: `Mozdulat: bord?k le, has akt?v.
F?kusz: der?k nem emelkedik el.`,
      },
    ],
  },
  {
    id: "strength-b",
    label: "Er?s?t?s B",
    category: "intense",
    rounds: "4 k?r",
    baseRounds: 4,
    progression: {
      repEvery: 2,
      roundEvery: 5,
      timeIncrementSeconds: 5,
    },
    isPrimary: true,
    exercises: [
      {
        name: "Push-up",
        reps: "4?6-10",
        detail: "V?ll alatt k?z, t?rzs egyenes, lass? leenged?s.",
      },
      {
        name: "Pike Push-up",
        reps: "3?6-8",
        detail: "Cs?p? magas, v?ll tol?er?.",
      },
      {
        name: "Step Back Lunge",
        reps: "3?8/oldal",
        detail: "H?tral?p?s, kontroll?lt mozg?s.",
      },
      {
        name: "Glute Bridge Hold",
        reps: "3?30 mp",
        detail: "Cs?p? fent tart.",
      },
      {
        name: "Bird Dog",
        reps: "3?12/oldal",
        detail: `Kiindul?: n?gyk?zl?b.
Mozdulat: ellent?tes kar-l?b ny?jt.
F?kusz: medence stabil, lass? kontroll.`,
      },
      {
        name: "Plank Shoulder Tap",
        reps: "2?20 ?rint?s",
        detail: `Kiindul?: plank.
Mozdulat: v?ll ?rint?s v?ltott k?zzel.
F?kusz: cs?p? nem billeg.`,
      },
    ],
  },
  {
    id: "easy-a",
    label: "Csendes Ac?l",
    category: "easy",
    rounds: "3 k?r",
    isPrimary: false,
    exercises: [
      { name: "Push-up", reps: "3?6-8", detail: "V?ll alatt k?z, t?rzs egyenes, lass? leenged?s." },
      { name: "Squat", reps: "3?8-10", detail: "Cs?p? h?tra, sarok stabil." },
      { name: "Glute Bridge", reps: "3?12", detail: "Sarok nyom, cs?p? emel." },
      { name: "Dead Bug", reps: "3?8/oldal", detail: "H?t a talajon, ellent?tes kar-l?b ny?jt." },
      { name: "Bird Dog", reps: "3?10/oldal", detail: "N?gyk?zl?b, ellent?tes kar-l?b ny?jt." },
    ],
  },
  {
    id: "easy-b",
    label: "Farkasl?p?s",
    category: "easy",
    rounds: "3 k?r",
    isPrimary: false,
    exercises: [
      { name: "Narrow Push-up", reps: "3?6-8", detail: "Kezek k?zelebb, tricepsz dolgozik." },
      { name: "Reverse Lunge", reps: "3?8/oldal", detail: "H?tral?p?s, kontroll?lt mozg?s." },
      { name: "Single Leg Bridge", reps: "3?8/oldal", detail: "Farizom f?kusz." },
      { name: "Side Plank", reps: "3?20 mp/oldal", detail: "Test egy vonalban." },
      { name: "Superman Hold", reps: "3?20 mp", detail: "Hason fekve, kar-l?b emel." },
    ],
  },
  {
    id: "intense-a",
    label: "Viharver?",
    category: "intense",
    rounds: "4 k?r",
    isPrimary: false,
    exercises: [
      { name: "Decline Push-up", reps: "3?6", detail: "L?b megemelve, v?ll er?s?t?s." },
      { name: "Squat", reps: "3?10", detail: "Lass? ereszked?s." },
      { name: "Reverse Lunge", reps: "3?8/oldal", detail: "Stabil t?rd." },
      { name: "Single Leg Bridge", reps: "3?10/oldal", detail: "Farizom er?." },
      { name: "Hollow Hold", reps: "3?30 mp", detail: "Core fesz?t?s." },
    ],
  },
  {
    id: "intense-b",
    label: "Hegyl?nc",
    category: "intense",
    rounds: "4 k?r",
    isPrimary: false,
    exercises: [
      { name: "Pike Push-up", reps: "3?6-8", detail: "Cs?p? magas, v?ll tol?er?." },
      { name: "Wide Squat", reps: "3?10-12", detail: "Sz?les ?ll?s, t?rd kifel?." },
      { name: "Step Squat", reps: "3?10", detail: "Guggol?s + oldal l?p?s." },
      { name: "Bridge Hold", reps: "3?30 mp", detail: "Cs?p? fent tart." },
      { name: "Bird Dog", reps: "3?12/oldal", detail: "Stabil t?rzs." },
    ],
  },
];

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  yoga: "#d97706",
  strength: "#c2410c",
  acl: "#16a34a",
  running: "#facc15",
};



