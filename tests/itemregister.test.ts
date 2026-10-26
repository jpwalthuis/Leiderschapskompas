import { describe, expect, it } from "vitest";
import register from "../content/itemregister.json";
import {
  isMeetbaar,
  valideerItemregister,
  type Item,
  type Itemregister,
} from "@/content/itemregister";

const echt = register as unknown as Itemregister;

/** Kopie van het register met één aangepast item, voor negatieve tests. */
function metItem(wijziging: (item: Item) => void, index = 0): Itemregister {
  const kopie = structuredClone(echt);
  wijziging(kopie.items[index]);
  return kopie;
}
const regels = (r: Itemregister) => valideerItemregister(r).map((f) => f.regel);

describe("itemregister in content/", () => {
  it("voldoet aan alle regels", () => {
    expect(valideerItemregister(echt)).toEqual([]);
  });

  it("bevat items in alle vier de fasen", () => {
    expect(new Set(echt.items.map((i) => i.fase))).toEqual(new Set([1, 2, 3, 4]));
  });

  it("geeft de beeldkeuze 5 seconden (keuze eigenaar)", () => {
    echt.items.filter((i) => i.format === "beeldkeuze").forEach((i) => expect(i.tijdslimiet_s).toBe(5));
  });

  it("markeert de reflexmeting als experimentele methode (regel 5)", () => {
    const reflex = echt.items.filter((i) => i.format === "beeldkeuze");
    expect(reflex.length).toBeGreaterThan(0);
    reflex.forEach((i) => expect(i.bewijs.methode).toBe("experimenteel"));
  });

  it("archetypen komen alleen voor in niet-meetbare items (regel 3)", () => {
    const archetype = echt.items.filter((i) => /archetyp/i.test(`${i.construct} ${i.kader}`));
    expect(archetype.length).toBeGreaterThan(0);
    archetype.forEach((i) => {
      expect(isMeetbaar(i)).toBe(false);
      expect(i.format).toBe("kaartsortering");
    });
  });
});

describe("regel 1: verplichte verantwoording", () => {
  it.each([
    ["construct", (i: Item) => { i.construct = ""; }],
    ["kader", (i: Item) => { i.kader = " "; }],
    ["bronnen leeg", (i: Item) => { i.bronnen = []; }],
    ["onbekende bron", (i: Item) => { i.bronnen = ["bestaat-niet"]; }],
    ["bewijs construct", (i: Item) => { delete (i.bewijs as Partial<Item["bewijs"]>).construct; }],
    ["bewijs methode ongeldig", (i: Item) => { (i.bewijs as unknown as Record<string, string>).methode = "bewezen"; }],
    ["bewijs item", (i: Item) => { delete (i.bewijs as Partial<Item["bewijs"]>).item; }],
  ])("faalt zonder %s", (_naam, wijziging) => {
    expect(regels(metItem(wijziging))).toContain("1");
  });
});

describe("regel 8: geen namen van bestaande instrumenten", () => {
  it.each(["TKI", "Thomas-Kilmann", "thomas kilmann", "PMAI", "MBTI", "Myers-Briggs", "DUTCH"])(
    "faalt als een deelnemertekst %s noemt",
    (term) => {
      const likert = echt.items.findIndex((i) => i.format === "likert");
      expect(regels(metItem((i) => { i.tekst = `Volgens de ${term} doe ik dit.`; }, likert))).toContain("8");
    },
  );

  it("laat het Engelse woord Dutch als taal ongemoeid", () => {
    const likert = echt.items.findIndex((i) => i.format === "likert");
    expect(regels(metItem((i) => { i.tekst = "I enjoy working with my Dutch colleagues."; }, likert))).not.toContain("8");
  });

  it("laat gewone deelnemertekst ongemoeid", () => {
    const likert = echt.items.findIndex((i) => i.format === "likert");
    expect(regels(metItem((i) => { i.tekst = "Ik werk graag samen met mijn Nederlandse en Duitse collega's."; }, likert))).not.toContain("8");
  });
});

describe("regel 9: versies", () => {
  it("faalt bij een dubbele combinatie van id en versie", () => {
    const kopie = structuredClone(echt);
    kopie.items.push(structuredClone(kopie.items[0]));
    expect(regels(kopie)).toContain("9");
  });

  it("staat een nieuwe versie van hetzelfde item toe", () => {
    const kopie = structuredClone(echt);
    const nieuw = structuredClone(kopie.items[0]);
    nieuw.versie = kopie.items[0].versie + 1;
    kopie.items.push(nieuw);
    expect(valideerItemregister(kopie)).toEqual([]);
  });

  it("faalt bij een ontbrekende of ongeldige versie", () => {
    expect(regels(metItem((i) => { i.versie = 0; }))).toContain("9");
  });
});

describe("regel 2: alleen onderbouwde constructen zijn meetbaar", () => {
  it("weigert een item met een experimenteel construct", () => {
    const item = structuredClone(echt.items[0]);
    item.bewijs.construct = "experimenteel";
    expect(isMeetbaar(item)).toBe(false);
  });

  it("alle huidige items buiten de kaartenoefening hebben een meetbaar construct", () => {
    echt.items.filter((i) => i.format !== "kaartsortering").forEach((i) => expect(isMeetbaar(i)).toBe(true));
  });

  it("de kaartenoefening is nooit meetbaar", () => {
    echt.items.filter((i) => i.format === "kaartsortering").forEach((i) => expect(isMeetbaar(i)).toBe(false));
  });
});

describe("kaartsortering", () => {
  const k = () => echt.items.findIndex((i) => i.format === "kaartsortering");

  it("heeft acht kaarten met unieke id, naam, beeld en twee kwaliteiten", () => {
    const kaarten = echt.items[k()].kaarten!;
    expect(kaarten).toHaveLength(8);
    expect(new Set(kaarten.map((c) => c.id)).size).toBe(8);
    expect(new Set(kaarten.map((c) => c.beeld)).size).toBe(8);
    kaarten.forEach((c) => {
      expect(c.naam && c.binnen && c.buiten).toBeTruthy();
      expect(["agentisch", "communaal", "geintegreerd"]).toContain(c.pool);
    });
  });

  it("faalt als het construct als sterk of matig wordt opgegeven (regel 2 en 3)", () => {
    expect(regels(metItem((i) => { i.bewijs.construct = "matig"; }, k()))).toContain("3");
  });

  it("faalt met te weinig kaarten", () => {
    expect(regels(metItem((i) => { i.kaarten = i.kaarten!.slice(0, 3); }, k()))).toContain("formaat");
  });

  it("faalt met dubbele kaart-id's", () => {
    expect(regels(metItem((i) => { i.kaarten![1].id = i.kaarten![0].id; }, k()))).toContain("formaat");
  });

  it("faalt als een kaart een merknaam noemt (regel 8)", () => {
    expect(regels(metItem((i) => { i.kaarten![0].buiten = "MBTI-type"; }, k()))).toContain("8");
  });

  it("heeft geen tijdslimiet", () => {
    const i = echt.items[k()];
    expect(i.tijdslimiet_s).toBeUndefined();
    expect(i.tijd).toBeUndefined();
  });
});
