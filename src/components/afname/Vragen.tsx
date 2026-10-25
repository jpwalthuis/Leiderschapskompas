"use client";

import { useCallback, useEffect } from "react";
import type { Item } from "@/content/itemregister";
import { Beeld } from "@/content/beelden";
import { vertaal } from "@/i18n";
import { useKlok } from "./klok";

export interface Keuze {
  waarde: string | null;
  reactietijd_ms: number | null;
  onderbroken: boolean;
}

interface VraagProps {
  volgorde: string[];
  onKeuze: (k: Keuze) => void;
}

const hoofdletter = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Tijdbalk({ limietMs, loopt }: { limietMs: number; loopt: boolean }) {
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
}: VraagProps & { woord: string; beelden: Record<string, string>; limietMs: number; label: string }) {
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

export function Stelling({ item, volgorde, onKeuze }: VraagProps & { item: Item }) {
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
          <button key={v} type="button" data-waarde={v} onClick={() => kies(v)}>
            {v}
          </button>
        ))}
      </div>
      <div className="schaal-labels" aria-hidden="true">
        <span>{vertaal("afname.stelling.laag")}</span>
        <span>{vertaal("afname.stelling.hoog")}</span>
      </div>
    </section>
  );
}

export function Dilemma({ item, volgorde, onKeuze }: VraagProps & { item: Item }) {
  const limietMs = (item.tijdslimiet_s ?? 8) * 1000;
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

export function Vignet({ item, volgorde, onKeuze }: VraagProps & { item: Item }) {
  const limietMs = (item.tijdslimiet_s ?? 10) * 1000;
  const { loopt, kies } = useVraag(limietMs, onKeuze);
  return (
    <section className="paneel">
      <span className="eyebrow">
        {vertaal("afname.vignet.meta", { seconden: item.tijdslimiet_s ?? 10, opties: volgorde.length })}
      </span>
      <p className="vraagtekst">{item.tekst}</p>
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
