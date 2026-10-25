/**
 * Scoring: van ruwe antwoorden naar een scoreprofiel. Puur: geen database, geen UI, geen klok (harde regel 20).
 *
 * Bewaakt:
 * - regel 2: alleen items met een onderbouwd construct tellen mee;
 * - regel 3: archetypen zijn duiding, afgeleid van agency/communion, nooit een meting;
 * - regel 5: reflex en druk vervallen zonder tijdslimieten; reflex hoort bij het construct agency;
 * - regel 6: scores zijn posities op de antwoordschaal, geen normscores;
 * - regel 7: gedwongen keuzes geven alleen een rangorde (ipsatief);
 * - regel 10: dezelfde ruwe data en scoringsversie geven altijd hetzelfde profiel.
 */
import { isMeetbaar, type Item, type Itemregister } from "@/content/itemregister";
import { geldigeAntwoorden, type Afname, type Antwoord } from "@/testmotor";
import { SCORINGSVERSIE } from "./versie";

export { SCORINGSVERSIE };

/** Reacties sneller dan dit tellen niet als reflexkeuze: dan is het beeld waarschijnlijk niet bekeken. */
export const TE_SNEL_MS = 300;
/** Minimum aantal geldige reflexkeuzes voor een reflexindicatie. */
export const MIN_REFLEXKEUZES = 4;
/** Verschil agency − communion waarbinnen de balans als geïntegreerd geldt (duiding). */
export const BALANSMARGE = 12;
/** Minimum aantal stellingen voor de controle op een rechtlijnig antwoordpatroon. */
const MIN_RECHTLIJNIG = 8;

export type Status = "beschikbaar" | "niet-beschikbaar" | "onvoldoende-gegevens";

export interface Schaalscore {
  subschaal: string;
  /** Positie op de antwoordschaal, 0 tot 100. Geen normscore (regel 6). */
  waarde: number | null;
  betekenis: "positie-op-antwoordschaal";
  status: Status;
  nItems: number;
  nBeantwoord: number;
}

export type Stijl = "forc" | "prob" | "comp" | "yield" | "avoid";
export const STIJLEN: Stijl[] = ["forc", "prob", "comp", "yield", "avoid"];

export interface Scoreprofiel {
  scoringsversie: string;
  afnameId: string;
  itemsetVersie: string;
  tijdslimieten: boolean;
  metingen: {
    agency: Schaalscore;
    communion: Schaalscore;
    extraversie: Schaalscore;
    behoeften: Record<"autonomie" | "competentie" | "verbondenheid", { bevrediging: Schaalscore; frustratie: Schaalscore }>;
    conflictInRust: { scores: Record<Stijl, Schaalscore>; voorkeur: Stijl[] };
    waarden: {
      ipsatief: true;
      aantalDilemmas: number;
      beantwoord: number;
      rangorde: { waarde: string; keuzes: number; plaats: number }[];
    };
    zorgBijFalen: { agentisch: number; communaal: number; beantwoord: number };
  };
  reflex: {
    status: Status;
    methode: "experimenteel";
    /** Construct waarnaast de reflexindicatie getoond moet worden (regel 5). */
    vergelijkMet: "agency";
    /** Percentage agentische keuzes van de geldige reflexkeuzes. */
    agentisch: number | null;
    geldigeKeuzes: number;
    medianeReactietijdMs: number | null;
  };
  onderDruk: {
    status: Status;
    keuzes: { itemId: string; drukniveau: string; aantalOpties: number; keuze: Stijl | null; reactietijdMs: number | null }[];
    keuzeBijHoogsteDruk: Stijl | null;
  };
  kwaliteit: {
    timeOuts: number;
    teSnel: number;
    rechtlijnig: boolean;
    onderbroken: number;
    herzieningen: number;
  };
  duiding: {
    soort: "duiding";
    archetypegroep: "agentisch" | "communaal" | "geintegreerd" | null;
    verschil: number | null;
  };
}

const positie = (gemiddelde: number) => Math.round(((gemiddelde - 1) / 4) * 100);

function schaal(subschaal: string, items: Item[], antwoorden: Map<string, Antwoord>): Schaalscore {
  const telt = items.filter((i) => i.format === "likert" && i.subschaal === subschaal && isMeetbaar(i));
  const waarden = telt.flatMap((i) => {
    const a = antwoorden.get(i.id);
    if (!a || a.waarde === null) return [];
    const v = Number(a.waarde);
    return [i.omgekeerd ? 6 - v : v];
  });
  const gem = waarden.length ? waarden.reduce((s, v) => s + v, 0) / waarden.length : null;
  return {
    subschaal,
    waarde: gem === null ? null : positie(gem),
    betekenis: "positie-op-antwoordschaal",
    status: gem === null ? "onvoldoende-gegevens" : "beschikbaar",
    nItems: telt.length,
    nBeantwoord: waarden.length,
  };
}

function mediaan(lijst: number[]): number | null {
  if (!lijst.length) return null;
  const s = [...lijst].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function scoor(afname: Afname, register: Itemregister): Scoreprofiel {
  const geldig = geldigeAntwoorden(afname);
  const perItem = new Map(geldig.map((a) => [a.item_id, a]));
  const items = register.items.filter((i) => isMeetbaar(i));
  const metFormat = (f: Item["format"]) => items.filter((i) => i.format === f);

  // Zelfbeeld
  const agency = schaal("agency", items, perItem);
  const communion = schaal("communion", items, perItem);
  const extraversie = schaal("extra", items, perItem);
  const behoeften = {
    autonomie: { bevrediging: schaal("satA", items, perItem), frustratie: schaal("frA", items, perItem) },
    competentie: { bevrediging: schaal("satC", items, perItem), frustratie: schaal("frC", items, perItem) },
    verbondenheid: { bevrediging: schaal("satR", items, perItem), frustratie: schaal("frR", items, perItem) },
  };
  const conflictScores = Object.fromEntries(STIJLEN.map((s) => [s, schaal(s, items, perItem)])) as Record<Stijl, Schaalscore>;
  const hoogste = Math.max(...STIJLEN.map((s) => conflictScores[s].waarde ?? -1));
  const voorkeur = hoogste < 0 ? [] : STIJLEN.filter((s) => conflictScores[s].waarde === hoogste);

  // Gedwongen keuzes: waarden (rangorde) en zorg bij falen
  const dilemmas = metFormat("dilemma");
  const waardeDilemmas = dilemmas.filter((i) => i.optie_a?.waarde && i.optie_b?.waarde);
  const telling = new Map<string, number>();
  waardeDilemmas.forEach((i) => {
    telling.set(i.optie_a!.waarde!, telling.get(i.optie_a!.waarde!) ?? 0);
    telling.set(i.optie_b!.waarde!, telling.get(i.optie_b!.waarde!) ?? 0);
  });
  let waardeBeantwoord = 0;
  for (const i of waardeDilemmas) {
    const k = perItem.get(i.id)?.waarde;
    const gekozen = k === "a" ? i.optie_a!.waarde! : k === "b" ? i.optie_b!.waarde! : null;
    if (gekozen) {
      telling.set(gekozen, (telling.get(gekozen) ?? 0) + 1);
      waardeBeantwoord++;
    }
  }
  const rangorde = [...telling.entries()]
    .map(([waarde, keuzes]) => ({ waarde, keuzes, plaats: 1 + [...telling.values()].filter((n) => n > keuzes).length }))
    .sort((a, b) => a.plaats - b.plaats || a.waarde.localeCompare(b.waarde));
  // Stabiele volgorde bij gelijke plaats: volgorde van eerste voorkomen in het register.
  const eersteVoorkomen = [...telling.keys()];
  rangorde.sort((a, b) => a.plaats - b.plaats || eersteVoorkomen.indexOf(a.waarde) - eersteVoorkomen.indexOf(b.waarde));

  const zorg = { agentisch: 0, communaal: 0, beantwoord: 0 };
  for (const i of dilemmas.filter((d) => d.optie_a?.pool && d.optie_b?.pool)) {
    const k = perItem.get(i.id)?.waarde;
    const pool = k === "a" ? i.optie_a!.pool : k === "b" ? i.optie_b!.pool : null;
    if (pool === "agentisch") zorg.agentisch++;
    if (pool === "communaal") zorg.communaal++;
    if (pool) zorg.beantwoord++;
  }

  // Reflex (experimenteel)
  const reflexItems = metFormat("beeldkeuze");
  const reflexAntwoorden = reflexItems.map((i) => perItem.get(i.id)).filter((a): a is Antwoord => !!a);
  const teSnel = reflexAntwoorden.filter((a) => !a.time_out && (a.reactietijd_ms ?? 0) < TE_SNEL_MS).length;
  const geldigReflex = reflexAntwoorden.filter((a) => !a.time_out && (a.reactietijd_ms ?? 0) >= TE_SNEL_MS);
  const reflexStatus: Status = !afname.tijdslimieten
    ? "niet-beschikbaar"
    : geldigReflex.length < MIN_REFLEXKEUZES
      ? "onvoldoende-gegevens"
      : "beschikbaar";
  const reflex = {
    status: reflexStatus,
    methode: "experimenteel" as const,
    vergelijkMet: "agency" as const,
    agentisch:
      reflexStatus === "beschikbaar"
        ? Math.round((geldigReflex.filter((a) => a.waarde === "agentisch").length / geldigReflex.length) * 100)
        : null,
    geldigeKeuzes: geldigReflex.length,
    medianeReactietijdMs: reflexStatus === "beschikbaar" ? mediaan(geldigReflex.map((a) => a.reactietijd_ms!)) : null,
  };

  // Conflict onder druk
  const vignetten = metFormat("vignet");
  const drukBeschikbaar = afname.tijdslimieten;
  const keuzes = vignetten.map((i) => {
    const a = perItem.get(i.id);
    return {
      itemId: i.id,
      drukniveau: i.drukniveau ?? "",
      aantalOpties: Object.keys(i.opties ?? {}).length,
      keuze: (a?.waarde ?? null) as Stijl | null,
      reactietijdMs: a?.reactietijd_ms ?? null,
    };
  });
  const onderDruk = {
    status: (drukBeschikbaar ? "beschikbaar" : "niet-beschikbaar") as Status,
    keuzes: drukBeschikbaar ? keuzes : [],
    keuzeBijHoogsteDruk: drukBeschikbaar ? (keuzes.at(-1)?.keuze ?? null) : null,
  };

  // Kwaliteit
  const stellingWaarden = metFormat("likert")
    .map((i) => perItem.get(i.id)?.waarde)
    .filter((v): v is string => v !== null && v !== undefined);
  const kwaliteit = {
    timeOuts: geldig.filter((a) => a.time_out).length,
    teSnel,
    rechtlijnig: stellingWaarden.length > MIN_RECHTLIJNIG && new Set(stellingWaarden).size === 1,
    onderbroken: geldig.filter((a) => a.onderbroken).length,
    herzieningen: geldig.filter((a) => a.poging > 1).length,
  };

  // Duiding (geen meting)
  const verschil = agency.waarde !== null && communion.waarde !== null ? agency.waarde - communion.waarde : null;
  const duiding = {
    soort: "duiding" as const,
    archetypegroep:
      verschil === null
        ? null
        : Math.abs(verschil) <= BALANSMARGE
          ? ("geintegreerd" as const)
          : verschil > 0
            ? ("agentisch" as const)
            : ("communaal" as const),
    verschil,
  };

  return {
    scoringsversie: SCORINGSVERSIE,
    afnameId: afname.id,
    itemsetVersie: afname.itemset_versie,
    tijdslimieten: afname.tijdslimieten,
    metingen: {
      agency,
      communion,
      extraversie,
      behoeften,
      conflictInRust: { scores: conflictScores, voorkeur },
      waarden: { ipsatief: true, aantalDilemmas: waardeDilemmas.length, beantwoord: waardeBeantwoord, rangorde },
      zorgBijFalen: zorg,
    },
    reflex,
    onderDruk,
    kwaliteit,
    duiding,
  };
}
