import { expect, test, type Page } from "@playwright/test";

/** De pagina mag nooit horizontaal scrollen (harde regel 18). */
async function geenHorizontaleScroll(page: Page) {
  const breed = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(breed, "pagina scrollt horizontaal").toBe(false);
}

async function openVoorbeeld(page: Page) {
  await page.goto("/test");
  await page.getByRole("button", { name: "Bekijk een voorbeeldrapport" }).click();
  await expect(page.getByRole("heading", { name: "Jouw leiderschapsprofiel" })).toBeVisible();
}

for (const schema of ["light", "dark"] as const) {
  test.describe(`rapport, ${schema === "light" ? "licht" : "donker"} thema`, () => {
    test.use({ colorScheme: schema });

    test("deelnemerrapport toont alle onderdelen", async ({ page }) => {
      await openVoorbeeld(page);
      await expect(page.getByText("Voorbeeldrapport met verzonnen antwoorden")).toBeVisible();
      for (const kop of [
        "In het kort", "Daadkracht en verbinding", "Waar je energie van krijgt en waar je die verliest", "Ratio, gevoel, intuïtie en realisme",
        "Wat voor jou zwaarder weegt", "In rust en onder druk", "Archetypische beelden", "Wat dit rapport niet zegt",
      ]) await expect(page.getByRole("heading", { name: kop, exact: true })).toBeVisible();
      // Regel 5: reflex staat naast daadkracht, gemarkeerd als experimenteel.
      const gerichtheid = page.locator('[data-sectie="gerichtheid"]');
      await expect(gerichtheid.getByRole("meter", { name: "Daadkracht", exact: true })).toHaveAttribute("aria-valuenow", "75");
      await expect(gerichtheid.getByRole("meter", { name: "Reflex: daadkracht, experimenteel" })).toBeVisible();
      // Regel 3: archetypen als duiding.
      await expect(page.locator('[data-sectie="archetypen"]').getByText("Duiding, geen meting")).toBeVisible();
      await expect(page.locator('[data-sectie="archetypen"] [data-kaart]')).toHaveCount(4);
      // Kaartfoto's laden echt.
      const geladen = await page.locator('[data-sectie="archetypen"] img').evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));
      expect(geladen).toEqual([true, true, true, true]);
      // Diagrammen.
      await expect(page.locator('[data-sectie="denken"] .diagram-kompas svg')).toHaveAttribute("aria-label", /Ratio 75, Intuïtie 75, Gevoel 50, Realisme 25/);
      await expect(page.locator('[data-sectie="gerichtheid"] .diagram-positie')).toBeVisible();
      await expect(page.locator('[data-sectie="drijfveren"] .waarde-vak[data-eerste]')).toContainText("Vrijheid en vernieuwing");
      await expect(page.locator('[data-sectie="conflict"] .drukverloop .druk-stip.meest')).toHaveCount(4);
      await expect(page.getByRole("heading", { name: "Wat dit zou kunnen betekenen" }).first()).toBeVisible();
      await geenHorizontaleScroll(page);
    });

    test("coachrapport toont kerngetallen, kwaliteit, gespreksvragen en bewijsniveaus", async ({ page }) => {
      await openVoorbeeld(page);
      await page.getByRole("tab", { name: "Coach" }).click();
      await expect(page.getByRole("tab", { name: "Coach" })).toHaveAttribute("aria-selected", "true");
      for (const kop of ["Leeswijzer voor de coach", "Kompas: ratio, gevoel, intuïtie en realisme", "Kerngetallen", "Kwaliteit van de afname", "Gespreksvragen voor de debrief", "Bewijsniveaus", "Interpretatieregels", "Verantwoording"]) {
        await expect(page.getByRole("heading", { name: kop, exact: true })).toBeVisible();
      }
      // Dezelfde diagrammen als de deelnemer, boven de tabellen.
      for (const [sectie, diagram] of [["kerngetallen", ".diagram-positie"], ["kompas", ".diagram-kompas"], ["behoeften", ".diagram-balans"], ["druk", ".drukverloop"], ["waarden", ".waardencirkel"]]) {
        await expect(page.locator(`[data-sectie="${sectie}"] ${diagram}`), sectie).toBeVisible();
      }
      const bewijs = page.locator('[data-sectie="bewijs"]');
      await expect(bewijs.locator('tr[data-gebruik="duiding"]')).toContainText("Kaartenoefening");
      await expect(bewijs.locator('tr[data-gebruik="indicatie"]')).toContainText("Reflexindicatie");
      // Uitleg per onderdeel, uitklapbaar.
      const uitleg = page.locator('[data-sectie="behoeften"] details.toelichting');
      await expect(uitleg.getByText("zelfdeterminatietheorie")).toBeHidden();
      await uitleg.getByText("Wat betekent dit onderdeel?").click();
      await expect(uitleg.getByText(/zelfdeterminatietheorie/)).toBeVisible();
      await geenHorizontaleScroll(page);
    });
  });
}

test("terug vanuit het voorbeeldrapport naar het welkomstscherm", async ({ page }) => {
  await openVoorbeeld(page);
  await page.getByRole("button", { name: "Terug" }).click();
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
});
