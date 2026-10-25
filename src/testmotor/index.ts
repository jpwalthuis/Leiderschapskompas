/**
 * Testmotor: volgorde van de afname, presentatievolgorde van opties en vastleggen van antwoorden.
 * Puur: geen UI, geen opslag, geen klok. Tijd en willekeur komen als invoer binnen.
 *
 * Bewaakt harde regels 9 (itemversies) en 10 (volledig antwoord).
 */
import type { Item, Itemregister } from "@/content/itemregister";

/** Tot de scoring er is (fase 2) wordt elke afname als ongescoord vastgelegd. */
export const SCORINGSVERSIE = "ongescoord";

export type Fase = 1 | 2 | 3;

export type Stap =
  | { soort: "intro"; fase: Fase }
  | { soort: "oefen" }
  | { soort: "item"; item: Item }
  | { soort: "einde" };

export interface Antwoord {
  afname_id: string;
  item_id: string;
  itemversie: number;
  fase: Fase;
  format: Item["format"];
  /** Ruwe waarde: de sleutel van de gekozen optie, of null bij een time-out. */
  waarde: string | null;
  time_out: boolean;
  reactietijd_ms: number | null;
  tijdslimiet_ms: number | null;
  /** Opties in de volgorde waarin ze getoond zijn (links naar rechts, of boven naar beneden). */
  getoonde_positie: string[];
  /** Index van de gekozen optie in getoonde_positie, of null bij een time-out. */
  gekozen_positie: number | null;
  /** Het scherm verloor de focus terwijl de vraag openstond (app gewisseld, scherm uit). */
  onderbroken: boolean;
  scoringsversie: string;
  vastgelegd_op: string;
}

export interface Afname {
  id: string;
  seed: number;
  gestart_op: string;
  afgerond_op: string | null;
  status: "bezig" | "afgerond";
  itemset_versie: string;
  scoringsversie: string;
  antwoorden: Antwoord[];
}

const LIKERT = ["1", "2", "3", "4", "5"];

/** Volgorde van de afname: per fase een intro, na de eerste intro een oefenronde, dan de items in registervolgorde. */
export function bouwStappen(register: Itemregister): Stap[] {
  const stappen: Stap[] = [];
  for (const fase of [1, 2, 3] as const) {
    const items = register.items.filter((i) => i.fase === fase);
    if (items.length === 0) continue;
    stappen.push({ soort: "intro", fase });
    if (fase === 1) stappen.push({ soort: "oefen" });
    items.forEach((item) => stappen.push({ soort: "item", item }));
  }
  stappen.push({ soort: "einde" });
  return stappen;
}

/** FNV-1a, 32 bit. Genoeg voor een korte, stabiele vingerafdruk; geen cryptografisch doel. */
function fnv1a(tekst: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < tekst.length; i++) {
    h ^= tekst.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Mulberry32: kleine, deterministische generator. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function schud<T>(lijst: T[], rnd: () => number): T[] {
  const uit = [...lijst];
  for (let i = uit.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [uit[i], uit[j]] = [uit[j], uit[i]];
  }
  return uit;
}

/** Alle optiesleutels van een item, in registervolgorde. */
export function optieSleutels(item: Item): string[] {
  switch (item.format) {
    case "beeldkeuze":
      return ["agentisch", "communaal"];
    case "likert":
      return LIKERT;
    case "dilemma":
      return ["a", "b"];
    case "vignet":
      return Object.keys(item.opties ?? {});
  }
}

/**
 * Presentatievolgorde van de opties. Willekeurig per afname en per item, maar reproduceerbaar uit de seed.
 * De antwoordschaal van een stelling blijft altijd 1 tot 5.
 */
export function optieVolgorde(item: Item, seed: number): string[] {
  const sleutels = optieSleutels(item);
  if (item.format === "likert") return sleutels;
  return schud(sleutels, generator(fnv1a(`${seed}:${item.id}@${item.versie}`)));
}

/** Vingerafdruk van de set items (id en versie). Verandert zodra een item wordt toegevoegd, verwijderd of herzien. */
export function itemsetVersie(register: Itemregister): string {
  const sleutel = register.items.map((i) => `${i.id}@${i.versie}`).sort().join("|");
  return `s${register.schema_versie}-${fnv1a(sleutel).toString(16).padStart(8, "0")}`;
}

export function nieuweAfname(register: Itemregister, opts: { id: string; seed: number; nu: string }): Afname {
  return {
    id: opts.id,
    seed: opts.seed,
    gestart_op: opts.nu,
    afgerond_op: null,
    status: "bezig",
    itemset_versie: itemsetVersie(register),
    scoringsversie: SCORINGSVERSIE,
    antwoorden: [],
  };
}

export interface AntwoordInvoer {
  /** Sleutel van de gekozen optie, of null bij een time-out. */
  waarde: string | null;
  reactietijd_ms: number | null;
  volgorde: string[];
  nu: string;
  onderbroken?: boolean;
}

export function maakAntwoord(afname: Afname, item: Item, invoer: AntwoordInvoer): Antwoord {
  const timeOut = invoer.waarde === null;
  if (!timeOut) {
    if (!invoer.volgorde.includes(invoer.waarde!)) {
      throw new Error(`Waarde "${invoer.waarde}" is niet getoond bij ${item.id}.`);
    }
    if (typeof invoer.reactietijd_ms !== "number" || !Number.isFinite(invoer.reactietijd_ms) || invoer.reactietijd_ms < 0) {
      throw new Error(`Ongeldige reactietijd bij ${item.id}.`);
    }
  }
  return {
    afname_id: afname.id,
    item_id: item.id,
    itemversie: item.versie,
    fase: item.fase,
    format: item.format,
    waarde: timeOut ? null : invoer.waarde,
    time_out: timeOut,
    reactietijd_ms: timeOut ? null : Math.round(invoer.reactietijd_ms!),
    tijdslimiet_ms: typeof item.tijdslimiet_s === "number" ? item.tijdslimiet_s * 1000 : null,
    getoonde_positie: [...invoer.volgorde],
    gekozen_positie: timeOut ? null : invoer.volgorde.indexOf(invoer.waarde!),
    onderbroken: invoer.onderbroken ?? false,
    scoringsversie: afname.scoringsversie,
    vastgelegd_op: invoer.nu,
  };
}

/** Meldt wat er aan een antwoord ontbreekt volgens harde regel 10. Lege lijst = volledig. */
export function controleerAntwoord(a: Antwoord): string[] {
  const m: string[] = [];
  if (!a.item_id) m.push("item-ID ontbreekt");
  if (!Number.isInteger(a.itemversie) || a.itemversie < 1) m.push("itemversie ontbreekt");
  if (!Array.isArray(a.getoonde_positie) || a.getoonde_positie.length === 0) m.push("getoonde positie ontbreekt");
  if (!a.scoringsversie) m.push("scoringsversie ontbreekt");
  if (a.time_out) {
    if (a.waarde !== null || a.reactietijd_ms !== null) m.push("time-out mag geen waarde of reactietijd hebben");
  } else {
    if (a.waarde === null || !a.getoonde_positie?.includes(a.waarde)) m.push("ruwe waarde ontbreekt of is niet getoond");
    if (typeof a.reactietijd_ms !== "number" || a.reactietijd_ms < 0) m.push("reactietijd ontbreekt");
  }
  return m;
}

/** Voegt een antwoord toe. Alleen het eerste antwoord per item telt; een afgeronde afname blijft ongewijzigd. */
export function registreer(afname: Afname, antwoord: Antwoord): Afname {
  if (afname.status !== "bezig") return afname;
  if (afname.antwoorden.some((a) => a.item_id === antwoord.item_id && a.itemversie === antwoord.itemversie)) return afname;
  return { ...afname, antwoorden: [...afname.antwoorden, antwoord] };
}

export function rondAf(afname: Afname, nu: string): Afname {
  return afname.status === "afgerond" ? afname : { ...afname, status: "afgerond", afgerond_op: nu };
}
