/**
 * Opslag van afnames achter één interface. Fase 1 gebruikt opslag in de browser voor de demo-afname;
 * fase 4 voegt een database-implementatie toe met dezelfde interface.
 *
 * Er worden hier alleen pseudonieme afnames bewaard, nooit naam of e-mail (harde regel 11).
 */
import type { Afname } from "@/testmotor";

export interface AfnameOpslag {
  bewaar(afname: Afname): Promise<void>;
  haal(id: string): Promise<Afname | null>;
  alle(): Promise<Afname[]>;
  wis(id: string): Promise<void>;
}

export class GeheugenOpslag implements AfnameOpslag {
  private data = new Map<string, Afname>();
  async bewaar(a: Afname) { this.data.set(a.id, structuredClone(a)); }
  async haal(id: string) { const a = this.data.get(id); return a ? structuredClone(a) : null; }
  async alle() { return [...this.data.values()].map((a) => structuredClone(a)); }
  async wis(id: string) { this.data.delete(id); }
}

const VOORVOEGSEL = "lk.afname.";

/**
 * Bewaart afnames in localStorage. Als de browser opslag weigert (privévenster, vol, geblokkeerd),
 * loopt de afname door op het geheugen van de pagina; dan gaat de data verloren bij herladen.
 */
export class BrowserOpslag implements AfnameOpslag {
  private reserve = new GeheugenOpslag();
  constructor(private storage: Storage) {}

  async bewaar(a: Afname) {
    await this.reserve.bewaar(a);
    try { this.storage.setItem(VOORVOEGSEL + a.id, JSON.stringify(a)); } catch { /* reserve houdt de data vast */ }
  }

  async haal(id: string) {
    try {
      const ruw = this.storage.getItem(VOORVOEGSEL + id);
      if (ruw) return JSON.parse(ruw) as Afname;
    } catch { /* val terug op reserve */ }
    return this.reserve.haal(id);
  }

  async alle() {
    const gevonden = new Map<string, Afname>();
    for (const a of await this.reserve.alle()) gevonden.set(a.id, a);
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const k = this.storage.key(i);
        if (k?.startsWith(VOORVOEGSEL)) {
          const ruw = this.storage.getItem(k);
          if (ruw) { const a = JSON.parse(ruw) as Afname; gevonden.set(a.id, a); }
        }
      }
    } catch { /* alleen reserve */ }
    return [...gevonden.values()];
  }

  async wis(id: string) {
    await this.reserve.wis(id);
    try { this.storage.removeItem(VOORVOEGSEL + id); } catch { /* niets te wissen */ }
  }
}
