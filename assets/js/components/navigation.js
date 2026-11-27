export function renderNavigation(list, routes, activePath) {
    list.innerHTML = routes
        .map((r) => `<li class="nav-item">
        <a class="nav-link ${r.path === activePath ? 'active' : ''}" href="#/${r.path}"
           ${r.path === activePath ? 'aria-current="page"' : ''}>
          <i class="bi bi-${r.icon} me-2"></i>${r.label}
        </a></li>`)
        .join('');
}
//# sourceMappingURL=navigation.js.map