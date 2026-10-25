/**
 * Abstracte beelden voor de reflexmeting (fase 1) en de oefenronde. Eigen ontwerp, geen licentie nodig.
 * Placeholder tot de definitieve beelden zijn ontworpen en in de pilot getest (zie bouwplan, "Buiten de code").
 */
import type { ReactElement } from "react";

const lijn = { stroke: "currentColor", fill: "none", strokeWidth: 2 } as const;

const BEELDEN = {
  wall: (
    <g {...lijn}>
      <rect x="15" y="20" width="90" height="56" />
      <path d="M15 34h90M15 48h90M15 62h90M45 20v14M75 20v14M30 34v14M60 34v14M90 34v14M45 48v14M75 48v14M30 62v14M60 62v14M90 62v14" />
    </g>
  ),
  knot: (
    <g {...lijn} strokeWidth={3} strokeLinecap="round">
      <path d="M8 48 C30 48 38 30 54 30 C70 30 72 56 58 60 C44 64 40 40 60 36 C78 32 84 48 112 48" />
    </g>
  ),
  flag: (
    <g {...lijn} strokeLinejoin="round">
      <path d="M10 80 L52 26 L72 52 L84 40 L112 80 Z" />
      <path d="M52 26 V6" />
      <path d="M52 6 L70 11 L52 16" fill="currentColor" />
    </g>
  ),
  gears: (
    <g {...lijn}>
      <circle cx="44" cy="46" r="18" /><circle cx="44" cy="46" r="6" />
      <circle cx="78" cy="38" r="12" /><circle cx="78" cy="38" r="4" />
      <circle cx="80" cy="68" r="10" /><circle cx="80" cy="68" r="3" />
      <path d="M44 22v6M44 64v6M20 46h6M62 46h6M27 29l4 4M57 59l4 4M27 63l4-4M57 33l4-4M78 22v4M78 50v4M94 38h-4M62 38h4M80 54v4M80 78v4M66 68h4M90 68h4" />
    </g>
  ),
  arrow: (
    <g {...lijn} strokeWidth={2.5} strokeLinecap="round">
      <path d="M14 70 H50 M14 56 H44 M14 42 H96" />
      <path d="M86 34 L98 42 L86 50" />
    </g>
  ),
  ring: (
    <g {...lijn}>
      <circle cx="60" cy="46" r="28" strokeDasharray="3 4" />
      {[[60, 18], [88, 46], [60, 74], [32, 46], [80, 26], [40, 66]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill="currentColor" />
      ))}
    </g>
  ),
  stairs: (
    <g {...lijn} strokeWidth={2.5} strokeLinejoin="round">
      <path d="M12 80 H32 V64 H52 V48 H72 V32 H92 V16 H108" />
      <path d="M98 10 L108 16 L98 22" />
    </g>
  ),
  roots: (
    <g {...lijn} strokeLinecap="round">
      <path d="M60 8 V44" />
      <path d="M60 44 C60 60 40 62 28 80 M60 44 C60 62 80 62 92 80 M60 44 V82 M48 60 C42 64 36 66 22 66 M72 60 C78 64 84 66 98 66" />
      <path d="M60 22 C52 18 46 20 42 14 M60 30 C68 26 74 28 78 22" />
    </g>
  ),
  miss: (
    <g {...lijn}>
      <circle cx="54" cy="46" r="30" /><circle cx="54" cy="46" r="18" /><circle cx="54" cy="46" r="6" />
      <path d="M108 14 L92 22" strokeWidth={3} />
      <path d="M92 22 L88 16 M92 22 L86 26" />
    </g>
  ),
  broken: (
    <g {...lijn}>
      <circle cx="26" cy="46" r="12" fill="currentColor" />
      <circle cx="94" cy="46" r="12" fill="currentColor" />
      <path d="M38 46 H54 M66 46 H82" strokeWidth={3} />
      <path d="M54 38 L58 46 L54 54 M66 38 L62 46 L66 54" />
    </g>
  ),
  spike: (
    <g {...lijn} strokeWidth={2.5} strokeLinejoin="round">
      <path d="M8 70 H40 L52 16 L64 80 L74 50 H112" />
    </g>
  ),
  overlap: (
    <g {...lijn}>
      <circle cx="48" cy="46" r="26" /><circle cx="72" cy="46" r="26" />
    </g>
  ),
  cirkel: <circle cx="60" cy="46" r="28" {...lijn} strokeWidth={2.5} />,
  vierkant: <rect x="34" y="20" width="52" height="52" {...lijn} strokeWidth={2.5} />,
} satisfies Record<string, ReactElement>;

export type BeeldNaam = keyof typeof BEELDEN;
export const BEELD_NAMEN = Object.keys(BEELDEN) as BeeldNaam[];

export function Beeld({ naam }: { naam: string }) {
  const inhoud = (BEELDEN as Record<string, ReactElement>)[naam];
  return (
    <svg viewBox="0 0 120 92" aria-hidden="true" focusable="false">
      {inhoud}
    </svg>
  );
}
