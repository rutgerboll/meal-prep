// ── Event handlers ────────────────────────────────────────────────────────────
async function toggleCooked(planIdx) {
  const plan = getActivePlan();
  if (!plan) return;
  plan.entries[planIdx].cooked = !plan.entries[planIdx].cooked;
  await dbPut('mealPlans', {...plan, _key:plan.id});
  render();
}
// Checking off a dinner on the Cook tab marks it cooked AND opens the rating sheet.
async function dismissRuleWarnings() {
  const plan = getActivePlan();
  if (!plan) return;
  plan.entries.forEach(e=>e.ruleWarningDismissed=true);
  await dbPut('mealPlans', {...plan, _key:plan.id});
  render();
}

function attachEvents() {
  // keyboard handling for search — already handled inline
}

// ── Boot ──────────────────────────────────────────────────────────────────────
function applyTheme() {
  let pref = (state.preferences && state.preferences.theme);
  if (!['auto','light','dark'].includes(pref)) pref = 'dark';
  let dark;
  if (pref === 'dark') dark = true;
  else if (pref === 'light') dark = false;
  else dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.dataset.theme = 'dark';
  else document.documentElement.removeAttribute('data-theme');
}
async function setTheme(t) {
  state.preferences.theme = t;
  await dbPut('preferences', {...state.preferences, _key:'singleton'});
  applyTheme();
  render();
  showToast(t === 'auto' ? 'Follows your phone' : (t === 'dark' ? 'Dark theme' : 'Light theme'));
}

async function boot() {
  try {
    await openDB();
    const meta = await dbGet('meta','singleton');
    if (!meta || !meta.seededAt) {
      await seedDB();
    }
    await loadState();
    await ensureIngredientStock();
    applyTheme();
    if (window.matchMedia) { try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{ if (((state.preferences&&state.preferences.theme)||'auto')==='auto'){ applyTheme(); render(); } }); } catch(e){} }
    if (syncAuto() && (syncUrl() || (typeof location!=='undefined' && location.protocol && location.protocol.startsWith('http')))) { doSync({silent:true}); }
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    render();
  } catch(err) {
    console.error('Boot error:', err);
    document.getElementById('loading').innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px">
      <div style="font-size:48px">⚠</div>
      <div style="font-size:20px;font-weight:700;margin:16px 0">Failed to load</div>
      <div style="font-size:13px;color:var(--text3)">${err.message}</div>
      <button class="btn-s" style="margin-top:20px" onclick="location.reload()">Retry</button>
    </div>`;
  }
}

