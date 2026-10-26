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
      "leeswijzer", "kerngetallen", "kwaliteit", "gespreksvragen", "behoeften", "kompas", "druk", "waarden", "kaarten", "bewijs", "regels", "verantwoording",
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
  it("elk onderdeel met een schaalweergave legt uit dat 0 tot 100 de positie op de antwoordschaal is", () => {
    const schaalblokken = ["balken", "positie", "as", "balans", "kompas", "kerngetallen", "tabel"] as const;
    for (const s of volledig(rapport())) {
      const heeftScores = s.soort === "meting" && s.blokken.some((b) => (schaalblokken as readonly string[]).includes(b.soort));
      const heeftVisual = s.blokken.some((b) => ["balken", "positie", "as", "balans", "kompas"].includes(b.soort));
      if (heeftVisual || (heeftScores && s.id !== "druk" && s.id !== "waarden")) expect(sleutels([s]), s.id).toContain("rapport.schaaluitleg");
    }
  });

  it("alle waarden in het kompas, de positie, de as en de balans liggen tussen 0 en 100", () => {
    const binnen = (v: number | null) => v === null || (v >= 0 && v <= 100);
    for (const s of volledig(rapport())) for (const b of s.blokken) {
      if (b.soort === "kompas") b.delen.forEach((d) => expect(binnen(d.waarde)).toBe(true));
      if (b.soort === "positie") expect(binnen(b.agency) && binnen(b.communion)).toBe(true);
      if (b.soort === "as") expect(binnen(b.waarde)).toBe(true);
      if (b.soort === "balans") b.rijen.forEach((r) => expect(binnen(r.vervuld) && binnen(r.gefrustreerd)).toBe(true));
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

  it("toont de reflex alleen in hetzelfde blok als het zelfbeeld daadkracht", () => {
    let gevonden = 0;
    for (const s of volledig(rapport())) for (const b of blokken(s, "balken")) {
      if (!b.balken.some((y) => y.reeks === "reflex")) continue;
      gevonden++;
      expect(b.balken.some((y) => y.reeks === "zelfbeeld" && y.label.sleutel === "rapport.label.agency"), s.id).toBe(true);
    }
    expect(gevonden).toBeGreaterThan(0);
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
    expect(vertaalTekst(t)).toContain("Strijder, Heerser, Ontdekker, Schepper en Rebel");
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
      "agency", "communion", "extraversie", "behoeften", "conflictInRust", "ratio", "gevoel", "intuitie", "realisme", "waarden", "zorgBijFalen", "reflex", "onderDruk", "kaarten",
    ]);
  });

  it("neemt per onderdeel het zwakste niveau uit het register", () => {
    expect(rij("agency")).toMatchObject({ construct: "sterk", methode: "sterk", item: "nieuw", gebruik: "meting" });
    expect(rij("reflex")).toMatchObject({ methode: "experimenteel", gebruik: "indicatie" });
    expect(rij("waarden")).toMatchObject({ methode: "matig", gebruik: "meting" });
    expect(rij("kaarten")).toMatchObject({ construct: "experimenteel", gebruik: "duiding" });
    expect(rij("realisme")).toMatchObject({ construct: "matig", gebruik: "meting" });
    expect(rij("intuitie")).toMatchObject({ construct: "sterk", gebruik: "meting" });
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

  it("vraagt naar een groot verschil tussen delen van het kompas", () => {
    expect(vragen()).toContain("rapport.vraag.kompas"); // 75 tegenover 25
  });

  it("vraagt naar botsende waarden bovenaan en onderaan", () => {
    expect(vragen()).toContain("rapport.vraag.waarden"); // vrijheid boven, zekerheid onder
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
    expect(blokken(sectie(r, "deelnemer", "energie"), "as")[0].waarde).toBeNull();
    expect(sleutels([sectie(r, "deelnemer", "samenvatting")])).not.toContain("rapport.samenvatting.energie.hoog");
  });
});

describe("puur (regel 20)", () => {
  it("geeft bij hetzelfde profiel altijd hetzelfde rapport", () => {
    const p: Scoreprofiel = profiel();
    expect(maakRapport(p, reg)).toEqual(maakRapport(structuredClone(p), reg));
  });
});

describe("kompas: ratio, gevoel, intuïtie en realisme", () => {
  const kompas = (opts: Parameters<typeof voorbeeldAfname>[1] = {}) => blokken(sectie(rapport(opts), "deelnemer", "denken"), "kompas")[0];

  it("toont de vier delen in vaste volgorde, met de klok mee vanaf boven", () => {
    expect(kompas().delen.map((d) => d.deel)).toEqual(["ratio", "intuitie", "gevoel", "realisme"]);
  });

  it("gebruikt de scores uit de scoring, ongewijzigd", () => {
    const p = profiel();
    const w = Object.fromEntries(kompas().delen.map((d) => [d.deel, d.waarde]));
    expect(w).toEqual({ ratio: p.metingen.denkstijl.ratio.waarde, gevoel: p.metingen.denkstijl.gevoel.waarde, intuitie: p.metingen.waarnemen.intuitie.waarde, realisme: p.metingen.waarnemen.realisme.waarde });
    expect(w).toEqual({ ratio: 75, gevoel: 50, intuitie: 75, realisme: 25 });
  });

  it("benoemt de sterkste en zwakste delen", () => {
    const s = sleutels([sectie(rapport(), "deelnemer", "denken")]);
    expect(s).toEqual(expect.arrayContaining(["rapport.betekenis.kompas.sterk.ratio", "rapport.betekenis.kompas.sterk.intuitie", "rapport.betekenis.kompas.zwak.realisme"]));
  });

  it("noemt een profiel evenwichtig als alle delen dicht bij elkaar liggen", () => {
    const drie = Object.fromEntries(reg.items.filter((i) => ["rationeel", "ervaringsgericht", "intuitie", "realisme"].includes(i.subschaal ?? "")).map((i) => [i.id, "3"]));
    const s = sleutels([sectie(rapport({ overschrijf: drie }), "deelnemer", "denken")]);
    expect(s).toContain("rapport.betekenis.kompas.evenwichtig");
    expect(s.some((x) => x.startsWith("rapport.betekenis.kompas.sterk."))).toBe(false);
  });
});

describe("visuals in het deelnemerrapport", () => {
  const r = rapport();

  it("daadkracht en verbinding als positie in een vlak, met de balansmarge", () => {
    const b = blokken(sectie(r, "deelnemer", "gerichtheid"), "positie")[0];
    expect(b).toMatchObject({ agency: 75, communion: 50, marge: 12 });
  });

  it("extraversie als as tussen rust en contact", () => {
    expect(blokken(sectie(r, "deelnemer", "energie"), "as")[0]).toMatchObject({ waarde: 75, links: { sleutel: "rapport.as.rust" }, rechts: { sleutel: "rapport.as.contact" } });
  });

  it("basisbehoeften als balans van vervuld en gefrustreerd", () => {
    const b = blokken(sectie(r, "deelnemer", "energie"), "balans")[0];
    expect(b.rijen.map((x) => [x.vervuld, x.gefrustreerd])).toEqual([[75, 75], [75, 25], [50, 25]]);
  });

  it("regel 7: de waardencirkel bevat alleen plaatsen, geen sterkte", () => {
    const b = blokken(sectie(r, "deelnemer", "drijfveren"), "waardencirkel")[0];
    expect(b.waarden.map((w) => w.code)).toEqual(["OC", "SE", "CO", "ST"]);
    expect(b.waarden.map((w) => w.plaats)).toEqual([1, 2, 4, 3]);
    for (const w of b.waarden) expect(Object.keys(w).sort()).toEqual(["code", "label", "plaats"]);
  });

  it("conflict onder druk als verloop over vier niveaus, met de opties die er nog waren", () => {
    const b = blokken(sectie(r, "deelnemer", "conflict"), "drukverloop")[0];
    expect(b.kolommen.map((k) => [k.meest, k.minst, k.opties.length])).toEqual([["prob", "avoid", 5], ["prob", "forc", 5], ["forc", "avoid", 4], ["forc", "yield", 3]]);
  });

  it("zonder tijdslimieten geen drukverloop", () => {
    expect(blokken(sectie(rapport({ tijdslimieten: false }), "deelnemer", "conflict"), "drukverloop")).toHaveLength(0);
  });

  it("de reflex staat niet in de positie (regel 5)", () => {
    expect(Object.keys(blokken(sectie(r, "deelnemer", "gerichtheid"), "positie")[0]).sort()).toEqual(["agency", "communion", "marge", "soort"]);
  });
});

describe("wat dit zou kunnen betekenen", () => {
  it("elke meting voor de deelnemer heeft een duiding in woorden met een vraag", () => {
    for (const s of rapport().deelnemer.filter((x) => x.soort === "meting")) {
      const b = blokken(s, "betekenis");
      expect(b.length, s.id).toBe(1);
      expect(b[0].alineas.length, s.id).toBeGreaterThan(0);
      expect(b[0].vraag, s.id).toBeTruthy();
    }
  });

  it("de kaarten krijgen een duiding per gekozen kaart", () => {
    const b = blokken(sectie(rapport(), "deelnemer", "archetypen"), "betekenis")[0];
    expect(b.alineas.map((x) => x.sleutel)).toEqual([
      "rapport.betekenis.kaart.wijze.voorkeur", "rapport.betekenis.kaart.ontdekker.voorkeur",
      "rapport.betekenis.kaart.zorggever.afwijzing", "rapport.betekenis.kaart.nar.afwijzing", "rapport.betekenis.kaart.schaduw",
    ]);
  });

  it("benoemt botsende waarden als de bovenste en onderste tegenover elkaar staan", () => {
    expect(sleutels([sectie(rapport(), "deelnemer", "drijfveren")])).toContain("rapport.betekenis.waarden.tegenpolen");
  });

  it("alle kaarten hebben een duiding voor voorkeur en afwijzing", () => {
    for (const k of reg.items.find((i) => i.format === "kaartsortering")!.kaarten!) {
      expect(() => vertaal(`rapport.betekenis.kaart.${k.id}.voorkeur`)).not.toThrow();
      expect(() => vertaal(`rapport.betekenis.kaart.${k.id}.afwijzing`)).not.toThrow();
    }
  });
});

describe("uitleg voor de coach", () => {
  const r = rapport();

  it("begint met een leeswijzer", () => {
    expect(r.coach[0].id).toBe("leeswijzer");
  });

  it("elk onderdeel van het coachrapport heeft een toelichting", () => {
    for (const s of r.coach.slice(1)) {
      expect(s.toelichting, s.id).toBeTruthy();
      expect(vertaalTekst(s.toelichting!).length, s.id).toBeGreaterThan(150);
    }
  });
});

describe("visuals ook in het coachrapport", () => {
  const diagrammen = ["positie", "as", "balans", "kompas", "waardencirkel", "drukverloop", "balken"];

  it("elk onderdeel met scores begint met een diagram, de tabel staat eronder", () => {
    for (const id of ["kerngetallen", "behoeften", "kompas", "druk", "waarden"]) {
      const s = sectie(rapport(), "coach", id);
      const eerste = s.blokken.findIndex((b) => diagrammen.includes(b.soort));
      expect(eerste, id).toBeGreaterThanOrEqual(0);
      const tabel = s.blokken.findIndex((b) => b.soort === "tabel" || b.soort === "kerngetallen");
      if (tabel >= 0) expect(eerste, id).toBeLessThan(tabel);
    }
  });

  it("toont conflict in rust en onder druk samen", () => {
    const s = sectie(rapport(), "coach", "druk");
    expect(blokken(s, "balken")).toHaveLength(1);
    expect(blokken(s, "drukverloop")).toHaveLength(1);
  });

  it("zonder tijdslimieten: wel conflict in rust, geen drukverloop", () => {
    const s = sectie(rapport({ tijdslimieten: false }), "coach", "druk");
    expect(blokken(s, "balken")).toHaveLength(1);
    expect(blokken(s, "drukverloop")).toHaveLength(0);
  });
});
