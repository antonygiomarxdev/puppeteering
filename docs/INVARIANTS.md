# Invariants

What must always hold across the product. Every row names an executable check; a row in prose only fails.

| ID | Rule | Owner FRD | Check |
|---|---|---|---|
| INV-1 | The puppet-monitor plugin version equals `version` in `office-app/package.json` | none yet (FRD MONITOR not written) | `npm --prefix office-app test` (`office-app/src/version.test.ts` fails when they differ) |
