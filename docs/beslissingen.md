# Beslissingen

| Datum | Besluit | Reden |
|---|---|---|
| 2026-10-23 | Doelgroep: ontwikkeling en coaching, geen selectie | Lagere juridische eisen; past bij het doel van de test |
| 2026-10-23 | Elke vraag gekoppeld aan construct, kader, bronnen en bewijs op drie niveaus | Eis eigenaar: geen discussie of een vraag meet wat ze zegt te meten |
| 2026-10-23 | Archetypen alleen als duiding, niet gemeten | Empirische basis omstreden; gevalideerd archetype-instrument (PMAI) is beschermd |
| 2026-10-23 | Masculien/feminien gemeten als agency/communion | Onderbouwde vorm van het idee, los van geslacht |
| 2026-10-23 | Conflictstijlen naar het dual concern-model, eigen items | TKI-items en -naam zijn beschermd |
| 2026-10-23 | Energie gemeten als behoeftebevrediging en -frustratie (zelfdeterminatietheorie) | Aantoonbare samenhang met vitaliteit |
| 2026-10-23 | Alle toegang via gelicentieerde coaches | Keuze eigenaar |
| 2026-10-23 | Groepscijfers vanaf n ≥ 10, groepsvergelijking alleen bij aangetoonde meetinvariantie | Herleidbaarheid voorkomen; vergelijkingen moeten betekenis hebben. Drempel is een ontwerpkeuze, geen wettelijke norm |
| 2026-10-24 | Techniek: webapp (PWA) in TypeScript met Next.js, PostgreSQL in een EU-regio, R voor psychometrische analyse | Akkoord eigenaar op het voorstel in het bouwplan |
| 2026-10-24 | Alleen deelnemers in de EU, hoofdmarkt Nederland | Keuze eigenaar. Eén privacyregime (AVG) en EU-opslag; geen PDPL, geen ISIC; VK en Zwitserland vallen erbuiten |
| 2026-10-24 | Versies: Next.js 16.3.8, React 19.2.8, Vitest 3.2.4, Node 22 | Laatste niet-afgekeurde versies die minstens twee weken oud zijn; Next.js 15.5.4 is door de uitgever gemarkeerd met een beveiligingslek |
| 2026-10-24 | Itemregister wordt in CI gecontroleerd op harde regels 1, 2, 8 en 9 | Een vraag zonder verantwoording of met een merknaam kan niet gemerged worden |
| 2026-10-24 | Talen: Nederlands, later Engels; geen Arabisch | Keuze eigenaar; volgt uit de beperking tot de EU |
| 2026-10-24 | Merkcontrole: afkortingen (TKI, PMAI, MBTI, DUTCH) alleen in hoofdletters, namen ongeacht hoofdletters | Anders zou het gewone Engelse woord "Dutch" in een toekomstige Engelse versie ten onrechte worden geblokkeerd |
| 2026-10-25 | Opslag achter één interface (`AfnameOpslag`); fase 1 bewaart in de browser, fase 4 voegt de database toe | Demo-afname werkt zonder account en zonder server; later wisselen zonder de testmotor te raken |
| 2026-10-25 | Scoringsversie `ongescoord` tot fase 2 (vervangen door 1.0.0, zie hieronder) | Regel 10 vraagt een scoringsversie per antwoord; zo is herkenbaar welke afnames nog gescoord moeten worden |
| 2026-10-25 | Optievolgorde willekeurig per afname en per item (ook bij dilemma's), reproduceerbaar uit een seed; stellingschaal blijft 1 tot 5 | Voorkomt volgorde-effecten; de getoonde positie wordt per antwoord vastgelegd |
| 2026-10-25 | Reactietijd start na twee animatieframes; bij getimede vragen telt alleen het eerste antwoord | De klok loopt pas als de vraag echt zichtbaar is; dubbel tikken of tikken na de time-out verandert niets |
| 2026-10-25 | Extra veld `onderbroken` per antwoord: het scherm verloor de focus terwijl de vraag openstond | Reactietijd van zo'n antwoord is onbetrouwbaar; nodig voor de kwaliteitsindicatoren in fase 2 |
| 2026-10-25 | End-to-end tests op telefoonformaat (Pixel 7) en een benadering van een opengevouwen vouwtelefoon (900 × 1000) | Harde regel 18; de vouwmaat is een benadering, geen exacte apparaatmaat |
| 2026-10-25 | Afname zonder tijdslimieten mogelijk; dan vervallen de reflex- en drukscores (harde regel 5 aangevuld) | Akkoord eigenaar. Toegankelijkheid voor wie meer tijd nodig heeft, zonder ongeldige scores te tonen. Coach zet het per uitnodiging (fase 4); in de demo een vinkje |
| 2026-10-25 | Terug naar de vorige vraag alleen binnen de stellingen; herziening is een nieuwe poging, de laatste telt (harde regel 10 aangevuld) | Akkoord eigenaar. Bij getimede vragen zou terug gaan de meting ongeldig maken; ruwe data blijft volledig, ook de herzieningen |
| 2026-10-25 | Eigenaar van de test is Ekana; de app volgt de huisstijl van ekana.nl | Keuze eigenaar |
| 2026-10-25 | Kleuren bemonsterd van een schermafdruk van ekana.nl: oranje #D8894E, oranje vlak #D78236 / #C96B2A, lichtgrijs #F2F2F2, tekstgrijs #6D6D6D, grijze knoppen #737373; lettertype Cardo | Geen officiële huisstijlgids beschikbaar; te vervangen door de officiële waarden zodra Ekana die levert |
| 2026-10-25 | Merkoranje alleen decoratief; voor tekst en bediening donkerder tinten van hetzelfde oranje (#9F5823 tekst, #C96B2A balken en focus) | #D8894E haalt op lichtgrijs 2,5:1, onder de WCAG-eis van 4,5:1 voor tekst en 3:1 voor bediening |
| 2026-10-25 | Cardo voor koppen, vraagteksten en hoofdknoppen; systeemlettertype voor kleine bedieningstekst | Cardo is de letter van ekana.nl; op een telefoon leest kleine tekst beter in een schreefloze letter |
| 2026-10-25 | Cardo wordt meegeleverd met de app (npm-pakket @fontsource/cardo, OFL-licentie), niet geladen vanaf Google | Geen verzoek naar Google bij elke deelnemer; past bij de AVG-lijn van de app |
| 2026-10-25 | Ekana is ook de licentiegever: coaches krijgen hun licentie van Ekana | Bevestigd door eigenaar |
| 2026-10-26 | Itembank v2 na feedback van de eigenaar ("te oppervlakkig", "uitkomst af te leiden uit de vragen", "te weinig tijd om te lezen") | Zie de regels hieronder; feedback ingesproken op 2026-10-26 |
| 2026-10-26 | Minimaal drie stellingen per schaal (agency, communion en extraversie zes); 63 stellingen in totaal | Eén stelling per schaal geeft geen betrouwbare score; lost de open vraag uit fase 2 op |
| 2026-10-26 | Nieuwe schalen denkstijl (rationeel, ervaringsgericht) en waarnemen (openheid: intuïtief versus feitelijk) | Wens eigenaar: ratio, gevoel, feitelijkheid en intuïtie. Gemeten via onderbouwde dimensies (Pacini & Epstein 1999; Witteman e.a. 2009; McCrae & Costa 1989), niet als Jung-typen |
| 2026-10-26 | Stellingen gemengd per afname, nooit twee van dezelfde schaal achter elkaar, zonder vast patroon | De uitkomst mag niet uit volgorde of groepering af te leiden zijn |
| 2026-10-26 | Tijdslimiet van dilemma's en vignetten afgeleid van de leestijd: woorden / 238 per minuut × leesfactor + 3 s | Eerdere limieten lagen deels onder de pure leestijd (vignet 3: 9 s voor 16 s tekst). 238 wpm: Brysbaert 2019. Leesfactor dilemma 1,5; vignetten 1,6 → 1,15 zodat de druk blijft oplopen |
| 2026-10-26 | Beeldkeuze van 2 naar 3 seconden | Feedback eigenaar: te snel. Ontwerpkeuze, te toetsen in de pilot |
| 2026-10-26 | Vignetten: eerst meest waarschijnlijke reactie (getimed), daarna minst waarschijnlijke (zonder tijdslimiet) | Meer informatie per situatie (best-worst, Louviere e.a. 2015); sluit aan bij de voorkeur-en-afwijzing-werkwijze die de eigenaar kent |
| 2026-10-26 | Getimede items krijgen een nieuwe itemversie (beeldkeuze, dilemma, vignet: versie 2); scoringsversie 1.1.0 | Regel 9 en 10: oude en nieuwe afnames blijven onderscheidbaar |
| 2026-10-26 | Prototype: "toon verantwoording" staat standaard uit | Met de verantwoording aan staat het construct onder elke vraag, waardoor de uitkomst voorspelbaar wordt |
| 2026-10-26 | Losse demo van de echte app (`npm run demo`) | De eigenaar kan de echte afname proberen zolang er nog geen hosting is |
| 2026-10-26 | Beeldkeuze (reflex): 5 seconden in plaats van 3 (beeldkeuze versie 3) | Keuze van de eigenaar: meer tijd om het beeld echt te zien. Nieuwe itemversie volgens regel 9 |
| 2026-10-26 | Kaartenoefening als testfase 4 (Reflectie): acht archetypekaarten van eigen ontwerp, eerste en tweede voorkeur, eerste en tweede afwijzing, zonder tijdslimiet | Wens van de eigenaar (voorkeur en afwijzing op beelden). Construct `experimenteel`, dus nooit gescoord (regel 2); regel 3 aangepast zodat de oefening als gespreksstof mag. Scoringsversie 1.2.0 geeft de keuzes ongewijzigd door als duiding |
| 2026-10-26 | Geen vragen of materiaal van ACT in Actie | De genoemde vragenlijsten meten psychologische flexibiliteit (ACT), bevatten geen archetypen en zijn niet vrij voor commercieel gebruik |
| 2026-10-26 | Testlengte ongeveer 12 tot 15 minuten | Akkoord eigenaar |
| 2026-10-26 | Gekozen kaarten krijgen een dikkere rand en een label, geen gekleurde achtergrond | Op een getinte achtergrond haalt tekst in het lichte thema geen 4,5:1 (regel 18) |
