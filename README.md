# Leiderschapskompas

Persoonlijkheidstest voor coaches: persoonlijkheid, leiderschap en drijfveren, gemeten met onderbouwde kaders en een experimentele reflexmeting.

- `CLAUDE.md`: harde regels en werkwijze voor ontwikkeling.
- `docs/bouwplan.md`: fasen en volgorde.
- `docs/datamodel.md`: tabellen, rollen en privacy.
- `docs/beslissingen.md`: genomen besluiten.
- `content/itemregister.json`: alle vragen met verantwoording.
- `prototype/leiderschapskompas.html`: klikbaar prototype, open in een browser.

Status: prototype. De vragen zijn nog niet psychometrisch getoetst.

## Lokaal draaien

```bash
npm ci
npm run dev      # ontwikkelserver op http://localhost:3000
npm run check    # lint, typen en tests
npm run build    # productiebuild
```

CI draait dezelfde controles op elke pull request.
