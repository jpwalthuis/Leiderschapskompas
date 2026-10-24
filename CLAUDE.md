# Leiderschapskompas

Digitale test die persoonlijkheid, leiderschap en drijfveren in beeld brengt, met een rapport voor de deelnemer, een uitgebreid rapport en dashboard voor de coach, en een geanonimiseerde benchmark. Coaches zetten de test in onder een licentie van ons bedrijf. Er is geen directe toegang voor opdrachtgevers of werkgevers. De test is alleen voor deelnemers in Europa.

Lees voor je begint:
- `docs/bouwplan.md`: fasen, volgorde en definitie van klaar per fase.
- `docs/datamodel.md`: tabellen, rollen en privacyregels.
- `content/itemregister.json`: alle vragen met construct, kader, bronnen en bewijsniveau. Dit is de bron van waarheid voor de inhoud.
- `prototype/leiderschapskompas.html`: klikbaar prototype (testflow, rapporten, coachdashboard). Gedrag en teksten zijn leidend; de code is wegwerpcode en wordt niet hergebruikt.

## Harde regels

Deze regels gelden voor elke wijziging. Een wijziging die er een breekt, wordt niet gemerged.

### Inhoud en meting
1. Elke vraag staat in het itemregister met construct, theoretisch kader, minimaal één bron en een bewijsoordeel op drie niveaus: construct, methode, item (`sterk`, `matig`, `experimenteel`, `nieuw`). Een test in CI faalt als een item een van deze velden mist.
2. Een onderdeel waarvan het construct niet `sterk` of `matig` is, wordt nooit als meting gescoord. Het mag hooguit als gemarkeerde duiding in een rapport.
3. Archetypen worden niet gemeten. Ze verschijnen alleen als duidingslaag, afgeleid van de gemeten balans agency/communion, en zijn in de UI zo gelabeld.
4. Masculien/feminien wordt gemeten als agency/communion en altijd zo uitgelegd: los van geslacht.
5. De reflexmeting (fase 1, snelle beeldkeuze) is `experimenteel`. Toon haar alleen naast het zelfbeeld op hetzelfde construct, nooit als losse uitslag.
6. Geen normscores of percentielen tot er normdata uit de pilot zijn. Tot dan is 0-100 de positie op de antwoordschaal, en dat staat bij elke score.
7. Gedwongen-keuzeblokken worden in productie gescoord met Thurstonian IRT. Tot die scoring er is, zijn die scores ipsatief en mag het rapport alleen de rangorde binnen de persoon tonen.
8. Geen items, namen of merken van bestaande instrumenten: geen TKI, Thomas-Kilmann, PMAI, MBTI of DUTCH-items. De modellen mogen we gebruiken, met eigen formuleringen.
9. Items zijn geversioneerd. Een gewijzigde tekst is een nieuwe itemversie, nooit een overschrijving.

### Data en privacy
10. Bewaar per antwoord altijd: item-ID, itemversie, ruwe waarde, reactietijd in ms, getoonde positie, en de scoringsversie. Scores moeten na elke scoringswijziging opnieuw te berekenen zijn.
11. Identiteit (naam, e-mail) staat in een aparte, versleutelde opslag en is alleen gekoppeld via een pseudoniem-ID. Analyse- en benchmarkcode krijgt nooit toegang tot die opslag.
12. Achtergrondkenmerken komen uit vaste lijsten (ISCO-08, NACE Rev. 2.1, ISCED, ISO 3166-2) met de versie van de lijst. Geen vrije tekst. Ze horen bij de afname, niet bij de persoon.
13. Geen bijzondere persoonsgegevens (artikel 9 AVG): geen etniciteit, religie, gezondheid. Gender is optioneel en heeft de optie "zeg ik liever niet".
14. Twee aparte toestemmingen: rapport delen met de coach, en opname in de benchmark. Zonder benchmarktoestemming telt een afname daar niet mee. Intrekken moet altijd kunnen.
15. Groepscijfers alleen bij n ≥ 10, server-side afgedwongen, ook bij gecombineerde filters. De UI verbergt het niet alleen, de API levert het niet.
16. Een groepsvergelijking op gemiddelden alleen als de meetinvariantie voor die groepsvariabele is aangetoond (status in de tabel `invariantiestudie`). Anders alleen aantallen.
17. Geen echte deelnemerdata in deze repository, in tests of in ontwikkelomgevingen. Gebruik synthetische data (zie de generator in het prototype).

### Techniek
18. Mobiel eerst. De app moet goed werken op een telefoon en op een opengevouwen vouwtelefoon.
19. UI in het Nederlands, met teksten uit vertaalbestanden zodat Engels en Arabisch (rechts-naar-links) later toe te voegen zijn.
20. Scoring is een pure, geteste module zonder database- of UI-afhankelijkheden.
21. Elke fase in het bouwplan eindigt met werkende tests. Schrijf voor scoring en privacyregels eerst de test.

## Werkwijze
- Werk per fase uit het bouwplan, in een eigen branch, en sluit af met een pull request.
- Bij twijfel over een inhoudelijke of juridische keuze: niet zelf invullen, maar als open vraag in de PR-beschrijving zetten.
- Leg nieuwe ontwerpbeslissingen vast in `docs/beslissingen.md` (datum, besluit, reden).
