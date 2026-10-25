import Link from "next/link";
import register from "../../content/itemregister.json";
import { vertaal } from "@/i18n";

export default function Start() {
  return (
    <main className="wrap">
      <span className="eyebrow">{vertaal("start.status")}</span>
      <h1>{vertaal("app.naam")}</h1>
      <p className="afzender">{vertaal("app.afzender", { eigenaar: "" })}<b>{vertaal("app.eigenaar")}</b></p>
      <p className="muted">{vertaal("app.omschrijving")}</p>
      <p>{vertaal("start.uitleg")}</p>
      <div><Link className="knop primair" href="/test">{vertaal("start.naarTest")}</Link></div>
      <p className="muted">{vertaal("start.itemsGeladen", { aantal: register.items.length })}</p>
    </main>
  );
}
