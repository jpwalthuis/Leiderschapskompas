import { defineConfig, devices } from "@playwright/test";

const POORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${POORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "telefoon", use: { ...devices["Pixel 7"] } },
    {
      // Benadering van een opengevouwen vouwtelefoon: bijna vierkant scherm met aanraakbediening.
      name: "vouwtelefoon-open",
      use: { ...devices["Pixel 7"], viewport: { width: 900, height: 1000 } },
    },
  ],
  webServer: {
    command: `npm run start -- -p ${POORT}`,
    url: `http://localhost:${POORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
