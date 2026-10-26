/**
 * Synthetische voorbeeldafname (harde regel 17): vaste, verzonnen antwoorden voor het voorbeeldrapport en voor tests.
 * Geen echte deelnemerdata. Het profiel is bewust gemengd, zodat elk onderdeel van het rapport iets te tonen heeft.
 */
import type { Itemregister } from "@/content/itemregister";
import { maakAntwoord, nieuweAfname, optieVolgorde, registreer, rondAf, type Afname } from "@/testmotor";

const NU = "2026-10-26T09:00:00.000Z";

/** Bedoelde antwoordpositie per subschaal (1 tot 5), vóór omkering van omgekeerde items. */
export const VOORBEELD_PROFIEL: Record<string, number> = {
  agency: 4, communion: 3, extra: 4,
  satA: 4, satC: 4, satR: 3, frA: 4, frC: 2, frR: 2,
  forc: 3, prob: 4, comp: 3, yield: 2, avoid: 2,
  rationeel: 4, ervaringsgericht: 3, intuitie: 4, realisme: 2,
};

/** Overige vaste antwoorden: reflex, dilemma's, vignetten (meest), kaarten (eerste voorkeur). */
export const VOORBEELD_KEUZES: Record<string, string | null> = {
  R1: "agentisch", R2: "communaal", R3: "agentisch", R4: "agentisch", R5: "agentisch", R6: null,
  W1: "a", W2: "a", W3: "a", W4: "b", W5: "a", W6: "b", W7: "a", W8: "b",
  D1: "prob", D2: "prob", D3: "forc", D4: "forc",
  K1: "wijze",
};
export const VOORBEELD_MINST: Record<string, string> = { D1: "avoid", D2: "forc", D3: "avoid", D4: "yield" };
export const VOORBEELD_SORTERING = { voorkeur: ["wijze", "ontdekker"], afwijzing: ["zorggever", "nar"] };
const RT: Record<string, number> = { R1: 1612, R2: 1845, R3: 1540, R4: 1701, R5: 1590, D1: 14200, D2: 12100, D3: 9900, D4: 7800 };

export function voorbeeldAfname(
  register: Itemregister,
  opts: { tijdslimieten?: boolean; overschrijf?: Record<string, string | null>; zonderKaarten?: boolean } = {},
): Afname {
  let a = nieuweAfname(register, { id: "voorbeeld", seed: 20261026, nu: NU, tijdslimieten: opts.tijdslimieten ?? true });
  const keuzes = { ...VOORBEELD_KEUZES, ...opts.overschrijf };
  for (const item of register.items) {
    if (item.format === "kaartsortering" && opts.zonderKaarten) continue;
    let waarde: string | null;
    if (item.format === "likert") {
      if (item.id in keuzes) waarde = keuzes[item.id];
      else {
        const doel = VOORBEELD_PROFIEL[item.subschaal ?? ""] ?? 3;
        waarde = String(item.omgekeerd ? 6 - doel : doel);
      }
    } else {
      if (!(item.id in keuzes)) continue;
      waarde = keuzes[item.id];
    }
    // Zonder tijdslimieten bestaat geen time-out: dan een gewone keuze.
    if (waarde === null && !a.tijdslimieten) waarde = item.format === "beeldkeuze" ? "communaal" : null;
    if (waarde === null && item.format === "likert") continue;
    a = registreer(
      a,
      maakAntwoord(a, item, {
        waarde,
        reactietijd_ms: waarde === null ? null : (RT[item.id] ?? 2400),
        volgorde: optieVolgorde(item, a.seed),
        minst: item.antwoord === "meest-minst" && waarde !== null ? VOORBEELD_MINST[item.id] : undefined,
        reactietijd_minst_ms: item.antwoord === "meest-minst" && waarde !== null ? 3100 : undefined,
        sortering: item.format === "kaartsortering" ? VOORBEELD_SORTERING : undefined,
        nu: NU,
      }),
    );
  }
  return rondAf(a, NU);
}
