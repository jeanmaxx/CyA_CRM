/* Portal navigation appearance; authentication and data flows stay in app.js. */
(function () {
  const shell = document.getElementById('portal-view');
  const sidebar = document.getElementById('portal-sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const mobileToggle = document.getElementById('sidebar-mobile-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!shell || !sidebar || !toggle || !mobileToggle || !backdrop) return;

  const key = 'ca-collaborator-sidebar';
  const mobile = window.matchMedia('(max-width:780px)');
  const tablet = window.matchMedia('(max-width:980px)');
  const main = shell.querySelector('.portal-main');
  const mobileNav = shell.querySelector('.mobile-nav');
  let preference;
  try { preference = localStorage.getItem(key); } catch (_) { /* Storage can be disabled. */ }
  let collapsed = preference === 'collapsed' || (preference !== 'expanded' && tablet.matches);
  let drawerOpen = false;

  const tooltip = document.createElement('div');
  tooltip.id = 'portal-nav-tooltip';
  tooltip.className = 'sidebar-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.appendChild(tooltip);
  let tooltipTarget;
  function hideTooltip() {
    tooltip.hidden = true;
    tooltipTarget?.removeAttribute('aria-describedby');
    tooltipTarget = null;
  }
  function showTooltip(button) {
    hideTooltip();
    if (mobile.matches || !collapsed || shell.hidden) return;
    tooltipTarget = button;
    tooltip.textContent = button.getAttribute('aria-label');
    button.setAttribute('aria-describedby', tooltip.id);
    tooltip.hidden = false;
    const rect = button.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 10}px`;
    tooltip.style.top = `${Math.max(8, Math.min(innerHeight - tooltip.offsetHeight - 8, rect.top + (rect.height - tooltip.offsetHeight) / 2))}px`;
  }

  function sync() {
    hideTooltip();
    shell.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
    shell.classList.toggle('sidebar-open', drawerOpen);
    const label = collapsed ? 'Expandir menú' : 'Contraer menú';
    toggle.setAttribute('aria-label', mobile.matches ? 'Cerrar menú' : label);
    toggle.title = toggle.getAttribute('aria-label');
    toggle.setAttribute('aria-expanded', String(mobile.matches ? drawerOpen : !collapsed));
    mobileToggle.setAttribute('aria-expanded', String(drawerOpen));
    backdrop.hidden = !drawerOpen;
    sidebar.inert = mobile.matches && !drawerOpen;
    main.inert = drawerOpen;
    if (mobileNav) mobileNav.inert = drawerOpen;
    document.body.classList.toggle('portal-menu-open', drawerOpen);
    if (drawerOpen) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
    }
  }
  function closeDrawer(restoreFocus = true) {
    const wasOpen = drawerOpen;
    drawerOpen = false;
    sync();
    if (wasOpen && restoreFocus && !shell.hidden) mobileToggle.focus();
  }
  toggle.addEventListener('click', () => {
    if (mobile.matches) return closeDrawer();
    collapsed = !collapsed;
    preference = collapsed ? 'collapsed' : 'expanded';
    try { localStorage.setItem(key, preference); } catch (_) { /* Still works for this visit. */ }
    sync();
  });
  mobileToggle.addEventListener('click', () => {
    drawerOpen = !drawerOpen;
    sync();
    if (drawerOpen) toggle.focus();
  });
  backdrop.addEventListener('click', () => closeDrawer());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      hideTooltip();
      if (drawerOpen) { event.preventDefault(); closeDrawer(); }
    }
    if (event.key !== 'Tab' || !drawerOpen) return;
    const buttons = [...sidebar.querySelectorAll('button:not([disabled])')].filter(el => el.getClientRects().length);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });

  // Observe the existing navigation state, including the Guide's capture listener.
  // This also covers navigation triggered by dashboard buttons or later phases.
  function syncCurrentPage() {
    shell.querySelectorAll('[data-page]').forEach(button => {
      if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  const navObserver = new MutationObserver(syncCurrentPage);
  shell.querySelectorAll('.sidebar-nav [data-page], .mobile-nav [data-page]').forEach(button => {
    navObserver.observe(button, { attributes: true, attributeFilter: ['class'] });
  });
  sidebar.querySelectorAll('[data-page]').forEach(button => {
    button.addEventListener('mouseenter', () => showTooltip(button));
    button.addEventListener('mouseleave', hideTooltip);
    button.addEventListener('focus', () => showTooltip(button));
    button.addEventListener('blur', hideTooltip);
  });
  // Capture at the sidebar before phase-specific listeners stop propagation.
  sidebar.addEventListener('click', event => {
    if (event.target.closest('[data-page], #logout-btn')) closeDrawer();
  }, true);
  const visibilityObserver = new MutationObserver(() => {
    if (shell.hidden) closeDrawer(false);
  });
  visibilityObserver.observe(shell, { attributes: true, attributeFilter: ['hidden'] });
  function resize() {
    const focusedInSidebar = sidebar.contains(document.activeElement);
    drawerOpen = false;
    if (preference !== 'expanded' && preference !== 'collapsed') collapsed = tablet.matches;
    sync();
    if (!shell.hidden && mobile.matches && focusedInSidebar) mobileToggle.focus();
    else if (!shell.hidden && !mobile.matches && document.activeElement === mobileToggle) toggle.focus();
  }
  mobile.addEventListener('change', resize);
  tablet.addEventListener('change', resize);
  window.addEventListener('resize', hideTooltip);
  sidebar.addEventListener('scroll', hideTooltip);
  sync();
  syncCurrentPage();
})();
