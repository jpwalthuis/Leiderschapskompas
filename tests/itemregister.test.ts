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

  it("bevat items in alle drie de fasen", () => {
    expect(new Set(echt.items.map((i) => i.fase))).toEqual(new Set([1, 2, 3]));
  });

  it("markeert de reflexmeting als experimentele methode (regel 5)", () => {
    const reflex = echt.items.filter((i) => i.format === "beeldkeuze");
    expect(reflex.length).toBeGreaterThan(0);
    reflex.forEach((i) => expect(i.bewijs.methode).toBe("experimenteel"));
  });

  it("bevat geen items die archetypen claimen te meten (regel 3)", () => {
    echt.items.forEach((i) => expect(i.construct.toLowerCase()).not.toMatch(/archetype/));
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
    nieuw.versie = 2;
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

  it("alle huidige items hebben een meetbaar construct", () => {
    echt.items.forEach((i) => expect(isMeetbaar(i)).toBe(true));
  });
});
