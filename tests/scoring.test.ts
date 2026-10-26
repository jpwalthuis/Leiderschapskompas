import { describe, expect, it } from "vitest";
import register from "../content/itemregister.json";
import type { Itemregister } from "@/content/itemregister";
import { maakAntwoord, nieuweAfname, optieVolgorde, registreer, rondAf, type Afname } from "@/testmotor";
import { SCORINGSVERSIE, scoor } from "@/scoring";

const reg = register as unknown as Itemregister;
const NU = "2026-10-25T10:00:00.000Z";
const item = (id: string) => reg.items.find((i) => i.id === id)!;

/** Antwoorden als in het voorbeeldrapport van het prototype (loadSample). */
const VOORBEELD: Record<string, string | null> = {
  R1: "agentisch", R2: "communaal", R3: "agentisch", R4: "agentisch", R5: "agentisch", R6: null,
  Z1: "5", Z2: "4", Z3: "4", Z4: "3", Z5: "2", Z6: "4",
  E1: "4", E2: "4", E3: "5", E4: "2",
  B1: "4", B2: "5", B3: "3", B4: "4", B5: "2", B6: "2",
  C1: "3", C2: "5", C3: "3", C4: "2", C5: "2",
  W1: "a", W2: "a", W3: "a", W4: "b", W5: "a", W6: "b", W7: "a", W8: "b",
  D1: "prob", D2: "prob", D3: "forc", D4: "forc",
};
/** Minst waarschijnlijke reactie per vignet (meest/minst-formaat, itembank v2). */
const MINST: Record<string, string> = { D1: "avoid", D2: "forc", D3: "avoid", D4: "yield" };
const RT: Record<string, number> = { R1: 612, R2: 845, R3: 540, R4: 701, R5: 590, D1: 8200, D2: 6100, D3: 3900, D4: 2800 };

function afnameMet(antwoorden: Record<string, string | null>, opts: { tijdslimieten?: boolean; rt?: Record<string, number>; onderbroken?: string[] } = {}): Afname {
  let a = nieuweAfname(reg, { id: "A-test", seed: 7, nu: NU, tijdslimieten: opts.tijdslimieten ?? true });
  for (const i of reg.items) {
    if (!(i.id in antwoorden)) continue;
    const waarde = antwoorden[i.id];
    a = registreer(
      a,
      maakAntwoord(a, i, {
        waarde,
        reactietijd_ms: waarde === null ? null : (opts.rt?.[i.id] ?? 1500),
        volgorde: optieVolgorde(i, a.seed),
        minst: i.antwoord === "meest-minst" && waarde !== null ? (MINST[i.id] ?? Object.keys(i.opties!).find((k) => k !== waarde)) : undefined,
        nu: NU,
        onderbroken: opts.onderbroken?.includes(i.id),
      }),
    );
  }
  return rondAf(a, NU);
}

const alles = (overschrijf: Record<string, string | null> = {}) => ({ ...VOORBEELD, ...overschrijf });

describe("overeenkomst met het prototype (voorbeeldantwoorden)", () => {
  const p = scoor(afnameMet(VOORBEELD, { rt: RT }), reg);

  it("zelfbeeld agency, communion en extraversie", () => {
    expect(p.metingen.agency.waarde).toBe(83);
    expect(p.metingen.communion.waarde).toBe(50);
    expect(p.metingen.extraversie.waarde).toBe(69);
  });

  it("basisbehoeften: bevrediging en frustratie apart", () => {
    const b = p.metingen.behoeften;
    expect([b.autonomie.bevrediging.waarde, b.autonomie.frustratie.waarde]).toEqual([75, 75]);
    expect([b.competentie.bevrediging.waarde, b.competentie.frustratie.waarde]).toEqual([100, 25]);
    expect([b.verbondenheid.bevrediging.waarde, b.verbondenheid.frustratie.waarde]).toEqual([50, 25]);
  });

  it("conflictstrategie in rust", () => {
    const c = p.metingen.conflictInRust;
    expect(Object.fromEntries(Object.entries(c.scores).map(([k, v]) => [k, v.waarde]))).toEqual({
      forc: 50, prob: 100, comp: 50, yield: 25, avoid: 25,
    });
    expect(c.voorkeur).toEqual(["prob"]);
  });

  it("waarden: rangorde uit gedwongen keuzes", () => {
    expect(p.metingen.waarden.rangorde.map((r) => [r.waarde, r.keuzes, r.plaats])).toEqual([
      ["OC", 3, 1], ["SE", 2, 2], ["ST", 1, 3], ["CO", 0, 4],
    ]);
  });

  it("zorg bij falen: één agentische en één communale keuze", () => {
    expect(p.metingen.zorgBijFalen).toMatchObject({ agentisch: 1, communaal: 1, beantwoord: 2 });
  });

  it("reflexindicatie", () => {
    expect(p.reflex).toMatchObject({ status: "beschikbaar", agentisch: 80, geldigeKeuzes: 5, medianeReactietijdMs: 612 });
  });

  it("conflict onder druk", () => {
    expect(p.onderDruk.status).toBe("beschikbaar");
    expect(p.onderDruk.keuzes.map((k) => k.keuze)).toEqual(["prob", "prob", "forc", "forc"]);
    expect(p.onderDruk.keuzeBijHoogsteDruk).toBe("forc");
  });

  it("kwaliteitsindicatoren", () => {
    expect(p.kwaliteit).toMatchObject({ timeOuts: 1, teSnel: 0, rechtlijnig: false, onderbroken: 0, herzieningen: 0 });
  });

  it("duiding: agentische balans", () => {
    expect(p.duiding).toMatchObject({ archetypegroep: "agentisch", verschil: 33, soort: "duiding" });
  });
});

describe("regel 6: geen normscores", () => {
  const p = scoor(afnameMet(VOORBEELD, { rt: RT }), reg);

  it("elke schaalscore is een positie op de antwoordschaal, 0 tot 100", () => {
    const schalen = [
      p.metingen.agency, p.metingen.communion, p.metingen.extraversie,
      ...Object.values(p.metingen.behoeften).flatMap((b) => [b.bevrediging, b.frustratie]),
      ...Object.values(p.metingen.conflictInRust.scores),
    ];
    for (const s of schalen) {
      expect(s.betekenis).toBe("positie-op-antwoordschaal");
      expect(s.waarde).toBeGreaterThanOrEqual(0);
      expect(s.waarde).toBeLessThanOrEqual(100);
    }
  });

  it("bevat nergens een percentiel of normscore", () => {
    expect(JSON.stringify(p)).not.toMatch(/percentiel|norm(score|groep)|stanine|z-score/i);
  });
});

describe("regel 7: waarden zijn ipsatief tot Thurstonian IRT", () => {
  it("markeert de waardenscores als ipsatief, alleen rangorde", () => {
    const p = scoor(afnameMet(VOORBEELD), reg);
    expect(p.metingen.waarden.ipsatief).toBe(true);
    expect(p.metingen.waarden.rangorde[0]).not.toHaveProperty("waarde_0_100");
  });

  it("geeft gedeelde plaatsen bij gelijke aantallen", () => {
    const p = scoor(afnameMet(alles({ W1: "b", W2: "b", W3: "b", W4: "a", W5: "b", W6: "a" })), reg);
    const plaats = Object.fromEntries(p.metingen.waarden.rangorde.map((r) => [r.waarde, r.plaats]));
    // ST: W1b W3b; CO: W2b W4a W5b; SE: W6a; OC: geen
    expect(plaats).toEqual({ CO: 1, ST: 2, SE: 3, OC: 4 });
    const gelijk = scoor(afnameMet(alles({ W1: "a", W2: "a", W3: "b", W4: "a", W5: "b", W6: "b" })), reg);
    // SE: W1a; OC: W2a W6b; ST: W3b; CO: W4a W5b
    const g = Object.fromEntries(gelijk.metingen.waarden.rangorde.map((r) => [r.waarde, r.plaats]));
    expect(g.OC).toBe(1);
    expect(g.CO).toBe(1);
    expect(g.SE).toBe(3);
    expect(g.ST).toBe(3);
  });
});

describe("regel 5: reflex en druk", () => {
  it("vervallen bij een afname zonder tijdslimieten", () => {
    const zonder = { ...VOORBEELD, R6: "communaal" };
    const p = scoor(afnameMet(zonder, { tijdslimieten: false }), reg);
    expect(p.reflex.status).toBe("niet-beschikbaar");
    expect(p.reflex.agentisch).toBeNull();
    expect(p.onderDruk.status).toBe("niet-beschikbaar");
    expect(p.onderDruk.keuzeBijHoogsteDruk).toBeNull();
    // Het zelfbeeld blijft gewoon beschikbaar.
    expect(p.metingen.agency.waarde).toBe(83);
  });

  it("de reflexindicatie hoort bij het construct agency (wordt naast het zelfbeeld getoond)", () => {
    const p = scoor(afnameMet(VOORBEELD), reg);
    expect(p.reflex.vergelijkMet).toBe("agency");
    expect(p.reflex.methode).toBe("experimenteel");
  });

  it("onvoldoende gegevens bij minder dan 4 geldige reflexkeuzes", () => {
    const p = scoor(afnameMet(alles({ R1: null, R2: null, R3: null })), reg);
    expect(p.reflex.status).toBe("onvoldoende-gegevens");
    expect(p.reflex.agentisch).toBeNull();
    expect(p.reflex.geldigeKeuzes).toBe(2);
  });

  it("laat reflexkeuzes onder 300 ms niet meetellen en telt ze als te snel", () => {
    const p = scoor(afnameMet(VOORBEELD, { rt: { ...RT, R2: 150 } }), reg);
    expect(p.kwaliteit.teSnel).toBe(1);
    expect(p.reflex.geldigeKeuzes).toBe(4);
    expect(p.reflex.agentisch).toBe(100);
  });

  it("geen keuze bij hoogste druk als het laatste vignet verliep", () => {
    const p = scoor(afnameMet(alles({ D4: null })), reg);
    expect(p.onderDruk.status).toBe("beschikbaar");
    expect(p.onderDruk.keuzeBijHoogsteDruk).toBeNull();
  });
});

describe("regel 2: alleen onderbouwde constructen tellen", () => {
  it("laat een item met een niet-onderbouwd construct buiten de score", () => {
    const zwak = structuredClone(reg);
    zwak.items.find((i) => i.id === "Z1")!.bewijs.construct = "experimenteel";
    const p = scoor(afnameMet(VOORBEELD), zwak);
    expect(p.metingen.agency.nItems).toBe(5); // 6 stellingen, Z1 telt niet
    expect(p.metingen.agency.waarde).toBe(75); // (4+4)/2 → 75
  });
});

describe("ontbrekende antwoorden en herzieningen", () => {
  it("rekent met de beantwoorde items en meldt hoeveel er ontbreken", () => {
    const zonderZ3: Record<string, string | null> = { ...VOORBEELD };
    delete zonderZ3.Z3;
    const p = scoor(afnameMet(zonderZ3), reg);
    expect(p.metingen.agency).toMatchObject({ nItems: 6, nBeantwoord: 2, waarde: 88 }); // (5+4)/2 = 4.5 → 87.5 → 88
  });

  it("geeft geen waarde als een schaal helemaal ontbreekt", () => {
    const zonder: Record<string, string | null> = { ...VOORBEELD };
    ["Z1", "Z2", "Z3"].forEach((k) => delete zonder[k]); // de nieuwe agency-stellingen (Z7–Z9) staan niet in VOORBEELD
    const p = scoor(afnameMet(zonder), reg);
    expect(p.metingen.agency).toMatchObject({ waarde: null, status: "onvoldoende-gegevens" });
    expect(p.duiding.archetypegroep).toBeNull();
  });

  it("gebruikt bij een herziene stelling de laatste poging", () => {
    let a = afnameMet(VOORBEELD);
    a = { ...a, status: "bezig", afgerond_op: null };
    a = registreer(a, maakAntwoord(a, item("Z5"), { waarde: "5", reactietijd_ms: 800, volgorde: ["1", "2", "3", "4", "5"], nu: NU }));
    const p = scoor(rondAf(a, NU), reg);
    expect(p.metingen.communion.waarde).toBe(75); // (3+5+4)/3 = 4 → 75
    expect(p.kwaliteit.herzieningen).toBe(1);
  });

  it("verwerkt omgekeerde items", () => {
    // Alle extraversie-items op 5: twee omgekeerd (E2, E4) worden 1.
    const p = scoor(afnameMet(alles({ E1: "5", E2: "5", E3: "5", E4: "5" })), reg);
    expect(p.metingen.extraversie.waarde).toBe(50);
  });
});

describe("kwaliteitsindicatoren", () => {
  it("herkent een rechtlijnig antwoordpatroon", () => {
    const vlak = Object.fromEntries(Object.entries(VOORBEELD).map(([k, v]) => [k, /^[ZEBC]/.test(k) ? "3" : v]));
    expect(scoor(afnameMet(vlak), reg).kwaliteit.rechtlijnig).toBe(true);
  });

  it("telt onderbroken vragen", () => {
    expect(scoor(afnameMet(VOORBEELD, { onderbroken: ["R2", "D1"] }), reg).kwaliteit.onderbroken).toBe(2);
  });
});

describe("duiding (regel 3)", () => {
  it.each([
    [{ Z1: "3", Z2: "3", Z3: "3", Z4: "3", Z5: "3", Z6: "3" }, "geintegreerd"],
    [{ Z1: "2", Z2: "2", Z3: "2", Z4: "5", Z5: "5", Z6: "5" }, "communaal"],
    [{ Z1: "5", Z2: "5", Z3: "5", Z4: "2", Z5: "2", Z6: "2" }, "agentisch"],
  ])("balans %j → %s", (ov, groep) => {
    expect(scoor(afnameMet(alles(ov)), reg).duiding.archetypegroep).toBe(groep);
  });

  it("is gemarkeerd als duiding, niet als meting", () => {
    const p = scoor(afnameMet(VOORBEELD), reg);
    expect(p.duiding.soort).toBe("duiding");
    expect(p.metingen).not.toHaveProperty("archetype");
  });
});

describe("herberekenbaarheid (regel 10)", () => {
  it("legt de scoringsversie en de itemset vast", () => {
    const a = afnameMet(VOORBEELD);
    const p = scoor(a, reg);
    expect(p.scoringsversie).toBe(SCORINGSVERSIE);
    expect(p.itemsetVersie).toBe(a.itemset_versie);
  });

  it("geeft bij dezelfde ruwe data altijd hetzelfde profiel", () => {
    const a = afnameMet(VOORBEELD, { rt: RT });
    expect(scoor(structuredClone(a), reg)).toEqual(scoor(a, reg));
  });

  it("nieuwe antwoorden krijgen de huidige scoringsversie", () => {
    expect(afnameMet(VOORBEELD).antwoorden[0].scoringsversie).toBe(SCORINGSVERSIE);
  });
});

describe("itembank v2: nieuwe schalen", () => {
  const extra = {
    T1: "5", T2: "4", T3: "5", T4: "1", // rationeel hoog (T4 omgekeerd → 5)
    T5: "2", T6: "1", T7: "2", T8: "5", // ervaringsgericht laag (T8 omgekeerd → 1)
    O1: "4", O2: "4", O3: "2", O4: "2", // openheid: (4+4+4+4)/4 = 4 → 75
  };
  const p = scoor(afnameMet({ ...VOORBEELD, ...extra }), reg);

  it("denkstijl: rationeel en ervaringsgericht als twee aparte schalen", () => {
    expect(p.metingen.denkstijl.rationeel.waarde).toBe(94); // (5+4+5+5)/4 = 4,75 → 93,75 → 94
    expect(p.metingen.denkstijl.ervaringsgericht.waarde).toBe(13); // (2+1+2+1)/4 = 1,5 → 12,5 → 13
  });

  it("waarnemen: openheid, hoog = intuïtief, laag = feitelijk", () => {
    expect(p.metingen.waarnemen.openheid.waarde).toBe(75);
  });

  it("nieuwe schalen zijn ook posities op de antwoordschaal (regel 6)", () => {
    expect(p.metingen.denkstijl.rationeel.betekenis).toBe("positie-op-antwoordschaal");
    expect(p.metingen.waarnemen.openheid.betekenis).toBe("positie-op-antwoordschaal");
  });
});

describe("itembank v2: conflict onder druk met meest en minst", () => {
  it("legt per vignet de meest en minst waarschijnlijke reactie vast", () => {
    const p = scoor(afnameMet(VOORBEELD, { rt: RT }), reg);
    expect(p.onderDruk.keuzes.map((k) => [k.keuze, k.minst])).toEqual([
      ["prob", "avoid"], ["prob", "forc"], ["forc", "avoid"], ["forc", "yield"],
    ]);
  });
});
