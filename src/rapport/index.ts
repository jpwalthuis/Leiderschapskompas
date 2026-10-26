/**
 * Rapport: van scoreprofiel naar de inhoud van het deelnemer- en coachrapport.
 * Puur (harde regel 20): geen UI en geen opslag. Alle tekst is een vertaalsleutel met waarden (harde regel 19);
 * de weergave vertaalt pas bij het tonen.
 *
 * Bewaakt:
 * - regel 3: archetypen alleen in secties van soort "duiding", zonder getallen;
 * - regel 4: daadkracht en verbinding met de uitleg dat het los staat van geslacht;
 * - regel 5: de reflex alleen als balk naast daadkracht; zonder tijdslimieten "niet beschikbaar";
 * - regel 6: bij elke schaalweergave de uitleg dat 0 tot 100 de positie op de antwoordschaal is;
 * - regel 7: waarden alleen als rangorde binnen de persoon, ook in de waardencirkel.
 */
import { BEWIJSNIVEAUS, isMeetbaar, type Bewijsniveau, type Item, type Itemregister } from "@/content/itemregister";
import { vertaal } from "@/i18n";
import { BALANSMARGE, STIJLEN, type KaartInfo, type Schaalscore, type Scoreprofiel, type Stijl } from "@/scoring";

/** Grenzen voor de duiding in woorden: onder 35 laag, 35 tot en met 65 midden, boven 65 hoog. */
export const BAND_LAAG = 35;
export const BAND_HOOG = 65;
/** Verschil tussen reflexindicatie en zelfbeeld daadkracht vanaf waar het rapport het verschil benoemt. */
export const REFLEX_AFWIJKING = 20;
/** Bevrediging boven deze waarde: energiebron. */
export const BRON_DREMPEL = 65;
/** Frustratie boven deze waarde: energielek. */
export const LEK_DREMPEL = 50;
/** Verschil tussen hoogste en laagste deel van het kompas vanaf waar de coach een vraag krijgt. */
export const KOMPAS_VERSCHIL = 30;
/** Liggen alle vier de delen van het kompas binnen deze marge, dan heet het profiel evenwichtig. */
export const KOMPAS_EVENWICHT = 15;
/** Marge rond de diagonaal waarbinnen daadkracht en verbinding als in balans gelden (duiding); uit de scoring. */
export { BALANSMARGE };

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

export type KompasDeel = "ratio" | "intuitie" | "gevoel" | "realisme";
/** Volgorde rond de cirkel, met de klok mee vanaf boven: oordelen verticaal, waarnemen horizontaal. */
export const KOMPAS_DELEN: KompasDeel[] = ["ratio", "intuitie", "gevoel", "realisme"];

export type WaardeCode = "OC" | "SE" | "CO" | "ST";
/** Volgorde rond de waardencirkel (Schwartz): tegenover elkaar staan de waarden die botsen. */
export const WAARDEN_CIRKEL: WaardeCode[] = ["OC", "SE", "CO", "ST"];

export type Blok =
  | { soort: "tekst"; tekst: Tekst; toon?: "gedempt" }
  | { soort: "balken"; balken: Balk[] }
  | { soort: "rangorde"; items: { label: Tekst; uitleg: Tekst; plaats: number }[] }
  | { soort: "lijst"; items: Tekst[] }
  | { soort: "melding"; toon: "let-op" | "ok"; items: Tekst[] }
  | { soort: "kerngetallen"; items: { waarde: Cel; label: Tekst }[] }
  | { soort: "tabel"; kop: Tekst[]; rijen: Cel[][] }
  | { soort: "kaarten"; voorkeur: KaartInfo[]; afwijzing: KaartInfo[] }
  | { soort: "bewijs"; rijen: BewijsRij[] }
  /** Positie in het vlak daadkracht (verticaal) tegen verbinding (horizontaal), met de balansband rond de diagonaal. */
  | { soort: "positie"; agency: number | null; communion: number | null; marge: number }
  /** Eén schaal als as tussen twee polen, met een markering. */
  | { soort: "as"; label: Tekst; waarde: number | null; links: Tekst; rechts: Tekst }
  /** Per rij twee kanten: gefrustreerd naar links, vervuld naar rechts. */
  | { soort: "balans"; rijen: { label: Tekst; vervuld: number | null; gefrustreerd: number | null }[] }
  /** Cirkel met vier delen; de straal van elk deel is de score. */
  | { soort: "kompas"; delen: { deel: KompasDeel; label: Tekst; waarde: number | null }[] }
  /** Waardencirkel: alleen de plaats in de eigen rangorde, geen sterkte (regel 7). */
  | { soort: "waardencirkel"; waarden: { code: WaardeCode; label: Tekst; plaats: number | null }[] }
  /** Keuze per drukniveau: meest (gevuld) en minst (open), en welke opties er nog waren. */
  | { soort: "drukverloop"; stijlen: { stijl: Stijl; label: Tekst }[]; kolommen: { label: Tekst; opties: Stijl[]; meest: Stijl | null; minst: Stijl | null }[] }
  /** "Wat dit zou kunnen betekenen": duiding in woorden met een vraag om over na te denken. */
  | { soort: "betekenis"; alineas: Tekst[]; vraag?: Tekst };

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
  /** Uitleg voor de coach: wat dit onderdeel meet en hoe je het leest. Alineas gescheiden door een witregel. */
  toelichting?: Tekst;
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
const TEGENOVER: Record<WaardeCode, WaardeCode> = { OC: "CO", CO: "OC", SE: "ST", ST: "SE" };

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
  const waardenBeantwoord = m.waarden.beantwoord > 0;
  const topWaarde = waardenBeantwoord ? (m.waarden.rangorde[0]?.waarde as WaardeCode | undefined) : undefined;
  const onderWaarde = waardenBeantwoord ? (m.waarden.rangorde.at(-1)?.waarde as WaardeCode | undefined) : undefined;
  const groep = p.duiding.archetypegroep;

  // Kompas: vier delen
  const kompasWaarden: Record<KompasDeel, number | null> = {
    ratio: m.denkstijl.ratio.waarde,
    gevoel: m.denkstijl.gevoel.waarde,
    intuitie: m.waarnemen.intuitie.waarde,
    realisme: m.waarnemen.realisme.waarde,
  };
  const kompasCompleet = KOMPAS_DELEN.every((d) => kompasWaarden[d] !== null);
  const kompasMax = kompasCompleet ? Math.max(...KOMPAS_DELEN.map((d) => kompasWaarden[d]!)) : null;
  const kompasMin = kompasCompleet ? Math.min(...KOMPAS_DELEN.map((d) => kompasWaarden[d]!)) : null;
  const evenwichtig = kompasMax !== null && kompasMin !== null && kompasMax - kompasMin <= KOMPAS_EVENWICHT;
  const sterkste = kompasCompleet ? KOMPAS_DELEN.filter((d) => kompasWaarden[d] === kompasMax) : [];
  const zwakste = kompasCompleet ? KOMPAS_DELEN.filter((d) => kompasWaarden[d] === kompasMin) : [];
  const deelNaam = (d: KompasDeel) => t(`rapport.kompas.inZin.${d}`);

  // ---------- Deelnemer ----------
  const samenvatting: Sectie = {
    id: "samenvatting",
    titel: t("rapport.samenvatting.titel"),
    soort: "info",
    blokken: [
      ...(groep ? [tekst(`rapport.samenvatting.balans.${groep}`)] : []),
      ...(band(m.extraversie.waarde) ? [tekst(`rapport.samenvatting.energie.${band(m.extraversie.waarde)}`)] : []),
      ...(kompasCompleet
        ? [evenwichtig ? tekst("rapport.samenvatting.kompas.evenwichtig") : tekst("rapport.samenvatting.kompas.sterkste", { delen: sterkste.map(deelNaam) })]
        : []),
      ...(topWaarde ? [tekst("rapport.samenvatting.waarde", { waarde: t(`rapport.waarde.${topWaarde}.naam`) })] : []),
      ...(rustTop ? [tekst("rapport.samenvatting.conflict", { stijl: stijlNaam(rustTop) })] : []),
      tekst("rapport.samenvatting.leeswijzer", undefined, "gedempt"),
    ],
  };

  const gerichtheidBalken: Balk[] = [balk("agency", m.agency), balk("communion", m.communion)];
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
    blokken: [
      tekst("rapport.gerichtheid.uitleg", undefined, "gedempt"),
      { soort: "positie", agency: m.agency.waarde, communion: m.communion.waarde, marge: BALANSMARGE },
      { soort: "balken", balken: gerichtheidBalken },
      tekst(reflexTekst),
      ...(groep
        ? [{
            soort: "betekenis" as const,
            alineas: [t(`rapport.betekenis.balans.${groep}.zien`), t(`rapport.betekenis.balans.${groep}.kracht`), t(`rapport.betekenis.balans.${groep}.valkuil`)],
            vraag: t(`rapport.betekenis.balans.${groep}.vraag`),
          }]
        : []),
      schaaluitleg(),
    ],
  };

  const extraBand = band(m.extraversie.waarde);
  const energieBetekenis: Tekst[] = [
    ...(extraBand ? [t(`rapport.betekenis.extraversie.${extraBand}`)] : []),
    ...bronnen.map((b) => t(`rapport.betekenis.bron.${b}`)),
    ...lekken.map((b) => t(`rapport.betekenis.lek.${b}`)),
  ];
  const energie: Sectie = {
    id: "energie",
    label: t("rapport.energie.label"),
    titel: t("rapport.energie.titel"),
    soort: "meting",
    blokken: [
      { soort: "as", label: t("rapport.label.extraversie"), waarde: m.extraversie.waarde, links: t("rapport.as.rust"), rechts: t("rapport.as.contact") },
      ...(extraBand ? [tekst(`rapport.energie.extraversie.${extraBand}`)] : []),
      tekst("rapport.energie.behoeftenTitel"),
      tekst("rapport.energie.behoeftenUitleg", undefined, "gedempt"),
      {
        soort: "balans",
        rijen: BEHOEFTEN.map((b) => ({
          label: t(`rapport.behoefte.${b}.naam`),
          vervuld: m.behoeften[b].bevrediging.waarde,
          gefrustreerd: m.behoeften[b].frustratie.waarde,
        })),
      },
      bronnen.length ? tekst("rapport.energie.bronnen", { behoeften: bronnen.map(behoefteNaam) }) : tekst("rapport.energie.geenBron"),
      lekken.length ? tekst("rapport.energie.lekken", { behoeften: lekken.map(behoefteNaam) }) : tekst("rapport.energie.geenLek"),
      ...(energieBetekenis.length
        ? [{ soort: "betekenis" as const, alineas: energieBetekenis, vraag: t(lekken.length ? "rapport.betekenis.energie.vraagLek" : "rapport.betekenis.energie.vraag") }]
        : []),
      tekst("rapport.energie.onderzoek", undefined, "gedempt"),
      schaaluitleg(),
    ],
  };

  const kompasBetekenis: Tekst[] = !kompasCompleet
    ? []
    : evenwichtig
      ? [t("rapport.betekenis.kompas.evenwichtig")]
      : [
          ...sterkste.map((d) => t(`rapport.betekenis.kompas.sterk.${d}`)),
          ...zwakste.map((d) => t(`rapport.betekenis.kompas.zwak.${d}`)),
          ...(kompasWaarden.intuitie! > BAND_HOOG && kompasWaarden.realisme! > BAND_HOOG ? [t("rapport.betekenis.kompas.beideWaarnemen")] : []),
          ...(kompasWaarden.ratio! > BAND_HOOG && kompasWaarden.gevoel! > BAND_HOOG ? [t("rapport.betekenis.kompas.beideOordelen")] : []),
        ];
  const denken: Sectie = {
    id: "denken",
    label: t("rapport.denken.label"),
    titel: t("rapport.denken.titel"),
    soort: "meting",
    blokken: [
      tekst("rapport.denken.uitleg", undefined, "gedempt"),
      { soort: "kompas", delen: KOMPAS_DELEN.map((d) => ({ deel: d, label: t(`rapport.label.${d}`), waarde: kompasWaarden[d] })) },
      { soort: "lijst", items: KOMPAS_DELEN.map((d) => t(`rapport.kompas.betekent.${d}`, { waarde: kompasWaarden[d] ?? "–" })) },
      ...(kompasBetekenis.length ? [{ soort: "betekenis" as const, alineas: kompasBetekenis, vraag: t("rapport.betekenis.kompas.vraag") }] : []),
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
  const plaatsVan = (c: WaardeCode) => (waardenBeantwoord ? (m.waarden.rangorde.find((r) => r.waarde === c)?.plaats ?? null) : null);
  const drijfveren: Sectie = {
    id: "drijfveren",
    label: t("rapport.drijfveren.label"),
    titel: t("rapport.drijfveren.titel"),
    soort: "meting",
    blokken: [
      ...(waardenBeantwoord
        ? [
            { soort: "waardencirkel" as const, waarden: WAARDEN_CIRKEL.map((c) => ({ code: c, label: t(`rapport.waarde.${c}.naam`), plaats: plaatsVan(c) })) },
            {
              soort: "rangorde" as const,
              items: m.waarden.rangorde.map((r) => ({ label: t(`rapport.waarde.${r.waarde}.naam`), uitleg: t(`rapport.waarde.${r.waarde}.uitleg`), plaats: r.plaats })),
            },
          ]
        : [tekst("rapport.drijfveren.geen")]),
      tekst("rapport.drijfveren.ipsatief", undefined, "gedempt"),
      ...(topWaarde && onderWaarde
        ? [{
            soort: "betekenis" as const,
            alineas: [
              t(`rapport.betekenis.waarde.${topWaarde}.top`),
              t(`rapport.betekenis.waarde.${onderWaarde}.onder`),
              ...(TEGENOVER[topWaarde] === onderWaarde ? [t("rapport.betekenis.waarden.tegenpolen")] : [t("rapport.betekenis.waarden.cirkel")]),
              ...(zorgTekst ? [t(zorgTekst)] : []),
            ],
            vraag: t("rapport.betekenis.waarden.vraag"),
          }]
        : zorgTekst
          ? [tekst(zorgTekst)]
          : []),
    ],
  };

  const conflictBlokken: Blok[] = [
    { soort: "balken", balken: STIJLEN.map((s) => balk(`stijl.${s}`, m.conflictInRust.scores[s])) },
    ...(rustTop ? [tekst("rapport.conflict.rust", { stijl: stijlNaam(rustTop) })] : []),
  ];
  const conflictBetekenis: Tekst[] = rustTop ? [t(`rapport.betekenis.stijl.${rustTop}.kracht`), t(`rapport.betekenis.stijl.${rustTop}.valkuil`)] : [];
  if (p.onderDruk.status !== "beschikbaar") conflictBlokken.push(tekst("rapport.druk.nietBeschikbaar"));
  else {
    conflictBlokken.push(tekst("rapport.druk.verloopUitleg", undefined, "gedempt"), {
      soort: "drukverloop",
      stijlen: STIJLEN.map((s) => ({ stijl: s, label: t(`rapport.label.stijl.${s}`) })),
      kolommen: p.onderDruk.keuzes.map((k, i) => ({
        label: t("rapport.druk.niveau", { niveau: i + 1 }),
        opties: (register.items.find((x) => x.id === k.itemId)?.opties ? Object.keys(register.items.find((x) => x.id === k.itemId)!.opties!) : []) as Stijl[],
        meest: k.keuze,
        minst: k.minst,
      })),
    });
    if (!drukTop) conflictBlokken.push(tekst("rapport.druk.geenKeuze"));
    else {
      conflictBlokken.push(tekst("rapport.druk.keuze", { stijl: stijlNaam(drukTop) }));
      if (rustTop && !m.conflictInRust.voorkeur.includes(drukTop)) {
        conflictBlokken.push(tekst("rapport.druk.verschil"));
        conflictBetekenis.push(t(`rapport.betekenis.druk.${drukTop}`));
      } else conflictBetekenis.push(t("rapport.betekenis.druk.zelfde"));
    }
  }
  if (conflictBetekenis.length) conflictBlokken.push({ soort: "betekenis", alineas: conflictBetekenis, vraag: t("rapport.betekenis.conflict.vraag") });
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
        ? [
            tekst("rapport.archetypen.kaarten"),
            { soort: "kaarten" as const, voorkeur: kaarten.voorkeur, afwijzing: kaarten.afwijzing },
            {
              soort: "betekenis" as const,
              alineas: [
                ...kaarten.voorkeur.map((k) => t(`rapport.betekenis.kaart.${k.id}.voorkeur`)),
                ...kaarten.afwijzing.map((k) => t(`rapport.betekenis.kaart.${k.id}.afwijzing`)),
                t("rapport.betekenis.kaart.schaduw"),
              ],
              vraag: t("rapport.betekenis.kaart.vraag"),
            },
          ]
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
          t("rapport.nietZegt.momentopname"),
          t("rapport.nietZegt.reflex"),
          t("rapport.nietZegt.archetypen"),
          ...(p.tijdslimieten ? [] : [t("rapport.nietZegt.zonderTijd")]),
        ],
      },
    ],
  };

  // ---------- Coach ----------
  const uitleg = (id: string) => t(`rapport.toelichting.${id}`);

  const leeswijzer: Sectie = {
    id: "leeswijzer",
    titel: t("rapport.coach.leeswijzer.titel"),
    soort: "info",
    blokken: [
      tekst("rapport.coach.leeswijzer.intro"),
      {
        soort: "lijst",
        items: ["opbouw", "schaal", "bewijs", "duiding", "gesprek", "grenzen"].map((k) => t(`rapport.coach.leeswijzer.${k}`)),
      },
    ],
  };

  // De coach ziet dezelfde diagrammen als de deelnemer, met de tabel als detail eronder.
  const uit = (s: Sectie, ...soorten: Blok["soort"][]) => s.blokken.filter((b) => soorten.includes(b.soort));

  const kerngetallen: Sectie = {
    id: "kerngetallen",
    titel: t("rapport.coach.kerngetallen.titel"),
    soort: "meting",
    toelichting: uitleg("kerngetallen"),
    blokken: [
      ...uit(gerichtheid, "positie", "balken"),
      ...uit(energie, "as"),
      {
        soort: "kerngetallen",
        items: [
          { waarde: m.agency.waarde, label: t("rapport.coach.kerngetallen.agency") },
          { waarde: m.communion.waarde, label: t("rapport.coach.kerngetallen.communion") },
          { waarde: reflexBeschikbaar ? p.reflex.agentisch : null, label: t("rapport.coach.kerngetallen.reflex", { aantal: p.reflex.geldigeKeuzes }) },
          { waarde: p.reflex.medianeReactietijdMs, label: t("rapport.coach.kerngetallen.reactietijd") },
          { waarde: m.extraversie.waarde, label: t("rapport.coach.kerngetallen.extraversie") },
          { waarde: kompasWaarden.ratio, label: t("rapport.coach.kerngetallen.ratio") },
          { waarde: kompasWaarden.gevoel, label: t("rapport.coach.kerngetallen.gevoel") },
          { waarde: kompasWaarden.intuitie, label: t("rapport.coach.kerngetallen.intuitie") },
          { waarde: kompasWaarden.realisme, label: t("rapport.coach.kerngetallen.realisme") },
          { waarde: groep ? t(`rapport.groep.${groep}`) : null, label: t("rapport.coach.kerngetallen.balans", { marge: BALANSMARGE }) },
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
    toelichting: uitleg("kwaliteit"),
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
  if (kompasMax !== null && kompasMin !== null && kompasMax - kompasMin >= KOMPAS_VERSCHIL) {
    vragen.push(t("rapport.vraag.kompas", { sterk: sterkste.map(deelNaam), zwak: zwakste.map(deelNaam) }));
  }
  if (topWaarde && onderWaarde && TEGENOVER[topWaarde] === onderWaarde) {
    vragen.push(t("rapport.vraag.waarden", { top: t(`rapport.waarde.${topWaarde}.naam`), onder: t(`rapport.waarde.${onderWaarde}.naam`) }));
  }
  if (kaarten) {
    vragen.push(t("rapport.vraag.kaarten", { voorkeur: kaarten.voorkeur[0].naam, afwijzing: kaarten.afwijzing[0].naam }));
    if (groep && groep !== "geintegreerd" && kaarten.voorkeur.every((c) => c.pool !== groep)) {
      vragen.push(t("rapport.vraag.kaartenBalans", { groep: t(`rapport.groep.${groep}`) }));
    }
  }
  if (!vragen.length) vragen.push(t("rapport.vraag.consistent"));
  const gespreksvragen: Sectie = {
    id: "gespreksvragen",
    titel: t("rapport.coach.gespreksvragen.titel"),
    soort: "info",
    toelichting: uitleg("gespreksvragen"),
    blokken: [{ soort: "lijst", items: vragen }],
  };

  const behoeftenTabel: Sectie = {
    id: "behoeften",
    titel: t("rapport.coach.behoeften.titel"),
    soort: "meting",
    toelichting: uitleg("behoeften"),
    blokken: [
      ...uit(energie, "balans"),
      {
        soort: "tabel" as const,
        kop: [t("rapport.coach.behoeften.behoefte"), t("rapport.coach.behoeften.vervuld"), t("rapport.coach.behoeften.gefrustreerd")],
        rijen: BEHOEFTEN.map((b) => [t(`rapport.behoefte.${b}.naam`), m.behoeften[b].bevrediging.waarde, m.behoeften[b].frustratie.waarde]),
      },
      schaaluitleg(),
    ],
  };

  const kompasCoach: Sectie = {
    id: "kompas",
    titel: t("rapport.coach.kompas.titel"),
    soort: "meting",
    toelichting: uitleg("kompas"),
    blokken: [
      ...uit(denken, "kompas"),
      {
        soort: "tabel" as const,
        kop: [t("rapport.coach.kompas.deel"), t("rapport.coach.kompas.score"), t("rapport.coach.kompas.kolomAs")],
        rijen: KOMPAS_DELEN.map((d) => [t(`rapport.label.${d}`), kompasWaarden[d], t(`rapport.coach.kompas.assen.${d === "ratio" || d === "gevoel" ? "oordelen" : "waarnemen"}`)]),
      },
      schaaluitleg(),
    ],
  };

  const druk: Sectie = {
    id: "druk",
    titel: t("rapport.coach.druk.titel"),
    soort: "meting",
    toelichting: uitleg("druk"),
    blokken: [
      ...uit(conflict, "balken"),
      ...(p.onderDruk.status === "beschikbaar"
        ? [
            ...uit(conflict, "drukverloop"),
            {
              soort: "tabel" as const,
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
        : [tekst("rapport.druk.nietBeschikbaar")]),
      schaaluitleg(),
    ],
  };

  const waarden: Sectie = {
    id: "waarden",
    titel: t("rapport.coach.waarden.titel"),
    soort: "meting",
    toelichting: uitleg("waarden"),
    blokken: [
      ...uit(drijfveren, "waardencirkel"),
      {
        soort: "tabel" as const,
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
    toelichting: uitleg("kaarten"),
    blokken: kaarten
      ? [{ soort: "kaarten", voorkeur: kaarten.voorkeur, afwijzing: kaarten.afwijzing }, tekst("rapport.coach.kaarten.uitleg", undefined, "gedempt")]
      : [tekst("rapport.kaarten.nietGedaan")],
  };

  const bewijs: Sectie = {
    id: "bewijs",
    titel: t("rapport.coach.bewijs.titel"),
    soort: "info",
    toelichting: uitleg("bewijs"),
    blokken: [tekst("rapport.coach.bewijs.uitleg", undefined, "gedempt"), { soort: "bewijs", rijen: bewijsRijen(register) }],
  };

  const regels: Sectie = {
    id: "regels",
    titel: t("rapport.coach.regels.titel"),
    soort: "info",
    toelichting: uitleg("regels"),
    blokken: [
      {
        soort: "lijst",
        items: [
          t("rapport.regel.schaal", { laag: BAND_LAAG, hoog: BAND_HOOG }),
          t("rapport.regel.reflex", { marge: REFLEX_AFWIJKING }),
          t("rapport.regel.behoeften", { bron: BRON_DREMPEL, lek: LEK_DREMPEL }),
          t("rapport.regel.waarden"),
          t("rapport.regel.balans", { marge: BALANSMARGE }),
          t("rapport.regel.kompas", { evenwicht: KOMPAS_EVENWICHT, verschil: KOMPAS_VERSCHIL }),
          t("rapport.regel.kaarten"),
        ],
      },
    ],
  };

  const verantwoording: Sectie = {
    id: "verantwoording",
    titel: t("rapport.coach.verantwoording.titel"),
    soort: "info",
    toelichting: uitleg("verantwoording"),
    blokken: [
      {
        soort: "tabel" as const,
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
    coach: [leeswijzer, kerngetallen, kwaliteit, gespreksvragen, behoeftenTabel, kompasCoach, druk, waarden, kaartenCoach, bewijs, regels, verantwoording],
  };
}

const ONDERDELEN: [string, (i: Item) => boolean][] = [
  ["agency", (i) => i.subschaal === "agency"],
  ["communion", (i) => i.subschaal === "communion"],
  ["extraversie", (i) => i.subschaal === "extra"],
  ["behoeften", (i) => /^(sat|fr)[ACR]$/.test(i.subschaal ?? "")],
  ["conflictInRust", (i) => i.format === "likert" && (STIJLEN as string[]).includes(i.subschaal ?? "")],
  ["ratio", (i) => i.subschaal === "rationeel"],
  ["gevoel", (i) => i.subschaal === "ervaringsgericht"],
  ["intuitie", (i) => i.subschaal === "intuitie"],
  ["realisme", (i) => i.subschaal === "realisme"],
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
