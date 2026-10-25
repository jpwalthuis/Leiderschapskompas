import { describe, expect, it } from "vitest";
import register from "../content/itemregister.json";
import type { Itemregister } from "@/content/itemregister";
import { BEELD_NAMEN } from "@/content/beelden";

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
});
