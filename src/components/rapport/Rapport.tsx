"use client";

import { useMemo, useState } from "react";
import type { Itemregister } from "@/content/itemregister";
import { KaartBeeld } from "@/content/kaartfotos";
import { As, Balans, Drukverloop, Kompas, Positie, Waardencirkel } from "./Diagrammen";
import { vertaal } from "@/i18n";
import { maakRapport, vertaalTekst, type Balk, type Blok, type Cel, type Sectie, type Tekst } from "@/rapport";
import { scoor, type KaartInfo } from "@/scoring";
import type { Afname } from "@/testmotor";

type Kant = "deelnemer" | "coach";

const isTekst = (c: Cel): c is Tekst => !!c && typeof c === "object";
const cel = (c: Cel) => (c === null ? "–" : isTekst(c) ? vertaalTekst(c) : String(c));

/** Rapport voor deelnemer en coach. In deze demo zijn beide te zien; vanaf bouwfase 4 bepaalt de rol wat zichtbaar is. */
export function Rapport({
  afname,
  register,
  voorbeeld = false,
  onTerug,
}: {
  afname: Afname;
  register: Itemregister;
  voorbeeld?: boolean;
  onTerug?: () => void;
}) {
  const rapport = useMemo(() => maakRapport(scoor(afname, register), register), [afname, register]);
  const [kant, setKant] = useState<Kant>("deelnemer");

  return (
    <div className="stack rapport">
      {voorbeeld && <span className="voorbeeld-label">{vertaal("rapport.ui.voorbeeld")}</span>}
      <div className="stack-kort">
        <span className="eyebrow">{vertaal("rapport.ui.label")}</span>
        <h1>{vertaal("rapport.ui.titel")}</h1>
      </div>
      <div className="tabs geen-print" role="tablist" aria-label={vertaal("rapport.ui.label")}>
        {(["deelnemer", "coach"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`tab-${k}`}
            aria-selected={kant === k}
            aria-controls="rapport-paneel"
            onClick={() => setKant(k)}
          >
            {vertaal(`rapport.ui.tabs.${k}`)}
          </button>
        ))}
      </div>
      <p className="muted klein geen-print">{vertaal("rapport.ui.tabsUitleg")}</p>
      <div className="stack" role="tabpanel" id="rapport-paneel" aria-labelledby={`tab-${kant}`}>
        {rapport[kant].map((s) => (
          <SectieWeergave key={s.id} sectie={s} />
        ))}
      </div>
      <div className="rij geen-print">
        {onTerug && <button type="button" onClick={onTerug}>{vertaal("rapport.ui.terug")}</button>}
        <button type="button" onClick={() => window.print()}>{vertaal("rapport.ui.afdrukken")}</button>
      </div>
    </div>
  );
}

function SectieWeergave({ sectie }: { sectie: Sectie }) {
  const kopId = `sectie-${sectie.id}`;
  return (
    <section className="paneel rapport-sectie" data-sectie={sectie.id} data-soort={sectie.soort} aria-labelledby={kopId}>
      {sectie.label && <span className="eyebrow">{vertaalTekst(sectie.label)}</span>}
      <h2 id={kopId}>{vertaalTekst(sectie.titel)}</h2>
      {sectie.blokken.map((b, i) => (
        <BlokWeergave key={i} blok={b} />
      ))}
      {sectie.toelichting && (
        <details className="toelichting">
          <summary>{vertaal("rapport.ui.toelichting")}</summary>
          {vertaalTekst(sectie.toelichting).split("\n\n").map((alinea, i) => <p key={i}>{alinea}</p>)}
        </details>
      )}
    </section>
  );
}

function BlokWeergave({ blok }: { blok: Blok }) {
  switch (blok.soort) {
    case "tekst":
      return <p className={blok.toon === "gedempt" ? "muted" : undefined}>{vertaalTekst(blok.tekst)}</p>;
    case "balken":
      return <Balken balken={blok.balken} />;
    case "positie":
      return <Positie blok={blok} />;
    case "as":
      return <As blok={blok} />;
    case "balans":
      return <Balans blok={blok} />;
    case "kompas":
      return <Kompas blok={blok} />;
    case "waardencirkel":
      return <Waardencirkel blok={blok} />;
    case "drukverloop":
      return <Drukverloop blok={blok} />;
    case "betekenis":
      return (
        <aside className="betekenis">
          <h3>{vertaal("rapport.ui.betekenis")}</h3>
          {blok.alineas.map((a, i) => <p key={i}>{vertaalTekst(a)}</p>)}
          {blok.vraag && (
            <p className="betekenis-vraag">
              <span className="eyebrow">{vertaal("rapport.ui.vraag")}</span>
              <br />
              {vertaalTekst(blok.vraag)}
            </p>
          )}
        </aside>
      );
    case "rangorde":
      return (
        <ol className="rangorde">
          {blok.items.map((r, i) => (
            <li key={i}>
              <span className="rangorde-plaats" aria-label={vertaal("rapport.coach.waarden.plaats")}>{vertaal("rapport.ui.plaats", { plaats: r.plaats })}</span>
              <span>
                <b>{vertaalTekst(r.label)}</b>
                <br />
                <span className="muted">{vertaalTekst(r.uitleg)}</span>
              </span>
            </li>
          ))}
        </ol>
      );
    case "lijst":
      return (
        <ul className="lijst">
          {blok.items.map((x, i) => <li key={i}>{vertaalTekst(x)}</li>)}
        </ul>
      );
    case "melding":
      return (
        <div className="melding-blok" data-toon={blok.toon}>
          <ul className="lijst">
            {blok.items.map((x, i) => <li key={i}>{vertaalTekst(x)}</li>)}
          </ul>
        </div>
      );
    case "kerngetallen":
      return (
        <dl className="kerncijfers">
          {blok.items.map((x, i) => (
            <div key={i}>
              <dt>{vertaalTekst(x.label)}</dt>
              <dd>{cel(x.waarde)}</dd>
            </div>
          ))}
        </dl>
      );
    case "tabel":
      return (
        <div className="tabelwrap">
          <table>
            <thead>
              <tr>{blok.kop.map((k, i) => <th key={i} scope="col">{vertaalTekst(k)}</th>)}</tr>
            </thead>
            <tbody>
              {blok.rijen.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} data-label={vertaalTekst(blok.kop[j])} className={typeof c === "number" || c === null ? "getal" : undefined}>{cel(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "kaarten":
      return (
        <div className="kaartkeuze">
          <KaartGroep titel={vertaal("rapport.ui.kaarten.voorkeur")} kaarten={blok.voorkeur} soort="voorkeur" />
          <KaartGroep titel={vertaal("rapport.ui.kaarten.afwijzing")} kaarten={blok.afwijzing} soort="afwijzing" />
        </div>
      );
    case "bewijs":
      return (
        <div className="tabelwrap">
          <table>
            <thead>
              <tr>
                {(["onderdeel", "construct", "methode", "item", "aantal", "gebruik"] as const).map((k) => (
                  <th key={k} scope="col">{vertaal(`rapport.ui.bewijs.${k}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {blok.rijen.map((r, i) => (
                <tr key={i} data-gebruik={r.gebruik}>
                  <td data-label={vertaal("rapport.ui.bewijs.onderdeel")}>{vertaalTekst(r.onderdeel)}</td>
                  {(["construct", "methode", "item"] as const).map((k) => (
                    <td key={k} data-label={vertaal(`rapport.ui.bewijs.${k}`)}>
                      <span className="niveau" data-niveau={r[k]}>{vertaal(`rapport.ui.niveau.${r[k]}`)}</span>
                    </td>
                  ))}
                  <td data-label={vertaal("rapport.ui.bewijs.aantal")} className="getal">{r.aantal}</td>
                  <td data-label={vertaal("rapport.ui.bewijs.gebruik")}>{vertaal(`rapport.ui.gebruik.${r.gebruik}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/**
 * Horizontale balken: één rij per schaal, label en getal boven een dunne balk.
 * De waarde staat altijd als getal in beeld (geen tooltip nodig); de kleur draagt alleen de reeks, met legenda bij twee reeksen.
 */
function Balken({ balken }: { balken: Balk[] }) {
  const reeksen = [...new Set(balken.map((b) => b.reeks))];
  return (
    <div className="balken">
      {reeksen.length > 1 && (
        <div className="legenda" aria-hidden="true">
          {reeksen.map((r) => (
            <span key={r}><i className="staal" data-reeks={r} />{vertaal(`rapport.ui.reeks.${r}`)}</span>
          ))}
        </div>
      )}
      {balken.map((b, i) => {
        const label = vertaalTekst(b.label);
        const waarde = b.waarde === null ? vertaal("rapport.ui.geenWaarde") : String(b.waarde);
        return (
          <div className="balk" key={i} data-reeks={b.reeks}>
            <div className="balk-kop">
              <span>{label}{b.experimenteel && <span className="muted"> · {vertaal("rapport.ui.niveau.experimenteel")}</span>}</span>
              <span className="balk-waarde">{waarde}</span>
            </div>
            <div
              className="balk-spoor"
              role="meter"
              aria-label={b.experimenteel ? `${label}, ${vertaal("rapport.ui.niveau.experimenteel")}` : label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={b.waarde ?? undefined}
              aria-valuetext={waarde}
            >
              {b.waarde !== null && <i style={{ width: `${b.waarde}%` }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KaartGroep({ titel, kaarten, soort }: { titel: string; kaarten: KaartInfo[]; soort: "voorkeur" | "afwijzing" }) {
  return (
    <div className="kaartgroep">
      <h3>{titel}</h3>
      <ol className="kaartrij" data-soort={soort}>
        {kaarten.map((k) => (
          <li key={k.id} className="minikaart" data-kaart={k.id}>
            <span className="minikaart-beeld"><KaartBeeld beeld={k.beeld} omschrijving={k.omschrijving} /></span>
            <span>
              <b className="kaart-naam">{k.naam}</b>
              <br />
              <span className="kaart-kwaliteit"><span>{vertaal("rapport.ui.kaarten.binnen")}</span> {k.binnen}</span>
              <span className="kaart-kwaliteit"><span>{vertaal("rapport.ui.kaarten.buiten")}</span> {k.buiten}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
