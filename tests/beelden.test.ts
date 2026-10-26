import { describe, expect, it } from "vitest";
import register from "../content/itemregister.json";
import type { Itemregister } from "@/content/itemregister";
import { existsSync } from "node:fs";
import { BEELD_NAMEN } from "@/content/beelden";
import { KAART_FOTOS } from "@/content/kaartfotos";

const reg = register as unknown as Itemregister;

describe("beelden voor de reflexmeting", () => {
  it("elk beeld waar een item naar verwijst, bestaat", () => {
    const nodig = reg.items
      .filter((i) => i.format === "beeldkeuze")
      .flatMap((i) => [i.beeld_agentisch!, i.beeld_communaal!]);
    nodig.forEach((n) => expect(BEELD_NAMEN).toContain(n));
  });

  it("de oefenronde heeft haar eigen, neutrale beelden", () => {
    expect(BEELD_NAMEN).toContain("cirkel");
    expect(BEELD_NAMEN).toContain("vierkant");
  });

  it("elke kaart van de kaartenoefening heeft een eigen foto die bestaat", () => {
    const kaarten = reg.items.flatMap((i) => i.kaarten ?? []);
    expect(kaarten.length).toBeGreaterThan(0);
    expect(new Set(kaarten.map((k) => k.beeld)).size).toBe(kaarten.length);
    for (const k of kaarten) {
      const pad = KAART_FOTOS[k.beeld];
      expect(pad, k.id).toBeTruthy();
      expect(existsSync(`public${pad}`), pad).toBe(true);
      expect(k.omschrijving, k.id).toBeTruthy();
    }
  });
});
