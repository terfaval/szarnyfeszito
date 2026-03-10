import { describe, expect, it } from "vitest";
import { parseBirdIdentificationBlockV23 } from "../dossierSchema";

describe("dossierSchema axis normalization", () => {
  it("accepts accented / capitalized identification axis tokens", () => {
    const identification = parseBirdIdentificationBlockV23({
      identification: {
        key_features: [
          { axis: "Csőr", title: "Rövid, hajlott csőr", description: "Konkrét jellegzetesség a terepen." },
          { axis: "Tollazat", title: "Mintázott tollazat", description: "Konkrét jellegzetesség a terepen." },
          { axis: "Hang", title: "Éles csipogás", description: "Konkrét jellegzetesség a terepen." },
          { axis: "Mozgás", title: "Hirtelen szökkenés", description: "Konkrét jellegzetesség a terepen." },
        ],
        identification_paragraph: "Egy bekezdésnyi azonosítási összefoglaló, ami nem üres.",
      },
    });

    expect(identification.key_features.map((f) => f.axis)).toEqual(["csor", "tollazat", "hang", "mozgas"]);
  });
});

