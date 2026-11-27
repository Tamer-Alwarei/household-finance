# Household Finance Manager

A learning project: a local-first household budget app built with **TypeScript + vanilla JS (ES modules) + Bootstrap 5**, with no frontend framework and no backend.

Source of truth for the requirements: `../Household_Finance_Manager_Master_Prompt.docx`.

## Goals (summary of the spec)

- One **combined** household budget for two people (default 50/50 sharing, editable). Default currency DKK, configurable.
- Data stored as versioned JSON in LocalStorage, behind a storage adapter so it can move to IndexedDB later.
- Works offline: Bootstrap is vendored into `vendor/`, no CDNs.
- Financial rules: payer is not the same as responsible person, each record is counted once, settlements and transfers are not income or expenses, forecasts are not actuals.
- Full feature list: transactions, recurring bills, payment calendar, monthly and annual budgets, savings, sinking funds, settlements, debts, forecasts, reports, backup/restore.

## Build phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Structure, Bootstrap shell, JSON model, LocalStorage, settings, people, categories | Done |
| 2 | Transactions, income, sharing, settlements | Done (income is a transaction type) |
| 3 | Recurring bills, payment calendar | Done (price history, mark paid, no duplicates) |
| 4 | Monthly/annual budgets, rollover | Done (overrides, copy month, reset/carry-unused/carry-both) |
| 5 | Savings goals, sinking funds, debts | Done. Payment accounts not implemented |
| 6 | Charts, comparisons, 12-month forecast | Done (Chart.js, in-memory scenarios) |
| 7 | Reports | Done. Reconciliation, snapshots and audit log not implemented |
| 8 | Backup/restore, migrations, tests | Done (JSON export/import with validation, pre-restore copy, 59 tests) |

### Known limitations

Payment accounts, reconciliation/monthly closing, snapshots/audit log, separate Income and Categories pages (categories live in Settings), browser notifications, saved views and multi-column sorting.
## Responsive design (Bootstrap breakpoints)

| Breakpoint | Width | Behaviour |
|------------|-------|-----------|
| default | <576px | Burger menu opens the sidebar as an offcanvas drawer; stat cards one per row |
| `sm` | ≥576px | Stat cards two per row |
| `md` | ≥768px | Category column shown in tables; larger stat numbers |
| `lg` | ≥992px | Sidebar fixed beside content; four stat cards per row; "Paid by" column shown |
| `xl` | ≥1200px | Budget vs actual and Who-paid-what side by side |

## Structure

```
index.html            App shell (top bar, sidebar, #app container)
src/                  TypeScript source (compiled to assets/js)
  app.ts              Hash router (13 routes) and bootstrapping
  models/types.ts     Data types
  data/               storage, dataManager, defaults/demo data, migration/import validation
  services/           calculation, budget, recurring, settlement, savings, forecast,
                      report, alert, validation (pure, UI independent, tested)
  components/         navigation, modal, confirmationDialog, formModal, charts, ui
  pages/              dashboard, transactions, recurringBills, paymentCalendar, monthlyBudget,
                      annualBudget, savings (+sinking funds), settlements, debts, forecasts,
                      reports, settings
  utils/              format, dateUtils, idGenerator
tests/                node:test logic tests plus jsdom page smoke tests
assets/css/main.css   Custom styles on top of Bootstrap
assets/js/            Compiled output (generated, do not edit)
vendor/               Bootstrap, icons, Chart.js copied from node_modules (generated)
scripts/vendor.mjs    Copies vendor files
```
## Run

```
npm install
npm run vendor     # copy Bootstrap into vendor/ (once)
npm run build      # compile TypeScript (or `npm run watch`)
npm start          # http://localhost:8123
npm test           # build, then run all tests
```

Do not open `index.html` via `file://`. ES modules need a server.

## Notes

- LocalStorage is per browser profile; clearing browser data deletes it. Use JSON backup (Settings) to move data between machines.
- Demo records have ids starting with `demo-` and can be removed from the Dashboard without touching real data.
