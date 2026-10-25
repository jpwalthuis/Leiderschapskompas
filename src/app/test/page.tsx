import type { Metadata } from "next";
import register from "../../../content/itemregister.json";
import type { Itemregister } from "@/content/itemregister";
import { Afname } from "@/components/afname/Afname";
import { vertaal } from "@/i18n";

export const metadata: Metadata = { title: `${vertaal("app.naam")} · demo-afname` };

export default function TestPagina() {
  return (
    <main className="wrap">
      <Afname register={register as unknown as Itemregister} />
    </main>
  );
}
