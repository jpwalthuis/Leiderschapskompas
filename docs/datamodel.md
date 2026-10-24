# Datamodel

Status: voorstel, afgeleid van het prototype (tab "Datamodel en rollen" in het coachdashboard).

## Tabellen

| Tabel | Velden (kern) | Opmerking |
|---|---|---|
| licentienemer | id, naam praktijk, licentietype, looptijd, land | |
| coach | id, licentienemer_id, certificeringsdatum, certificeringsversie | |
| opdracht | id, coach_id, opdrachtgever, sector_code, sector_lijst_versie, startdatum | Opdrachtgever krijgt geen toegang |
| deelnemer | pseudoniem_id, coach_id | Geen naam of e-mail |
| identiteit | pseudoniem_id, naam, e-mail | Aparte, versleutelde opslag; alleen deelnemer en eigen coach |
| afname | id, pseudoniem_id, opdracht_id, datum, itemset_versie, scoringsversie | |
| profielsnapshot | afname_id, isco_code, isco_versie, sector_code, sector_lijst_versie, leiderschapsniveau, aantal_medewerkers, geboortejaar, land, regio (ISO 3166-2), isced, gender (optioneel) | Per afname, niet per persoon |
| antwoord | afname_id, item_id, itemversie, waarde, reactietijd_ms, getoonde_positie, time_out | Ruwe data, nooit overschreven |
| score | afname_id, construct, waarde, marge, scoringsversie | Herberekenbaar uit `antwoord` |
| item | id, versie, teksten per taal, construct, kader, bronnen, bewijs_construct, bewijs_methode, bewijs_item | Gevuld uit `content/itemregister.json` |
| toestemming | afname_id, doel (coachrapport, benchmark), gegeven_op, ingetrokken_op | |
| invariantiestudie | groepsvariabele, construct, niveau (configuraal, metrisch, scalair, gedeeltelijk), n, datum | Bepaalt wat de benchmark toont |
| benchmarkaggregaat | groepsvariabele, groepswaarde, construct, n, gemiddelde, interval, berekend_op | Alleen n ≥ 10 en alleen met benchmarktoestemming |

## Rollen onder de AVG

- **Coach**: verwerkingsverantwoordelijke voor de gegevens van zijn cliënten (test, rapport, debrief).
- **Wij, voor het coachrapport**: verwerker namens de coach. Verwerkersovereenkomst in de licentie.
- **Wij, voor de benchmark**: verwerkingsverantwoordelijke, omdat de data voor een eigen doel wordt gebruikt (artikel 28 lid 10 AVG). Grondslag: aparte toestemming van de deelnemer.
- Gepseudonimiseerde data blijft persoonsgegeven. De benchmark krijgt nooit toegang tot `identiteit`.
- Voor deelnemers in Saoedi-Arabië geldt daarnaast de PDPL.

Juridische toets van deze rolverdeling is nodig vóór livegang.

## Toegang per rol

| Rol | Ziet |
|---|---|
| Deelnemer | Eigen rapport, eigen gegevens, export en verwijdering |
| Coach | Eigen cliënten individueel (na toestemming), groepsprofiel per opdracht vanaf n ≥ 10, benchmark |
| Licentienemer | Coaches en licentiegebruik, geen cliëntdata |
| Beheerder (wij) | Licenties, itemregister, aggregaten; geen identiteitsopslag |
