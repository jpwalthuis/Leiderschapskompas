/**
 * Minimale vertaallaag (harde regel 19). Alle UI-tekst komt uit een berichtenbestand per taal,
 * zodat later Engels of een rechts-naar-links-taal kan worden toegevoegd.
 */
import nl from "./messages/nl.json";

export const TALEN = { nl } as const;
export type Taal = keyof typeof TALEN;
export const STANDAARDTAAL: Taal = "nl";

/** Leesrichting per taal; voeg rechts-naar-links-talen hier toe. */
export const RICHTING: Record<Taal, "ltr" | "rtl"> = { nl: "ltr" };

export function vertaal(sleutel: string, waarden: Record<string, string | number> = {}, taal: Taal = STANDAARDTAAL): string {
  const tekst = sleutel
    .split(".")
    .reduce<unknown>((node, deel) => (node && typeof node === "object" ? (node as Record<string, unknown>)[deel] : undefined), TALEN[taal]);
  if (typeof tekst !== "string") throw new Error(`Ontbrekende vertaling: ${taal}:${sleutel}`);
  return tekst.replace(/\{(\w+)\}/g, (_, naam: string) => String(waarden[naam] ?? `{${naam}}`));
}
