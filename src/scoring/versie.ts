/**
 * Versie van de scoringsregels. Verhoog bij elke wijziging die een uitkomst kan veranderen;
 * oude afnames blijven herberekenbaar uit de ruwe antwoorden (harde regel 10).
 *
 * 1.0.0: klassieke scoring (gemiddelde per schaal, rangorde bij gedwongen keuze). Thurstonian IRT volgt na de pilot.
 * 1.1.0: itembank v2: schalen denkstijl (rationeel, ervaringsgericht) en waarnemen (openheid); bij conflict onder druk
 *        ook de minst waarschijnlijke reactie. Rekenregels per schaal ongewijzigd.
 * 1.2.0: kaartenoefening (fase 4) als duiding doorgegeven; metingen ongewijzigd.
 */
export const SCORINGSVERSIE = "1.2.0";
