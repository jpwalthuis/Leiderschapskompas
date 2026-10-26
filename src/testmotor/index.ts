/**
 * Testmotor: volgorde van de afname, presentatievolgorde van opties en vastleggen van antwoorden.
 * Puur: geen UI, geen opslag, geen klok. Tijd en willekeur komen als invoer binnen.
 *
 * Bewaakt harde regels 5 (afname zonder tijdslimieten), 9 (itemversies) en 10 (volledig antwoord).
 */
import type { Item, Itemregister } from "@/content/itemregister";

import { SCORINGSVERSIE } from "@/scoring/versie";

/** Versie van de scoringsregels die bij vastleggen gold; wordt per antwoord bewaard (harde regel 10). */
export { SCORINGSVERSIE };

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
  /** 1 voor het eerste antwoord; hoger als de deelnemer een stelling herziet. Eerdere pogingen blijven bewaard. */
  poging: number;
  /** "meest-minst" bij vignetten: `waarde` is de meest waarschijnlijke reactie, `minst` de minst waarschijnlijke. */
  antwoordformaat: "enkel" | "meest-minst";
  minst: string | null;
  /** Tijd tussen de keuze voor meest en de keuze voor minst (zonder tijdslimiet). */
  reactietijd_minst_ms: number | null;
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
  /** Uit = afname zonder tijdslimieten. Dan vervallen de reflex- en drukscores (harde regel 5). */
  tijdslimieten: boolean;
  /** Alle antwoorden in volgorde van vastleggen, inclusief herziene pogingen. Nooit overschreven. */
  antwoorden: Antwoord[];
}

/** Alleen stellingen mogen herzien worden; bij getimede vragen telt de eerste reactie. */
export function isHerzienbaar(format: Item["format"]): boolean {
  return format === "likert";
}

const LIKERT = ["1", "2", "3", "4", "5"];

/**
 * Volgorde van de afname: per fase een intro, na de eerste intro een oefenronde, dan de items.
 * Stellingen worden per afname gemengd (reproduceerbaar uit de seed), zodat stellingen van dezelfde schaal
 * nooit naast elkaar staan en de uitkomst niet uit de volgorde af te leiden is. Getimede items houden
 * de registervolgorde, omdat de druk daar bewust oploopt.
 */
export function bouwStappen(register: Itemregister, seed = 0): Stap[] {
  const stappen: Stap[] = [];
  for (const fase of [1, 2, 3] as const) {
    const items = register.items.filter((i) => i.fase === fase);
    if (items.length === 0) continue;
    stappen.push({ soort: "intro", fase });
    if (fase === 1) stappen.push({ soort: "oefen" });
    const stellingen = mengStellingen(items.filter((i) => i.format === "likert"), seed);
    [...stellingen, ...items.filter((i) => i.format !== "likert")].forEach((item) => stappen.push({ soort: "item", item }));
  }
  stappen.push({ soort: "einde" });
  return stappen;
}

/**
 * Mengt de stellingen willekeurig, met als enige eis dat twee opeenvolgende stellingen nooit van dezelfde schaal zijn.
 * Elke stap trekt een willekeurige stelling uit de toegestane; een trekking die het vervolg onmogelijk zou maken,
 * wordt overgeslagen. Zo ontstaat geen vast patroon (zoals steeds dezelfde drie schalen na elkaar).
 */
function mengStellingen(items: Item[], seed: number): Item[] {
  const rnd = generator(fnv1a(`${seed}:stellingen`));
  const rest = [...items];
  const uit: Item[] = [];
  const schaal = (i: Item) => i.subschaal ?? "";
  // Is de rest nog zo te ordenen dat buren verschillen, gegeven dat de vorige stelling van schaal `laatste` was?
  const haalbaar = (over: Item[], laatste: string) => {
    const n = over.length;
    const telling = new Map<string, number>();
    over.forEach((i) => telling.set(schaal(i), (telling.get(schaal(i)) ?? 0) + 1));
    return [...telling].every(([g, c]) => c <= (g === laatste ? Math.floor(n / 2) : Math.ceil(n / 2)));
  };
  while (rest.length) {
    const vorige = uit.length ? schaal(uit[uit.length - 1]) : null;
    const toegestaan = rest
      .map((i, k) => k)
      .filter((k) => schaal(rest[k]) !== vorige && haalbaar(rest.filter((_, j) => j !== k), schaal(rest[k])));
    // Geen nette ordening mogelijk (bijvoorbeeld één schaal met te veel stellingen): neem dan willekeurig de rest.
    const keuzes = toegestaan.length ? toegestaan : rest.map((_, k) => k);
    const k = keuzes[Math.floor(rnd() * keuzes.length)];
    uit.push(rest.splice(k, 1)[0]);
  }
  return uit;
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

export function nieuweAfname(
  register: Itemregister,
  opts: { id: string; seed: number; nu: string; tijdslimieten?: boolean },
): Afname {
  return {
    id: opts.id,
    seed: opts.seed,
    gestart_op: opts.nu,
    afgerond_op: null,
    status: "bezig",
    itemset_versie: itemsetVersie(register),
    scoringsversie: SCORINGSVERSIE,
    tijdslimieten: opts.tijdslimieten ?? true,
    antwoorden: [],
  };
}

export interface AntwoordInvoer {
  /** Sleutel van de gekozen optie (bij vignetten: de meest waarschijnlijke), of null bij een time-out. */
  waarde: string | null;
  reactietijd_ms: number | null;
  volgorde: string[];
  nu: string;
  onderbroken?: boolean;
  /** Alleen bij vignetten: de minst waarschijnlijke reactie. */
  minst?: string | null;
  reactietijd_minst_ms?: number | null;
}

/** Gemiddelde stille leessnelheid over alle studies (Brysbaert, 2019). */
export const LEESSNELHEID_WPM = 238;

/** Alle tekst die bij een item op het scherm staat. */
function schermtekst(item: Item): string {
  return [item.woord, item.tekst, item.vraag, item.optie_a?.tekst, item.optie_b?.tekst, ...Object.values(item.opties ?? {})]
    .filter((t): t is string => !!t)
    .join(" ");
}

/** Tijdslimiet in seconden afgeleid van de leestijd, of null als het item geen leestijdmodel heeft. */
export function leestijdLimietS(item: Item): number | null {
  if (!item.tijd) return null;
  const woorden = schermtekst(item).trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil((woorden / LEESSNELHEID_WPM) * 60 * item.tijd.leesfactor + item.tijd.beslis_s);
}

/** Tijdslimiet in ms voor dit item in deze afname, of null als er geen limiet geldt. */
export function tijdslimietMs(afname: Afname, item: Item): number | null {
  if (!afname.tijdslimieten) return null;
  const lees = leestijdLimietS(item);
  if (lees !== null) return lees * 1000;
  return typeof item.tijdslimiet_s === "number" ? item.tijdslimiet_s * 1000 : null;
}

export function maakAntwoord(afname: Afname, item: Item, invoer: AntwoordInvoer): Antwoord {
  const timeOut = invoer.waarde === null;
  if (timeOut && tijdslimietMs(afname, item) === null) {
    throw new Error(`Time-out bij ${item.id} terwijl er geen tijdslimiet geldt.`);
  }
  const meestMinst = item.antwoord === "meest-minst";
  if (!timeOut) {
    if (!invoer.volgorde.includes(invoer.waarde!)) {
      throw new Error(`Waarde "${invoer.waarde}" is niet getoond bij ${item.id}.`);
    }
    if (meestMinst && (!invoer.minst || !invoer.volgorde.includes(invoer.minst) || invoer.minst === invoer.waarde)) {
      throw new Error(`Bij ${item.id} ontbreekt een geldige minst waarschijnlijke reactie.`);
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
    tijdslimiet_ms: tijdslimietMs(afname, item),
    getoonde_positie: [...invoer.volgorde],
    gekozen_positie: timeOut ? null : invoer.volgorde.indexOf(invoer.waarde!),
    onderbroken: invoer.onderbroken ?? false,
    poging: 1,
    antwoordformaat: meestMinst ? "meest-minst" : "enkel",
    minst: meestMinst && !timeOut ? invoer.minst! : null,
    reactietijd_minst_ms:
      meestMinst && !timeOut && typeof invoer.reactietijd_minst_ms === "number" ? Math.round(invoer.reactietijd_minst_ms) : null,
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
  if (!Number.isInteger(a.poging) || a.poging < 1) m.push("poging ontbreekt");
  if (a.antwoordformaat === "meest-minst" && !a.time_out && (!a.minst || a.minst === a.waarde || !a.getoonde_positie?.includes(a.minst))) {
    m.push("minst waarschijnlijke reactie ontbreekt");
  }
  if (a.time_out) {
    if (a.waarde !== null || a.reactietijd_ms !== null) m.push("time-out mag geen waarde of reactietijd hebben");
  } else {
    if (a.waarde === null || !a.getoonde_positie?.includes(a.waarde)) m.push("ruwe waarde ontbreekt of is niet getoond");
    if (typeof a.reactietijd_ms !== "number" || a.reactietijd_ms < 0) m.push("reactietijd ontbreekt");
  }
  return m;
}

const zelfdeItem = (a: Antwoord, b: Pick<Antwoord, "item_id" | "itemversie">) =>
  a.item_id === b.item_id && a.itemversie === b.itemversie;

/**
 * Voegt een antwoord toe. Een afgeronde afname blijft ongewijzigd.
 * Bij getimede vragen telt alleen het eerste antwoord. Een stelling mag herzien worden:
 * dat wordt een nieuwe poging naast de eerdere, die bewaard blijven.
 */
export function registreer(afname: Afname, antwoord: Antwoord): Afname {
  if (afname.status !== "bezig") return afname;
  const eerder = afname.antwoorden.filter((a) => zelfdeItem(a, antwoord)).length;
  if (eerder > 0 && !isHerzienbaar(antwoord.format)) return afname;
  return { ...afname, antwoorden: [...afname.antwoorden, { ...antwoord, poging: eerder + 1 }] };
}

/** Het antwoord dat telt per item: de laatste poging, in de volgorde waarin de items voor het eerst beantwoord zijn. */
export function geldigeAntwoorden(afname: Afname): Antwoord[] {
  const laatste = new Map<string, Antwoord>();
  for (const a of afname.antwoorden) laatste.set(`${a.item_id}@${a.itemversie}`, a);
  return [...laatste.values()];
}

/** Het huidige antwoord op een item, of null. */
export function huidigAntwoord(afname: Afname, item: Pick<Item, "id" | "versie">): Antwoord | null {
  const sleutel = { item_id: item.id, itemversie: item.versie };
  return afname.antwoorden.filter((a) => zelfdeItem(a, sleutel)).at(-1) ?? null;
}

export function rondAf(afname: Afname, nu: string): Afname {
  return afname.status === "afgerond" ? afname : { ...afname, status: "afgerond", afgerond_op: nu };
}
