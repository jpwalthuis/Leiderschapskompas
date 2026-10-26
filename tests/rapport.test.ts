import { describe, expect, it } from "vitest";
import register from "../content/itemregister.json";
import type { Itemregister } from "@/content/itemregister";
import { scoor, type Scoreprofiel } from "@/scoring";
import { vertaal } from "@/i18n";
import { voorbeeldAfname } from "@/voorbeeld";
import {
  BAND_HOOG,
  BAND_LAAG,
  band,
  maakRapport,
  REFLEX_AFWIJKING,
  type Blok,
  type Rapport,
  type Sectie,
  type Tekst,
  vertaalTekst,
} from "@/rapport";

const reg = register as unknown as Itemregister;
const profiel = (opts: Parameters<typeof voorbeeldAfname>[1] = {}) => scoor(voorbeeldAfname(reg, opts), reg);
const rapport = (opts: Parameters<typeof voorbeeldAfname>[1] = {}) => maakRapport(profiel(opts), reg);

/** Alle teksten in een lijst secties, ook in tabellen, lijsten en meldingen. */
function teksten(secties: Sectie[]): Tekst[] {
  const uit: Tekst[] = [];
  const isTekst = (x: unknown): x is Tekst => !!x && typeof x === "object" && "sleutel" in (x as object);
  const loop = (x: unknown) => {
    if (isTekst(x)) uit.push(x);
    if (Array.isArray(x)) x.forEach(loop);
    else if (x && typeof x === "object") Object.values(x).forEach(loop);
  };
  loop(secties);
  return uit;
}
const sleutels = (s: Sectie[]) => teksten(s).map((t) => t.sleutel);
const sectie = (r: Rapport, kant: "deelnemer" | "coach", id: string) => r[kant].find((s) => s.id === id)!;
const blokken = <S extends Blok["soort"]>(s: Sectie, soort: S) => s.blokken.filter((b): b is Extract<Blok, { soort: S }> => b.soort === soort);
const volledig = (r: Rapport) => [...r.deelnemer, ...r.coach];

describe("banden", () => {
  it.each([
    [0, "laag"], [BAND_LAAG - 1, "laag"], [BAND_LAAG, "midden"], [BAND_HOOG, "midden"], [BAND_HOOG + 1, "hoog"], [100, "hoog"], [null, null],
  ])("%s → %s", (v, b) => {
    expect(band(v as number | null)).toBe(b);
  });
});

describe("opbouw", () => {
  const r = rapport();

  it("bevat de afgesproken onderdelen voor de deelnemer, in vaste volgorde", () => {
    expect(r.deelnemer.map((s) => s.id)).toEqual([
      "samenvatting", "gerichtheid", "energie", "denken", "drijfveren", "conflict", "archetypen", "nietZegt",
    ]);
  });

  it("bevat voor de coach daarnaast kerngetallen, kwaliteit, gespreksvragen en bewijsniveaus", () => {
    expect(r.coach.map((s) => s.id)).toEqual([
      "kerngetallen", "kwaliteit", "gespreksvragen", "behoeften", "druk", "waarden", "kaarten", "bewijs", "regels", "verantwoording",
    ]);
  });

  it("elke tekst bestaat in het Nederlandse vertaalbestand (regel 19)", () => {
    for (const t of teksten(volledig(r))) expect(() => vertaalTekst(t)).not.toThrow();
  });

  it("ook bij een afname zonder tijdslimieten en zonder kaarten", () => {
    const z = rapport({ tijdslimieten: false, zonderKaarten: true });
    for (const t of teksten(volledig(z))) expect(() => vertaalTekst(t)).not.toThrow();
  });

  it("legt scoringsversie en itemset vast (regel 10)", () => {
    const p = profiel();
    expect(r.meta).toMatchObject({ scoringsversie: p.scoringsversie, itemsetVersie: p.itemsetVersie, tijdslimieten: true });
  });
});

describe("regel 6: scores zijn posities op de antwoordschaal", () => {
  it("elk onderdeel met balken legt uit dat 0 tot 100 de positie op de antwoordschaal is", () => {
    for (const s of volledig(rapport())) {
      if (blokken(s, "balken").length) expect(sleutels([s]), s.id).toContain("rapport.schaaluitleg");
    }
  });

  it("noemt nergens percentielen of normscores als uitkomst", () => {
    const tekst = teksten(volledig(rapport())).map(vertaalTekst).join(" ");
    expect(tekst).not.toMatch(/percentiel/i);
    expect(tekst).not.toMatch(/\bboven(?:gemiddeld)?\s+(?:het\s+)?gemiddelde\b|vergeleken met (?:andere|collega)/i);
  });

  it("alle balkwaarden liggen tussen 0 en 100", () => {
    for (const s of volledig(rapport())) for (const b of blokken(s, "balken")) for (const x of b.balken) {
      if (x.waarde !== null) expect(x.waarde).toBeGreaterThanOrEqual(0);
      if (x.waarde !== null) expect(x.waarde).toBeLessThanOrEqual(100);
    }
  });
});

describe("regel 4: daadkracht en verbinding los van geslacht", () => {
  it("legt bij de gerichtheid uit dat het niets met geslacht te maken heeft", () => {
    expect(sleutels([sectie(rapport(), "deelnemer", "gerichtheid")])).toContain("rapport.gerichtheid.uitleg");
    expect(vertaal("rapport.gerichtheid.uitleg")).toMatch(/geslacht/);
  });
});

describe("regel 5: reflex alleen naast het zelfbeeld", () => {
  it("toont de reflexindicatie in hetzelfde blok als daadkracht, gemarkeerd als experimenteel", () => {
    const s = sectie(rapport(), "deelnemer", "gerichtheid");
    const b = blokken(s, "balken").find((x) => x.balken.some((y) => y.reeks === "reflex"))!;
    expect(b.balken.some((y) => y.reeks === "zelfbeeld" && y.label.sleutel === "rapport.label.agency")).toBe(true);
    expect(b.balken.find((y) => y.reeks === "reflex")!.experimenteel).toBe(true);
  });

  it("toont de reflex nergens anders als balk", () => {
    const r = rapport();
    for (const s of volledig(r)) {
      if (s.id === "gerichtheid") continue;
      for (const b of blokken(s, "balken")) expect(b.balken.some((y) => y.reeks === "reflex"), s.id).toBe(false);
    }
  });

  it("zonder tijdslimieten: geen reflexbalk en geen drukkeuzes, wel de melding niet beschikbaar", () => {
    const r = rapport({ tijdslimieten: false });
    const ger = sectie(r, "deelnemer", "gerichtheid");
    expect(blokken(ger, "balken").flatMap((b) => b.balken).some((y) => y.reeks === "reflex")).toBe(false);
    expect(sleutels([ger])).toContain("rapport.reflex.nietBeschikbaar");
    expect(sleutels([sectie(r, "deelnemer", "conflict")])).toContain("rapport.druk.nietBeschikbaar");
    expect(blokken(sectie(r, "coach", "druk"), "tabel")).toHaveLength(0);
    expect(sleutels([sectie(r, "coach", "druk")])).toContain("rapport.druk.nietBeschikbaar");
    expect(sleutels(r.deelnemer)).toContain("rapport.nietZegt.zonderTijd");
  });

  it("bij te weinig geldige reflexkeuzes: geen balk maar onvoldoende gegevens", () => {
    const r = rapport({ overschrijf: { R1: null, R2: null, R3: null } });
    const ger = sectie(r, "deelnemer", "gerichtheid");
    expect(blokken(ger, "balken").flatMap((b) => b.balken).some((y) => y.reeks === "reflex")).toBe(false);
    expect(sleutels([ger])).toContain("rapport.reflex.onvoldoende");
  });

  it.each([
    [{ R2: "agentisch" }, "rapport.reflex.meerDaadkracht"], // 100% agentisch tegenover zelfbeeld 75
    [{ R1: "communaal", R3: "communaal", R4: "communaal" }, "rapport.reflex.meerVerbinding"],
    [{}, "rapport.reflex.inLijn"], // 80% tegenover 75
  ])("vergelijkt reflex en zelfbeeld met een marge van %s punten", (ov, sleutel) => {
    expect(REFLEX_AFWIJKING).toBe(20);
    expect(sleutels([sectie(rapport({ overschrijf: ov }), "deelnemer", "gerichtheid")])).toContain(sleutel);
  });
});

describe("regel 7: waarden alleen als rangorde", () => {
  it("toont waarden als rangorde binnen de persoon, zonder balken", () => {
    const s = sectie(rapport(), "deelnemer", "drijfveren");
    expect(blokken(s, "balken")).toHaveLength(0);
    const rang = blokken(s, "rangorde")[0];
    expect(rang.items.map((i) => i.label.sleutel)).toEqual([
      "rapport.waarde.OC.naam", "rapport.waarde.SE.naam", "rapport.waarde.ST.naam", "rapport.waarde.CO.naam",
    ]);
    expect(rang.items.map((i) => i.plaats)).toEqual([1, 2, 3, 4]);
    expect(sleutels([s])).toContain("rapport.drijfveren.ipsatief");
  });
});

describe("regel 3: archetypen als duiding, niet als meting", () => {
  it("de archetypen staan in een sectie die als duiding is gemarkeerd, zonder getallen of balken", () => {
    const s = sectie(rapport(), "deelnemer", "archetypen");
    expect(s.soort).toBe("duiding");
    expect(s.label?.sleutel).toBe("rapport.duiding");
    expect(blokken(s, "balken")).toHaveLength(0);
    expect(blokken(s, "kerngetallen")).toHaveLength(0);
  });

  it("toont de kaartkeuzes van de deelnemer in eigen volgorde", () => {
    const k = blokken(sectie(rapport(), "deelnemer", "archetypen"), "kaarten")[0];
    expect(k.voorkeur.map((c) => c.id)).toEqual(["wijze", "ontdekker"]);
    expect(k.afwijzing.map((c) => c.id)).toEqual(["zorggever", "nar"]);
  });

  it("noemt bij de gemeten balans de kaarten van die pool", () => {
    const s = sectie(rapport(), "deelnemer", "archetypen");
    const t = teksten([s]).find((x) => x.sleutel.startsWith("rapport.archetypen.balans."))!;
    expect(t.sleutel).toBe("rapport.archetypen.balans.agentisch");
    expect(vertaalTekst(t)).toContain("Strijder, Heerser, Ontdekker en Schepper");
  });

  it("zonder kaartenoefening: alleen de balans, en de melding dat de oefening niet is gedaan", () => {
    const r = rapport({ zonderKaarten: true });
    expect(blokken(sectie(r, "deelnemer", "archetypen"), "kaarten")).toHaveLength(0);
    expect(sleutels([sectie(r, "coach", "kaarten")])).toContain("rapport.kaarten.nietGedaan");
  });

  it("de coachsectie over de kaarten is ook duiding", () => {
    expect(sectie(rapport(), "coach", "kaarten").soort).toBe("duiding");
  });
});

describe("bewijsniveaus in het coachrapport", () => {
  const rijen = () => blokken(sectie(rapport(), "coach", "bewijs"), "bewijs")[0].rijen;
  const rij = (id: string) => rijen().find((r) => r.onderdeel.sleutel === `rapport.onderdeel.${id}`)!;

  it("heeft een rij per onderdeel", () => {
    expect(rijen().map((r) => r.onderdeel.sleutel.split(".").at(-1))).toEqual([
      "agency", "communion", "extraversie", "behoeften", "conflictInRust", "denkstijl", "waarnemen", "waarden", "zorgBijFalen", "reflex", "onderDruk", "kaarten",
    ]);
  });

  it("neemt per onderdeel het zwakste niveau uit het register", () => {
    expect(rij("agency")).toMatchObject({ construct: "sterk", methode: "sterk", item: "nieuw", gebruik: "meting" });
    expect(rij("reflex")).toMatchObject({ methode: "experimenteel", gebruik: "indicatie" });
    expect(rij("waarden")).toMatchObject({ methode: "matig", gebruik: "meting" });
    expect(rij("kaarten")).toMatchObject({ construct: "experimenteel", gebruik: "duiding" });
  });

  it("noemt het aantal items per onderdeel", () => {
    expect(rij("conflictInRust").aantal).toBe(15);
    expect(rij("kaarten").aantal).toBe(1);
  });
});

describe("kwaliteit van de afname", () => {
  it("meldt een time-out", () => {
    const m = blokken(sectie(rapport(), "coach", "kwaliteit"), "melding")[0];
    expect(m.toon).toBe("let-op");
    expect(m.items.map((t) => t.sleutel)).toContain("rapport.kwaliteit.timeOuts");
  });

  it("meldt geen afwijkingen bij een schone afname", () => {
    const m = blokken(sectie(rapport({ overschrijf: { R6: "agentisch" } }), "coach", "kwaliteit"), "melding")[0];
    expect(m.toon).toBe("ok");
    expect(m.items.map((t) => t.sleutel)).toEqual(["rapport.kwaliteit.geen"]);
  });

  it("meldt een afname zonder tijdslimieten", () => {
    const m = blokken(sectie(rapport({ tijdslimieten: false }), "coach", "kwaliteit"), "melding")[0];
    expect(m.items.map((t) => t.sleutel)).toContain("rapport.kwaliteit.zonderTijd");
  });

  it("meldt een rechtlijnig antwoordpatroon", () => {
    const alleDrie = Object.fromEntries(reg.items.filter((i) => i.format === "likert").map((i) => [i.id, "3"]));
    const m = blokken(sectie(rapport({ overschrijf: alleDrie }), "coach", "kwaliteit"), "melding")[0];
    expect(m.items.map((t) => t.sleutel)).toContain("rapport.kwaliteit.rechtlijnig");
  });
});

describe("gespreksvragen voor de coach", () => {
  const vragen = (opts: Parameters<typeof voorbeeldAfname>[1] = {}) =>
    blokken(sectie(rapport(opts), "coach", "gespreksvragen"), "lijst")[0].items.map((t) => t.sleutel);

  it("vraagt naar een behoefte met frustratie boven de drempel", () => {
    expect(vragen()).toContain("rapport.vraag.frustratie");
  });

  it("vraagt naar een verschuiving van rust naar hoogste druk", () => {
    // In rust: probleemoplossen. Bij hoogste druk: forceren.
    expect(vragen()).toContain("rapport.vraag.drukVerschuiving");
  });

  it("vraagt naar tegengestelde antwoorden bij zorg bij falen", () => {
    expect(vragen()).toContain("rapport.vraag.zorgTegengesteld");
  });

  it("vraagt altijd door op de kaarten als die gekozen zijn", () => {
    expect(vragen()).toContain("rapport.vraag.kaarten");
    expect(vragen({ zonderKaarten: true })).not.toContain("rapport.vraag.kaarten");
  });

  it("vraagt naar een grote afwijking tussen reflex en zelfbeeld", () => {
    expect(vragen({ overschrijf: { R1: "communaal", R3: "communaal", R4: "communaal" } })).toContain("rapport.vraag.reflex");
    expect(vragen()).not.toContain("rapport.vraag.reflex");
  });

  it("stelt geen drukvraag zonder tijdslimieten", () => {
    expect(vragen({ tijdslimieten: false })).not.toContain("rapport.vraag.drukVerschuiving");
  });
});

describe("samenvatting en duiding van de deelnemer", () => {
  const s = (opts: Parameters<typeof voorbeeldAfname>[1] = {}) => sleutels([sectie(rapport(opts), "deelnemer", "samenvatting")]);

  it("volgt de gemeten balans en het energieprofiel", () => {
    expect(s()).toEqual(expect.arrayContaining(["rapport.samenvatting.balans.agentisch", "rapport.samenvatting.energie.hoog", "rapport.samenvatting.waarde"]));
  });

  it("noemt de energiebron en het energielek bij de behoeften", () => {
    const t = teksten([sectie(rapport(), "deelnemer", "energie")]);
    const bron = t.find((x) => x.sleutel === "rapport.energie.bronnen")!;
    const lek = t.find((x) => x.sleutel === "rapport.energie.lekken")!;
    expect(vertaalTekst(bron)).toMatch(/autonomie en competentie/);
    expect(vertaalTekst(lek)).toMatch(/autonomie/);
  });

  it("legt bij denken en waarnemen uit dat ratio en gevoel geen tegenpolen zijn", () => {
    expect(sleutels([sectie(rapport(), "deelnemer", "denken")])).toContain("rapport.denken.uitleg");
  });

  it("noemt in 'wat dit rapport niet zegt' dat er geen vergelijking met anderen is", () => {
    expect(sleutels([sectie(rapport(), "deelnemer", "nietZegt")])).toEqual(
      expect.arrayContaining(["rapport.nietZegt.oordeel", "rapport.nietZegt.geenNorm", "rapport.nietZegt.reflex", "rapport.nietZegt.archetypen"]),
    );
  });

  it("geeft geen onderdeel een waarde als de schaal ontbreekt", () => {
    const leeg = Object.fromEntries(reg.items.filter((i) => i.subschaal === "extra").map((i) => [i.id, null]));
    const r = rapport({ overschrijf: leeg });
    const balk = blokken(sectie(r, "deelnemer", "energie"), "balken")[0].balken.find((b) => b.label.sleutel === "rapport.label.extraversie")!;
    expect(balk.waarde).toBeNull();
    expect(sleutels([sectie(r, "deelnemer", "samenvatting")])).not.toContain("rapport.samenvatting.energie.hoog");
  });
});

describe("puur (regel 20)", () => {
  it("geeft bij hetzelfde profiel altijd hetzelfde rapport", () => {
    const p: Scoreprofiel = profiel();
    expect(maakRapport(p, reg)).toEqual(maakRapport(structuredClone(p), reg));
  });
});
