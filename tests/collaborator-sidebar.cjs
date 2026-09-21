const fs = require('node:fs');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('runtime/colaboradores.html', 'utf8');
const script = fs.readFileSync('colaborador/sidebar.js', 'utf8');

function setup(width, saved, blocked = false) {
  const dom = new JSDOM(html, { url: 'https://example.test/colaboradores/', runScripts: 'outside-only' });
  const w = dom.window, d = w.document, queries = [];
  w.matchMedia = query => {
    const limit = Number(query.match(/\d+/)[0]);
    const media = { matches: width <= limit, addEventListener: (_, fn) => media.change = fn, limit };
    queries.push(media);
    return media;
  };
  if (saved) w.localStorage.setItem('ca-collaborator-sidebar', saved);
  if (blocked) Object.defineProperty(w, 'localStorage', { get() { throw Error('Storage disabled'); } });
  d.getElementById('portal-view').hidden = false;
  w.eval(script);
  return {
    w, d, shell: d.getElementById('portal-view'),
    click: id => d.getElementById(id).click(),
    resize(next) { for (const m of queries) { const changed = m.matches !== (next <= m.limit); m.matches = next <= m.limit; if (changed) m.change(); } },
    flush: () => new Promise(resolve => w.setTimeout(resolve, 0)),
    close: () => w.close(),
  };
}

(async () => {
  const desktop = setup(1440);
  assert.equal(desktop.shell.dataset.sidebar, 'expanded');
  desktop.click('sidebar-toggle');
  assert.equal(desktop.shell.dataset.sidebar, 'collapsed');
  assert.equal(desktop.w.localStorage.getItem('ca-collaborator-sidebar'), 'collapsed');
  assert.equal(desktop.d.getElementById('sidebar-toggle').getAttribute('aria-label'), 'Expandir menú');
  desktop.d.querySelector('.sidebar [data-page="guia"]').focus();
  assert.equal(desktop.d.getElementById('portal-nav-tooltip').hidden, false);
  assert.equal(desktop.d.getElementById('portal-nav-tooltip').textContent, 'Información / Guía');
  desktop.resize(390);
  assert.equal(desktop.d.getElementById('portal-sidebar').inert, true);
  desktop.click('sidebar-mobile-toggle');
  assert.equal(desktop.d.querySelector('.portal-main').inert, true);
  assert.equal(desktop.d.getElementById('portal-sidebar').getAttribute('aria-modal'), 'true');
  // Guide uses a capture listener that stops propagation in the existing portal.
  const guide = desktop.d.querySelector('.sidebar [data-page="guia"]');
  guide.addEventListener('click', event => {
    event.stopImmediatePropagation();
    desktop.d.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === 'guia'));
  }, true);
  guide.click();
  await desktop.flush();
  assert.equal(desktop.d.getElementById('sidebar-mobile-toggle').getAttribute('aria-expanded'), 'false');
  assert.equal(desktop.d.querySelector('.portal-main').inert, false);
  assert.equal(guide.getAttribute('aria-current'), 'page');
  assert.equal(desktop.d.querySelector('.sidebar [data-page="inicio"]').hasAttribute('aria-current'), false);
  desktop.click('sidebar-mobile-toggle');
  desktop.d.dispatchEvent(new desktop.w.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(desktop.d.activeElement.id, 'sidebar-mobile-toggle');
  desktop.click('sidebar-mobile-toggle');
  desktop.shell.hidden = true;
  await desktop.flush();
  assert.equal(desktop.d.body.classList.contains('portal-menu-open'), false);
  desktop.resize(1440);
  assert.equal(desktop.shell.dataset.sidebar, 'collapsed', 'Mobile does not overwrite the desktop preference');
  desktop.close();

  for (const [width, saved, expected] of [[1440, 'collapsed', 'collapsed'], [900, null, 'collapsed'], [900, 'expanded', 'expanded']]) {
    const portal = setup(width, saved);
    assert.equal(portal.shell.dataset.sidebar, expected);
    portal.close();
  }
  const blocked = setup(1440, null, true);
  blocked.click('sidebar-toggle');
  assert.equal(blocked.shell.dataset.sidebar, 'collapsed', 'Menu still works when storage is unavailable');
  blocked.close();
  console.log('PASS: collaborator sidebar preference, responsive drawer, focus return, Guide capture navigation, aria-current and disabled storage.');
})().catch(error => { console.error(error); process.exitCode = 1; });
