// ── Inventory (fridge / freezer) ──────────────────────────────────────────────
function inventoryNudges(){ return (state.inventory||[]).filter(it=>(it.fridge||0)<=1 && (it.freezer||0)>0); }

/* A recipe's thaw lead time — falls back to its base protein's value. */
function thawHoursFor(r, rm){
  if(!r) return null;
  if(r.thawHoursAhead!=null) return r.thawHoursAhead;
  if(r.baseRecipeId && rm[r.baseRecipeId]?.thawHoursAhead!=null) return rm[r.baseRecipeId].thawHoursAhead;
  return null;
}

/* Forward-looking thaw reminders: upcoming, uncooked, from-the-freezer plan
   entries whose thaw lead time has arrived ("move tomorrow's chicken to the fridge"). */
function thawReminders(){
  const plan=getActivePlan(); if(!plan) return [];
  const rm=getRecipeMap();
  const today=new Date(); today.setHours(0,0,0,0);
  const seen=new Set(); const out=[];
  for(const e of plan.entries){
    if(e.cooked || !e.dayDate) continue;
    if(!(e.freezer || isLikelyFreezer(e, plan))) continue;
    const r=rm[e.recipeId]; if(!r) continue;
    const thaw=thawHoursFor(r, rm); if(thaw==null) continue;
    const daysUntil=Math.round((new Date(e.dayDate+'T00:00:00')-today)/86400000);
    const leadDays=Math.max(1, Math.ceil(thaw/24));
    if(daysUntil<0 || daysUntil>leadDays) continue;
    const key=e.recipeId+'|'+e.dayDate; if(seen.has(key)) continue; seen.add(key);
    out.push({recipe:r, entry:e, daysUntil});
  }
  return out.sort((a,b)=>a.daysUntil-b.daysUntil);
}
function whenWord(d){ return d<=0?'today':d===1?'tomorrow':`in ${d} days`; }

function renderHeadsUp(){
  const thaws=thawReminders();
  const nudges=inventoryNudges();
  if(!thaws.length && !nudges.length) return '';
  const thawRows=thaws.map(t=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;cursor:pointer" onclick="navigate('#/recipes/${t.recipe.id}')">
      <div style="font-size:14px">Move <strong>${esc(t.recipe.title.replace('Finish — ',''))}</strong> to the fridge <span style="color:var(--pr)">${whenWord(t.daysUntil)}</span><div style="font-size:12px;color:var(--text3)">cooking ${esc(t.entry.dayLabel||t.entry.dayDate)}</div></div>
      <span style="color:var(--pr)">›</span>
    </div>`).join('');
  const invRows=nudges.map(it=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0">
      <div style="font-size:14px">${esc(it.name)} <span style="color:var(--text3)">· ${it.fridge||0} fridge, ${it.freezer||0} frozen</span></div>
      <button class="btn-s" style="height:36px;padding:0 12px;font-size:13px" onclick="invMove('${it.id}',Math.min(${it.freezer||0},2))">Thaw 2</button>
    </div>`).join('');
  return `<div class="card" style="margin-bottom:16px;border-left:4px solid var(--pr)">
    <div style="font-weight:700;font-size:15px;margin-bottom:8px">🧊 Heads up — thaw ahead</div>
    ${thawRows}${invRows}
  </div>`;
}
function renderInventoryScreen(){
  const inv=state.inventory||[]; const rm=getRecipeMap();
  const recipeOpts=`<option value="">— not linked —</option>`+state.recipes.slice().sort((a,b)=>a.title.localeCompare(b.title)).map(r=>`<option value="${r.id}">${esc(r.title.replace('Finish — ',''))}</option>`).join('');
  const rows = inv.length ? inv.map(it=>{
    const link = it.recipeId && rm[it.recipeId] ? esc(rm[it.recipeId].title.replace('Finish — ','')) : '';
    return `<div style="padding:14px 0;border-bottom:1px solid var(--bdr)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-weight:600;font-size:16px">${esc(it.name)}</div>${link?`<div style="font-size:12px;color:var(--text3)">↳ ${link}</div>`:''}</div><button class="btn-t" style="color:var(--danger);font-size:13px" onclick="invDelete('${it.id}')">Remove</button></div>
      <div style="display:flex;gap:18px;margin-top:10px">
        ${['fridge','freezer'].map(f=>`<div style="flex:1">
          <div style="font-size:12px;color:var(--text3);margin-bottom:4px">${f==='fridge'?'🧊 Fridge':'❄️ Freezer'}</div>
          <div style="display:flex;align-items:center;gap:12px">
            <button class="stp-btn" onclick="invAdjust('${it.id}','${f}',-1)">–</button>
            <span style="font-size:20px;font-weight:600;min-width:24px;text-align:center">${it[f]||0}</span>
            <button class="stp-btn" onclick="invAdjust('${it.id}','${f}',1)">+</button>
          </div>
        </div>`).join('')}
      </div>
      ${(it.freezer||0)>0?`<button class="btn-s" style="width:100%;margin-top:10px" onclick="invMove('${it.id}',Math.min(${it.freezer||0},2))">Move 2 from freezer → fridge</button>`:''}
    </div>`;
  }).join('') : `<div class="empty" style="padding:24px 8px"><div class="empty-ico">🧊</div><div class="empty-sub">Nothing tracked yet. Add what's in your fridge and freezer below.</div></div>`;
  return `
    <div class="sh"><button class="back" onclick="navigate('#/more')">‹</button><span class="stitle">Fridge & Freezer</span></div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:14px">Track servings on hand. Logging a cook subtracts one from the linked item's fridge — adjust anything by hand anytime.</div>
    ${inv.length?'<div class="ssec" style="margin-top:0">On hand</div>':''}
    ${rows}
    <div class="ssec">Add an item</div>
    <div class="card">
      <div class="fld"><label>Name</label><input id="inv-name" placeholder="e.g. Garlic ground beef"></div>
      <div class="fld"><label>Link to recipe (optional)</label><select id="inv-link">${recipeOpts}</select></div>
      <div style="display:flex;gap:10px">
        <div class="fld" style="flex:1"><label>Fridge</label><input id="inv-fridge" type="number" value="0" inputmode="numeric"></div>
        <div class="fld" style="flex:1"><label>Freezer</label><input id="inv-freezer" type="number" value="0" inputmode="numeric"></div>
      </div>
      <button class="btn-p" onclick="addInventoryItem()">Add to inventory</button>
    </div>`;
}
async function addInventoryItem(){
  const nameEl=document.getElementById('inv-name'); const name=(nameEl&&nameEl.value||'').trim();
  if(!name){ showToast('Name it first'); return; }
  const id='inv-'+Date.now().toString(36);
  const it={ id, name, recipeId:(document.getElementById('inv-link').value||null), fridge:parseInt(document.getElementById('inv-fridge').value)||0, freezer:parseInt(document.getElementById('inv-freezer').value)||0, updatedAt:new Date().toISOString(), _key:id };
  state.inventory.push(it); await dbPut('inventory', it); showToast('Added to inventory'); render();
}
async function invAdjust(id, field, delta){
  const it=state.inventory.find(x=>x.id===id); if(!it) return;
  it[field]=Math.max(0,(it[field]||0)+delta); it.updatedAt=new Date().toISOString();
  await dbPut('inventory', {...it,_key:id}); render();
}
async function invMove(id, n){
  const it=state.inventory.find(x=>x.id===id); if(!it) return;
  n=Math.min(n, it.freezer||0); if(n<=0) return;
  it.freezer=(it.freezer||0)-n; it.fridge=(it.fridge||0)+n; it.updatedAt=new Date().toISOString();
  await dbPut('inventory', {...it,_key:id}); showToast(`Moved ${n} to fridge`); render();
}
async function invDelete(id){
  state.inventory=(state.inventory||[]).filter(x=>x.id!==id);
  await dbDelete('inventory', id); showToast('Removed'); render();
}

