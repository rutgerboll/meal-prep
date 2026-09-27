// ── Plan Screen ───────────────────────────────────────────────────────────────
const CUISINE_TAGS = ['italian','greek','mediterranean','thai','indian','tex-mex','mexican','eastern-european','american','french'];
function fmtMD(iso){ const d=new Date(iso+'T00:00:00'); return `${d.getMonth()+1}/${d.getDate()}`; }
function dayLabelHtml(entry){
  const dd = entry.dayDate ? new Date(entry.dayDate+'T00:00:00') : null;
  const wd = dd ? dd.toLocaleDateString('en-US',{weekday:'short'}) : ((entry.dayLabel||'').split(' ')[0]||'');
  const md = dd ? `${dd.getMonth()+1}/${dd.getDate()}` : '';
  return `<span class="day-lbl">${wd}${md?`<br><span style="font-size:12px">${md}</span>`:''}</span>`;
}
// Every day from the plan's first to last meal date, gaps included, so each calendar
// day can get a lunch + dinner slot. Date-less plans have nothing to enumerate between,
// so fall back to just their (de-duped) dinner-entry dates and render as before.
function planDateRange(plan){
  const dated = plan.entries.filter(e=>(e.meal==='dinner'||e.meal==='lunch') && e.dayDate).map(e=>e.dayDate);
  if(!dated.length){
    return [...new Set(plan.entries.filter(e=>e.meal==='dinner').map(e=>e.dayDate).filter(Boolean))].sort();
  }
  const sorted=[...dated].sort(); const end=sorted[sorted.length-1]; const out=[];
  for(let t=new Date(sorted[0]+'T00:00:00Z'); ; t.setUTCDate(t.getUTCDate()+1)){
    const iso=t.toISOString().split('T')[0];
    out.push(iso);
    if(iso>=end) break;
  }
  return out;
}
function planWeekSplit(dates){
  const allDates = [...dates].sort();
  let weekMid=null;
  if(allDates.length>1){ const d0=new Date(allDates[0]),dN=new Date(allDates[allDates.length-1]); weekMid=new Date((d0.getTime()+dN.getTime())/2).toISOString().split('T')[0]; }
  return { w1: allDates.filter(d=>!weekMid||d<=weekMid), w2: allDates.filter(d=>weekMid&&d>weekMid) };
}
function renderBatchCard(mode){
  const plan=getActivePlan(); const rm=getRecipeMap();
  const batchEntries=plan.entries.filter(e=>e.meal==='batch');
  if(!batchEntries.length) return '';
  const batchDone=batchEntries.every(e=>e.cooked);
  const batchDay=(batchEntries[0]?.dayLabel||'').replace(' (batch cook)','');
  if(mode==='cook' && batchDone){
    const exp=!!(window._cookSec && window._cookSec['batch']);
    if(!exp){
      return `<div class="ck-seclbl"><span>Batch Cook</span></div>
        <div class="ck-ent ck-collapsed" onclick="toggleSec('batch')">
          <div class="t">${batchDay} — all done</div><div class="chk">✓</div></div>`;
    }
  }
  const collapseBtn=(mode==='cook' && batchDone)
    ? `<button class="ck-actb" style="font-size:11px" onclick="toggleSec('batch')">collapse ▲</button>`:'';
  // One card per batch day: dinner bases and lunch prep cook on the main batch
  // day; a later Sunday may hold a lunch-only re-prep so greens stay fresh.
  const groups=[]; const byDay={};
  for(const e of batchEntries){
    const k=e.dayDate||'';
    if(!byDay[k]){ byDay[k]={key:k, label:(e.dayLabel||'').replace(' (batch cook)',''), entries:[]}; groups.push(byDay[k]); }
    byDay[k].entries.push(e);
  }
  groups.sort((a,b)=>a.key.localeCompare(b.key));
  const isLunchPrep = e => ((rm[e.recipeId]?.tags)||[]).includes('lunch');
  const cards = groups.map(g=>{
    const lunchOnly = g.entries.every(isLunchPrep);
    return `<div class="batch-card">
      <div style="display:flex;align-items:center;margin-bottom:4px">
        <div style="font-size:17px;font-weight:700">${lunchOnly?'🥗 Batch Prep':'🍳 Batch Cook Day'} — ${g.label}</div>
      </div>
      ${g.entries.map(e=>{
        const planIdx=plan.entries.findIndex(x=>x===e); const r=rm[e.recipeId];
        const right=mode==='cook'
          ? `<div class="day-rt"><div class="cchk ${e.cooked?'done':'todo'}" onclick="event.stopPropagation();toggleCooked(${planIdx})">${e.cooked?'✓':''}</div></div>`
          : `<div class="day-rt"><span style="color:var(--text3);font-size:20px">›</span></div>`;
        return `<div class="day-row" style="padding:10px 0" onclick="navigate('#/recipes/${e.recipeId}')">
          <div class="day-ctr"><div class="day-ttl" style="font-size:15px">${r?.title||e.recipeId}</div><div class="day-sub">${isLunchPrep(e)?'Lunch prep':'Bulk base'} · ×${e.servings} servings</div></div>
          ${right}
        </div>`;
      }).join('')}
      ${lunchOnly?'':`<div class="banner bi2" style="margin:12px 0 0;padding:8px 12px"><span>❄</span><span class="bbody">Freeze half of each base immediately after cooking for week 2</span></div>`}
    </div>`;
  }).join('');
  return `${(mode==='cook' && batchDone)?`<div class="ck-seclbl"><span>Batch Cook</span>${collapseBtn}</div>`:''}${cards}`;
}
// Cook tab: dinners with each day's lunch-salad chooser woven in right beneath the dinner.
function planRuleWarnings(){
  const plan=getActivePlan(); const rm=getRecipeMap();
  const ruleWarnings=[];
  for(let i=0;i<plan.entries.length;i++){
    const entry=plan.entries[i]; const recipe=rm[entry.recipeId];
    if(!entry.ruleWarningDismissed){ ruleCheck(recipe,rm).forEach(wn=>ruleWarnings.push({msg:`${recipe?.title||entry.recipeId}: ${wn}`,idx:i})); }
  }
  if(!ruleWarnings.length) return '';
  return `<div class="banner bw"><span class="bico">⚠</span><div class="bbody">${ruleWarnings.map(wn=>`<div>${wn.msg}</div>`).join('')}</div><button class="bx" onclick="dismissRuleWarnings()">Dismiss all</button></div>`;
}
function getNextDraftPlan(){
  const drafts=state.mealPlans.filter(p=>p.isDraft && !p.isActive);
  const lastDate=p=>(p.entries||[]).map(e=>e.dayDate||'').sort().pop()||'';
  return drafts.sort((a,b)=>lastDate(b).localeCompare(lastDate(a)))[0]||null;
}
function renderDraftTeaser(){
  const draft=getNextDraftPlan();
  if(!draft) return '';
  const dinners=(draft.entries||[]).filter(e=>e.meal==='dinner');
  return `<div class="card card-alt" style="margin-bottom:16px">
    <div style="font-size:12px;color:var(--pr);font-weight:600;margin-bottom:5px">NEXT PLAN · REVIEW DRAFT</div>
    <div style="font-size:17px;font-weight:600;margin-bottom:4px">${esc(draft.label)}</div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:12px">${dinners.length} dinners · ${dinners.reduce((n,e)=>n+(+e.servings||0),0)} portions · shopping list included · current plan stays active</div>
    <button class="btn-s" onclick="navigate('#/plan/draft')">Review dinners &amp; shopping</button>
  </div>`;
}
function renderDraftPlanScreen(){
  const draft=getNextDraftPlan();
  if(!draft) return `<div class="sh"><button class="back" onclick="navigate('#/plan')">‹</button><span class="stitle">Next plan</span></div><div class="empty"><div class="empty-ttl">No draft to review</div></div>`;
  const rm=getRecipeMap();
  const entries=draft.entries||[];
  const batches=entries.filter(e=>e.meal==='batch').sort((a,b)=>(a.dayDate||'').localeCompare(b.dayDate||''));
  const dinners=entries.filter(e=>e.meal==='dinner').sort((a,b)=>(a.dayDate||'').localeCompare(b.dayDate||''));
  const groups=[];
  for(const e of dinners){
    const last=groups[groups.length-1];
    if(last && last.recipeId===e.recipeId) last.entries.push(e);
    else groups.push({recipeId:e.recipeId,entries:[e]});
  }
  const date=e=>e.dayDate?fmtMD(e.dayDate):(e.dayLabel||'');
  const batchHtml=batches.map(e=>`<div class="day-row" style="padding:10px 0;border-bottom:1px solid var(--bdr)">
    <div class="day-ctr"><div class="day-ttl">${esc(rm[e.recipeId]?.title||e.recipeId)}</div>
    <div style="font-size:13px;color:var(--text3)">${esc(date(e))} · ${e.servings} portions</div></div>
    <div class="day-rt"><button class="btn-t" onclick="navigate('#/recipes/${e.recipeId}')">Recipe ›</button></div>
  </div>`).join('');
  const dinnerHtml=groups.map(g=>{
    const first=g.entries[0], last=g.entries[g.entries.length-1];
    const span=g.entries.length>1?`${date(first)}–${date(last)}`:date(first);
    const portionNote=g.entries.find(e=>e.portionNote)?.portionNote;
    return `<div class="day-row" style="padding:12px 0;border-bottom:1px solid var(--bdr)">
      <div class="day-ctr"><div class="day-ttl">${esc((rm[g.recipeId]?.title||g.recipeId).replace('Finish — ',''))}</div>
      <div style="font-size:13px;color:var(--text3)">${esc(span)} · ${g.entries.length} nights · ${g.entries.reduce((n,e)=>n+(+e.servings||0),0)} portions</div>
      ${portionNote?`<div style="font-size:13px;color:var(--text2);margin-top:4px">${esc(portionNote)}</div>`:''}</div>
      <div class="day-rt"><button class="btn-t" onclick="navigate('#/recipes/${g.recipeId}')">Recipe ›</button></div>
    </div>`;
  }).join('');
  const gl=state.groceryLists.find(g=>g.planId===draft.id);
  const shopItems=gl?(gl.weekly||[]).flatMap(w=>w.items||[]).filter(i=>i.stockStatus!=='have'):[];
  const shopHtml=shopItems.length?shopItems.map(i=>`<div style="padding:8px 0;border-bottom:1px solid var(--bdrs);font-size:14px">${esc(i.displayText)}</div>`).join('')
    :'<div style="font-size:13px;color:var(--text3)">Shopping draft not synced yet.</div>';
  return `<div class="sh"><button class="back" onclick="navigate('#/plan')">‹</button><span class="stitle">Next plan draft</span></div>
    <div class="card card-alt" style="margin-bottom:14px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">${esc(draft.label)}</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.5">${esc(draft.note||'Review dinners and actual stock before using this plan.')}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:8px">For review only. Cook and Grocery still use your active plan.</div>
    </div>
    <div class="ssec">${batches.length} batch cooks</div>${batchHtml}
    <div class="ssec">Dinners</div>${dinnerHtml}
    <div class="ssec">Shopping draft · ${shopItems.length} lines</div>${shopHtml}
    ${gl&&shopItems.length?`<div class="sticky"><button class="btn-p" onclick="copyList('${draft.id}',0)">📋 Copy shopping draft</button></div>`:''}`;
}
function renderPlanScreen(){
  const plan=getActivePlan();
  if(!plan){ return `<div class="sh"><span class="stitle">Plan</span></div>${renderDraftTeaser()}<div class="empty"><div class="empty-ico">📅</div><div class="empty-ttl">No active plan</div><div class="empty-sub">Sync a plan from your library, let the app suggest one, or build it yourself</div><button class="btn-p" style="max-width:260px" onclick="syncNowOrSetup()">↻ Sync from my library</button><button class="btn-s" style="max-width:260px;margin-top:12px" onclick="startSuggested()">✨ Suggest a plan for me</button><button class="btn-s" style="max-width:260px;margin-top:12px" onclick="navigate('#/plan/build')">Build it myself</button></div>`; }
  const rm=getRecipeMap();
  const bases=[...new Set(plan.entries.filter(e=>e.meal==='batch').map(e=>e.recipeId))];
  const dinners=[...new Set(plan.entries.filter(e=>e.meal==='dinner').map(e=>e.recipeId))];
  const lunches=[...new Set(plan.entries.filter(e=>e.meal==='lunch').map(e=>e.recipeId))];
  const meta = r => `<span style="font-size:13px;color:var(--text3)">⏱ ${r?.timeMinutes||'?'}m</span>${r?.caloriesPerServing?`<span style="font-size:13px;color:var(--text3)">🔥 ${r.caloriesPerServing} cal</span>`:''}<span style="font-size:13px;color:var(--text3)">${r?.servings||'?'} servings</span>`;
  const row = id => { const r=rm[id]; const title=(r?.title||id).replace('Finish — ','');
    const tags=(r?.tags||[]).slice(0,2).map(t=>`<span class="chip ${t}">${t}</span>`).join('');
    return `<div class="day-row" style="padding:14px 0;border-bottom:1px solid var(--bdr)" onclick="navigate('#/recipes/${id}')"><div class="day-ctr"><div class="day-ttl">${esc(title)}</div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:4px">${tags}${meta(r)}</div></div><div class="day-rt"><span style="color:var(--text3);font-size:20px">›</span></div></div>`; };
  const section=(label,ids)=> ids.length?`<div class="ssec">${label}</div>${ids.map(row).join('')}`:'';
  const cuisineSet=new Set(); dinners.forEach(id=>(rm[id]?.tags||[]).forEach(t=>{ if(CUISINE_TAGS.includes(t)) cuisineSet.add(t); }));
  const summary=`${dinners.length} dinners · ${lunches.length} salads${cuisineSet.size?` · ${cuisineSet.size} cuisines`:''}`;
  return `
    <div class="sh" style="display:flex;align-items:center;justify-content:space-between"><span class="stitle">Plan</span><div style="display:flex;gap:4px"><button class="btn-t" style="font-size:13px" onclick="syncNowOrSetup()">↻ Sync</button><button class="btn-t" style="font-size:13px" onclick="navigate('#/plan/build')">✏ Edit</button></div></div>
    <div class="prg-l" style="margin-bottom:14px">${summary}</div>
    ${renderDraftTeaser()}
    ${planRuleWarnings()}
    ${section('🍳 Bulk bases', bases)}
    ${section('Dinners', dinners)}
    ${section('🥗 Lunch salads', lunches)}
    <div class="sticky"><button class="btn-p" onclick="navigate('#/list')">Make grocery list</button></div>`;
}
