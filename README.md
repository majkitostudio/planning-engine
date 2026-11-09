# Plánovací Engine

Nekomerční ukázková aplikace pro tvorbu měsíčního rozpisu směn. Projekt má fungující technický základ, ale plánovací kvalita ani produkční provoz nejsou potvrzené.

## Aktuální směr

Rozhodnutí z 9. 11. 2026: vrátit OR-Tools jako hlavní solver. Zatím jde o rozhodnutí a plán práce, ne o hotovou implementaci. Měsíční návrh dnes používá Cloudflare Workers AI; návrat solveru musí zachovat nezávislou kontrolu návrhu a výslovné potvrzení manažerem.

- [Mapa projektu a jeho historie](docs/PROJECT_MAP.md)
- [Plán výměny solveru](docs/SOLVER_REPLACEMENT_PLAN.md)
- [Pracovní pravidla projektu](AGENTS.md)

## Lokální spuštění

```bash
npm install
npm run dev
```

Dostupné příkazy pro lint, typovou kontrolu, testy, build a kontrolu databázového schématu jsou v `package.json`. Produkční databázi ani služby nepoužívej bez výslovného potvrzení podle `AGENTS.md`.
