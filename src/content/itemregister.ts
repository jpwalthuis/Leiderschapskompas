/**
 * Itemregister: typen en validatie.
 *
 * Bewaakt harde regels 1, 8 en 9 uit CLAUDE.md:
 * - elk item heeft construct, kader, minimaal één bekende bron en bewijs op drie niveaus;
 * - deelnemerteksten bevatten geen namen of merken van bestaande instrumenten;
 * - (id, versie) is uniek.
 */

export const BEWIJSNIVEAUS = ["sterk", "matig", "experimenteel", "nieuw"] as const;
export type Bewijsniveau = (typeof BEWIJSNIVEAUS)[number];

export const FORMATS = ["beeldkeuze", "likert", "dilemma", "vignet"] as const;
export type Format = (typeof FORMATS)[number];

export interface Bewijs {
  construct: Bewijsniveau;
  methode: Bewijsniveau;
  item: Bewijsniveau;
}

export interface Bron {
  t: string;
  n: string;
}

export interface Optie {
  tekst: string;
  waarde?: string;
  pool?: string;
}

export interface Item {
  id: string;
  versie: number;
  fase: 1 | 2 | 3;
  format: Format;
  construct: string;
  kader: string;
  bronnen: string[];
  bewijs: Bewijs;
  toelichting: string;
  // beeldkeuze
  woord?: string;
  beeld_agentisch?: string;
  beeld_communaal?: string;
  // likert
  tekst?: string;
  subschaal?: string;
  omgekeerd?: boolean;
  schaal?: string;
  // dilemma
  vraag?: string;
  optie_a?: Optie;
  optie_b?: Optie;
  // vignet
  drukniveau?: string;
  opties?: Record<string, string>;
  /** Vaste tijdslimiet (beeldkeuze). */
  tijdslimiet_s?: number;
  /** Tijdslimiet afgeleid van de leestijd: woorden / leessnelheid × leesfactor + beslistijd. */
  tijd?: { leesfactor: number; beslis_s: number };
  /** Vignetten: eerst de meest waarschijnlijke reactie (getimed), daarna de minst waarschijnlijke. */
  antwoord?: "meest-minst";
}

export interface Itemregister {
  schema_versie: number;
  status: string;
  bronnen: Record<string, Bron>;
  items: Item[];
}

export interface Fout {
  item: string;
  regel: string;
  melding: string;
}

/** Namen en merken die nooit in een deelnemertekst mogen staan (harde regel 8). */
export const VERBODEN_AFKORTINGEN = /\b(TKI|PMAI|MBTI|DUTCH)\b/;
export const VERBODEN_NAMEN = /\b(Thomas[\s-]?Kilmann|Pearson[\s-]?Marr|Myers[\s-]?Briggs)\b/i;

/** Eerste verboden term in een tekst, of null. Afkortingen alleen in hoofdletters, zodat "Dutch" als taal mag. */
export function verbodenTerm(tekst: string): string | null {
  return (tekst.match(VERBODEN_AFKORTINGEN) ?? tekst.match(VERBODEN_NAMEN))?.[0] ?? null;
}

const leeg = (v: unknown): boolean => typeof v !== "string" || v.trim() === "";
const isNiveau = (v: unknown): v is Bewijsniveau =>
  typeof v === "string" && (BEWIJSNIVEAUS as readonly string[]).includes(v);

/** Alle teksten die een deelnemer te zien krijgt. */
export function deelnemerteksten(item: Item): string[] {
  const t: (string | undefined)[] = [item.woord, item.tekst, item.vraag, item.optie_a?.tekst, item.optie_b?.tekst];
  if (item.opties) t.push(...Object.values(item.opties));
  return t.filter((x): x is string => typeof x === "string");
}

/** Mag dit item als meting worden gescoord? (harde regel 2) */
export function isMeetbaar(item: Item): boolean {
  return item.bewijs.construct === "sterk" || item.bewijs.construct === "matig";
}

export function valideerItemregister(register: Itemregister): Fout[] {
  const fouten: Fout[] = [];
  const fout = (item: string, regel: string, melding: string) => fouten.push({ item, regel, melding });
  const gezien = new Set<string>();

  if (!Array.isArray(register.items) || register.items.length === 0) {
    fout("-", "1", "Het register bevat geen items.");
    return fouten;
  }

  for (const item of register.items) {
    const id = leeg(item.id) ? "(zonder id)" : item.id;

    // Regel 1: verplichte velden
    if (leeg(item.id)) fout(id, "1", "Item heeft geen id.");
    if (leeg(item.construct)) fout(id, "1", "Construct ontbreekt.");
    if (leeg(item.kader)) fout(id, "1", "Theoretisch kader ontbreekt.");
    if (!Array.isArray(item.bronnen) || item.bronnen.length === 0) {
      fout(id, "1", "Geen enkele bron opgegeven.");
    } else {
      for (const b of item.bronnen) {
        if (!register.bronnen?.[b]) fout(id, "1", `Bron "${b}" staat niet in de bronnenlijst.`);
      }
    }
    for (const niveau of ["construct", "methode", "item"] as const) {
      if (!isNiveau(item.bewijs?.[niveau])) {
        fout(id, "1", `Bewijsoordeel "${niveau}" ontbreekt of is ongeldig.`);
      }
    }

    // Regel 9: versie en uniciteit
    if (!Number.isInteger(item.versie) || item.versie < 1) fout(id, "9", "Versie moet een geheel getal ≥ 1 zijn.");
    const sleutel = `${item.id}@${item.versie}`;
    if (gezien.has(sleutel)) fout(id, "9", `Dubbele combinatie van id en versie: ${sleutel}.`);
    gezien.add(sleutel);

    // Formaat en fase
    if (![1, 2, 3].includes(item.fase)) fout(id, "formaat", "Fase moet 1, 2 of 3 zijn.");
    if (!(FORMATS as readonly string[]).includes(item.format)) {
      fout(id, "formaat", `Onbekend formaat "${item.format}".`);
    } else {
      formaatFouten(item).forEach((m) => fout(id, "formaat", m));
    }

    // Regel 8: geen namen of merken van bestaande instrumenten in deelnemerteksten
    for (const tekst of deelnemerteksten(item)) {
      const treffer = verbodenTerm(tekst);
      if (treffer) fout(id, "8", `Deelnemertekst noemt "${treffer}".`);
    }
  }
  return fouten;
}

function formaatFouten(item: Item): string[] {
  const m: string[] = [];
  const tijd = () => {
    const vast = typeof item.tijdslimiet_s === "number" && item.tijdslimiet_s > 0;
    const lees = !!item.tijd && item.tijd.leesfactor >= 1 && item.tijd.beslis_s >= 0;
    if (!vast && !lees) m.push("Tijdslimiet ontbreekt (vast, of leesfactor ≥ 1 met beslistijd).");
  };
  switch (item.format) {
    case "beeldkeuze":
      if (leeg(item.woord)) m.push("Woord ontbreekt.");
      if (leeg(item.beeld_agentisch) || leeg(item.beeld_communaal)) m.push("Beide beelden zijn verplicht.");
      tijd();
      break;
    case "likert":
      if (leeg(item.tekst)) m.push("Stellingtekst ontbreekt.");
      if (leeg(item.subschaal)) m.push("Subschaal ontbreekt.");
      if (leeg(item.schaal)) m.push("Antwoordschaal ontbreekt.");
      if (typeof item.omgekeerd !== "boolean") m.push("Omgekeerd moet waar of onwaar zijn.");
      break;
    case "dilemma":
      if (leeg(item.vraag)) m.push("Vraag ontbreekt.");
      if (leeg(item.optie_a?.tekst) || leeg(item.optie_b?.tekst)) m.push("Beide opties zijn verplicht.");
      tijd();
      break;
    case "vignet":
      if (leeg(item.tekst)) m.push("Situatieschets ontbreekt.");
      if (!item.opties || Object.keys(item.opties).length < 2) m.push("Minimaal twee opties nodig.");
      tijd();
      break;
  }
  return m;
}
