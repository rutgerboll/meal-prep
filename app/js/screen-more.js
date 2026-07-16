// ── More Screen ───────────────────────────────────────────────────────────────
function renderMoreScreen() {
  const installed = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const installHtml = (!installed && window._deferredInstall) ? `
    <div class="card" style="margin-bottom:16px;border:2px solid var(--pr)">
      <div style="font-size:15px;font-weight:600;margin-bottom:4px">📲 Install on your phone</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:12px">Add to your home screen for a full-screen app and durable storage.</div>
      <button class="btn-p" onclick="installApp()">Install app</button>
    </div>` : '';
  return `
    <div class="sh"><span class="stitle">More</span></div>
    ${installHtml}
    <div>
      <div class="more-row" onclick="navigate('#/more/sync')"><span class="mico">↻</span><span class="mlbl">Sync from Claude</span><span class="mchev">›</span></div>
      <div class="more-row" onclick="navigate('#/more/prefs')"><span class="mico">⚙️</span><span class="mlbl">Preferences</span><span class="mchev">›</span></div>
      <div class="more-row" onclick="navigate('#/more/inventory')"><span class="mico">🧊</span><span class="mlbl">Fridge & Freezer</span><span class="mchev">›</span></div>
      <div class="more-row" onclick="navigate('#/more/pantry')"><span class="mico">🫙</span><span class="mlbl">Pantry Staples</span><span class="mchev">›</span></div>
      <div class="more-row" onclick="navigate('#/more/units')"><span class="mico">📦</span><span class="mlbl">Purchase Units</span><span class="mchev">›</span></div>
      <div class="more-row" onclick="navigate('#/more/backlog')"><span class="mico">📷</span><span class="mlbl">Cookbook Backlog</span><span class="mchev">›</span></div>
      <div class="more-row" onclick="navigate('#/more/backup')"><span class="mico">💾</span><span class="mlbl">Backup & Export</span><span class="mchev">›</span></div>
    </div>
    <div class="ssec">Appearance</div>
    <div class="card">
      <div style="font-size:13px;color:var(--text3);margin-bottom:10px">Theme</div>
      <div style="display:flex;gap:8px">
        ${[['auto','Auto','ti-device-mobile'],['light','Light','ti-sun'],['dark','Dark','ti-moon']].map(([k,l,ic])=>{
          const on = ((state.preferences.theme||'dark')===k);
          return `<button onclick="setTheme('${k}')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;height:48px;border-radius:12px;cursor:pointer;font-size:14px;font-weight:600;background:${on?'var(--prl)':'var(--bg-in)'};border:2px solid ${on?'var(--pr)':'var(--bdr)'};color:var(--text)">${l}${on?' ✓':''}</button>`;
        }).join('')}
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:8px">Auto follows your phone's light/dark setting.</div>
    </div>
    <div style="margin-top:24px;text-align:center;font-size:13px;color:var(--text3)">
      <div>Meal Planner for Rutger</div>
      <div style="margin-top:4px">v2.0 · ${state.recipes.length} recipes · ${state.mealPlans.length} plans</div>
    </div>`;
}

// ── Preferences ───────────────────────────────────────────────────────────────
function renderPrefsScreen() {
  const p = state.preferences;
  const d = p.dislikes || {};
  const band = p.calorieWarnBand || [1200,1800];
  return `
    <div class="sh"><button class="back" onclick="navigate('#/more')">‹</button><span class="stitle">Preferences</span></div>
    <form id="prefs-form" onsubmit="savePrefs(event)">
      <div class="card" style="margin-bottom:12px">
        <div class="ssec" style="margin-top:0">Household</div>
        <div class="fld"><label>Household size</label><input name="householdSize" type="number" value="${p.householdSize||2}" min="1" inputmode="numeric"></div>
        <div class="fld"><label>Dinners per week</label><input name="dinnersPerWeek" type="number" value="${p.dinnersPerWeek||6}" min="1" max="7" inputmode="numeric"></div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="ssec" style="margin-top:0">Calorie Targets</div>
        <div style="display:flex;gap:8px">
          <div class="fld" style="flex:1"><label>Rutger (cal)</label><input name="calRutger" type="number" value="${p.calorieTargets?.rutger||800}" inputmode="numeric"></div>
          <div class="fld" style="flex:1"><label>Wife (cal)</label><input name="calWife" type="number" value="${p.calorieTargets?.wife||600}" inputmode="numeric"></div>
        </div>
        <div style="display:flex;gap:8px">
          <div class="fld" style="flex:1"><label>Warn band low</label><input name="warnLow" type="number" value="${band[0]}" inputmode="numeric"></div>
          <div class="fld" style="flex:1"><label>Warn band high</label><input name="warnHigh" type="number" value="${band[1]}" inputmode="numeric"></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="ssec" style="margin-top:0">Diet Rules</div>
        ${[
          ['cilantroOptional','Cilantro optional (wife dislikes)'],
          ['noSoupsStews','No soups or stews (curries OK)'],
          ['noCutPork','No cut pork (sausage OK)'],
          ['asianOnlyThai','Asian only: Thai (no Chinese, Japanese, etc.)'],
        ].map(([k,l])=>`<label style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bdrs);cursor:pointer;font-size:15px">
          <input type="checkbox" name="${k}" ${d[k]?'checked':''} style="width:20px;height:20px;accent-color:var(--pr)"> ${l}
        </label>`).join('')}
      </div>
      <div class="card" style="margin-bottom:12px">
        <div class="ssec" style="margin-top:0">Cooking Style</div>
        <div class="fld"><label>Style</label>
          <select name="cookingStyle">
            <option value="bulk-prep" ${p.cookingStyle==='bulk-prep'?'selected':''}>Bulk prep (~2 weeks)</option>
            <option value="fresh-nightly" ${p.cookingStyle==='fresh-nightly'?'selected':''}>Fresh nightly</option>
          </select>
        </div>
      </div>
      <div class="sticky"><button type="submit" class="btn-p">Save Preferences</button></div>
    </form>`;
}

async function savePrefs(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const p = state.preferences;
  p.householdSize = parseInt(fd.get('householdSize'))||2;
  p.dinnersPerWeek = parseInt(fd.get('dinnersPerWeek'))||6;
  p.calorieTargets = { rutger: parseInt(fd.get('calRutger'))||800, wife: parseInt(fd.get('calWife'))||600, pairPerDinner: (parseInt(fd.get('calRutger'))||800)+(parseInt(fd.get('calWife'))||600) };
  p.calorieWarnBand = [parseInt(fd.get('warnLow'))||1200, parseInt(fd.get('warnHigh'))||1800];
  p.dislikes = { cilantroOptional: !!fd.get('cilantroOptional'), noSoupsStews: !!fd.get('noSoupsStews'), noCutPork: !!fd.get('noCutPork'), asianOnlyThai: !!fd.get('asianOnlyThai') };
  p.cookingStyle = fd.get('cookingStyle')||'bulk-prep';
  await dbPut('preferences', {...p, _key:'singleton'});
  showToast('Preferences saved!');
  navigate('#/more');
}

// ── Pantry ────────────────────────────────────────────────────────────────────
function renderPantryScreen() {
  const items = state.pantry.items || [];
  return `
    <div class="sh"><button class="back" onclick="navigate('#/more')">‹</button><span class="stitle">Pantry Staples</span></div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Items here are skipped on the grocery list when marked "pantry" in a recipe ingredient.</div>
    <div id="pantry-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      ${items.length ? items.map(item=>`<span class="chip" style="height:30px;padding-right:5px;gap:5px">${item}<span style="cursor:pointer;color:var(--text3);font-size:16px;line-height:1;padding:0 3px;-webkit-tap-highlight-color:transparent" onclick="removePantryItem('${item.replace(/'/g,"\\'")}')">×</span></span>`).join('') : '<div style="color:var(--text3);font-size:13px">No staples yet.</div>'}
    </div>
    <div style="display:flex;gap:8px">
      <input id="new-pantry-item" placeholder="Add item…" style="flex:1;background:var(--bg-in);border:1px solid var(--bdr);border-radius:8px;color:var(--text);height:44px;padding:0 12px;font-size:15px;font-family:var(--font)" onkeydown="if(event.key==='Enter'){addPantryItem();event.preventDefault()}">
      <button class="btn-s" onclick="addPantryItem()">Add</button>
    </div>`;
}

async function addPantryItem() {
  const inp = document.getElementById('new-pantry-item');
  const val = inp?.value?.trim().toLowerCase();
  if (!val) return;
  if (!state.pantry.items) state.pantry.items = [];
  if (!state.pantry.items.includes(val)) {
    state.pantry.items.push(val);
    await dbPut('pantry', {...state.pantry, _key:'singleton'});
    showToast(`Added: ${val}`);
    render();
  } else showToast('Already in pantry');
}

async function removePantryItem(item) {
  state.pantry.items = (state.pantry.items||[]).filter(x=>x!==item);
  await dbPut('pantry', {...state.pantry, _key:'singleton'});
  render();
}

// ── Purchase Units ────────────────────────────────────────────────────────────
function renderUnitsScreen() {
  const pus = [...state.purchaseUnits].sort((a,b)=>(a.itemNorm||a._key).localeCompare(b.itemNorm||b._key));
  return `
    <div class="sh"><button class="back" onclick="navigate('#/more')">‹</button><span class="stitle">Purchase Units</span></div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Package sizes for rounding up grocery quantities.</div>
    <div class="ssec" style="margin-top:0">Package Sizes</div>
    <div style="margin-bottom:16px">
      ${pus.map(pu=>`<div class="pu-row" style="padding:14px 0;border-bottom:1px solid var(--bdr)">
        <span class="pu-item">${pu.itemNorm||pu._key}</span>
        <span class="pu-det">${pu.packageLabel||''} ${pu.mode==='by-weight'?`(round to ${pu.roundIncrement} ${pu.packageUnit})`:''}</span>
        <button class="btn-t" style="font-size:12px;min-height:36px" onclick="editPurchaseUnit('${(pu.itemNorm||pu._key).replace(/'/g,"\\'")}')">Edit</button>
      </div>`).join('')}
    </div>
    <button class="btn-s" style="width:100%" onclick="addPurchaseUnit()">+ Add Package Size</button>`;
}

function addPurchaseUnit() { showPUModal(null); }
function editPurchaseUnit(key) {
  const pu = state.purchaseUnits.find(p=>(p.itemNorm||p._key)===key);
  showPUModal(pu);
}

function showPUModal(pu) {
  const ov = document.createElement('div');
  ov.className = 'ov';
  ov.id = 'pu-modal';
  ov.innerHTML = `
    <div class="sheet">
      <div class="hdl"></div>
      <div class="shd"><span class="sht">${pu?'Edit':'Add'} Package Size</span><button class="btn-t" onclick="document.getElementById('pu-modal').remove()">✕</button></div>
      <div class="shb">
        <form onsubmit="savePurchaseUnit(event,'${pu?pu.itemNorm||pu._key:''}')">
          <div class="fld"><label>Item name (normalized)</label><input name="itemNorm" value="${pu?.itemNorm||pu?._key||''}" placeholder="e.g. chicken thighs" required></div>
          <div class="fld"><label>Mode</label>
            <select name="mode" id="pu-mode" onchange="document.getElementById('pu-pkg-field').style.display=this.value==='package'?'':'none';document.getElementById('pu-wt-field').style.display=this.value==='by-weight'?'':'none'">
              <option value="package" ${!pu||pu.mode==='package'?'selected':''}>Package (exact count)</option>
              <option value="by-weight" ${pu?.mode==='by-weight'?'selected':''}>By weight (round up)</option>
            </select>
          </div>
          <div id="pu-pkg-field" style="${pu?.mode==='by-weight'?'display:none':''}">
            <div class="fld"><label>Package size (number)</label><input name="packageSize" type="number" step="0.01" value="${pu?.packageSize||''}" inputmode="decimal"></div>
            <div class="fld"><label>Package unit (oz, lb, each, cup…)</label><input name="packageUnit" value="${pu?.packageUnit||''}" placeholder="oz"></div>
            <div class="fld"><label>Package label (display text)</label><input name="packageLabel" value="${pu?.packageLabel||''}" placeholder="14.5 oz can"></div>
          </div>
          <div id="pu-wt-field" style="${pu?.mode!=='by-weight'?'display:none':''}">
            <div class="fld"><label>Round increment (e.g. 0.5)</label><input name="roundIncrement" type="number" step="0.01" value="${pu?.roundIncrement||0.5}" inputmode="decimal"></div>
            <div class="fld"><label>Unit (lb)</label><input name="packageUnit" value="${pu?.packageUnit||'lb'}"></div>
            <div class="fld"><label>Label</label><input name="packageLabel" value="${pu?.packageLabel||'loose by weight'}"></div>
          </div>
          <button type="submit" class="btn-p" style="margin-top:16px">Save</button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

async function savePurchaseUnit(e, oldKey) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const itemNorm = fd.get('itemNorm').trim().toLowerCase();
  const mode = fd.get('mode');
  const pu = { itemNorm, _key: itemNorm, mode,
    packageSize: mode==='package' ? parseFloat(fd.get('packageSize'))||null : null,
    packageUnit: fd.get('packageUnit')||'each',
    packageLabel: fd.get('packageLabel')||itemNorm,
    roundIncrement: mode==='by-weight' ? parseFloat(fd.get('roundIncrement'))||0.5 : null,
  };
  if (oldKey && oldKey !== itemNorm) await dbDelete('purchaseUnits', oldKey);
  await dbPut('purchaseUnits', pu);
  if (oldKey) {
    const idx = state.purchaseUnits.findIndex(p=>(p.itemNorm||p._key)===oldKey);
    if (idx >= 0) state.purchaseUnits[idx] = pu; else state.purchaseUnits.push(pu);
  } else { state.purchaseUnits.push(pu); }
  document.getElementById('pu-modal')?.remove();
  showToast('Saved!');
  render();
}


// ── Backup Screen ─────────────────────────────────────────────────────────────
function renderBackupScreen() {
  const prefs = state.preferences;
  const lastSeed = 'Never';
  return `
    <div class="sh"><button class="back" onclick="navigate('#/more')">‹</button><span class="stitle">Backup & Export</span></div>
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:17px;font-weight:600;margin-bottom:12px">Export Data</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Download all your recipes, plans, and settings as a JSON file.</div>
      <button class="btn-p" onclick="exportData()">📥 Export JSON</button>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:17px;font-weight:600;margin-bottom:12px">Import Data</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Restore from a previously exported JSON file.</div>
      <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(event)">
      <button class="btn-s" style="width:100%" onclick="document.getElementById('import-file').click()">📤 Import JSON</button>
    </div>
    <div class="card">
      <div style="font-size:17px;font-weight:600;margin-bottom:12px">Reset to Sample Data</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Wipe all data and reload the original seed. This cannot be undone.</div>
      <button class="btn-d" style="width:100%" onclick="resetToSeed()">⚠ Reset to Seed Data</button>
    </div>`;
}

async function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    recipes: state.recipes,
    mealPlans: state.mealPlans,
    groceryLists: state.groceryLists,
    pantry: state.pantry,
    purchaseUnits: state.purchaseUnits,
    preferences: state.preferences,
    aliasMap: state.aliasMap,
    cookLog: state.cookLog,
    cookbookBacklog: state.cookbookBacklog,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `meal-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported!');
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const ok = await confirm('Import Data', 'This will replace all current data. Are you sure?', 'Import');
  if (!ok) return;
  const text = await file.text();
  const data = JSON.parse(text);
  // Clear all stores
  for (const s of STORES) await dbClear(s);
  // Re-insert
  for (const r of data.recipes||[]) await dbPut('recipes', {...r, _key: r.id});
  for (const p of data.mealPlans||[]) await dbPut('mealPlans', {...p, _key: p.id});
  for (const g of data.groceryLists||[]) await dbPut('groceryLists', {...g, _key: g.planId});
  if (data.pantry) await dbPut('pantry', {...data.pantry, _key:'singleton'});
  for (const pu of data.purchaseUnits||[]) await dbPut('purchaseUnits', {...pu, _key: pu.itemNorm||pu._key});
  if (data.preferences) await dbPut('preferences', {...data.preferences, _key:'singleton'});
  if (data.aliasMap) await dbPut('aliasMap', {data: data.aliasMap, _key:'singleton'});
  for (const cl of data.cookLog||[]) await dbPut('cookLog', cl);
  for (const cb of data.cookbookBacklog||[]) await dbPut('cookbookBacklog', {...cb, _key: cb.filename});
  await loadState();
  showToast('Import complete!');
  render();
}

async function resetToSeed() {
  const ok = await confirm('Reset to Seed Data', 'This will erase all your changes and restore the original data. Cannot be undone.', 'Reset');
  if (!ok) return;
  for (const s of STORES) await dbClear(s);
  await seedDB();
  await loadState();
  showToast('Reset complete!');
  navigate('#/plan');
}

