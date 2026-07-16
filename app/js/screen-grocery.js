// ── Grocery List Screen ───────────────────────────────────────────────────────
function renderListScreen() {
  const plan = getActivePlan();
  if (!plan) return `<div class="sh"><span class="stitle">Grocery</span></div><div class="empty"><div class="empty-ico">🛒</div><div class="empty-ttl">No active plan</div><div class="empty-sub">Make a plan first, then build a list</div><button class="btn-p" style="max-width:200px" onclick="navigate('#/plan')">Go to Plan</button></div>`;
  const gl = state.groceryLists.find(g=>g.planId===plan.id);
  if (!gl) {
    return `<div class="sh"><span class="stitle">Grocery</span></div>
      <div class="card" style="margin-bottom:16px"><div style="font-size:17px;font-weight:600;margin-bottom:6px">${esc(plan.label)}</div><div style="color:var(--text3);font-size:13px">${plan.entries.length} plan entries · no list yet</div></div>
      <div class="empty"><div class="empty-ico">🛒</div><div class="empty-ttl">No list yet</div><div class="empty-sub">Build a grocery list from your active plan</div>
      <button class="btn-p" style="max-width:240px" onclick="generateList()">Make grocery list</button></div>`;
  }
  const weekly = gl.weekly && gl.weekly.length ? gl.weekly : [{week:1,label:'Buy now',items:gl.items||[]}];
  const genDate = new Date(gl.generatedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const splitNote = weekly.length>1 ? `<div style="font-size:13px;color:var(--text3);margin-bottom:12px">Fresh items are split by week so they don't wilt — buy each list at the start of its week. Shelf-stable items are all on “Buy now.”</div>` : '';
  // Inventory awareness: items already on hand are surfaced separately, not bought.
  const HAVE_BADGE = 'background:rgba(76,124,90,.18);color:var(--pr);padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;white-space:nowrap';
  const LOW_BADGE = 'background:rgba(196,148,42,.20);color:#b07d12;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:600;white-space:nowrap';
  const haveSeen = new Set();
  const haveItems = weekly.flatMap(s=>s.items).filter(i=>i.stockStatus==='have' && !haveSeen.has(i.item) && haveSeen.add(i.item));
  const haveHtml = haveItems.length ? `
    <div style="margin-bottom:10px"><div class="unk-hd" onclick="this.nextElementSibling.classList.toggle('hidden')">✓ Check before you shop (${haveItems.length}) ▾</div>
      <div>${haveItems.map(it=>`<div class="gr-row" style="cursor:pointer" onclick="this.querySelector('.gr-oh').classList.toggle('hidden')">
        <div class="gr-txt"><div class="gr-name">${esc(it.item)} <span style="${HAVE_BADGE}">probably enough on hand</span></div><div class="gr-oh hidden gr-note">${it.onHandNote ? esc(it.onHandNote) : `On hand: ${fmtQty(it.onHandQty)} ${esc(it.onHandUnit||'')} — tracking is rough; verify before skipping this.`}</div></div>
      </div>`).join('')}</div></div>` : '';
  const ed = window._glEdit || null;
  const editorRow = (val, si, ii) => `<div class="gr-row" style="flex-direction:column;align-items:stretch">
      <input id="gl-edit-input" value="${esc(val).replace(/"/g,'&quot;')}" placeholder="e.g. 1 can coconut milk" autocomplete="off"
        onkeydown="if(event.key==='Enter')saveGroceryEdit('${plan.id}',${si},'${ii}')"
        style="width:100%;height:44px;border-radius:10px;padding:0 12px;background:var(--glass);border:1px solid var(--glass-bdr);color:var(--text);font-size:15px;font-family:var(--font)">
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn-s" style="flex:1;min-height:40px" onclick="saveGroceryEdit('${plan.id}',${si},'${ii}')">Save</button>
        <button class="btn-t" style="min-height:40px" onclick="cancelGroceryEdit()">Cancel</button>
        ${ii!=='new'?`<button class="btn-t" style="min-height:40px;color:#c25b4e" onclick="removeGroceryItem('${plan.id}',${si},'${ii}')">Remove</button>`:''}
      </div>
    </div>`;
  const sections = weekly.map((sec,si)=>{
    const visible = sec.items.map((item,ii)=>({item,ii})).filter(x=>x.item.stockStatus!=='have');
    const checked=visible.filter(x=>x.item.checked).length, total=visible.length;
    const rows = total ? visible.map(({item,ii})=>{
        if (ed && ed.si===si && ed.ii===ii) return editorRow(item.displayText, si, ii);
        const lowBadge = item.stockStatus==='low' ? ` <span style="${LOW_BADGE}">have some</span>` : '';
        const ohLine = item.stockStatus==='low' ? `<div class="gr-note">On hand: ${fmtQty(item.onHandQty)} ${esc(item.onHandUnit||'')} — top up to ${fmtQty(item.buyQty)} ${esc(item.buyUnit||'')}; verify before buying.</div>` : '';
        return `<div class="gr-row ${item.checked?'chk':''}">
        <div class="gr-chk ${item.checked?'on':''}" onclick="toggleGrocery('${plan.id}',${si},${ii})"></div>
        <div class="gr-txt"><div class="gr-name">${esc(item.displayText)}${lowBadge}</div>${item.leftoverNote?`<div class="gr-note">${esc(item.leftoverNote)}</div>`:''}${ohLine}</div>
        <div class="gr-edit" onclick="editGrocery('${plan.id}',${si},'${ii}')">✎</div>
      </div>`;
      }).join('') : '<div style="padding:14px;color:var(--text3);font-size:13px">Nothing to buy this week.</div>';
    const addRow = (ed && ed.si===si && ed.ii==='new') ? editorRow('', si, 'new')
      : `<div style="text-align:right;margin:4px 2px 0"><button class="btn-t" style="font-size:13px" onclick="editGrocery('${plan.id}',${si},'new')">＋ Add item</button></div>`;
    const inlineCopy = si>0 ? `<div style="text-align:right;margin:6px 2px 2px"><button class="btn-t" style="font-size:13px" onclick="copyList('${plan.id}',${si})">📋 Copy this list</button></div>` : '';
    return `<div class="ssec">${esc(sec.label)} <span style="font-weight:400;color:var(--text3);font-size:13px">· ${checked}/${total}</span></div>${rows}${addRow}${inlineCopy}`;
  }).join('');
  const unknownHtml = gl.unknownUnits?.length ? `
    <div style="margin-top:16px"><div class="unk-hd" onclick="this.nextElementSibling.classList.toggle('hidden')">📦 Add package size for these (${gl.unknownUnits.length}) ▾</div>
      <div>${gl.unknownUnits.map(u=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bdrs);font-size:13px;color:var(--text2)"><span>${esc(u)}</span><button class="btn-t" style="font-size:12px;min-height:36px" onclick="navigate('#/more/units')">Add →</button></div>`).join('')}</div></div>` : '';
  const warnsHtml = gl.warnings?.length ? `<div class="banner bw" style="margin-bottom:16px"><span class="bico">⚠</span><div class="bbody">${gl.warnings.map(w=>`<div>${esc(w)}</div>`).join('')}</div></div>` : '';
  return `
    <div class="sh"><span class="stitle">Grocery</span></div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:8px">${gl.source==='claude' ? 'From Claude · ' : 'Generated '}${genDate} · ${esc(plan.label)}</div>
    ${splitNote}
    ${warnsHtml}
    ${haveHtml}
    ${sections}
    ${unknownHtml}
    <div style="text-align:center;margin-top:14px"><button class="btn-t" style="font-size:13px" onclick="generateList()">${gl.source==='claude' ? '↻ Rebuild in app (replaces Claude’s list)' : '↻ Regenerate'}</button></div>
    <div class="sticky"><button class="btn-p" onclick="copyList('${plan.id}',0)">📋 Copy ${weekly.length>1?'“Buy now” list':'for Notes'}</button></div>`;
}

async function generateList() {
  const plan = getActivePlan();
  if (!plan) return;
  const rm = getRecipeMap();
  const existing = state.groceryLists.find(g=>g.planId===plan.id);
  const built = buildWeeklyLists(plan, rm, state.pantry.items||[], state.purchaseUnits, state.aliasMap);
  // Hand-added lines aren't derivable from recipes — carry them through a rebuild.
  const extras = existing ? (existing.items||[]).filter(i=>i.userAdded).map(i=>({...i})) : [];
  if (extras.length && built.weekly.length) built.weekly[0].items.push(...extras);
  const prev = {};
  if (existing && existing.weekly) existing.weekly.forEach(w=>w.items.forEach(it=>{ prev[w.week+'|'+(it.item||it.displayText)] = it.checked; }));
  built.weekly.forEach(w=>w.items.forEach(it=>{ it.checked = !!prev[w.week+'|'+(it.item||it.displayText)]; }));
  const gl = { planId: plan.id, generatedAt: new Date().toISOString(), weekly: built.weekly, items: built.weekly.flatMap(w=>w.items), unknownUnits: built.unknownUnits, warnings: built.warnings, _key: plan.id };
  await dbPut('groceryLists', gl);
  const idx = state.groceryLists.findIndex(g=>g.planId===plan.id);
  if (idx >= 0) state.groceryLists[idx] = gl; else state.groceryLists.push(gl);
  showToast(`Generated ${gl.items.length} items${built.weekly.length>1?` · ${built.weekly.length} trips`:''}`);
  render();
}

async function toggleGrocery(planId, si, ii) {
  const gl = state.groceryLists.find(g=>g.planId===planId);
  if (!gl || !gl.weekly || !gl.weekly[si] || !gl.weekly[si].items[ii]) return;
  const it = gl.weekly[si].items[ii];
  it.checked = !it.checked;
  gl.items = gl.weekly.flatMap(w=>w.items);
  await dbPut('groceryLists', gl);
  render();
}

// Manual list tweaks: any line can be edited or removed, and lines added —
// e.g. drop "2 cans coconut milk" to 1 because the pantry actually has two.
// Edits bump generatedAt so a re-sync of the same chat list doesn't undo them;
// only a chat list re-written later supersedes (its file mtime is newer).
// User-added lines survive both an in-app rebuild and a chat-list re-sync.
function editGrocery(planId, si, ii){
  window._glEdit = { si, ii: ii==='new' ? 'new' : +ii };
  render();
  setTimeout(()=>{ const el=document.getElementById('gl-edit-input'); if(el) el.focus(); }, 60);
}
function cancelGroceryEdit(){ window._glEdit=null; render(); }
async function saveGroceryEdit(planId, si, ii){
  const gl = state.groceryLists.find(g=>g.planId===planId);
  const val = ((document.getElementById('gl-edit-input')||{}).value||'').trim();
  window._glEdit = null;
  if (!gl || !gl.weekly || !gl.weekly[si]) { render(); return; }
  if (ii === 'new') {
    if (val) gl.weekly[si].items.push({ item: val.toLowerCase().replace(/\s+/g,' '), aisle: null,
      neededQty: null, neededUnit: null, buyQty: null, buyUnit: null, displayText: val,
      leftoverNote: null, checked: false, missingPU: false, userAdded: true });
  } else {
    const it = gl.weekly[si].items[+ii];
    if (it && val && val !== it.displayText) { it.displayText = val; it.userEdited = true; }
  }
  gl.items = gl.weekly.flatMap(w=>w.items);
  gl.generatedAt = new Date().toISOString();
  await dbPut('groceryLists', gl);
  render();
}
async function removeGroceryItem(planId, si, ii){
  const gl = state.groceryLists.find(g=>g.planId===planId);
  window._glEdit = null;
  if (!gl || !gl.weekly || !gl.weekly[si] || !gl.weekly[si].items[+ii]) { render(); return; }
  gl.weekly[si].items.splice(+ii, 1);
  gl.items = gl.weekly.flatMap(w=>w.items);
  gl.generatedAt = new Date().toISOString();
  await dbPut('groceryLists', gl);
  render();
}

async function copyList(planId, si) {
  const gl = state.groceryLists.find(g=>g.planId===planId);
  if (!gl) return;
  const sec = (gl.weekly && gl.weekly[si]) ? gl.weekly[si] : {items: gl.items||[]};
  // On-hand items are surfaced separately on screen; checked-off items are already handled — don't copy either into the buy list.
  const text = sec.items.filter(i=>i.stockStatus!=='have' && !i.checked).map(i=>i.displayText).join('\n');
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); }
    else { const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    showToast('Copied — paste into Notes');
  } catch(e) { showToast('Copy failed — see console'); console.log('Grocery list:\n'+text); }
}

