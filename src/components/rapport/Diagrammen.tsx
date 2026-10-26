"use client";

/**
 * Diagrammen voor het rapport. Puur SVG en CSS, kleuren uit de tokens (--reeks-1, --reeks-2), tekst in teksttokens.
 * Elke waarde staat ook als getal of woord in beeld, zodat kleur nooit de enige drager is.
 */
import { vertaal } from "@/i18n";
import type { Blok, KompasDeel } from "@/rapport";
import { vertaalTekst } from "@/rapport";
import type { Stijl } from "@/scoring";

type B<S extends Blok["soort"]> = Extract<Blok, { soort: S }>;

/** Daadkracht (verticaal) tegen verbinding (horizontaal), met de band van balans rond de diagonaal. */
export function Positie({ blok }: { blok: B<"positie"> }) {
  const { agency, communion, marge } = blok;
  const L = 40, T = 12, S = 200; // linkermarge, bovenmarge, zijde van het vlak
  const x = (v: number) => L + (v / 100) * S;
  const y = (v: number) => T + S - (v / 100) * S;
  const band = [
    [0, marge], [100 - marge, 100], [100, 100], [100, 100 - marge], [marge, 0], [0, 0],
  ].map(([c, a]) => `${x(c)},${y(a)}`).join(" ");
  const label = vertaal("rapport.ui.positie.uitleg");
  const waarden = `${vertaal("rapport.ui.positie.y")} ${agency ?? "–"}, ${vertaal("rapport.ui.positie.x")} ${communion ?? "–"}`;
  return (
    <figure className="diagram diagram-positie">
      <svg viewBox="0 0 252 252" role="img" aria-label={`${label} ${waarden}`}>
        <rect x={L} y={T} width={S} height={S} className="vlak" />
        <polygon points={band} className="balansband" />
        <line x1={x(50)} y1={T} x2={x(50)} y2={T + S} className="raster" />
        <line x1={L} y1={y(50)} x2={L + S} y2={y(50)} className="raster" />
        <line x1={x(0)} y1={y(0)} x2={x(100)} y2={y(100)} className="diagonaal" />
        <text x={L - 6} y={T + 4} className="as-getal" textAnchor="end" dominantBaseline="hanging">100</text>
        <text x={L - 6} y={T + S} className="as-getal" textAnchor="end">0</text>
        <text x={L + S} y={T + S + 14} className="as-getal" textAnchor="end">100</text>
        <text x={L + S / 2} y={T + S + 30} className="as-label" textAnchor="middle">{vertaal("rapport.ui.positie.x")} →</text>
        <text transform={`translate(12 ${T + S / 2}) rotate(-90)`} className="as-label" textAnchor="middle">{vertaal("rapport.ui.positie.y")} →</text>
        <text x={x(70)} y={y(64)} className="band-label" textAnchor="middle" transform={`rotate(-45 ${x(70)} ${y(64)})`}>{vertaal("rapport.ui.positie.balans")}</text>
        {agency !== null && communion !== null && (
          <g>
            <circle cx={x(communion)} cy={y(agency)} r={9} className="punt-ring" />
            <circle cx={x(communion)} cy={y(agency)} r={7} className="punt" />
            <text x={x(communion) + 12} y={y(agency) - 10} className="punt-label">{vertaal("rapport.ui.positie.jij")}</text>
          </g>
        )}
      </svg>
      <figcaption className="muted">{waarden}</figcaption>
    </figure>
  );
}

/** Eén schaal tussen twee polen. */
export function As({ blok }: { blok: B<"as"> }) {
  const label = vertaalTekst(blok.label);
  return (
    <figure className="diagram diagram-as">
      <div className="as-kop">
        <span>{label}</span>
        <span className="balk-waarde">{blok.waarde ?? vertaal("rapport.ui.geenWaarde")}</span>
      </div>
      <div className="as-lijn" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={blok.waarde ?? undefined}>
        <span className="as-midden" />
        {blok.waarde !== null && <span className="as-marker" style={{ left: `${blok.waarde}%` }} />}
      </div>
      <div className="as-polen">
        <span>← {vertaalTekst(blok.links)}</span>
        <span>{vertaalTekst(blok.rechts)} →</span>
      </div>
    </figure>
  );
}

/** Per rij: gefrustreerd naar links, vervuld naar rechts, vanaf een gedeelde middenlijn. */
export function Balans({ blok }: { blok: B<"balans"> }) {
  return (
    <figure className="diagram diagram-balans">
      <div className="legenda" aria-hidden="true">
        <span><i className="staal" data-reeks="gefrustreerd" />{vertaal("rapport.ui.balans.gefrustreerd")}</span>
        <span><i className="staal" data-reeks="vervuld" />{vertaal("rapport.ui.balans.vervuld")}</span>
      </div>
      {blok.rijen.map((r, i) => {
        const naam = vertaalTekst(r.label);
        return (
          <div className="balans-rij" key={i} role="group" aria-label={`${naam}: ${vertaal("rapport.ui.balans.vervuld")} ${r.vervuld ?? "–"}, ${vertaal("rapport.ui.balans.gefrustreerd")} ${r.gefrustreerd ?? "–"}`}>
            <div className="balans-naam">{naam}</div>
            <div className="balans-balken" aria-hidden="true">
              <span className="balans-getal links">{r.gefrustreerd ?? "–"}</span>
              <div className="balans-helft links"><i style={{ width: `${r.gefrustreerd ?? 0}%` }} /></div>
              <div className="balans-helft rechts"><i style={{ width: `${r.vervuld ?? 0}%` }} /></div>
              <span className="balans-getal rechts">{r.vervuld ?? "–"}</span>
            </div>
          </div>
        );
      })}
    </figure>
  );
}

const ROND: Record<KompasDeel, number> = { ratio: -90, intuitie: 0, gevoel: 90, realisme: 180 };
const OORDELEN: KompasDeel[] = ["ratio", "gevoel"];

/** Cirkel met vier delen: de straal van elk deel is de score, ringen op 25, 50, 75 en 100. */
export function Kompas({ blok }: { blok: B<"kompas"> }) {
  const C = 170, R = 100;
  const punt = (hoek: number, r: number) => [C + r * Math.cos((hoek * Math.PI) / 180), C + r * Math.sin((hoek * Math.PI) / 180)];
  const taart = (midden: number, r: number) => {
    const [x1, y1] = punt(midden - 44, r);
    const [x2, y2] = punt(midden + 44, r);
    return `M ${C} ${C} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  };
  const beschrijving = blok.delen.map((d) => `${vertaalTekst(d.label)} ${d.waarde ?? "–"}`).join(", ");
  return (
    <figure className="diagram diagram-kompas">
      <svg viewBox="0 0 340 340" role="img" aria-label={`${vertaal("rapport.ui.kompas.uitleg")} ${beschrijving}`}>
        {[25, 50, 75, 100].map((v) => <circle key={v} cx={C} cy={C} r={(v / 100) * R} className="raster" />)}
        <line x1={C} y1={C - R} x2={C} y2={C + R} className="raster" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} className="raster" />
        {blok.delen.map((d) =>
          d.waarde === null || d.waarde === 0 ? null : (
            <path key={d.deel} d={taart(ROND[d.deel], (d.waarde / 100) * R)} className="kompas-deel" data-as={OORDELEN.includes(d.deel) ? "oordelen" : "waarnemen"} />
          ),
        )}
        {blok.delen.map((d) => {
          const [x, y] = punt(ROND[d.deel], R + (ROND[d.deel] % 180 === 0 ? 40 : 28));
          return (
            <text key={d.deel} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="kompas-label">
              <tspan x={x} dy="-0.5em">{vertaalTekst(d.label)}</tspan>
              <tspan x={x} dy="1.2em" className="kompas-getal">{d.waarde ?? "–"}</tspan>
            </text>
          );
        })}
      </svg>
      <figcaption className="legenda">
        <span>{vertaal("rapport.ui.kompas.ringen")}</span>
        <span><i className="staal" data-as="oordelen" />{vertaal("rapport.ui.kompas.oordelen")}</span>
        <span><i className="staal" data-as="waarnemen" />{vertaal("rapport.ui.kompas.waarnemen")}</span>
      </figcaption>
    </figure>
  );
}

/** Waardencirkel: vier kwadranten met de plaats in de eigen rangorde (regel 7: geen sterkte). */
export function Waardencirkel({ blok }: { blok: B<"waardencirkel"> }) {
  return (
    <figure className="diagram diagram-waarden">
      <div className="waardencirkel" role="list" aria-label={vertaal("rapport.ui.waardencirkel.uitleg")}>
        {blok.waarden.map((w) => (
          <div key={w.code} role="listitem" className="waarde-vak" data-code={w.code} data-eerste={w.plaats === 1 || undefined}>
            <span className="waarde-plaats">{w.plaats === null ? "–" : vertaal("rapport.ui.waardencirkel.plaats", { plaats: w.plaats })}</span>
            <span className="waarde-naam">{vertaalTekst(w.label)}</span>
          </div>
        ))}
      </div>
      <figcaption className="muted klein">{vertaal("rapport.ui.waardencirkel.uitleg")}</figcaption>
    </figure>
  );
}

/** Keuze per drukniveau: gevuld = eerste reactie, open = minst waarschijnlijk, streep = geen optie meer. */
export function Drukverloop({ blok }: { blok: B<"drukverloop"> }) {
  const cel = (k: B<"drukverloop">["kolommen"][number], s: Stijl) => {
    if (!k.opties.includes(s)) return <span className="druk-weg" title={vertaal("rapport.ui.drukverloop.weg")}>–</span>;
    if (k.meest === s) return <span className="druk-stip meest" aria-label={vertaal("rapport.ui.drukverloop.meest")} />;
    if (k.minst === s) return <span className="druk-stip minst" aria-label={vertaal("rapport.ui.drukverloop.minst")} />;
    return <span className="druk-stip leeg" aria-hidden="true" />;
  };
  return (
    <figure className="diagram diagram-druk">
      <table className="drukverloop">
        <caption className="sr-only">{vertaal("rapport.ui.drukverloop.uitleg")}</caption>
        <thead>
          <tr>
            <th scope="col" />
            {blok.kolommen.map((k, i) => <th key={i} scope="col">{vertaalTekst(k.label)}</th>)}
          </tr>
        </thead>
        <tbody>
          {blok.stijlen.map((s) => (
            <tr key={s.stijl}>
              <th scope="row">{vertaalTekst(s.label)}</th>
              {blok.kolommen.map((k, i) => <td key={i}>{cel(k, s.stijl)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="legenda">
        <span><span className="druk-stip meest" aria-hidden="true" />{vertaal("rapport.ui.drukverloop.meest")}</span>
        <span><span className="druk-stip minst" aria-hidden="true" />{vertaal("rapport.ui.drukverloop.minst")}</span>
        <span><span className="druk-weg" aria-hidden="true">–</span>{vertaal("rapport.ui.drukverloop.weg")}</span>
      </figcaption>
    </figure>
  );
}
