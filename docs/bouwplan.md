# Bouwplan

Status: vastgesteld op 2026-10-24. Per fase een pull request.

## Techniek

Akkoord eigenaar op 2026-10-24.

| Onderdeel | Keuze | Reden |
|---|---|---|
| App | Webapp (PWA) in TypeScript, Next.js | Eén codebase voor telefoon en laptop, geen app store nodig |
| Database | PostgreSQL in een EU-regio | Relationeel model past bij dit datamodel; EU-opslag voor de AVG |
| Identiteitsopslag | Aparte database of schema met eigen sleutel | Harde regel 11 |
| Scoring | Pure TypeScript-module met unit tests | Harde regel 20 |
| Psychometrische analyse | R-scripts in `analyse/` (lavaan voor CFA en invariantie, thurstonianIRT voor gedwongen keuze) | Gangbare, controleerbare pakketten |
| Hosting | Voorstel: Scalingo, regio osc-fr1 (Parijs). Wacht op akkoord eigenaar | Franse aanbieder, EU-opslag, ISO 27001, verwerkersovereenkomst, automatisch een previewversie per pull request |

Alleen deelnemers in de EU, met Nederland als hoofdmarkt. Alle opslag en verwerking in de EU; de registratie accepteert alleen EU-lidstaten.

## Fasen

### Fase 0: Basis
- Projectstructuur, linting, testrunner, CI.
- CI-test op het itemregister (harde regel 1): elk item heeft construct, kader, bron en bewijs op drie niveaus.
- Klaar als: CI draait groen op een lege app met het gevalideerde itemregister.

### Fase 1: Itembank en testmotor
- Itemregister als geversioneerde data, ingeladen in de app.
- Testflow in drie fasen zoals het prototype: oefenronde, getimede beeldkeuze (2 s), stellingen, dilemma's (8 s), drukvignetten (15, 12, 9, 7 s, met wegvallende opties).
- Willekeurige links/rechts-positie en optievolgorde, vastgelegd per antwoord.
- Per antwoord opslaan: harde regel 10.
- Werkt zonder account voor een demo-afname, met synthetische opslag.
- Klaar als: een volledige afname op telefoon slaagt en alle antwoorden met reactietijd en versies zijn opgeslagen.

### Fase 2: Scoring
Status: gebouwd (PR fase-2/scoring), scoringsversie 1.0.0.
- Pure module: agency, communion, extraversie (met omgekeerde items), basisbehoeften (bevrediging en frustratie apart), conflictstrategieën in rust en onder druk, waardenrangorde, reflexindicatie.
- Scoring rekent met de geldige antwoorden: per item de laatste poging.
- Afname zonder tijdslimieten: reflexindicatie en conflict onder druk krijgen de status "niet beschikbaar" (harde regel 5).
- Kwaliteitsindicatoren: time-outs, reacties onder 300 ms, rechtlijnig antwoordpatroon, te weinig geldige reflexkeuzes, onderbroken vragen, aantal herzieningen.
- Scoringsversie in elke uitkomst.
- Klaar als: unit tests dekken elke schaal, inclusief ontbrekende antwoorden en time-outs, en uitkomsten komen overeen met het prototype op de voorbeeldantwoorden.

### Fase 3: Rapporten
- Cliëntrapport en coachrapport zoals in het prototype, inclusief de sectie "wat dit rapport niet zegt".
- Bewijsniveaus zichtbaar in het coachrapport.
- Klaar als: beide rapporten renderen op telefoonbreedte en in licht en donker thema.

### Fase 4: Accounts, rollen en toestemming
- Rollen: beheerder (wij), licentienemer, coach, deelnemer.
- Coach nodigt deelnemer uit via een link en kan per uitnodiging de tijdslimieten uitzetten; deelnemer ziet altijd het eigen rapport.
- Twee toestemmingen (harde regel 14), met intrekken.
- Identiteitsopslag gescheiden (harde regel 11).
- Klaar als: tests bewijzen dat een coach alleen eigen cliënten ziet en dat zonder toestemming niets gedeeld wordt.

### Fase 5: Registratie en achtergrondkenmerken
- Registratieformulier met vaste lijsten (harde regel 12): beroep (ISCO-08), sector (NACE Rev. 2.1), leiderschapsniveau, aantal medewerkers, geboortejaar, land (EU-lidstaat) en regio (ISO 3166-2), opleiding (ISCED), gender optioneel.
- Profielsnapshot per afname.
- Klaar als: er geen vrij tekstveld voor achtergrondkenmerken bestaat.

### Fase 6: Dashboard
- Coachweergave: eigen cliënten, filters, groepsprofiel per opdracht vanaf n ≥ 10.
- Benchmark over alle licentienemers, alleen met benchmarktoestemming, uit vooraf berekende aggregaten.
- Drempel en invariantiestatus server-side afgedwongen (harde regels 15 en 16).
- Klaar als: tests bewijzen dat geen enkele API-route een groep onder de 10 teruggeeft, ook niet via gecombineerde filters.

### Fase 7: Privacyfuncties en licentie
- Inzage, export en verwijdering door de deelnemer.
- Bewaartermijnen en automatisch opschonen.
- Auditlog van wie welke gegevens inzag.
- Licentiebeheer: looptijd, aantal afnames.
- Input voor DPIA en verwerkersovereenkomst (juridische tekst valt buiten de code).

### Fase 8: Pilot en validatie
- Export van gepseudonimiseerde antwoorddata voor analyse.
- R-scripts: itemanalyse, betrouwbaarheid, CFA, meetinvariantie per groepsvariabele, Thurstonian IRT-scoring.
- Resultaten bijwerken in het itemregister (bewijsniveau `item`) en de tabel `invariantiestudie`.
- Klaar als: de analyse reproduceerbaar draait op een synthetische dataset.

## Buiten de code
- Psycholoog of psychometricus voor itemrevisie en pilotopzet.
- Ontwerp en licentie van de beelden voor fase 1.
- Juridische toets: AVG-rollen, DPIA, licentievoorwaarden.
