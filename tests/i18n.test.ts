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
