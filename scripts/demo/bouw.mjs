/**
 * Bouwt dist/demo.html: één zelfstandig HTML-bestand met de echte afname (React, testmotor, itemregister, huisstijl).
 * Gebruik: npm run demo
 *
 * Het lettertype Cardo wordt ingesloten vanuit @fontsource/cardo, zodat de demo geen externe bronnen laadt.
 */
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const wortel = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const uit = resolve(wortel, "dist/demo.html");

const js = await build({
  entryPoints: [resolve(wortel, "scripts/demo/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  tsconfig: resolve(wortel, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
  write: false,
});

async function lettertype(gewicht) {
  const pad = resolve(wortel, `node_modules/@fontsource/cardo/files/cardo-latin-${gewicht}-normal.woff2`);
  const data = (await readFile(pad)).toString("base64");
  return `@font-face{font-family:"Cardo";font-style:normal;font-weight:${gewicht};font-display:swap;src:url(data:font/woff2;base64,${data}) format("woff2")}`;
}

const css = (await readFile(resolve(wortel, "src/app/globals.css"), "utf8")) + (await lettertype(400)) + (await lettertype(700));
const script = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<title>Leiderschapskompas demo</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="app"></div>
<script>${script}</script>
`;

await mkdir(dirname(uit), { recursive: true });
await writeFile(uit, html);
console.log(`Demo gebouwd: ${uit} (${Math.round(html.length / 1024)} kB)`);
