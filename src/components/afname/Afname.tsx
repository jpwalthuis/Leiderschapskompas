"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Itemregister } from "@/content/itemregister";
import { vertaal } from "@/i18n";
import { BrowserOpslag, GeheugenOpslag, type AfnameOpslag } from "@/opslag";
import {
  bouwStappen,
  geldigeAntwoorden,
  huidigAntwoord,
  maakAntwoord,
  nieuweAfname,
  optieVolgorde,
  registreer,
  rondAf,
  tijdslimietMs,
  type Afname as AfnameData,
  type Stap,
} from "@/testmotor";
import { voorbeeldAfname } from "@/voorbeeld";
import { Rapport } from "@/components/rapport/Rapport";
import { Beeldkeuze, Dilemma, Kaartsortering, Stelling, Vignet, type Keuze } from "./Vragen";

function maakOpslag(): AfnameOpslag {
  try {
    return new BrowserOpslag(window.localStorage);
  } catch {
    return new GeheugenOpslag();
  }
}

function nieuweId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `afname-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function nieuweSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

const isStelling = (s: Stap | undefined) => s?.soort === "item" && s.item.format === "likert";

export function Afname({ register }: { register: Itemregister }) {
  const opslag = useRef<AfnameOpslag | null>(null);
  const [afname, setAfname] = useState<AfnameData | null>(null);
  // De volgorde van de stellingen hangt af van de seed van de afname (gemengd, reproduceerbaar).
  const seed = afname?.seed ?? 0;
  const stappen = useMemo(() => bouwStappen(register, seed), [register, seed]);
  const totaalItems = useMemo(() => stappen.filter((s) => s.soort === "item").length, [stappen]);
  // De teksten noemen de tijdslimiet van de beeldkeuze uit het register, zodat ze niet uit de pas lopen.
  const seconden = register.items.find((i) => i.format === "beeldkeuze")?.tijdslimiet_s ?? 0;
  const [index, setIndex] = useState(-1); // -1 = welkomstscherm
  const [toonData, setToonData] = useState(false);
  const [zonderTijd, setZonderTijd] = useState(false);
  /** Getoond rapport: van de eigen afname, of het voorbeeld met verzonnen antwoorden. */
  const [rapport, setRapport] = useState<{ afname: AfnameData; voorbeeld: boolean } | null>(null);

  useEffect(() => {
    opslag.current = maakOpslag();
  }, []);

  const stap: Stap | null = index >= 0 ? stappen[index] : null;

  const volgende = useCallback(() => setIndex((i) => Math.min(i + 1, stappen.length - 1)), [stappen.length]);
  // Terug kan alleen binnen het blok stellingen; nooit naar een getimede vraag of een intro.
  const vorige = useCallback(() => setIndex((i) => (isStelling(stappen[i - 1]) ? i - 1 : i)), [stappen]);

  const start = () => {
    const a = nieuweAfname(register, {
      id: nieuweId(),
      seed: nieuweSeed(),
      nu: new Date().toISOString(),
      tijdslimieten: !zonderTijd,
    });
    setAfname(a);
    setToonData(false);
    void opslag.current?.bewaar(a);
    setIndex(0);
  };

  const beantwoord = useCallback(
    (keuze: Keuze) => {
      if (!afname || stap?.soort !== "item") return;
      const item = stap.item;
      const antwoord = maakAntwoord(afname, item, {
        waarde: keuze.waarde,
        reactietijd_ms: keuze.reactietijd_ms,
        volgorde: optieVolgorde(item, afname.seed),
        nu: new Date().toISOString(),
        onderbroken: keuze.onderbroken,
        minst: keuze.minst,
        reactietijd_minst_ms: keuze.reactietijd_minst_ms,
        sortering: keuze.sortering,
      });
      let bijgewerkt = registreer(afname, antwoord);
      // Na het laatste item volgt het eindscherm: dan wordt de afname direct afgerond.
      if (stappen[index + 1]?.soort === "einde") bijgewerkt = rondAf(bijgewerkt, new Date().toISOString());
      setAfname(bijgewerkt);
      void opslag.current?.bewaar(bijgewerkt);
      // Korte pauze zodat de keuze zichtbaar is; bij een time-out direct door.
      setTimeout(volgende, keuze.waarde === null ? 0 : 120);
    },
    [afname, stap, volgende, stappen, index],
  );

  const geldig = afname ? geldigeAntwoorden(afname) : [];
  const procent = Math.round((geldig.length / totaalItems) * 100);
  const zonder = afname ? !afname.tijdslimieten : zonderTijd;

  const kop = (label: string) => (
    <>
      <div className="voortgang" aria-hidden="true"><i style={{ width: `${procent}%` }} /></div>
      <div className="qhead"><span>{label}</span><span>{vertaal("afname.voortgang", { procent })}</span></div>
    </>
  );

  if (rapport) {
    return (
      <Rapport
        afname={rapport.afname}
        register={register}
        voorbeeld={rapport.voorbeeld}
        onTerug={() => {
          setRapport(null);
          if (typeof window !== "undefined") window.scrollTo(0, 0);
        }}
      />
    );
  }

  if (!stap) {
    return (
      <div className="stack">
        <h1>{vertaal("afname.welkom.titel")}</h1>
        <p className="afzender">{vertaal("app.afzender", { eigenaar: "" })}<b>{vertaal("app.eigenaar")}</b></p>
        <p className="muted">{vertaal("afname.welkom.tekst")}</p>
        <section className="paneel">
          <ol className="fasen">
            <li>{vertaal(zonder ? "afname.welkom.fase1ZonderTijd" : "afname.welkom.fase1", { seconden })}</li>
            <li>{vertaal("afname.welkom.fase2")}</li>
            <li>{vertaal(zonder ? "afname.welkom.fase3ZonderTijd" : "afname.welkom.fase3")}</li>
            <li>{vertaal("afname.welkom.fase4")}</li>
          </ol>
        </section>
        <label className="schakelaar" htmlFor="zonderTijd">
          <input id="zonderTijd" type="checkbox" checked={zonderTijd} onChange={(e) => setZonderTijd(e.target.checked)} />
          <span>
            <b>{vertaal("afname.welkom.zonderTijd")}</b>
            <br />
            <span className="muted">{vertaal("afname.welkom.zonderTijdUitleg")}</span>
          </span>
        </label>
        <p className="muted">{vertaal("afname.welkom.privacy")}</p>
        <div className="rij">
          <button type="button" className="primair" onClick={start}>{vertaal("afname.welkom.start")}</button>
          <button type="button" onClick={() => { setRapport({ afname: voorbeeldAfname(register), voorbeeld: true }); window.scrollTo(0, 0); }}>
            {vertaal("afname.welkom.voorbeeld")}
          </button>
        </div>
      </div>
    );
  }

  switch (stap.soort) {
    case "intro": {
      const p = `afname.intro.${stap.fase}`;
      const extra = vertaal(`${p}.extra`);
      return (
        <div className="stack">
          {kop(vertaal(`${p}.label`))}
          <section className="paneel">
            <span className="eyebrow">{vertaal(`${p}.label`)}</span>
            <h2>{vertaal(`${p}.titel`)}</h2>
            <p>{vertaal(zonder ? `${p}.tekstZonderTijd` : `${p}.tekst`, { seconden })}</p>
            {extra && <p className="muted">{extra}</p>}
            <div><button type="button" className="primair" onClick={volgende}>{vertaal(`${p}.knop`)}</button></div>
          </section>
        </div>
      );
    }
    case "oefen":
      return (
        <div className="stack">
          {kop(vertaal("afname.oefen.label"))}
          <Beeldkeuze
            key="oefen"
            label={vertaal("afname.oefen.label")}
            woord={vertaal("afname.oefen.woord")}
            beelden={{ agentisch: "cirkel", communaal: "vierkant" }}
            limietMs={zonder ? null : 2000}
            volgorde={["agentisch", "communaal"]}
            onKeuze={() => volgende()}
          />
        </div>
      );
    case "item": {
      const a = afname!;
      const item = stap.item;
      const volgorde = optieVolgorde(item, a.seed);
      const fase = stappen.filter((s) => s.soort === "item" && s.item.format === item.format);
      const nummer = fase.findIndex((s) => s.soort === "item" && s.item.id === item.id) + 1;
      const sleutel = `${item.id}@${item.versie}`;
      const props = { volgorde, onKeuze: beantwoord, limietMs: tijdslimietMs(a, item) };
      if (item.format === "beeldkeuze") {
        const label = vertaal("afname.beeldkeuze.label", { nummer, totaal: fase.length });
        return (
          <div className="stack">
            {kop(label)}
            <Beeldkeuze
              {...props}
              key={sleutel}
              label={label}
              woord={item.woord!}
              beelden={{ agentisch: item.beeld_agentisch!, communaal: item.beeld_communaal! }}
            />
          </div>
        );
      }
      if (item.format === "likert")
        return (
          <div className="stack">
            {kop(vertaal("afname.stelling.label", { nummer, totaal: fase.length }))}
            <Stelling
              key={sleutel}
              item={item}
              volgorde={volgorde}
              onKeuze={beantwoord}
              huidig={huidigAntwoord(a, item)?.waarde ?? null}
              onVorige={isStelling(stappen[index - 1]) ? vorige : undefined}
              onVolgende={volgende}
            />
          </div>
        );
      if (item.format === "dilemma")
        return <div className="stack">{kop(vertaal("afname.dilemma.label", { nummer, totaal: fase.length }))}<Dilemma {...props} key={sleutel} item={item} /></div>;
      if (item.format === "kaartsortering")
        return <div className="stack">{kop(vertaal("afname.kaarten.label"))}<Kaartsortering key={sleutel} item={item} volgorde={volgorde} onKeuze={beantwoord} /></div>;
      return <div className="stack">{kop(vertaal("afname.vignet.label", { drukniveau: item.drukniveau ?? "" }))}<Vignet {...props} key={sleutel} item={item} /></div>;
    }
    case "einde": {
      const a = afname!;
      return (
        <div className="stack">
          {kop(vertaal("afname.einde.titel"))}
          <section className="paneel">
            <h2>{vertaal("afname.einde.titel")}</h2>
            <p>{vertaal("afname.einde.tekst")}</p>
            {!a.tijdslimieten && <p className="melding">{vertaal("afname.einde.zonderTijd")}</p>}
            <dl className="kerncijfers" data-testid="kerncijfers">
              <div><dt>{vertaal("afname.einde.antwoorden")}</dt><dd data-testid="aantal">{geldig.length}</dd></div>
              <div><dt>{vertaal("afname.einde.herzien")}</dt><dd data-testid="herzien">{geldig.filter((x) => x.poging > 1).length}</dd></div>
              <div><dt>{vertaal("afname.einde.timeouts")}</dt><dd>{geldig.filter((x) => x.time_out).length}</dd></div>
              <div><dt>{vertaal("afname.einde.onderbroken")}</dt><dd>{geldig.filter((x) => x.onderbroken).length}</dd></div>
              <div><dt>{vertaal("afname.einde.itemset")}</dt><dd className="mono">{a.itemset_versie}</dd></div>
            </dl>
            <div className="rij">
              <button type="button" className="primair" onClick={() => { setRapport({ afname: a, voorbeeld: false }); window.scrollTo(0, 0); }}>
                {vertaal("afname.einde.rapport")}
              </button>
              <button type="button" onClick={() => setToonData((v) => !v)} aria-expanded={toonData}>{vertaal("afname.einde.toonData")}</button>
              <button type="button" onClick={start}>{vertaal("afname.einde.opnieuw")}</button>
              <button type="button" onClick={() => { void opslag.current?.wis(a.id); setAfname(null); setIndex(-1); }}>{vertaal("afname.einde.wissen")}</button>
            </div>
            {toonData && <pre className="data" data-testid="data">{JSON.stringify(a, null, 2)}</pre>}
          </section>
        </div>
      );
    }
  }
}
