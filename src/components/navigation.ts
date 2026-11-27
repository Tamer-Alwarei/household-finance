export interface Route {
  path: string;
  label: string;
  icon: string;
  render: (container: HTMLElement) => void;
}

export function renderNavigation(list: HTMLElement, routes: Route[], activePath: string): void {
  list.innerHTML = routes
    .map(
      (r) => `<li class="nav-item">
        <a class="nav-link ${r.path === activePath ? 'active' : ''}" href="#/${r.path}"
           ${r.path === activePath ? 'aria-current="page"' : ''}>
          <i class="bi bi-${r.icon} me-2"></i>${r.label}
        </a></li>`,
    )
    .join('');
}
