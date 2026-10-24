import register from "../../content/itemregister.json";
import { vertaal } from "@/i18n";

export default function Start() {
  return (
    <main className="wrap">
      <span className="eyebrow">{vertaal("start.status")}</span>
      <h1>{vertaal("app.naam")}</h1>
      <p className="muted">{vertaal("app.omschrijving")}</p>
      <p>{vertaal("start.uitleg")}</p>
      <p className="muted">{vertaal("start.itemsGeladen", { aantal: register.items.length })}</p>
    </main>
  );
}
