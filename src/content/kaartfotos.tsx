/**
 * Foto's voor de kaartenoefening (fase 4), aangeleverd door de eigenaar (2026-10-26).
 * De bestanden staan in public/kaarten. De paden zijn letterlijke tekst, zodat de losse demo ze bij het bouwen
 * kan vervangen door ingesloten afbeeldingen (scripts/demo/bouw.mjs).
 */
import { Beeld } from "./beelden";

export const KAART_FOTOS: Record<string, string> = {
  "foto-strijder": "/kaarten/strijder.jpg",
  "foto-heerser": "/kaarten/heerser.jpg",
  "foto-ontdekker": "/kaarten/ontdekker.jpg",
  "foto-schepper": "/kaarten/schepper.jpg",
  "foto-zorggever": "/kaarten/zorggever.jpg",
  "foto-rebel": "/kaarten/rebel.jpg",
  "foto-wijze": "/kaarten/wijze.jpg",
  "foto-nar": "/kaarten/nar.jpg",
};

/** Beeld van een kaart: de foto als die er is, anders een abstract beeld. */
export function KaartBeeld({ beeld, omschrijving }: { beeld: string; omschrijving?: string }) {
  const src = KAART_FOTOS[beeld];
  // eslint-disable-next-line @next/next/no-img-element -- ook in de losse demo zonder Next.js-beeldserver
  if (src) return <img src={src} alt={omschrijving ?? ""} decoding="async" />;
  return <Beeld naam={beeld} />;
}
