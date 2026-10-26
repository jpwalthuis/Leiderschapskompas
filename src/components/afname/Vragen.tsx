"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "@/content/itemregister";
import { Beeld } from "@/content/beelden";
import { KaartBeeld } from "@/content/kaartfotos";
import { vertaal } from "@/i18n";
import { useKlok } from "./klok";

export interface Keuze {
  waarde: string | null;
  reactietijd_ms: number | null;
  onderbroken: boolean;
  /** Alleen bij vignetten: de minst waarschijnlijke reactie, gekozen zonder tijdslimiet. */
  minst?: string | null;
  reactietijd_minst_ms?: number | null;
  /** Alleen bij de kaartenoefening. */
  sortering?: { voorkeur: string[]; afwijzing: string[] };
}

interface VraagProps {
  volgorde: string[];
  onKeuze: (k: Keuze) => void;
  /** Tijdslimiet in ms, of null bij een afname zonder tijdslimieten. */
  limietMs: number | null;
}

const hoofdletter = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Tijdbalk({ limietMs, loopt }: { limietMs: number | null; loopt: boolean }) {
  if (limietMs === null) return null;
  return (
    <div className="tijdbalk" role="progressbar" aria-label={vertaal("afname.tijd")}>
      <i style={loopt ? { transition: `transform ${limietMs}ms linear`, transform: "scaleX(0)" } : undefined} />
    </div>
  );
}

/** Gedeelde afhandeling: klok, time-out en het eerste antwoord dat telt. */
function useVraag(limietMs: number | null, onKeuze: (k: Keuze) => void) {
  const bijTimeOut = useCallback(
    (onderbroken: boolean) => onKeuze({ waarde: null, reactietijd_ms: null, onderbroken }),
    [onKeuze],
  );
  const { loopt, stop } = useKlok(limietMs, bijTimeOut);
  const kies = useCallback(
    (waarde: string) => {
      const r = stop();
      if (!r) return;
      onKeuze({ waarde, reactietijd_ms: r.ms, onderbroken: r.onderbroken });
    },
    [stop, onKeuze],
  );
  return { loopt, kies };
}

export function Beeldkeuze({
  woord,
  beelden,
  limietMs,
  label,
  volgorde,
  onKeuze,
}: VraagProps & { woord: string; beelden: Record<string, string>; label: string }) {
  const { loopt, kies } = useVraag(limietMs, onKeuze);

  useEffect(() => {
    const toets = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") kies(volgorde[0]);
      if (e.key === "ArrowRight") kies(volgorde[1]);
    };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [kies, volgorde]);

  return (
    <section className="paneel" aria-label={label}>
      <div className="woord">{woord}</div>
      <Tijdbalk limietMs={limietMs} loopt={loopt} />
      <div className="paar">
        {volgorde.map((pool, i) => (
          <button
            key={pool}
            type="button"
            className="beeld"
            data-pool={pool}
            aria-label={vertaal(i === 0 ? "afname.beeldkeuze.links" : "afname.beeldkeuze.rechts")}
            onClick={() => kies(pool)}
          >
            <Beeld naam={beelden[pool]} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function Stelling({
  item,
  volgorde,
  onKeuze,
  huidig,
  onVorige,
  onVolgende,
}: Omit<VraagProps, "limietMs"> & {
  item: Item;
  /** Eerder gegeven antwoord, zichtbaar als de deelnemer terugkomt. */
  huidig: string | null;
  /** Ontbreekt bij de eerste stelling. */
  onVorige?: () => void;
  onVolgende: () => void;
}) {
  const { kies } = useVraag(null, onKeuze);

  useEffect(() => {
    const toets = (e: KeyboardEvent) => {
      if (volgorde.includes(e.key)) kies(e.key);
    };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [kies, volgorde]);

  return (
    <section className="paneel">
      <p className="vraagtekst">{item.tekst}</p>
      <div className="schaal" role="group" aria-label={vertaal("afname.stelling.schaal")}>
        {volgorde.map((v) => (
          <button
            key={v}
            type="button"
            data-waarde={v}
            className={huidig === v ? "gekozen" : undefined}
            aria-pressed={huidig === v}
            onClick={() => kies(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="schaal-labels" aria-hidden="true">
        <span>{vertaal("afname.stelling.laag")}</span>
        <span>{vertaal("afname.stelling.hoog")}</span>
      </div>
      {(onVorige || huidig !== null) && (
        <div className="navigatie">
          {onVorige ? <button type="button" onClick={onVorige}>{vertaal("afname.stelling.vorige")}</button> : <span />}
          {huidig !== null && <button type="button" onClick={onVolgende}>{vertaal("afname.stelling.volgende")}</button>}
        </div>
      )}
    </section>
  );
}

export function Dilemma({ item, volgorde, onKeuze, limietMs }: VraagProps & { item: Item }) {
  const { loopt, kies } = useVraag(limietMs, onKeuze);
  const tekst = (k: string) => hoofdletter((k === "a" ? item.optie_a : item.optie_b)?.tekst ?? "");
  return (
    <section className="paneel">
      <p className="vraagtekst"><b>{item.vraag}</b></p>
      <Tijdbalk limietMs={limietMs} loopt={loopt} />
      <div className="opties">
        {volgorde.map((k) => (
          <button key={k} type="button" className="optie" data-optie={k} onClick={() => kies(k)}>
            {tekst(k)}
          </button>
        ))}
      </div>
    </section>
  );
}

export function Vignet({ item, volgorde, onKeuze, limietMs }: VraagProps & { item: Item }) {
  // Stap 1: meest waarschijnlijke reactie, getimed. Stap 2: minst waarschijnlijke, zonder tijdslimiet.
  const [meest, setMeest] = useState<{ waarde: string; ms: number; onderbroken: boolean } | null>(null);
  const tussen = useCallback((k: Keuze) => {
    if (k.waarde === null) onKeuze(k);
    else setMeest({ waarde: k.waarde, ms: k.reactietijd_ms!, onderbroken: k.onderbroken });
  }, [onKeuze]);
  const { loopt, kies } = useVraag(limietMs, tussen);
  const tweedeStart = useRef(0);
  useEffect(() => {
    if (meest) tweedeStart.current = performance.now();
  }, [meest]);

  if (meest) {
    return (
      <section className="paneel">
        <span className="eyebrow">{vertaal("afname.vignet.minstLabel")}</span>
        <p className="vraagtekst">{item.tekst}</p>
        <p className="muted">{vertaal("afname.vignet.minstVraag")}</p>
        <div className="opties">
          {volgorde.filter((k) => k !== meest.waarde).map((k) => (
            <button
              key={k}
              type="button"
              className="optie"
              data-optie={k}
              onClick={() =>
                onKeuze({
                  waarde: meest.waarde,
                  reactietijd_ms: meest.ms,
                  onderbroken: meest.onderbroken,
                  minst: k,
                  reactietijd_minst_ms: performance.now() - tweedeStart.current,
                })
              }
            >
              {item.opties?.[k]}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="paneel">
      <span className="eyebrow">
        {limietMs === null
          ? vertaal("afname.vignet.metaZonderTijd", { opties: volgorde.length })
          : vertaal("afname.vignet.meta", { seconden: limietMs / 1000, opties: volgorde.length })}
      </span>
      <p className="vraagtekst">{item.tekst}</p>
      <p className="muted">{vertaal("afname.vignet.meestVraag")}</p>
      <Tijdbalk limietMs={limietMs} loopt={loopt} />
      <div className="opties">
        {volgorde.map((k) => (
          <button key={k} type="button" className="optie" data-optie={k} onClick={() => kies(k)}>
            {item.opties?.[k]}
          </button>
        ))}
      </div>
    </section>
  );
}

const BADGES = ["voorkeur1", "voorkeur2", "afwijzing1", "afwijzing2"] as const;

/**
 * Kaartenoefening (fase 4, reflectie): eerste en tweede voorkeur, dan eerste en tweede afwijzing.
 * Zonder tijdslimiet; de deelnemer kan de laatste keuze ongedaan maken en bevestigt aan het eind.
 * Duiding, geen meting (harde regel 3).
 */
export function Kaartsortering({ item, volgorde, onKeuze }: Omit<VraagProps, "limietMs"> & { item: Item }) {
  const [keuzes, setKeuzes] = useState<string[]>([]);
  const geen = useCallback(() => {}, []);
  const { stop } = useKlok(null, geen);
  const kaart = (id: string) => item.kaarten!.find((k) => k.id === id)!;
  const klaar = keuzes.length === 4;
  const vraag = vertaal(klaar ? "afname.kaarten.stap.klaar" : `afname.kaarten.stap.${keuzes.length}`);

  const bevestig = () => {
    const r = stop();
    if (!r) return;
    onKeuze({
      waarde: keuzes[0],
      reactietijd_ms: r.ms,
      onderbroken: r.onderbroken,
      sortering: { voorkeur: keuzes.slice(0, 2), afwijzing: keuzes.slice(2, 4) },
    });
  };

  return (
    <section className="paneel">
      <span className="eyebrow">{vertaal("afname.kaarten.geenMeting")}</span>
      <p className="vraagtekst" aria-live="polite">{vraag}</p>
      {!klaar && <p className="muted">{vertaal("afname.kaarten.voortgang", { nummer: keuzes.length + 1 })}</p>}
      <div className="kaarten">
        {volgorde.map((id) => {
          const k = kaart(id);
          const plek = keuzes.indexOf(id);
          const badge = plek >= 0 ? BADGES[plek] : null;
          return (
            <button
              key={id}
              type="button"
              className="kaart"
              data-kaart={id}
              data-keuze={badge ?? undefined}
              aria-pressed={plek >= 0}
              aria-disabled={plek >= 0 || klaar}
              aria-label={`${k.naam}: ${vertaal("afname.kaarten.binnen")} ${k.binnen}, ${vertaal("afname.kaarten.buiten")} ${k.buiten}${badge ? ` (${vertaal(`afname.kaarten.badge.${badge}`)})` : ""}`}
              onClick={() => { if (plek < 0 && !klaar) setKeuzes((v) => [...v, id]); }}
            >
              {badge && <span className="kaart-badge" aria-hidden="true">{vertaal(`afname.kaarten.badge.${badge}`)}</span>}
              <span className="kaart-beeld"><KaartBeeld beeld={k.beeld} omschrijving={k.omschrijving} /></span>
              <span className="kaart-naam">{k.naam}</span>
              <span className="kaart-kwaliteit"><span>{vertaal("afname.kaarten.binnen")}</span> {k.binnen}</span>
              <span className="kaart-kwaliteit"><span>{vertaal("afname.kaarten.buiten")}</span> {k.buiten}</span>
            </button>
          );
        })}
      </div>
      {keuzes.length > 0 && (
        <div className="navigatie">
          <button type="button" onClick={() => setKeuzes((v) => v.slice(0, -1))}>{vertaal("afname.kaarten.herstel")}</button>
          {klaar && <button type="button" className="primair" onClick={bevestig}>{vertaal("afname.kaarten.bevestig")}</button>}
        </div>
      )}
    </section>
  );
}
