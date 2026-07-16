// ── Cook screen (unified meal-slot, Sage handoff) ─────────────────────────────
/* =====================================================================
   COOK SCREEN — unified meal-slot (Sage)
   Drop-in replacement for the Cook tab. Vanilla JS, no deps.
   Pairs with handoff/sage.css.

   HOW TO INSTALL
   1. Paste this whole file into the app's <script>, AFTER the existing
      helpers (getActivePlan, getRecipeMap, dinnerPool, saladPool,
      dayHasLunch, planWeekSplit, navigate, render, dbPut,
      saveCookFeedback, esc) are defined.
   2. It REDEFINES renderCookScreen(), so it must come AFTER the old
      definition (later definition wins). The old renderDaySlot,
      chooseDinner/Lunch, renderCookModal, startCookLog become unused —
      you may delete them.
   3. New persisted fields: plan.dinnerLogged{date:bool},
      plan.lunchLogged{date:bool}. Additive — no migration needed.

   ONE COMPONENT, EVERY MEAL. Only the option pool + label differ
   between dinner and lunch.
   States: empty → (inline carousel) → chosen → logged. Plus "none"
   and a collapsed one-line state when the whole day is done.
   ===================================================================== */

window._ckChanging = window._ckChanging || {};   // transient: {dateKey:true}
let _ckRate = null;                              // transient rating draft

/* ---- small helpers ---------------------------------------------- */
function ckKey(d, m){ return d + '|' + m; }
/* How many times a recipe is planned for this meal = how many portions were bought */
function ckCapacity(plan, meal, id){ return plan.entries.filter(e => e.meal === meal && e.recipeId === id).length || 1; }
/* How many OTHER days have already claimed this recipe for this meal */
function ckUsedElsewhere(plan, meal, id, exceptDate){
  const ch = meal === 'dinner' ? (plan.dinnerChoices||{}) : (plan.lunchChoices||{});
  return Object.keys(ch).filter(d => d !== exceptDate && ch[d] === id).length;
}
/* Portions left for a given day; <=0 means used up (don't have ingredients) */
function ckRemaining(plan, meal, id, date){ return ckCapacity(plan, meal, id) - ckUsedElsewhere(plan, meal, id, date); }
function ckWeekday(date){ return new Date(date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short'}); }
function ckDateShort(date){ return new Date(date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
async function ckPersist(plan){ await dbPut('mealPlans', {...plan, _key: plan.id}); }
/* Most recent cook date for a recipe ('' if never cooked) — drives carousel ordering */
function ckLastCooked(id){
  const log = (getRecipeMap()[id] && getRecipeMap()[id].feedbackLog) || [];
  return log.reduce((mx, e) => (e.date > mx ? e.date : mx), '');
}

/* What's next up on the plan for an empty slot: the earliest plan-ordered entry for this
   meal that still has portions left, preferring one planned for this exact date. Works for
   both lunch and dinner, and for days that have no entry of their own (pulls from the queue). */
function ckNextUp(plan, meal, date){
  const ordered = plan.entries
    .filter(e => e.meal === meal)
    .sort((a, b) => (a.dayDate || '').localeCompare(b.dayDate || ''));
  const own = ordered.find(e => e.dayDate === date && ckRemaining(plan, meal, e.recipeId, date) > 0);
  if (own) return own.recipeId;
  const next = ordered.find(e => ckRemaining(plan, meal, e.recipeId, date) > 0);
  return next ? next.recipeId : null;
}

function ckPool(meal){
  const rm = getRecipeMap();
  const ids = meal === 'dinner' ? dinnerPool().map(x => x.id) : saladPool();
  return ids.map(id => {
    const r = rm[id] || {};
    return {
      id,
      title: (r.title || id).replace('Finish — ', ''),
      cuisine: (r.tags || [])[0] || '',
      metaShort: `${r.timeMinutes ?? '?'} min · ${r.caloriesPerServing ?? '?'} cal`,
    };
  });
}

function ckStatusOf(plan, date, meal){
  const choice = meal === 'dinner' ? (plan.dinnerChoices||{})[date] : (plan.lunchChoices||{})[date];
  const logged = meal === 'dinner' ? (plan.dinnerLogged||{})[date] : (plan.lunchLogged||{})[date];
  if (!choice) return 'empty';
  if (choice === 'none') return 'none';
  return logged ? 'logged' : 'chosen';
}

/* a day is "done" (collapsible) only when every meal is logged or none */
function ckDayDone(plan, date){
  let ok = ['logged','none'].includes(ckStatusOf(plan, date, 'dinner'));
  if (dayHasLunch(date)) ok = ok && ['logged','none'].includes(ckStatusOf(plan, date, 'lunch'));
  return ok;
}

function ckLogLine(id){
  const r = getRecipeMap()[id];
  const log = (r && r.feedbackLog) || [];
  const e = log[log.length - 1];
  if (!e) return 'logged';
  const stars = '★'.repeat(e.liked) + '☆'.repeat(5 - e.liked);
  const diff = ['','very easy','easy','medium','hard','very hard'][e.difficulty] || '';
  return `${stars} · ${e.actualMinutes} min · ${diff}`;
}

/* ---- screen ------------------------------------------------------ */
function renderCookScreen(){
  const plan = getActivePlan();
  if (!plan){
    return `<div class="ck-head"><span class="ck-title">Cook</span></div>
      <div style="text-align:center;padding:80px 20px;color:var(--text3)">
        <div style="font-size:17px;color:var(--text2);margin-bottom:6px">No active plan</div>
        <div style="font-size:14px;margin-bottom:20px">Make a plan first, then cook from it here.</div>
        <button class="ck-primary" style="max-width:240px;margin:0 auto" onclick="navigate('#/plan')">Go to Plan</button>
      </div>`;
  }
  const today = new Date().toISOString().split('T')[0];
  const dates = planDateRange(plan);
  const { w1: w1dates, w2: w2dates } = planWeekSplit(dates);
  const dc = plan.dinnerChoices || {};
  const done = dates.filter(d => dc[d]).length;
  const pct = dates.length ? Math.round(done / dates.length * 100) : 0;

  const week = (title, dates, key) => {
    if (!dates.length) return '';
    const allDone = dates.every(d => ckDayDone(plan, d));
    const exp = !!(window._cookSec && window._cookSec[key]);
    if (allDone && !exp){
      return `<div class="ck-seclbl"><span>${title}</span></div>
        <div class="ck-ent ck-collapsed" onclick="toggleSec('${key}')">
          <div class="t">All ${dates.length} days logged</div><div class="chk">✓</div></div>`;
    }
    const collapse = allDone
      ? `<button class="ck-actb" style="font-size:11px" onclick="toggleSec('${key}')">collapse ▲</button>` : '';
    return `<div class="ck-seclbl"><span>${title}</span>${collapse}</div>${dates.map(d => ckRenderDay(plan, d, today)).join('')}`;
  };

  return `
    <div class="ck-head"><span class="ck-title">Cook</span><span class="ck-date">${ckDateShort(today)}</span></div>
    <div class="ck-prog"><div class="ck-track"><div class="ck-fill" style="width:${pct}%"></div></div>
      <div class="ck-prog-l">${done} of ${dates.length} dinners</div></div>
    ${typeof renderHeadsUp === 'function' ? renderHeadsUp() : ''}
    ${typeof renderBatchCard === 'function' ? renderBatchCard('cook') : ''}
    ${week('Week 1', w1dates, 'w1')}
    ${week('Week 2 — from freezer', w2dates, 'w2')}`;
}

function ckRenderDay(plan, date, today){
  const done = ckDayDone(plan, date);
  const expanded = !!(window._cookExpanded && window._cookExpanded[date]);
  const isToday = date === today;

  if (done && !expanded && !isToday){
    const rm = getRecipeMap();
    const id = (plan.dinnerChoices || {})[date];
    const t = id === 'none' ? 'Didn’t cook' : (rm[id]?.title || id || '').replace('Finish — ', '');
    return `<div class="ck-ent ck-collapsed" onclick="toggleDayExpand('${date}')">
      <div class="t"><span class="d">${ckWeekday(date)}</span>&nbsp;&nbsp;${esc(t)}</div><div class="chk">✓</div></div>`;
  }

  const collapsible = done && expanded && !isToday;
  let html = dayHasLunch(date)
    ? ckRenderSlot(plan, date, 'lunch', isToday, collapsible) + ckRenderSlot(plan, date, 'dinner', isToday, false)
    : ckRenderSlot(plan, date, 'dinner', isToday, collapsible);
  if (done && expanded && !isToday){
    html += `<div class="ck-ent" style="padding:4px 0 14px">
      <button class="ck-actb" style="font-size:12px;color:var(--text3)" onclick="toggleDayExpand('${date}')">Collapse ▲</button></div>`;
  }
  return html;
}

function ckRenderSlot(plan, date, meal, isToday, collapsible){
  const rm = getRecipeMap();
  const choice = meal === 'dinner' ? (plan.dinnerChoices||{})[date] : (plan.lunchChoices||{})[date];
  const status = ckStatusOf(plan, date, meal);
  const changing = !!window._ckChanging[ckKey(date, meal)];
  const picking = status === 'empty' || changing;

  const headerClick = collapsible ? ` onclick="toggleDayExpand('${date}')" style="cursor:pointer;-webkit-tap-highlight-color:transparent"` : '';
  const header = `<div class="ck-ent-h"${headerClick}>
    <span class="ck-meal">${ckWeekday(date)} · ${meal}</span>
    ${(isToday && status === 'empty') ? '<span class="ck-today">TODAY</span>' : ''}</div>`;

  let body = '';
  if (picking){
    const nextId = ckNextUp(plan, meal, date);
    const planned = nextId
      ? `<span class="ck-planned">next up: ${esc((rm[nextId]?.title || '').replace('Finish — ', ''))}</span>` : '<span></span>';
    const cancel = changing ? `<button class="ck-cancel" onclick="ckCancel('${date}','${meal}')">Cancel</button>` : '';
    const _pool = ckPool(meal);
    // Least-recently-cooked first (never-cooked sorts to the front) so the best bets surface;
    // the next-up recipe, if any, stays pinned and highlighted at the head of the carousel.
    const _sorted = [..._pool].sort((a, b) => ckLastCooked(a.id).localeCompare(ckLastCooked(b.id)));
    const _ordered = nextId
      ? [..._sorted.filter(p=>p.id===nextId), ..._sorted.filter(p=>p.id!==nextId)]
      : _sorted;
    const cards = _ordered.map(p => {
      const sel = choice === p.id;
      const usedUp = !sel && ckRemaining(plan, meal, p.id, date) <= 0;
      if (usedUp){
        return `<div class="ck-card" style="opacity:.4;cursor:default" aria-disabled="true">
          <span class="ck-chip">${esc(p.cuisine)}</span>
          <div class="t">${esc(p.title)}</div>
          <div class="m">${esc(p.metaShort)}</div>
          <div class="p" style="color:var(--text3)">· used up</div></div>`;
      }
      return `<div class="ck-card${sel ? ' sel' : ''}${nextId === p.id ? ' ck-next' : ''}" onclick="ckPick('${date}','${meal}','${p.id}')">
        <span class="ck-chip">${esc(p.cuisine)}</span>
        <div class="t">${esc(p.title)}</div>
        <div class="m">${esc(p.metaShort)}</div>
        <div class="p">${nextId === p.id ? '· next up' : ''}</div></div>`;
    }).join('');
    const none = `<div class="ck-card-none${choice === 'none' ? ' sel' : ''}" onclick="ckPickNone('${date}','${meal}')">Didn't cook</div>`;
    body = `<div class="ck-ent-h" style="min-height:18px;margin-top:6px">${planned}${cancel}</div>
      <div class="ck-rail">${cards}${none}</div>`;
  } else if (status === 'chosen'){
    const r = rm[choice]; const t = (r?.title || choice).replace('Finish — ', '');
    const meta = r ? `${(r.tags||[])[0] || ''} · ${r.timeMinutes} min · ${r.caloriesPerServing} cal` : '';
    const prep = r && (r.prepAhead||[]).length ? `<div style="font-size:12px;color:var(--pr);margin-top:4px">🌙 ${esc(r.prepAhead[0])}</div>` : '';
    const hasPrev = !!(r?.feedbackLog?.length);
    const logBtn = hasPrev ? `<button class="ck-acta" onclick="ckQuickLog('${date}','${meal}')">Log</button>` : '';
    const rateBtn = `<button class="${hasPrev ? 'ck-actb' : 'ck-acta'}" onclick="ckOpenRate('${date}','${meal}')">Rate it</button>`;
    body = `<div class="ck-slot-ttl">${esc(t)}</div><div class="ck-meta">${esc(meta)}</div>${prep}
      <div class="ck-actions">
        <button class="ck-acta" onclick="navigate('#/recipes/${choice}')">View recipe</button>
        ${logBtn}${rateBtn}
        <button class="ck-actb" onclick="ckChange('${date}','${meal}')">Change</button></div>`;
  } else if (status === 'logged'){
    const r = rm[choice]; const t = (r?.title || choice).replace('Finish — ', '');
    body = `<div class="ck-slot-ttl">${esc(t)}</div><div class="ck-meta logged">${ckLogLine(choice)}</div>
      <div class="ck-actions">
        <button class="ck-acta" onclick="navigate('#/recipes/${choice}')">View recipe</button>
        <button class="ck-actb" onclick="ckOpenRate('${date}','${meal}')">Edit log</button>
        <button class="ck-actb" onclick="ckChange('${date}','${meal}')">Change</button></div>`;
  } else { // none
    body = `<div class="ck-ent-h" style="margin-top:6px">
      <span class="ck-meta" style="color:var(--text3)">Didn't cook</span>
      <button class="ck-actb" onclick="ckChange('${date}','${meal}')">Choose</button></div>`;
  }
  return `<div class="ck-ent">${header}${body}</div>`;
}

/* ---- choose / change -------------------------------------------- */
async function ckPick(date, meal, id){
  const plan = getActivePlan(); if (!plan) return;
  if (meal === 'dinner'){
    plan.dinnerChoices = plan.dinnerChoices || {}; plan.dinnerChoices[date] = id;
    plan.dinnerLogged  = plan.dinnerLogged  || {}; plan.dinnerLogged[date]  = false;
  } else {
    plan.lunchChoices  = plan.lunchChoices  || {}; plan.lunchChoices[date]  = id;
    plan.lunchLogged   = plan.lunchLogged   || {}; plan.lunchLogged[date]   = false;
  }
  delete window._ckChanging[ckKey(date, meal)];
  await ckPersist(plan); render();
}
async function ckPickNone(date, meal){
  const plan = getActivePlan(); if (!plan) return;
  if (meal === 'dinner'){
    plan.dinnerChoices = plan.dinnerChoices || {}; plan.dinnerChoices[date] = 'none';
    plan.dinnerLogged  = plan.dinnerLogged  || {}; plan.dinnerLogged[date]  = false;
  } else {
    plan.lunchChoices  = plan.lunchChoices  || {}; plan.lunchChoices[date]  = 'none';
    plan.lunchLogged   = plan.lunchLogged   || {}; plan.lunchLogged[date]   = false;
  }
  delete window._ckChanging[ckKey(date, meal)];
  await ckPersist(plan); render();
}
function ckChange(date, meal){ window._ckChanging[ckKey(date, meal)] = true; render(); }
function ckCancel(date, meal){ delete window._ckChanging[ckKey(date, meal)]; render(); }

/* Quick "log" for a recipe that's already been rated before — repeats the last
   rating instead of making you re-rate, so the day still collapses. */
async function ckQuickLog(date, meal){
  const plan = getActivePlan(); if (!plan) return;
  const rm = getRecipeMap();
  const id = meal === 'dinner' ? (plan.dinnerChoices||{})[date] : (plan.lunchChoices||{})[date];
  if (!id || id === 'none') return;
  const r = rm[id];
  const prev = (r?.feedbackLog || [])[(r?.feedbackLog || []).length - 1];
  if (!prev) { ckOpenRate(date, meal); return; }
  const idx = plan.entries.findIndex(e => e.meal === meal && e.dayDate === date);
  await saveCookFeedback(id, idx, {
    difficulty: prev.difficulty, actualMinutes: prev.actualMinutes, liked: prev.liked, changeNote: '',
  });
  const p = getActivePlan();
  if (meal === 'dinner'){ p.dinnerLogged = p.dinnerLogged || {}; p.dinnerLogged[date] = true; }
  else { p.lunchLogged = p.lunchLogged || {}; p.lunchLogged[date] = true; }
  await ckPersist(p);
  render();
}

/* ---- rate sheet -------------------------------------------------- */
function ckOpenRate(date, meal){
  const plan = getActivePlan(); const rm = getRecipeMap();
  const id = meal === 'dinner' ? (plan.dinnerChoices||{})[date] : (plan.lunchChoices||{})[date];
  if (!id || id === 'none') return;
  const r = rm[id]; const prev = (r.feedbackLog || [])[(r.feedbackLog || []).length - 1];
  _ckRate = {
    date, meal, recipeId: id,
    difficulty: prev ? prev.difficulty : 3,
    actualMinutes: prev ? prev.actualMinutes : (r.timeMinutes || 30),
    liked: prev ? prev.liked : 4,
    changeNote: prev ? (prev.changeNote || '') : '',
  };
  ckRenderRate();
}
function ckRenderRate(){
  const s = _ckRate; const r = getRecipeMap()[s.recipeId];
  const title = (r?.title || s.recipeId).replace('Finish — ', '');
  const stars = (g, v) => [1,2,3,4,5].map(i =>
    `<span class="ck-star ${v >= i ? 'on' : ''}" onclick="ckRateSet('${g}',${i})">★</span>`).join('');
  document.getElementById('ck-rate-ov')?.remove();
  const ov = document.createElement('div');
  ov.className = 'ck-ov'; ov.id = 'ck-rate-ov';
  ov.onclick = (e) => { if (e.target === ov) ckRateClose(); };
  ov.innerHTML = `<div class="ck-sheet">
    <div class="ck-handle"></div>
    <div class="ck-sheet-lbl">${ckWeekday(s.date)} · ${s.meal}</div>
    <div class="ck-sheet-ttl">${esc(title)}</div>
    <div class="ck-field"><div class="ck-field-l">How'd you like it?</div><div class="ck-stars">${stars('liked', s.liked)}</div></div>
    <div class="ck-field"><div class="ck-field-l">Difficulty</div><div class="ck-stars">${stars('difficulty', s.difficulty)}</div></div>
    <div class="ck-field"><div class="ck-field-l">Actual time · est ${r?.timeMinutes ?? '?'} min</div>
      <div class="ck-stepper">
        <button class="ck-stepbtn" onclick="ckRateTime(-5)">−</button>
        <span class="ck-stepval">${s.actualMinutes} min</span>
        <button class="ck-stepbtn" onclick="ckRateTime(5)">+</button></div></div>
    <div class="ck-field"><div class="ck-field-l">What I'd change next time</div>
      <textarea class="ck-note" placeholder="Optional…" oninput="_ckRate.changeNote=this.value">${esc(s.changeNote)}</textarea></div>
    <button class="ck-primary" onclick="ckRateSave()">Save log</button>
    <button class="ck-skip" onclick="ckRateClose()">Skip — just mark it made</button>
  </div>`;
  document.body.appendChild(ov);
}
function ckRateSet(g, v){ _ckRate[g] = v; ckRenderRate(); }
function ckRateTime(d){ _ckRate.actualMinutes = Math.max(5, _ckRate.actualMinutes + d); ckRenderRate(); }
function ckRateClose(){ document.getElementById('ck-rate-ov')?.remove(); _ckRate = null; }
async function ckRateSave(){
  const s = _ckRate; if (!s) return;
  const plan = getActivePlan();
  const idx = plan ? plan.entries.findIndex(e => e.meal === s.meal && e.dayDate === s.date) : -1;
  await saveCookFeedback(s.recipeId, idx, {
    difficulty: s.difficulty, actualMinutes: s.actualMinutes, liked: s.liked, changeNote: s.changeNote,
  });
  const p = getActivePlan();
  if (s.meal === 'dinner'){ p.dinnerLogged = p.dinnerLogged || {}; p.dinnerLogged[s.date] = true; }
  else { p.lunchLogged = p.lunchLogged || {}; p.lunchLogged[s.date] = true; }
  await ckPersist(p);
  ckRateClose(); render();
}


