import { describe, expect, it } from "vitest";
import register from "../content/itemregister.json";
import type { Itemregister } from "@/content/itemregister";
import { nieuweAfname } from "@/testmotor";
import { BrowserOpslag, GeheugenOpslag, type AfnameOpslag } from "@/opslag";

const reg = register as unknown as Itemregister;
const maak = (id: string) => nieuweAfname(reg, { id, seed: 1, nu: "2026-10-25T10:00:00.000Z" });

/** Minimale nabootsing van window.localStorage. */
class NepStorage implements Storage {
  private d = new Map<string, string>();
  get length() { return this.d.size; }
  clear() { this.d.clear(); }
  getItem(k: string) { return this.d.get(k) ?? null; }
  key(i: number) { return [...this.d.keys()][i] ?? null; }
  removeItem(k: string) { this.d.delete(k); }
  setItem(k: string, v: string) { this.d.set(k, v); }
}

const varianten: [string, () => AfnameOpslag][] = [
  ["geheugen", () => new GeheugenOpslag()],
  ["browser", () => new BrowserOpslag(new NepStorage())],
];

describe.each(varianten)("opslag: %s", (_naam, maakOpslag) => {
  it("bewaart en haalt een afname terug", async () => {
    const o = maakOpslag();
    await o.bewaar(maak("A-1"));
    expect((await o.haal("A-1"))?.id).toBe("A-1");
  });

  it("overschrijft een afname met dezelfde id", async () => {
    const o = maakOpslag();
    await o.bewaar(maak("A-1"));
    await o.bewaar({ ...maak("A-1"), status: "afgerond" });
    expect((await o.alle())).toHaveLength(1);
    expect((await o.haal("A-1"))?.status).toBe("afgerond");
  });

  it("geeft null voor een onbekende afname", async () => {
    expect(await maakOpslag().haal("bestaat-niet")).toBeNull();
  });

  it("wist een afname", async () => {
    const o = maakOpslag();
    await o.bewaar(maak("A-1"));
    await o.wis("A-1");
    expect(await o.haal("A-1")).toBeNull();
  });
});

describe("browseropslag", () => {
  it("raakt sleutels van andere toepassingen niet aan", async () => {
    const s = new NepStorage();
    s.setItem("iets-anders", "blijft");
    const o = new BrowserOpslag(s);
    await o.bewaar(maak("A-1"));
    await o.wis("A-1");
    expect(s.getItem("iets-anders")).toBe("blijft");
  });

  it("werkt door als de browseropslag weigert (privévenster)", async () => {
    const weigert = new NepStorage();
    weigert.setItem = () => { throw new Error("QuotaExceededError"); };
    const o = new BrowserOpslag(weigert);
    await expect(o.bewaar(maak("A-1"))).resolves.toBeUndefined();
    expect((await o.haal("A-1"))?.id).toBe("A-1");
  });
});
