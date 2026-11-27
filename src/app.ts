import { dataManager } from './data/dataManager.js';
import { renderNavigation, type Route } from './components/navigation.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactions } from './pages/transactions.js';
import { renderRecurringBills } from './pages/recurringBills.js';
import { renderPaymentCalendar } from './pages/paymentCalendar.js';
import { renderMonthlyBudget } from './pages/monthlyBudget.js';
import { renderAnnualBudget } from './pages/annualBudget.js';
import { renderSavings, renderSinkingFunds } from './pages/savings.js';
import { renderSettlements } from './pages/settlements.js';
import { renderDebts } from './pages/debts.js';
import { renderForecasts } from './pages/forecasts.js';
import { renderReports } from './pages/reports.js';
import { renderSettings } from './pages/settings.js';

const routes: Route[] = [
  { path: 'dashboard', label: 'Dashboard', icon: 'speedometer2', render: renderDashboard },
  { path: 'transactions', label: 'Transactions', icon: 'list-ul', render: renderTransactions },
  { path: 'recurring', label: 'Recurring Bills', icon: 'arrow-repeat', render: renderRecurringBills },
  { path: 'calendar', label: 'Payment Calendar', icon: 'calendar3', render: renderPaymentCalendar },
  { path: 'monthly', label: 'Monthly Budget', icon: 'pie-chart', render: renderMonthlyBudget },
  { path: 'annual', label: 'Annual Budget', icon: 'bar-chart', render: renderAnnualBudget },
  { path: 'savings', label: 'Savings', icon: 'piggy-bank', render: renderSavings },
  { path: 'sinking', label: 'Sinking Funds', icon: 'safe', render: renderSinkingFunds },
  { path: 'settlements', label: 'Settlements', icon: 'people', render: renderSettlements },
  { path: 'debts', label: 'Debts', icon: 'bank', render: renderDebts },
  { path: 'forecasts', label: 'Forecasts', icon: 'graph-up-arrow', render: renderForecasts },
  { path: 'reports', label: 'Reports', icon: 'file-earmark-bar-graph', render: renderReports },
  { path: 'settings', label: 'Settings', icon: 'gear', render: renderSettings },
];

const app = document.getElementById('app')!;
const navList = document.getElementById('nav-list')!;
const lastSaved = document.getElementById('last-saved')!;

function currentRoute(): Route {
  const path = location.hash.replace(/^#\//, '') || 'dashboard';
  return routes.find((r) => r.path === path) ?? routes[0];
}

function render(): void {
  const route = currentRoute();
  renderNavigation(navList, routes, route.path);
  // Pages attach their own delegated handlers; clear the previous page's first.
  app.onclick = null;
  app.onchange = null;
  route.render(app);
  document.title = `${route.label} - Household Finance`;
  const ts = dataManager.data.lastSaved;
  lastSaved.textContent = dataManager.lastError ?? (ts ? `Saved ${new Date(ts).toLocaleTimeString()}` : '');
  lastSaved.classList.toggle('text-danger', !!dataManager.lastError);
}

function closeMobileMenu(): void {
  const el = document.getElementById('sidebar')!;
  // Only the offcanvas (below lg) needs closing; on desktop this is a no-op.
  const bs = (window as any).bootstrap;
  bs?.Offcanvas.getInstance(el)?.hide();
}

window.addEventListener('hashchange', () => {
  closeMobileMenu();
  render();
});
dataManager.onChange(render);
render();
