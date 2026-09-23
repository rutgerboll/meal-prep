// ── Helpers ───────────────────────────────────────────────────────────────────
function showToast(msg, duration=2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function confirm(title, msg, okLabel='OK') {
  return new Promise(res => {
    document.getElementById('conf-title').textContent = title;
    document.getElementById('conf-msg').textContent = msg;
    document.getElementById('conf-ok').textContent = okLabel;
    document.getElementById('confirm-ov').classList.remove('hidden');
    const ok = document.getElementById('conf-ok');
    const cancel = document.getElementById('conf-cancel');
    const done = v => {
      document.getElementById('confirm-ov').classList.add('hidden');
      ok.onclick = null; cancel.onclick = null;
      res(v);
    };
    ok.onclick = () => done(true);
    cancel.onclick = () => done(false);
  });
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

function getAvatarColor(tags) {
  if (tags.includes('beef')) return '#7C2D12';
  if (tags.includes('chicken')) return '#78350F';
  if (tags.includes('turkey')) return '#713F12';
  if (tags.includes('italian')) return '#6B2D32';
  if (tags.includes('thai')) return '#14532D';
  if (tags.includes('indian')) return '#78350F';
  if (tags.includes('mediterranean') || tags.includes('greek')) return '#1E3A5F';
  return '#292524';
}

function fmtStars(n) {
  if (!n) return '–';
  return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
}

function isLikelyFreezer(entry, plan) {
  if (entry.meal !== 'dinner') return false;
  const same = plan.entries.filter(e => e.recipeId === entry.recipeId && e.meal === 'dinner');
  if (same.length < 2) return false;
  const sorted = [...same].sort((a,b) => (a.dayDate||'').localeCompare(b.dayDate||''));
  const idx = sorted.findIndex(e => e.dayDate === entry.dayDate && e.dayLabel === entry.dayLabel);
  return idx > 0;
}


// ── Render engine ─────────────────────────────────────────────────────────────
function navigate(route) {
  state.prevRoute = state.activeRoute;
  state.activeRoute = route;
  render();
  window.scrollTo(0,0);
}

function render() {
  const app = document.getElementById('app');
  const route = state.activeRoute;

  // Determine active tab
  const tabMap = {'#/plan':0,'#/recipes':1,'#/list':2,'#/cook':3,'#/more':4};
  let activeTab = 0;
  for (const [prefix, idx] of Object.entries(tabMap)) {
    if (route.startsWith(prefix)) activeTab = idx;
  }

  const _prevScreen = app.querySelector('.screen');
  const _prevScroll = _prevScreen ? _prevScreen.scrollTop : 0;
  const _sameRoute = (state._renderedRoute === route);
  app.innerHTML = '';

  // Screen
  const screenEl = document.createElement('div');
  screenEl.className = 'screen';

  if (route === '#/plan') screenEl.innerHTML = renderPlanScreen();
  else if (route === '#/plan/draft') screenEl.innerHTML = renderDraftPlanScreen();
  else if (route === '#/plan/build') screenEl.innerHTML = renderPlanBuilder();
  else if (route === '#/more/sync') screenEl.innerHTML = renderSyncScreen();
  else if (route === '#/more/inventory') screenEl.innerHTML = renderInventoryScreen();
  else if (route.startsWith('#/recipes/new') || route.startsWith('#/recipes/edit/')) screenEl.innerHTML = renderCapture();
  else if (route.startsWith('#/recipes/') && route !== '#/recipes/') screenEl.innerHTML = renderRecipeDetail(route.split('/')[2]);
  else if (route === '#/recipes') screenEl.innerHTML = renderRecipesScreen();
  else if (route === '#/list') screenEl.innerHTML = renderListScreen();
  else if (route === '#/cook') screenEl.innerHTML = renderCookScreen();
  else if (route === '#/more') screenEl.innerHTML = renderMoreScreen();
  else if (route === '#/more/prefs') screenEl.innerHTML = renderPrefsScreen();
  else if (route === '#/more/pantry') screenEl.innerHTML = renderPantryScreen();
  else if (route === '#/more/units') screenEl.innerHTML = renderUnitsScreen();
  else if (route === '#/more/backup') screenEl.innerHTML = renderBackupScreen();
  else if (route === '#/more/backlog') screenEl.innerHTML = renderBacklogScreen();
  else screenEl.innerHTML = renderPlanScreen();

  app.appendChild(screenEl);
  if (_sameRoute) screenEl.scrollTop = _prevScroll;
  state._renderedRoute = route;

  // Bottom Nav
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.innerHTML = `
    <button class="nt ${activeTab===0?'active':''}" onclick="navigate('#/plan')">
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <span class="nl">Plan</span>
    </button>
    <button class="nt ${activeTab===1?'active':''}" onclick="navigate('#/recipes')">
      <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <span class="nl">Recipes</span>
    </button>
    <button class="nt ${activeTab===2?'active':''}" onclick="navigate('#/list')">
      <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/></svg>
      <span class="nl">List</span>
    </button>
    <button class="nt ${activeTab===3?'active':''}" onclick="navigate('#/cook')">
      <svg viewBox="0 0 24 24"><path d="M6 2v6"/><path d="M18 2v6"/><path d="M6 8c0 0 0 4 6 4s6-4 6-4"/><path d="M12 12v6"/><path d="M8 18h8"/></svg>
      <span class="nl">Cook</span>
    </button>
    <button class="nt ${activeTab===4?'active':''}" onclick="navigate('#/more')">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
      <span class="nl">More</span>
    </button>`;
  app.appendChild(nav);

  // Attach events after render
  setTimeout(attachEvents, 0);
}
