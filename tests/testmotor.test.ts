import { describe, expect, it } from "vitest";
import register from "../content/itemregister.json";
import type { Itemregister } from "@/content/itemregister";
import {
  SCORINGSVERSIE,
  bouwStappen,
  controleerAntwoord,
  itemsetVersie,
  maakAntwoord,
  nieuweAfname,
  optieVolgorde,
  registreer,
  rondAf,
  type Afname,
} from "@/testmotor";

const reg = register as unknown as Itemregister;
const NU = "2026-10-25T10:00:00.000Z";
const item = (id: string) => reg.items.find((i) => i.id === id)!;
const afname = (): Afname => nieuweAfname(reg, { id: "A-1", seed: 42, nu: NU });

describe("stappen", () => {
  const stappen = bouwStappen(reg);

  it("begint met de intro van fase 1 en een oefenronde, en eindigt met het einde", () => {
    expect(stappen[0]).toEqual({ soort: "intro", fase: 1 });
    expect(stappen[1]).toEqual({ soort: "oefen" });
    expect(stappen.at(-1)).toEqual({ soort: "einde" });
  });

  it("bevat elk item precies één keer, in de volgorde van het register binnen elke fase", () => {
    const ids = stappen.flatMap((s) => (s.soort === "item" ? [s.item.id] : []));
    const verwacht = [1, 2, 3].flatMap((f) => reg.items.filter((i) => i.fase === f).map((i) => i.id));
    expect(ids).toEqual(verwacht);
  });

  it("zet een intro vóór elke fase", () => {
    const intros = stappen.filter((s) => s.soort === "intro").map((s) => (s.soort === "intro" ? s.fase : 0));
    expect(intros).toEqual([1, 2, 3]);
  });
});

describe("optievolgorde", () => {
  it("is reproduceerbaar uit de seed van de afname", () => {
    expect(optieVolgorde(item("D1"), 42)).toEqual(optieVolgorde(item("D1"), 42));
  });

  it("verschilt tussen afnames", () => {
    const volgordes = new Set(Array.from({ length: 30 }, (_, s) => optieVolgorde(item("D1"), s).join(",")));
    expect(volgordes.size).toBeGreaterThan(1);
  });

  it("bevat bij beeldkeuze precies de twee polen", () => {
    expect([...optieVolgorde(item("R1"), 7)].sort()).toEqual(["agentisch", "communaal"]);
  });

  it("houdt de stellingschaal vast op 1 tot 5", () => {
    expect(optieVolgorde(item("Z1"), 7)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("bevat bij een vignet alle opties van het item", () => {
    expect([...optieVolgorde(item("D4"), 7)].sort()).toEqual(Object.keys(item("D4").opties!).sort());
  });
});

describe("itemsetversie", () => {
  it("is stabiel", () => {
    expect(itemsetVersie(reg)).toBe(itemsetVersie(structuredClone(reg)));
  });

  it("verandert als een item een nieuwe versie krijgt", () => {
    const kopie = structuredClone(reg);
    kopie.items[0].versie = 2;
    expect(itemsetVersie(kopie)).not.toBe(itemsetVersie(reg));
  });
});

describe("regel 10: elk antwoord is volledig", () => {
  it("legt alle verplichte velden vast", () => {
    const a = maakAntwoord(afname(), item("R1"), {
      waarde: "communaal",
      reactietijd_ms: 640,
      volgorde: ["agentisch", "communaal"],
      nu: NU,
    });
    expect(a).toMatchObject({
      afname_id: "A-1",
      item_id: "R1",
      itemversie: 1,
      waarde: "communaal",
      reactietijd_ms: 640,
      getoonde_positie: ["agentisch", "communaal"],
      gekozen_positie: 1,
      tijdslimiet_ms: 2000,
      time_out: false,
      scoringsversie: SCORINGSVERSIE,
    });
    expect(controleerAntwoord(a)).toEqual([]);
  });

  it("legt een time-out vast zonder waarde en zonder reactietijd", () => {
    const a = maakAntwoord(afname(), item("R1"), { waarde: null, reactietijd_ms: null, volgorde: ["communaal", "agentisch"], nu: NU });
    expect(a.time_out).toBe(true);
    expect(a.gekozen_positie).toBeNull();
    expect(controleerAntwoord(a)).toEqual([]);
  });

  it("weigert een waarde die niet getoond is", () => {
    expect(() =>
      maakAntwoord(afname(), item("R1"), { waarde: "iets anders", reactietijd_ms: 500, volgorde: ["agentisch", "communaal"], nu: NU }),
    ).toThrow();
  });

  it("weigert een negatieve reactietijd", () => {
    expect(() =>
      maakAntwoord(afname(), item("Z1"), { waarde: "3", reactietijd_ms: -1, volgorde: ["1", "2", "3", "4", "5"], nu: NU }),
    ).toThrow();
  });

  it("controleerAntwoord meldt ontbrekende velden", () => {
    const a = maakAntwoord(afname(), item("Z1"), { waarde: "4", reactietijd_ms: 900, volgorde: ["1", "2", "3", "4", "5"], nu: NU });
    const kapot = { ...a, itemversie: undefined, scoringsversie: "" } as unknown as typeof a;
    expect(controleerAntwoord(kapot).length).toBeGreaterThanOrEqual(2);
  });
});

describe("afname", () => {
  it("legt itemsetversie, scoringsversie en seed vast bij de start", () => {
    const a = afname();
    expect(a).toMatchObject({ id: "A-1", seed: 42, gestart_op: NU, afgerond_op: null, status: "bezig", scoringsversie: SCORINGSVERSIE });
    expect(a.itemset_versie).toBe(itemsetVersie(reg));
  });

  it("telt alleen het eerste antwoord per item (dubbel tikken of tikken na de time-out)", () => {
    let a = afname();
    const opts = { reactietijd_ms: 500, volgorde: ["agentisch", "communaal"], nu: NU };
    a = registreer(a, maakAntwoord(a, item("R1"), { ...opts, waarde: "agentisch" }));
    a = registreer(a, maakAntwoord(a, item("R1"), { ...opts, waarde: "communaal" }));
    expect(a.antwoorden).toHaveLength(1);
    expect(a.antwoorden[0].waarde).toBe("agentisch");
  });

  it("is na afronden gesloten voor nieuwe antwoorden", () => {
    let a = rondAf(afname(), NU);
    expect(a.status).toBe("afgerond");
    a = registreer(a, maakAntwoord(a, item("Z1"), { waarde: "2", reactietijd_ms: 400, volgorde: ["1", "2", "3", "4", "5"], nu: NU }));
    expect(a.antwoorden).toHaveLength(0);
  });

  it("verandert de oorspronkelijke afname niet", () => {
    const a = afname();
    registreer(a, maakAntwoord(a, item("Z1"), { waarde: "2", reactietijd_ms: 400, volgorde: ["1", "2", "3", "4", "5"], nu: NU }));
    expect(a.antwoorden).toHaveLength(0);
  });
});
