import { describe, expect, it } from "vitest";
import register from "../content/itemregister.json";
import type { Itemregister } from "@/content/itemregister";
import {
  SCORINGSVERSIE,
  bouwStappen,
  controleerAntwoord,
  LEESSNELHEID_WPM,
  leestijdLimietS,
  tijdslimietMs,
  geldigeAntwoorden,
  huidigAntwoord,
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
  const stappen = bouwStappen(reg, 42);

  it("begint met de intro van fase 1 en een oefenronde, en eindigt met het einde", () => {
    expect(stappen[0]).toEqual({ soort: "intro", fase: 1 });
    expect(stappen[1]).toEqual({ soort: "oefen" });
    expect(stappen.at(-1)).toEqual({ soort: "einde" });
  });

  const ids = (st: typeof stappen) => st.flatMap((s) => (s.soort === "item" ? [s.item.id] : []));

  it("bevat elk item precies één keer", () => {
    expect([...ids(stappen)].sort()).toEqual(reg.items.map((i) => i.id).sort());
  });

  it("houdt getimede items in registervolgorde en zet stellingen vóór de dilemma's", () => {
    const getimed = ids(stappen).filter((id) => reg.items.find((i) => i.id === id)!.format !== "likert");
    expect(getimed).toEqual(reg.items.filter((i) => i.format !== "likert").map((i) => i.id));
    const laatsteStelling = Math.max(...ids(stappen).map((id, k) => (reg.items.find((i) => i.id === id)!.format === "likert" ? k : -1)));
    const eersteDilemma = ids(stappen).findIndex((id) => reg.items.find((i) => i.id === id)!.format === "dilemma");
    expect(laatsteStelling).toBeLessThan(eersteDilemma);
  });

  it("mengt de stellingen: nooit twee stellingen van dezelfde schaal achter elkaar", () => {
    for (const seed of [1, 2, 3, 42, 99]) {
      const sub = bouwStappen(reg, seed).flatMap((s) => (s.soort === "item" && s.item.format === "likert" ? [s.item.subschaal] : []));
      for (let k = 1; k < sub.length; k++) expect(sub[k], `seed ${seed}, positie ${k}`).not.toBe(sub[k - 1]);
    }
  });

  it("lukt het mengen ook bij een krappe verdeling (3 + 2 stellingen)", () => {
    const basis = reg.items.find((i) => i.format === "likert")!;
    const krap = {
      ...reg,
      items: ["a", "a", "a", "b", "b"].map((sub, k) => ({ ...structuredClone(basis), id: `K${k}`, subschaal: sub })),
    };
    for (let seed = 0; seed < 50; seed++) {
      const sub = bouwStappen(krap, seed).flatMap((s) => (s.soort === "item" ? [s.item.subschaal] : []));
      expect(sub, `seed ${seed}`).toEqual(["a", "b", "a", "b", "a"]);
    }
  });

  it("mengt zonder vast patroon (geen vaste volgorde van schalen)", () => {
    const begin = new Set(
      Array.from({ length: 30 }, (_, seed) =>
        bouwStappen(reg, seed).flatMap((s) => (s.soort === "item" && s.item.format === "likert" ? [s.item.subschaal] : [])).slice(0, 3).join(","),
      ),
    );
    expect(begin.size).toBeGreaterThan(15);
    // Binnen één afname: de eerste zes stellingen zijn geen herhaling van drie schalen.
    const zes = bouwStappen(reg, 42).flatMap((s) => (s.soort === "item" && s.item.format === "likert" ? [s.item.subschaal] : [])).slice(0, 6);
    expect(zes.slice(0, 3).join()).not.toBe(zes.slice(3, 6).join());
  });

  it("mengt reproduceerbaar per afname en verschillend tussen afnames", () => {
    expect(ids(bouwStappen(reg, 42))).toEqual(ids(stappen));
    expect(ids(bouwStappen(reg, 43))).not.toEqual(ids(stappen));
  });

  it("zet een intro vóór elke fase", () => {
    const intros = stappen.filter((s) => s.soort === "intro").map((s) => (s.soort === "intro" ? s.fase : 0));
    expect(intros).toEqual([1, 2, 3, 4]);
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
    kopie.items[0].versie += 1;
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
      itemversie: item("R1").versie,
      waarde: "communaal",
      reactietijd_ms: 640,
      getoonde_positie: ["agentisch", "communaal"],
      gekozen_positie: 1,
      tijdslimiet_ms: 5000,
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

  it("telt bij getimede vragen alleen het eerste antwoord (dubbel tikken of tikken na de time-out)", () => {
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

describe("stellingen herzien", () => {
  const schaal = ["1", "2", "3", "4", "5"];
  const opts = { reactietijd_ms: 700, volgorde: schaal, nu: NU };

  it("bewaart een herzien antwoord als nieuwe poging naast het eerste", () => {
    let a = afname();
    a = registreer(a, maakAntwoord(a, item("Z1"), { ...opts, waarde: "2" }));
    a = registreer(a, maakAntwoord(a, item("Z1"), { ...opts, waarde: "5" }));
    expect(a.antwoorden.map((x) => [x.waarde, x.poging])).toEqual([["2", 1], ["5", 2]]);
  });

  it("het laatste antwoord telt", () => {
    let a = afname();
    a = registreer(a, maakAntwoord(a, item("Z1"), { ...opts, waarde: "2" }));
    a = registreer(a, maakAntwoord(a, item("Z2"), { ...opts, waarde: "3" }));
    a = registreer(a, maakAntwoord(a, item("Z1"), { ...opts, waarde: "5" }));
    expect(geldigeAntwoorden(a).map((x) => [x.item_id, x.waarde])).toEqual([["Z1", "5"], ["Z2", "3"]]);
    expect(huidigAntwoord(a, item("Z1"))?.waarde).toBe("5");
    expect(huidigAntwoord(a, item("Z3"))).toBeNull();
  });

  it.each(["R1", "W1", "D1"])("staat geen herziening toe bij getimed item %s", (id) => {
    const i = item(id);
    let a = afname();
    const volgorde = optieVolgorde(i, a.seed);
    a = registreer(a, maakAntwoord(a, i, { waarde: volgorde[0], minst: volgorde[1], reactietijd_ms: 300, volgorde, nu: NU }));
    a = registreer(a, maakAntwoord(a, i, { waarde: volgorde[1], minst: volgorde[0], reactietijd_ms: 300, volgorde, nu: NU }));
    expect(a.antwoorden).toHaveLength(1);
  });
});

describe("regel 5: afname zonder tijdslimieten", () => {
  const zonder = () => nieuweAfname(reg, { id: "A-2", seed: 1, nu: NU, tijdslimieten: false });

  it("staat standaard aan", () => {
    expect(afname().tijdslimieten).toBe(true);
  });

  it("legt vast dat de afname zonder tijdslimieten is gedaan", () => {
    expect(zonder().tijdslimieten).toBe(false);
  });

  it("legt geen tijdslimiet vast bij getimede items", () => {
    const a = zonder();
    const ant = maakAntwoord(a, item("D1"), { waarde: "prob", minst: "forc", reactietijd_ms: 30000, volgorde: optieVolgorde(item("D1"), 1), nu: NU });
    expect(ant.tijdslimiet_ms).toBeNull();
    expect(controleerAntwoord(ant)).toEqual([]);
  });

  it("kan geen time-out hebben", () => {
    expect(() => maakAntwoord(zonder(), item("R1"), { waarde: null, reactietijd_ms: null, volgorde: ["agentisch", "communaal"], nu: NU })).toThrow();
  });
});

describe("tijdslimiet op basis van leestijd", () => {
  it("rekent met de gemiddelde leessnelheid uit de meta-analyse", () => {
    expect(LEESSNELHEID_WPM).toBe(238);
  });

  it("geeft een dilemma de leestijd maal de leesfactor plus beslistijd, naar boven afgerond", () => {
    // W1: 26 woorden → 26/238*60 = 6,55 s; × 1,5 = 9,83; + 3 = 12,83 → 13 s
    expect(leestijdLimietS(item("W1"))).toBe(13);
  });

  it("laat de druk oplopen bij de vignetten, maar altijd boven de leestijd", () => {
    const limieten = ["D1", "D2", "D3", "D4"].map((id) => leestijdLimietS(item(id))!);
    for (let k = 1; k < limieten.length; k++) expect(limieten[k]).toBeLessThan(limieten[k - 1]);
    for (const id of ["D1", "D2", "D3", "D4", "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]) {
      const i = item(id);
      const woorden = [i.tekst, i.vraag, i.optie_a?.tekst, i.optie_b?.tekst, ...Object.values(i.opties ?? {})]
        .filter(Boolean).join(" ").trim().split(/\s+/).length;
      expect(leestijdLimietS(i)!, id).toBeGreaterThan((woorden / 238) * 60);
    }
  });

  it("gebruikt een vaste limiet waar het item die opgeeft (beeldkeuze)", () => {
    expect(tijdslimietMs(afname(), item("R1"))).toBe(5000);
    expect(leestijdLimietS(item("R1"))).toBeNull();
  });

  it("heeft geen limiet zonder tijdslimieten en bij stellingen", () => {
    const zonder = nieuweAfname(reg, { id: "x", seed: 1, nu: NU, tijdslimieten: false });
    expect(tijdslimietMs(zonder, item("D1"))).toBeNull();
    expect(tijdslimietMs(afname(), item("Z1"))).toBeNull();
  });
});

describe("vignetten: meest en minst", () => {
  const i = () => item("D1");
  const volgorde = () => optieVolgorde(i(), 42);

  it("legt de meest en de minst waarschijnlijke reactie vast", () => {
    const a = maakAntwoord(afname(), i(), { waarde: "prob", minst: "avoid", reactietijd_ms: 9000, reactietijd_minst_ms: 2500, volgorde: volgorde(), nu: NU });
    expect(a).toMatchObject({ waarde: "prob", minst: "avoid", antwoordformaat: "meest-minst", reactietijd_minst_ms: 2500 });
    expect(controleerAntwoord(a)).toEqual([]);
  });

  it("weigert een antwoord zonder minst", () => {
    expect(() => maakAntwoord(afname(), i(), { waarde: "prob", reactietijd_ms: 9000, volgorde: volgorde(), nu: NU })).toThrow();
  });

  it("weigert dezelfde optie als meest én minst", () => {
    expect(() => maakAntwoord(afname(), i(), { waarde: "prob", minst: "prob", reactietijd_ms: 9000, reactietijd_minst_ms: 1000, volgorde: volgorde(), nu: NU })).toThrow();
  });

  it("legt bij een time-out niets vast, ook geen minst", () => {
    const a = maakAntwoord(afname(), i(), { waarde: null, reactietijd_ms: null, volgorde: volgorde(), nu: NU });
    expect(a).toMatchObject({ time_out: true, minst: null, reactietijd_minst_ms: null });
    expect(controleerAntwoord(a)).toEqual([]);
  });

  it("andere vraagvormen hebben geen minst", () => {
    const a = maakAntwoord(afname(), item("W1"), { waarde: "a", reactietijd_ms: 4000, volgorde: ["a", "b"], nu: NU });
    expect(a).toMatchObject({ antwoordformaat: "enkel", minst: null });
  });
});

describe("kaartenoefening (fase 4, reflectie)", () => {
  const k = () => item("K1");
  const volgorde = () => optieVolgorde(k(), 42);
  const sortering = { voorkeur: ["wijze", "schepper"], afwijzing: ["heerser", "nar"] };

  it("staat als laatste fase vóór het einde, met een eigen intro", () => {
    const st = bouwStappen(reg, 42);
    expect(st.at(-3)).toEqual({ soort: "intro", fase: 4 });
    expect(st.at(-2)).toMatchObject({ soort: "item", item: { id: "K1" } });
  });

  it("toont alle acht kaarten in een willekeurige, reproduceerbare volgorde", () => {
    expect([...volgorde()].sort()).toEqual(k().kaarten!.map((c) => c.id).sort());
    expect(optieVolgorde(k(), 42)).toEqual(volgorde());
    const anders = [1, 2, 3, 4, 5].some((s) => optieVolgorde(k(), s).join() !== volgorde().join());
    expect(anders).toBe(true);
  });

  it("heeft geen tijdslimiet, ook niet in een getimede afname", () => {
    expect(tijdslimietMs(afname(), k())).toBeNull();
  });

  it("legt twee voorkeuren en twee afwijzingen vast; waarde is de eerste voorkeur", () => {
    const a = maakAntwoord(afname(), k(), { waarde: "wijze", sortering, reactietijd_ms: 20000, volgorde: volgorde(), nu: NU });
    expect(a).toMatchObject({ antwoordformaat: "sortering", waarde: "wijze", sortering, time_out: false, tijdslimiet_ms: null });
    expect(controleerAntwoord(a)).toEqual([]);
  });

  it.each([
    ["zonder sortering", undefined],
    ["met één voorkeur", { voorkeur: ["wijze"], afwijzing: ["heerser", "nar"] }],
    ["met een kaart dubbel", { voorkeur: ["wijze", "schepper"], afwijzing: ["wijze", "nar"] }],
    ["met een onbekende kaart", { voorkeur: ["wijze", "schepper"], afwijzing: ["heerser", "magiër"] }],
    ["als waarde niet de eerste voorkeur is", { voorkeur: ["schepper", "wijze"], afwijzing: ["heerser", "nar"] }],
  ])("weigert een antwoord %s", (_n, sort) => {
    expect(() => maakAntwoord(afname(), k(), { waarde: "wijze", sortering: sort, reactietijd_ms: 20000, volgorde: volgorde(), nu: NU })).toThrow();
  });

  it("kan geen time-out hebben", () => {
    expect(() => maakAntwoord(afname(), k(), { waarde: null, reactietijd_ms: null, volgorde: volgorde(), nu: NU })).toThrow();
  });

  it("controleerAntwoord meldt een onvolledige sortering", () => {
    const a = maakAntwoord(afname(), k(), { waarde: "wijze", sortering, reactietijd_ms: 20000, volgorde: volgorde(), nu: NU });
    expect(controleerAntwoord({ ...a, sortering: { voorkeur: ["wijze"], afwijzing: [] } })).toContain("sortering onvolledig");
  });

  it("andere vraagvormen hebben geen sortering", () => {
    const a = maakAntwoord(afname(), item("W1"), { waarde: "a", reactietijd_ms: 4000, volgorde: ["a", "b"], nu: NU });
    expect(a.sortering).toBeNull();
  });
});
