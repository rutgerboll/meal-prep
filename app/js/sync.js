// ── Sync from Claude (keyless: pull a bundle from your Mac mini) ───────────────
const SYNC = { busy:false };
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function syncUrl(){ try{ return localStorage.getItem('mp_sync_url')||''; }catch(e){ return ''; } }
function syncAuto(){ try{ return localStorage.getItem('mp_sync_auto')!=='0'; }catch(e){ return true; } }
function syncLast(){ try{ return localStorage.getItem('mp_sync_last')||''; }catch(e){ return ''; } }
function dataMode(){ try{ return localStorage.getItem('mp_data_mode')||'test'; }catch(e){ return 'test'; } }
function setDataMode(m){ try{ localStorage.setItem('mp_data_mode', m); }catch(e){} showToast(m==='production'?'Production — feedback counts':'Test mode — feedback flagged as test'); render(); }
async function pushFeedback(){
  const base = (syncUrl().replace(/\/+$/,'')) || ((typeof location!=='undefined' && location.origin && location.origin!=='null') ? location.origin : '');
  if(!base) return {pushed:0};
  const unsent = state.cookLog.filter(c=>!c.pushed);
  if(!unsent.length) return {pushed:0};
  const resp = await fetch(base + '/feedback', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ entries: unsent.map(c=>({...c, env: c.env||'test'})) }) });
  if(!resp.ok) throw new Error('feedback push failed ('+resp.status+')');
  for(const c of unsent){ c.pushed = true; await dbPut('cookLog', c); }
  return {pushed: unsent.length};
}

async function fetchSyncBundle(){
  let base = syncUrl().replace(/\/+$/,'');
  if(!base){ base = (typeof location!=='undefined' && location.origin && location.origin!=='null') ? location.origin : ''; }
  if(!base) throw new Error('Set your Mac mini address first (More - Sync from Claude).');
  let resp;
  try{ resp = await fetch(base + '/sync.json', {cache:'no-store'}); }
  catch(e){ throw new Error("Couldn't reach your sync server — check you're on Tailscale and the Mac mini is running."); }
  if(!resp.ok) throw new Error('Server returned '+resp.status);
  const data = await resp.json();
  if(!data || !Array.isArray(data.recipes)) throw new Error('That address did not return a meal bundle.');
  return data;
}

async function applySyncBundle(b){
  let added=0, updated=0;
  const localById = Object.fromEntries(state.recipes.map(r=>[r.id,r]));
  for(const inc of (b.recipes||[])){
    const loc = localById[inc.id];
    const merged = {...inc, _key:inc.id};
    if(loc){ // preserve local cook history so syncing never wipes feedback
      if(loc.ratings && (loc.ratings.cookCount||0)>0) merged.ratings = loc.ratings;
      if(loc.feedbackLog) merged.feedbackLog = loc.feedbackLog;
      updated++;
    } else added++;
    await dbPut('recipes', merged);
  }
  if(Array.isArray(b.mealPlans)){
    const localPlans = Object.fromEntries(state.mealPlans.map(p=>[p.id,p]));
    for(const inc of b.mealPlans){
      const lp = localPlans[inc.id];
      let entries = inc.entries||[];
      if(lp){ // keep cooked check-offs by entry signature
        const ck = {}; (lp.entries||[]).forEach(e=>{ ck[e.recipeId+'|'+e.dayDate+'|'+e.meal] = e.cooked; });
        entries = entries.map(e=>({...e, cooked: ((ck[e.recipeId+'|'+e.dayDate+'|'+e.meal] ?? e.cooked) || false)}));
      }
      const carry = {};
      if (lp) {
        const newDates = new Set((inc.entries||[]).map(e=>e.dayDate).filter(Boolean));
        const byDate = obj => Object.fromEntries(Object.entries(obj||{}).filter(([d]) => newDates.has(d)));
        if (lp.dinnerChoices) carry.dinnerChoices = byDate(lp.dinnerChoices);
        if (lp.dinnerLogged)  carry.dinnerLogged  = byDate(lp.dinnerLogged);
        if (lp.lunchChoices)  carry.lunchChoices  = byDate(lp.lunchChoices);
        if (lp.lunchLogged)   carry.lunchLogged   = byDate(lp.lunchLogged);
      }
      await dbPut('mealPlans', {...inc, entries, ...carry, _key:inc.id});
    }
    const allPlans = await dbGetAll('mealPlans');
    const wantActive = {}; b.mealPlans.forEach(p=>{ wantActive[p.id]=!!p.isActive; });
    const anyActive = b.mealPlans.some(p=>p.isActive);
    for(const p of allPlans){ const a = anyActive ? !!wantActive[p.id] : ((p.id in wantActive)? wantActive[p.id] : p.isActive); if(p.isActive!==a){ await dbPut('mealPlans',{...p,isActive:a,_key:p.id}); } }
  }
  if(Array.isArray(b.groceryLists)){
    for(const inc of b.groceryLists){
      const loc = state.groceryLists.find(g=>g.planId===inc.planId);
      // Newest wins: a chat list re-written after the local list was made
      // supersedes it; otherwise the local list (and its in-store check-offs)
      // stays untouched. ISO timestamps compare lexicographically.
      if(loc && (loc.generatedAt||'') >= (inc.generatedAt||'')) continue;
      const rec = chatListRecord(inc);
      if(loc){ // carry check-offs and hand-added lines across by line key
        const ck = {}; (loc.items||[]).forEach(i=>{ if(i.checked) ck[i.item]=true; });
        rec.items.forEach(i=>{ i.checked = !!ck[i.item]; });
        const keys = new Set(rec.items.map(i=>i.item));
        const extras = (loc.items||[]).filter(i=>i.userAdded && !keys.has(i.item)).map(i=>({...i}));
        if(extras.length){ rec.weekly[0].items.push(...extras); rec.items = rec.weekly.flatMap(w=>w.items); }
      }
      await dbPut('groceryLists', rec);
    }
  }
  if(b.pantry) await dbPut('pantry', {...b.pantry, _key:'singleton'});
  if(Array.isArray(b.purchaseUnits)){ for(const pu of b.purchaseUnits){ await dbPut('purchaseUnits', {...pu, _key: pu.itemNorm || slugify(pu.item||'x')}); } }
  if(b.aliasMap) await dbPut('aliasMap', {data:b.aliasMap, _key:'singleton'});
  if(Array.isArray(b.cookbookBacklog)){ for(const cb of b.cookbookBacklog){ await dbPut('cookbookBacklog', {...cb, _key:cb.filename}); } }
  if(Array.isArray(b.ingredientStock)){ // skills own inventory — replace wholesale
    await dbClear('ingredientStock');
    for(const it of b.ingredientStock){ await dbPut('ingredientStock', {...it, _key:it.id}); }
    const m = await dbGet('meta','singleton'); const upd = (b.meta||{}).inventoryUpdatedAt;
    if(m && upd!==undefined) await dbPut('meta', {...m, inventoryUpdatedAt: upd});
  }
  if(b.preferences){ const lp=state.preferences||{}; await dbPut('preferences', {...b.preferences, theme:lp.theme, aiModel:lp.aiModel, _key:'singleton'}); }
  await loadState(); applyTheme();
  try{ localStorage.setItem('mp_sync_last', new Date().toISOString()); }catch(e){}
  return {added, updated};
}

async function doSync(opts){
  opts = opts||{};
  if(SYNC.busy) return;
  SYNC.busy=true; if(!opts.silent) render();
  try{
    let pushed = 0;
    try{ pushed = (await pushFeedback()).pushed; }catch(pe){ console.log('feedback push skipped:', pe.message||pe); }
    const b = await fetchSyncBundle();
    const r = await applySyncBundle(b);
    if(!opts.silent) showToast(`Synced — ${r.added} new, ${r.updated} updated${pushed?`, ${pushed} feedback sent`:''}`);
  }catch(e){
    if(!opts.silent) showToast('Sync failed: '+(e.message||e));
    else console.log('Auto-sync skipped:', e.message||e);
  }
  SYNC.busy=false; render();
}
function syncNowOrSetup(){ if(!syncUrl() && (typeof location==='undefined' || !location.protocol || !location.protocol.startsWith('http'))) { navigate('#/more/sync'); } else { doSync(); } }
function saveSyncUrl(){ const el=document.getElementById('sync-url'); const v=(el&&el.value||'').trim(); try{ localStorage.setItem('mp_sync_url', v); }catch(e){} showToast('Address saved'); render(); }
function toggleSyncAuto(on){ try{ localStorage.setItem('mp_sync_auto', on?'1':'0'); }catch(e){} }

function renderSyncScreen(){
  const url = syncUrl(); const last = syncLast(); const auto = syncAuto();
  return `
    <div class="sh"><button class="back" onclick="navigate('#/more')">‹</button><span class="stitle">Sync from Claude</span></div>
    <div class="card" style="margin-bottom:12px">
      <div style="font-size:13px;color:var(--text3);line-height:1.6">Plan your meals in the <b>Claude desktop app</b> — it writes to your recipe library using your meal-planning skills. Then tap <b>Sync</b> here to pull the latest plan and recipes into this app. No API key is stored anywhere; everything except the sync itself works offline.</div>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div class="ssec" style="margin-top:0">Sync server</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:10px">Your Mac mini's Tailscale HTTPS address. Leave blank to use the site you opened the app from.</div>
      <input id="sync-url" placeholder="https://macmini.your-tailnet.ts.net" value="${esc(url).replace(/"/g,'&quot;')}" style="width:100%;height:46px;border-radius:12px;padding:0 12px;background:var(--glass);border:1px solid var(--glass-bdr);color:var(--text);font-size:15px;font-family:var(--font);margin-bottom:10px">
      <button class="btn-s" onclick="saveSyncUrl()">Save address</button>
      <label style="display:flex;align-items:center;gap:10px;margin-top:14px;font-size:15px;cursor:pointer"><input type="checkbox" ${auto?'checked':''} onclick="toggleSyncAuto(this.checked)" style="width:20px;height:20px;accent-color:var(--pr)"> Auto-sync when the app opens</label>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div class="ssec" style="margin-top:0">Feedback mode</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:10px">Your cook ratings are sent back to Claude on sync. While you're testing, keep this on <b>Test</b> so junk ratings are flagged separately and never touch your real recipes. Switch to <b>Production</b> when it's for real.</div>
      <div style="display:flex;gap:10px">
        ${[['test','Test','#A8670F'],['production','Production','#3B7A40']].map(([k,l,c])=>{ const on=dataMode()===k; return `<button onclick="setDataMode('${k}')" style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:48px;border-radius:12px;cursor:pointer;font-size:15px;font-weight:600;background:${on?'var(--prl)':'var(--bg-in)'};border:2px solid ${on?'var(--pr)':'var(--bdr)'};color:var(--text)"><span style="width:12px;height:12px;border-radius:50%;background:${c};display:inline-block"></span>${l}${on?' ✓':''}</button>`; }).join('')}
      </div>
    </div>
    ${last?`<div style="text-align:center;font-size:12px;color:var(--text3);margin-bottom:12px">Last synced ${esc(new Date(last).toLocaleString())}</div>`:''}
    <div class="sticky"><button class="btn-p" onclick="doSync()">${SYNC.busy?'Syncing…':'↻ Sync now'}</button></div>`;
}

