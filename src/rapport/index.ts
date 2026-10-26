/**
 * Rapport: van scoreprofiel naar de inhoud van het deelnemer- en coachrapport.
 * Puur (harde regel 20): geen UI en geen opslag. Alle tekst is een vertaalsleutel met waarden (harde regel 19);
 * de weergave vertaalt pas bij het tonen.
 *
 * Bewaakt:
 * - regel 3: archetypen alleen in secties van soort "duiding", zonder getallen;
 * - regel 4: daadkracht en verbinding met de uitleg dat het los staat van geslacht;
 * - regel 5: de reflex alleen als balk naast daadkracht; zonder tijdslimieten "niet beschikbaar";
 * - regel 6: bij elke balk de uitleg dat 0 tot 100 de positie op de antwoordschaal is;
 * - regel 7: waarden alleen als rangorde binnen de persoon.
 */
import { BEWIJSNIVEAUS, isMeetbaar, type Bewijsniveau, type Item, type Itemregister } from "@/content/itemregister";
import { vertaal } from "@/i18n";
import { STIJLEN, type KaartInfo, type Schaalscore, type Scoreprofiel, type Stijl } from "@/scoring";

/** Grenzen voor de duiding in woorden: onder 35 laag, 35 tot en met 65 midden, boven 65 hoog. */
export const BAND_LAAG = 35;
export const BAND_HOOG = 65;
/** Verschil tussen reflexindicatie en zelfbeeld daadkracht vanaf waar het rapport het verschil benoemt. */
export const REFLEX_AFWIJKING = 20;
/** Bevrediging boven deze waarde: energiebron. */
export const BRON_DREMPEL = 65;
/** Frustratie boven deze waarde: energielek. */
export const LEK_DREMPEL = 50;
/** Verschil tussen de twee denkstijlen vanaf waar de coach een vraag krijgt. */
export const DENKSTIJL_VERSCHIL = 30;

export type Band = "laag" | "midden" | "hoog";
export function band(v: number | null): Band | null {
  if (v === null) return null;
  return v < BAND_LAAG ? "laag" : v <= BAND_HOOG ? "midden" : "hoog";
}

/** Een waarde in een tekst: gewone tekst, een getal, een andere vertaalsleutel, of een opsomming daarvan. */
export type Waarde = string | number | Tekst | (string | Tekst)[];

export interface Tekst {
  sleutel: string;
  waarden?: Record<string, Waarde>;
}

/** Vertaalt een tekst, inclusief geneste sleutels. Een opsomming wordt "a, b en c" in de taal van het rapport. */
export function vertaalTekst(x: Tekst): string {
  const een = (w: string | number | Tekst): string => (typeof w === "object" ? vertaalTekst(w) : String(w));
  const waarden = Object.fromEntries(
    Object.entries(x.waarden ?? {}).map(([k, w]) => {
      if (!Array.isArray(w)) return [k, een(w)];
      const delen = w.map(een);
      return [k, delen.length <= 1 ? delen.join("") : `${delen.slice(0, -1).join(", ")} ${vertaal("rapport.en")} ${delen.at(-1)}`];
    }),
  );
  return vertaal(x.sleutel, waarden);
}
export type Cel = Tekst | string | number | null;

export interface Balk {
  label: Tekst;
  /** Positie op de antwoordschaal (0 tot 100), of null als er geen gegevens zijn. */
  waarde: number | null;
  reeks: "zelfbeeld" | "reflex" | "vervuld" | "gefrustreerd";
  experimenteel?: boolean;
}

export type Blok =
  | { soort: "tekst"; tekst: Tekst; toon?: "gedempt" }
  | { soort: "balken"; balken: Balk[] }
  | { soort: "rangorde"; items: { label: Tekst; uitleg: Tekst; plaats: number }[] }
  | { soort: "lijst"; items: Tekst[] }
  | { soort: "melding"; toon: "let-op" | "ok"; items: Tekst[] }
  | { soort: "kerngetallen"; items: { waarde: Cel; label: Tekst }[] }
  | { soort: "tabel"; kop: Tekst[]; rijen: Cel[][] }
  | { soort: "kaarten"; voorkeur: KaartInfo[]; afwijzing: KaartInfo[] }
  | { soort: "bewijs"; rijen: BewijsRij[] };

export interface BewijsRij {
  onderdeel: Tekst;
  construct: Bewijsniveau;
  methode: Bewijsniveau;
  item: Bewijsniveau;
  aantal: number;
  /** meting = gescoord; indicatie = gescoord maar experimentele methode; duiding = nooit gescoord. */
  gebruik: "meting" | "indicatie" | "duiding";
}

export interface Sectie {
  id: string;
  /** Klein label boven de titel. Bij duiding altijd "Duiding, geen meting". */
  label?: Tekst;
  titel: Tekst;
  soort: "meting" | "duiding" | "info";
  blokken: Blok[];
}

export interface Rapport {
  meta: { afnameId: string; scoringsversie: string; itemsetVersie: string; tijdslimieten: boolean };
  deelnemer: Sectie[];
  coach: Sectie[];
}

const t = (sleutel: string, waarden?: Record<string, Waarde>): Tekst => (waarden ? { sleutel, waarden } : { sleutel });
const tekst = (sleutel: string, waarden?: Record<string, Waarde>, toon?: "gedempt"): Blok =>
  toon ? { soort: "tekst", tekst: t(sleutel, waarden), toon } : { soort: "tekst", tekst: t(sleutel, waarden) };
const schaaluitleg = (): Blok => tekst("rapport.schaaluitleg", undefined, "gedempt");
const DUIDING = t("rapport.duiding");

const BEHOEFTEN = ["autonomie", "competentie", "verbondenheid"] as const;

const balk = (label: string, s: Schaalscore, reeks: Balk["reeks"] = "zelfbeeld"): Balk => ({ label: t(`rapport.label.${label}`), waarde: s.waarde, reeks });

export function maakRapport(p: Scoreprofiel, register: Itemregister): Rapport {
  const m = p.metingen;
  const kaartenRegister = register.items.find((i) => i.format === "kaartsortering")?.kaarten ?? [];
  const rustTop: Stijl | null = m.conflictInRust.voorkeur[0] ?? null;
  const drukTop = p.onderDruk.status === "beschikbaar" ? p.onderDruk.keuzeBijHoogsteDruk : null;
  const reflexBeschikbaar = p.reflex.status === "beschikbaar" && p.reflex.agentisch !== null;
  const reflexVerschil = reflexBeschikbaar && m.agency.waarde !== null ? p.reflex.agentisch! - m.agency.waarde : null;
  const bronnen = BEHOEFTEN.filter((b) => (m.behoeften[b].bevrediging.waarde ?? -1) > BRON_DREMPEL);
  const lekken = BEHOEFTEN.filter((b) => (m.behoeften[b].frustratie.waarde ?? -1) > LEK_DREMPEL);
  const behoefteNaam = (b: (typeof BEHOEFTEN)[number]) => t(`rapport.behoefte.${b}.inZin`);
  const stijlNaam = (s: Stijl) => t(`rapport.stijl.${s}`);
  const topWaarde = m.waarden.beantwoord > 0 ? m.waarden.rangorde[0]?.waarde : undefined;
  const groep = p.duiding.archetypegroep;

  // ---------- Deelnemer ----------
  const samenvatting: Sectie = {
    id: "samenvatting",
    titel: t("rapport.samenvatting.titel"),
    soort: "info",
    blokken: [
      ...(groep ? [tekst(`rapport.samenvatting.balans.${groep}`)] : []),
      ...(band(m.extraversie.waarde) ? [tekst(`rapport.samenvatting.energie.${band(m.extraversie.waarde)}`)] : []),
      ...(topWaarde ? [tekst("rapport.samenvatting.waarde", { waarde: t(`rapport.waarde.${topWaarde}.naam`) })] : []),
      ...(m.denkstijl.rationeel.waarde !== null && m.denkstijl.ervaringsgericht.waarde !== null
        ? [tekst(`rapport.samenvatting.denken.${denkcombinatie(m.denkstijl.rationeel.waarde, m.denkstijl.ervaringsgericht.waarde)}`)]
        : []),
    ],
  };

  const gerichtheidBalken: Balk[] = [balk("agency", m.agency), balk("communion", m.communion, "zelfbeeld")];
  if (reflexBeschikbaar) {
    gerichtheidBalken.push({ label: t("rapport.label.reflex"), waarde: p.reflex.agentisch, reeks: "reflex", experimenteel: true });
  }
  const reflexTekst = !p.tijdslimieten
    ? "rapport.reflex.nietBeschikbaar"
    : !reflexBeschikbaar
      ? "rapport.reflex.onvoldoende"
      : reflexVerschil === null || Math.abs(reflexVerschil) <= REFLEX_AFWIJKING
        ? "rapport.reflex.inLijn"
        : reflexVerschil > 0
          ? "rapport.reflex.meerDaadkracht"
          : "rapport.reflex.meerVerbinding";
  const gerichtheid: Sectie = {
    id: "gerichtheid",
    label: t("rapport.gerichtheid.label"),
    titel: t("rapport.gerichtheid.titel"),
    soort: "meting",
    blokken: [tekst("rapport.gerichtheid.uitleg", undefined, "gedempt"), { soort: "balken", balken: gerichtheidBalken }, tekst(reflexTekst), schaaluitleg()],
  };

  const energie: Sectie = {
    id: "energie",
    label: t("rapport.energie.label"),
    titel: t("rapport.energie.titel"),
    soort: "meting",
    blokken: [
      { soort: "balken", balken: [balk("extraversie", m.extraversie)] },
      ...(band(m.extraversie.waarde) ? [tekst(`rapport.energie.extraversie.${band(m.extraversie.waarde)}`)] : []),
      tekst("rapport.energie.behoeftenTitel"),
      {
        soort: "balken",
        balken: BEHOEFTEN.flatMap((b) => [
          { label: t(`rapport.label.${b}.vervuld`), waarde: m.behoeften[b].bevrediging.waarde, reeks: "vervuld" as const },
          { label: t(`rapport.label.${b}.gefrustreerd`), waarde: m.behoeften[b].frustratie.waarde, reeks: "gefrustreerd" as const },
        ]),
      },
      bronnen.length
        ? tekst("rapport.energie.bronnen", { behoeften: bronnen.map(behoefteNaam) })
        : tekst("rapport.energie.geenBron"),
      lekken.length
        ? tekst("rapport.energie.lekken", { behoeften: lekken.map(behoefteNaam) })
        : tekst("rapport.energie.geenLek"),
      tekst("rapport.energie.onderzoek", undefined, "gedempt"),
      schaaluitleg(),
    ],
  };

  const denken: Sectie = {
    id: "denken",
    label: t("rapport.denken.label"),
    titel: t("rapport.denken.titel"),
    soort: "meting",
    blokken: [
      tekst("rapport.denken.uitleg", undefined, "gedempt"),
      { soort: "balken", balken: [balk("rationeel", m.denkstijl.rationeel), balk("ervaringsgericht", m.denkstijl.ervaringsgericht)] },
      ...(m.denkstijl.rationeel.waarde !== null && m.denkstijl.ervaringsgericht.waarde !== null
        ? [tekst(`rapport.denken.combinatie.${denkcombinatie(m.denkstijl.rationeel.waarde, m.denkstijl.ervaringsgericht.waarde)}`)]
        : []),
      { soort: "balken", balken: [balk("openheid", m.waarnemen.openheid)] },
      ...(band(m.waarnemen.openheid.waarde) ? [tekst(`rapport.denken.waarnemen.${band(m.waarnemen.openheid.waarde)}`)] : []),
      schaaluitleg(),
    ],
  };

  const zorg = m.zorgBijFalen;
  const zorgTekst =
    zorg.beantwoord === 0
      ? null
      : zorg.agentisch > zorg.communaal
        ? "rapport.drijfveren.zorg.agentisch"
        : zorg.communaal > zorg.agentisch
          ? "rapport.drijfveren.zorg.communaal"
          : "rapport.drijfveren.zorg.beide";
  const drijfveren: Sectie = {
    id: "drijfveren",
    label: t("rapport.drijfveren.label"),
    titel: t("rapport.drijfveren.titel"),
    soort: "meting",
    blokken: [
      ...(m.waarden.beantwoord > 0
        ? [{
            soort: "rangorde" as const,
            items: m.waarden.rangorde.map((r) => ({ label: t(`rapport.waarde.${r.waarde}.naam`), uitleg: t(`rapport.waarde.${r.waarde}.uitleg`), plaats: r.plaats })),
          }]
        : [tekst("rapport.drijfveren.geen")]),
      tekst("rapport.drijfveren.ipsatief", undefined, "gedempt"),
      ...(zorgTekst ? [tekst(zorgTekst)] : []),
    ],
  };

  const conflictBlokken: Blok[] = [
    { soort: "balken", balken: STIJLEN.map((s) => balk(`stijl.${s}`, m.conflictInRust.scores[s])) },
    ...(rustTop ? [tekst("rapport.conflict.rust", { stijl: stijlNaam(rustTop) })] : []),
  ];
  if (p.onderDruk.status !== "beschikbaar") conflictBlokken.push(tekst("rapport.druk.nietBeschikbaar"));
  else if (!drukTop) conflictBlokken.push(tekst("rapport.druk.geenKeuze"));
  else {
    conflictBlokken.push(tekst("rapport.druk.keuze", { stijl: stijlNaam(drukTop) }));
    if (rustTop && !m.conflictInRust.voorkeur.includes(drukTop)) conflictBlokken.push(tekst("rapport.druk.verschil"));
  }
  conflictBlokken.push(tekst("rapport.conflict.geenBeste", undefined, "gedempt"), schaaluitleg());
  const conflict: Sectie = { id: "conflict", label: t("rapport.conflict.label"), titel: t("rapport.conflict.titel"), soort: "meting", blokken: conflictBlokken };

  const kaarten = p.duiding.kaarten;
  const poolKaarten = groep ? kaartenRegister.filter((k) => k.pool === groep).map((k) => k.naam) : [];
  const archetypen: Sectie = {
    id: "archetypen",
    label: DUIDING,
    titel: t("rapport.archetypen.titel"),
    soort: "duiding",
    blokken: [
      tekst("rapport.archetypen.uitleg"),
      ...(kaarten
        ? [tekst("rapport.archetypen.kaarten"), { soort: "kaarten" as const, voorkeur: kaarten.voorkeur, afwijzing: kaarten.afwijzing }]
        : []),
      ...(groep && poolKaarten.length ? [tekst(`rapport.archetypen.balans.${groep}`, { kaarten: poolKaarten })] : []),
      tekst("rapport.archetypen.vraag", undefined, "gedempt"),
    ],
  };

  const nietZegt: Sectie = {
    id: "nietZegt",
    titel: t("rapport.nietZegt.titel"),
    soort: "info",
    blokken: [
      {
        soort: "lijst",
        items: [
          t("rapport.nietZegt.oordeel"),
          t("rapport.nietZegt.geenNorm"),
          t("rapport.nietZegt.prototype"),
          t("rapport.nietZegt.reflex"),
          t("rapport.nietZegt.archetypen"),
          ...(p.tijdslimieten ? [] : [t("rapport.nietZegt.zonderTijd")]),
        ],
      },
    ],
  };

  // ---------- Coach ----------
  const kerngetallen: Sectie = {
    id: "kerngetallen",
    titel: t("rapport.coach.kerngetallen.titel"),
    soort: "meting",
    blokken: [
      {
        soort: "kerngetallen",
        items: [
          { waarde: m.agency.waarde, label: t("rapport.coach.kerngetallen.agency") },
          { waarde: m.communion.waarde, label: t("rapport.coach.kerngetallen.communion") },
          { waarde: reflexBeschikbaar ? p.reflex.agentisch : null, label: t("rapport.coach.kerngetallen.reflex", { aantal: p.reflex.geldigeKeuzes }) },
          { waarde: p.reflex.medianeReactietijdMs, label: t("rapport.coach.kerngetallen.reactietijd") },
          { waarde: m.extraversie.waarde, label: t("rapport.coach.kerngetallen.extraversie") },
          { waarde: m.denkstijl.rationeel.waarde, label: t("rapport.coach.kerngetallen.rationeel") },
          { waarde: m.denkstijl.ervaringsgericht.waarde, label: t("rapport.coach.kerngetallen.ervaringsgericht") },
          { waarde: m.waarnemen.openheid.waarde, label: t("rapport.coach.kerngetallen.openheid") },
          { waarde: groep ? t(`rapport.groep.${groep}`) : null, label: t("rapport.coach.kerngetallen.balans", { marge: 12 }) },
        ],
      },
      schaaluitleg(),
    ],
  };

  const meldingen: Tekst[] = [];
  const k = p.kwaliteit;
  if (!p.tijdslimieten) meldingen.push(t("rapport.kwaliteit.zonderTijd"));
  if (k.timeOuts) meldingen.push(t("rapport.kwaliteit.timeOuts", { aantal: k.timeOuts }));
  if (k.teSnel) meldingen.push(t("rapport.kwaliteit.teSnel", { aantal: k.teSnel }));
  if (k.rechtlijnig) meldingen.push(t("rapport.kwaliteit.rechtlijnig"));
  if (k.onderbroken) meldingen.push(t("rapport.kwaliteit.onderbroken", { aantal: k.onderbroken }));
  if (p.tijdslimieten && p.reflex.status === "onvoldoende-gegevens") meldingen.push(t("rapport.kwaliteit.reflexOnvoldoende", { aantal: p.reflex.geldigeKeuzes }));
  const kwaliteit: Sectie = {
    id: "kwaliteit",
    titel: t("rapport.coach.kwaliteit.titel"),
    soort: "info",
    blokken: [
      meldingen.length ? { soort: "melding", toon: "let-op", items: meldingen } : { soort: "melding", toon: "ok", items: [t("rapport.kwaliteit.geen")] },
      ...(k.herzieningen ? [tekst("rapport.kwaliteit.herzien", { aantal: k.herzieningen }, "gedempt")] : []),
    ],
  };

  const vragen: Tekst[] = [];
  if (reflexVerschil !== null && Math.abs(reflexVerschil) > REFLEX_AFWIJKING) {
    vragen.push(t("rapport.vraag.reflex", { reflex: p.reflex.agentisch!, agency: m.agency.waarde!, verschil: Math.abs(reflexVerschil) }));
  }
  if (rustTop && drukTop && !m.conflictInRust.voorkeur.includes(drukTop)) {
    vragen.push(t("rapport.vraag.drukVerschuiving", { rust: stijlNaam(rustTop), druk: stijlNaam(drukTop) }));
  }
  for (const b of lekken) vragen.push(t("rapport.vraag.frustratie", { behoefte: behoefteNaam(b), waarde: m.behoeften[b].frustratie.waarde! }));
  if (zorg.agentisch > 0 && zorg.communaal > 0) vragen.push(t("rapport.vraag.zorgTegengesteld"));
  const r = m.denkstijl.rationeel.waarde;
  const e = m.denkstijl.ervaringsgericht.waarde;
  if (r !== null && e !== null && Math.abs(r - e) >= DENKSTIJL_VERSCHIL) {
    vragen.push(t("rapport.vraag.denkstijl", { stijl: t(r > e ? "rapport.denkstijl.ervaringsgericht" : "rapport.denkstijl.rationeel") }));
  }
  if (kaarten) {
    vragen.push(t("rapport.vraag.kaarten", { voorkeur: kaarten.voorkeur[0].naam, afwijzing: kaarten.afwijzing[0].naam }));
    if (groep && groep !== "geintegreerd" && kaarten.voorkeur.every((c) => c.pool !== groep)) {
      vragen.push(t("rapport.vraag.kaartenBalans", { groep: t(`rapport.groep.${groep}`) }));
    }
  }
  if (!vragen.length) vragen.push(t("rapport.vraag.consistent"));
  const gespreksvragen: Sectie = { id: "gespreksvragen", titel: t("rapport.coach.gespreksvragen.titel"), soort: "info", blokken: [{ soort: "lijst", items: vragen }] };

  const behoeftenTabel: Sectie = {
    id: "behoeften",
    titel: t("rapport.coach.behoeften.titel"),
    soort: "meting",
    blokken: [
      {
        soort: "tabel",
        kop: [t("rapport.coach.behoeften.behoefte"), t("rapport.coach.behoeften.vervuld"), t("rapport.coach.behoeften.gefrustreerd")],
        rijen: BEHOEFTEN.map((b) => [t(`rapport.behoefte.${b}.naam`), m.behoeften[b].bevrediging.waarde, m.behoeften[b].frustratie.waarde]),
      },
      schaaluitleg(),
    ],
  };

  const druk: Sectie = {
    id: "druk",
    titel: t("rapport.coach.druk.titel"),
    soort: "meting",
    blokken:
      p.onderDruk.status === "beschikbaar"
        ? [
            {
              soort: "tabel",
              kop: [t("rapport.coach.druk.situatie"), t("rapport.coach.druk.opties"), t("rapport.coach.druk.meest"), t("rapport.coach.druk.minst"), t("rapport.coach.druk.tijd")],
              rijen: p.onderDruk.keuzes.map((x) => [
                x.itemId,
                x.aantalOpties,
                x.keuze ? t(`rapport.label.stijl.${x.keuze}`) : t("rapport.coach.druk.geenKeuze"),
                x.minst ? t(`rapport.label.stijl.${x.minst}`) : null,
                x.reactietijdMs,
              ]),
            },
            tekst("rapport.coach.druk.uitleg", undefined, "gedempt"),
          ]
        : [tekst("rapport.druk.nietBeschikbaar")],
  };

  const waarden: Sectie = {
    id: "waarden",
    titel: t("rapport.coach.waarden.titel"),
    soort: "meting",
    blokken: [
      {
        soort: "tabel",
        kop: [t("rapport.coach.waarden.waarde"), t("rapport.coach.waarden.keuzes"), t("rapport.coach.waarden.plaats")],
        rijen: m.waarden.rangorde.map((x) => [t(`rapport.waarde.${x.waarde}.vol`), x.keuzes, x.plaats]),
      },
      tekst("rapport.coach.waarden.uitleg", { beantwoord: m.waarden.beantwoord, totaal: m.waarden.aantalDilemmas }, "gedempt"),
    ],
  };

  const kaartenCoach: Sectie = {
    id: "kaarten",
    label: DUIDING,
    titel: t("rapport.coach.kaarten.titel"),
    soort: "duiding",
    blokken: kaarten
      ? [{ soort: "kaarten", voorkeur: kaarten.voorkeur, afwijzing: kaarten.afwijzing }, tekst("rapport.coach.kaarten.uitleg", undefined, "gedempt")]
      : [tekst("rapport.kaarten.nietGedaan")],
  };

  const bewijs: Sectie = {
    id: "bewijs",
    titel: t("rapport.coach.bewijs.titel"),
    soort: "info",
    blokken: [tekst("rapport.coach.bewijs.uitleg", undefined, "gedempt"), { soort: "bewijs", rijen: bewijsRijen(register) }],
  };

  const regels: Sectie = {
    id: "regels",
    titel: t("rapport.coach.regels.titel"),
    soort: "info",
    blokken: [
      {
        soort: "lijst",
        items: [
          t("rapport.regel.schaal", { laag: BAND_LAAG, hoog: BAND_HOOG }),
          t("rapport.regel.reflex", { marge: REFLEX_AFWIJKING }),
          t("rapport.regel.behoeften", { bron: BRON_DREMPEL, lek: LEK_DREMPEL }),
          t("rapport.regel.waarden"),
          t("rapport.regel.balans", { marge: 12 }),
          t("rapport.regel.kaarten"),
          t("rapport.regel.denkstijl", { verschil: DENKSTIJL_VERSCHIL }),
        ],
      },
    ],
  };

  const verantwoording: Sectie = {
    id: "verantwoording",
    titel: t("rapport.coach.verantwoording.titel"),
    soort: "info",
    blokken: [
      {
        soort: "tabel",
        kop: [t("rapport.coach.verantwoording.wat"), t("rapport.coach.verantwoording.waarde")],
        rijen: [
          [t("rapport.coach.verantwoording.afname"), p.afnameId],
          [t("rapport.coach.verantwoording.scoringsversie"), p.scoringsversie],
          [t("rapport.coach.verantwoording.itemset"), p.itemsetVersie],
          [t("rapport.coach.verantwoording.tijdslimieten"), t(p.tijdslimieten ? "rapport.ja" : "rapport.nee")],
        ],
      },
    ],
  };

  return {
    meta: { afnameId: p.afnameId, scoringsversie: p.scoringsversie, itemsetVersie: p.itemsetVersie, tijdslimieten: p.tijdslimieten },
    deelnemer: [samenvatting, gerichtheid, energie, denken, drijfveren, conflict, archetypen, nietZegt],
    coach: [kerngetallen, kwaliteit, gespreksvragen, behoeftenTabel, druk, waarden, kaartenCoach, bewijs, regels, verantwoording],
  };
}

/** Beide denkstijlen in woorden: welke hoog is, of allebei. */
function denkcombinatie(rationeel: number, ervaring: number): "beide" | "rationeel" | "ervaring" | "geen" {
  const r = rationeel > BAND_HOOG;
  const e = ervaring > BAND_HOOG;
  return r && e ? "beide" : r ? "rationeel" : e ? "ervaring" : "geen";
}

const ONDERDELEN: [string, (i: Item) => boolean][] = [
  ["agency", (i) => i.subschaal === "agency"],
  ["communion", (i) => i.subschaal === "communion"],
  ["extraversie", (i) => i.subschaal === "extra"],
  ["behoeften", (i) => /^(sat|fr)[ACR]$/.test(i.subschaal ?? "")],
  ["conflictInRust", (i) => i.format === "likert" && (STIJLEN as string[]).includes(i.subschaal ?? "")],
  ["denkstijl", (i) => i.subschaal === "rationeel" || i.subschaal === "ervaringsgericht"],
  ["waarnemen", (i) => i.subschaal === "openheid"],
  ["waarden", (i) => i.format === "dilemma" && !!i.optie_a?.waarde],
  ["zorgBijFalen", (i) => i.format === "dilemma" && !!i.optie_a?.pool],
  ["reflex", (i) => i.format === "beeldkeuze"],
  ["onderDruk", (i) => i.format === "vignet"],
  ["kaarten", (i) => i.format === "kaartsortering"],
];

/** Per onderdeel het zwakste bewijsniveau uit het register, op elk van de drie niveaus. */
function bewijsRijen(register: Itemregister): BewijsRij[] {
  const zwakste = (niveaus: Bewijsniveau[]) => niveaus.reduce((a, b) => (BEWIJSNIVEAUS.indexOf(b) > BEWIJSNIVEAUS.indexOf(a) ? b : a));
  return ONDERDELEN.flatMap(([id, hoort]) => {
    const items = register.items.filter(hoort);
    if (!items.length) return [];
    const methode = zwakste(items.map((i) => i.bewijs.methode));
    return [{
      onderdeel: t(`rapport.onderdeel.${id}`),
      construct: zwakste(items.map((i) => i.bewijs.construct)),
      methode,
      item: zwakste(items.map((i) => i.bewijs.item)),
      aantal: items.length,
      gebruik: !items.every(isMeetbaar) ? "duiding" : methode === "experimenteel" ? "indicatie" : "meting",
    }];
  });
}
