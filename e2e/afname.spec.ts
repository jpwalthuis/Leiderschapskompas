import { expect, test, type Page } from "@playwright/test";
import register from "../content/itemregister.json";

const items = register.items;
const aantal = (format: string) => items.filter((i) => i.format === format).length;

/** De pagina mag nooit horizontaal scrollen (harde regel 18). */
async function geenHorizontaleScroll(page: Page) {
  const breed = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(breed, "pagina scrollt horizontaal").toBe(false);
}

/** Wacht tot de kopregel van de vraag verandert: dan staat de volgende vraag op het scherm. */
async function naVolgendeVraag(page: Page, vorigeLabel: string) {
  await expect(page.locator(".qhead span").first()).not.toHaveText(vorigeLabel);
}

async function kopLabel(page: Page) {
  return (await page.locator(".qhead span").first().textContent()) ?? "";
}

test("volledige afname: alle antwoorden met reactietijd en versies opgeslagen", async ({ page }) => {
  await page.goto("/");
  await geenHorizontaleScroll(page);
  await page.getByRole("link", { name: "Start de demo-afname" }).click();

  await page.getByRole("button", { name: "Start" }).click();

  // Fase 1: intro, oefenronde, beeldkeuze
  await page.getByRole("button", { name: "Oefenronde" }).click();
  await geenHorizontaleScroll(page);
  await page.getByRole("button", { name: "Linker beeld" }).click();

  // Eerste item bewust laten verlopen: de time-out moet worden vastgelegd.
  let label = await kopLabel(page);
  expect(label).toContain("Fase 1 · 1 van");
  await naVolgendeVraag(page, label); // na 2 seconden zonder antwoord

  for (let i = 1; i < aantal("beeldkeuze"); i++) {
    label = await kopLabel(page);
    await page.getByRole("button", { name: i % 2 ? "Linker beeld" : "Rechter beeld" }).click();
    await naVolgendeVraag(page, label);
  }

  // Fase 2: stellingen en dilemma's
  await page.getByRole("button", { name: "Verder" }).click();
  const schaal = () => page.getByRole("group", { name: "Antwoordschaal" });
  for (let i = 0; i < aantal("likert"); i++) {
    label = await kopLabel(page);
    if (i === 0) {
      await geenHorizontaleScroll(page);
      await expect(page.getByRole("button", { name: "Vorige" })).toHaveCount(0); // niet terug naar de intro
    }
    if (i === 2) {
      // Terug naar stelling 2, het eerdere antwoord (2) staat gemarkeerd; wijzig naar 5.
      await page.getByRole("button", { name: "Vorige" }).click();
      await expect(page.locator(".qhead span").first()).toContainText("Stelling 2 van");
      await expect(schaal().getByRole("button", { name: "2", exact: true })).toHaveAttribute("aria-pressed", "true");
      await schaal().getByRole("button", { name: "5", exact: true }).click();
      await expect(page.locator(".qhead span").first()).toContainText("Stelling 3 van");
      // Nog een keer terug, en nu zonder wijziging verder.
      await page.getByRole("button", { name: "Vorige" }).click();
      await expect(schaal().getByRole("button", { name: "5", exact: true })).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Volgende" }).click();
      await expect(page.locator(".qhead span").first()).toContainText("Stelling 3 van");
    }
    await schaal().getByRole("button", { name: String((i % 5) + 1), exact: true }).click();
    await naVolgendeVraag(page, label);
  }
  for (let i = 0; i < aantal("dilemma"); i++) {
    label = await kopLabel(page);
    await page.locator(".optie").first().click();
    await naVolgendeVraag(page, label);
  }

  // Fase 3: vignetten onder druk
  await page.getByRole("button", { name: "Start fase 3" }).click();
  for (let i = 0; i < aantal("vignet"); i++) {
    label = await kopLabel(page);
    if (i === 0) await geenHorizontaleScroll(page);
    await page.locator(".optie").last().click();
    await naVolgendeVraag(page, label);
  }

  // Eindscherm
  await expect(page.getByRole("heading", { name: "Klaar" })).toBeVisible();
  await expect(page.getByTestId("aantal")).toHaveText(String(items.length));
  await expect(page.getByTestId("herzien")).toHaveText("1");
  await geenHorizontaleScroll(page);

  // Controle op de opgeslagen data (harde regel 10), ook na herladen
  await page.reload();
  const afnames = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith("lk.afname."))
      .map((k) => JSON.parse(localStorage.getItem(k)!)),
  );
  expect(afnames).toHaveLength(1);
  const a = afnames[0];
  expect(a.status).toBe("afgerond");
  expect(a.afgerond_op).toBeTruthy();
  expect(a.itemset_versie).toMatch(/^s1-[0-9a-f]{8}$/);
  expect(a.tijdslimieten).toBe(true);
  // Alle pogingen blijven bewaard: één stelling is herzien, dus één ruw antwoord extra.
  expect(a.antwoorden).toHaveLength(items.length + 1);
  const likertIds = items.filter((i) => i.format === "likert").map((i) => i.id);
  const tweede = a.antwoorden.filter((x: { item_id: string }) => x.item_id === likertIds[1]);
  expect(tweede.map((x: { waarde: string; poging: number }) => [x.waarde, x.poging])).toEqual([["2", 1], ["5", 2]]);

  // Het geldige antwoord per item is de laatste poging.
  const laatste = new Map<string, { item_id: string }>();
  for (const x of a.antwoorden) laatste.set(x.item_id, x);
  const geldig = [...laatste.values()];
  expect(geldig).toHaveLength(items.length);

  for (const antw of a.antwoorden) {
    const item = items.find((i) => i.id === antw.item_id)!;
    expect(item, `onbekend item ${antw.item_id}`).toBeTruthy();
    expect(antw.itemversie).toBe(item.versie);
    expect(antw.scoringsversie).toBe("1.0.0");
    expect(antw.getoonde_positie.length).toBeGreaterThanOrEqual(2);
    if (antw.time_out) {
      expect(antw.waarde).toBeNull();
      expect(antw.reactietijd_ms).toBeNull();
    } else {
      expect(antw.getoonde_positie).toContain(antw.waarde);
      expect(antw.gekozen_positie).toBe(antw.getoonde_positie.indexOf(antw.waarde));
      expect(antw.reactietijd_ms).toBeGreaterThan(0);
      if (antw.tijdslimiet_ms) expect(antw.reactietijd_ms).toBeLessThan(antw.tijdslimiet_ms);
    }
  }

  // Het eerste reflexitem verliep; de andere niet.
  const r1 = a.antwoorden.find((x: { item_id: string }) => x.item_id === items[0].id);
  expect(r1.time_out).toBe(true);
  expect(a.antwoorden.filter((x: { time_out: boolean }) => x.time_out)).toHaveLength(1);

  // De volgorde van de geldige antwoorden volgt de volgorde van het register.
  expect(geldig.map((x) => x.item_id)).toEqual(items.map((i) => i.id));
});

test("afname zonder tijdslimieten: geen time-out en geen tijdslimiet in de data", async ({ page }) => {
  await page.goto("/test");
  await page.getByLabel("Zonder tijdslimieten").check();
  await expect(page.getByText("Kies binnen 2 seconden")).toHaveCount(0);
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Oefenronde" }).click();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page.getByRole("button", { name: "Linker beeld" }).click();

  // Langer wachten dan de normale limiet van 2 seconden: de vraag blijft staan.
  const label = await kopLabel(page);
  await page.waitForTimeout(3000);
  await expect(page.locator(".qhead span").first()).toHaveText(label);
  await page.getByRole("button", { name: "Rechter beeld" }).click();
  await naVolgendeVraag(page, label);

  const a = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("lk.afname."))!;
    return JSON.parse(localStorage.getItem(k)!);
  });
  expect(a.tijdslimieten).toBe(false);
  expect(a.antwoorden[0].time_out).toBe(false);
  expect(a.antwoorden[0].tijdslimiet_ms).toBeNull();
  expect(a.antwoorden[0].reactietijd_ms).toBeGreaterThan(3000);
});

test("tikken na het verstrijken van de tijd overschrijft de time-out niet", async ({ page }) => {
  await page.goto("/test");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Oefenronde" }).click();
  await page.getByRole("button", { name: "Linker beeld" }).click();
  const label = await kopLabel(page);
  await naVolgendeVraag(page, label);
  // Direct na de time-out snel twee keer tikken op het volgende item
  await page.getByRole("button", { name: "Linker beeld" }).click();
  await page.getByRole("button", { name: "Linker beeld" }).click({ trial: true }).catch(() => {});
  const a = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("lk.afname."))!;
    return JSON.parse(localStorage.getItem(k)!);
  });
  expect(a.antwoorden[0].time_out).toBe(true);
  expect(new Set(a.antwoorden.map((x: { item_id: string }) => x.item_id)).size).toBe(a.antwoorden.length);
});
