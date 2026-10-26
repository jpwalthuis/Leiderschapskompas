import { describe, expect, it } from "vitest";
import { vertaal } from "@/i18n";

describe("vertaallaag", () => {
  it("geeft de Nederlandse tekst terug", () => {
    expect(vertaal("app.naam")).toBe("Leiderschapskompas");
  });

  it("vult variabelen in", () => {
    expect(vertaal("start.itemsGeladen", { aantal: 39 })).toMatch(/^39 vragen/);
  });

  it("faalt luid bij een ontbrekende sleutel", () => {
    expect(() => vertaal("bestaat.niet")).toThrow(/Ontbrekende vertaling/);
  });
});

describe("teksten volgen het itemregister", () => {
  it("noemt bij de reflex de tijdslimiet uit het register", async () => {
    const { default: register } = await import("../content/itemregister.json");
    const s = register.items.find((i) => i.format === "beeldkeuze")!.tijdslimiet_s;
    expect(vertaal("afname.welkom.fase1", { seconden: s! })).toContain(`${s} seconden`);
    expect(vertaal("afname.intro.1.tekst", { seconden: s! })).toContain(`${s} seconden`);
  });
});

describe("regel 8 in alle teksten", () => {
  it("geen enkele vertaaltekst noemt een bestaand instrument", async () => {
    const { default: nl } = await import("@/i18n/messages/nl.json");
    const { verbodenTerm } = await import("@/content/itemregister");
    const alle: string[] = [];
    const loop = (x: unknown) => (typeof x === "string" ? alle.push(x) : x && typeof x === "object" && Object.values(x).forEach(loop));
    loop(nl);
    expect(alle.map(verbodenTerm).filter(Boolean)).toEqual([]);
  });
});
