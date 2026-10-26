/**
 * Ingang voor de losse demo (npm run demo): de echte afname-component, zonder Next.js-server.
 * Bedoeld om de test te laten proberen zolang er nog geen hosting is. Antwoorden blijven in de browser.
 */
import { createRoot } from "react-dom/client";
import register from "../../content/itemregister.json";
import type { Itemregister } from "@/content/itemregister";
import { Afname } from "@/components/afname/Afname";

const wortel = document.getElementById("app");
if (wortel) {
  createRoot(wortel).render(
    <main className="wrap">
      <Afname register={register as unknown as Itemregister} />
    </main>,
  );
}
