// ── Plan Builder ──────────────────────────────────────────────────────────────
let _builderState = null;

function renderPlanBuilder() {
  if (!_builderState) {
    const existingPlan = getActivePlan();
    _builderState = {
      step: 0, // 0=template, 1=bases, 2=week1, 3=week2, 4=lunch, 5=review
      label: existingPlan ? existingPlan.label : `Plan ${new Date().toISOString().split('T')[0]}`,
      kind: 'bulk-2week',
      entries: existingPlan ? JSON.parse(JSON.stringify(existingPlan.entries)) : [],
      editingExisting: !!existingPlan,
      existingId: existingPlan?.id,
    };
  }
  const s = _builderState;
  const STEPS = ['Template','Bases','Week 1','Week 2','Lunch','Review'];

  const stepDots = STEPS.map((l,i)=>`<div style="flex:1;height:4px;border-radius:2px;background:${i<s.step?'var(--pr)':i===s.step?'rgba(217,119,6,.5)':'var(--bdr)'}"></div>`).join('');

  return `
    <div class="sh">
      <button class="back" onclick="${s.step>0?'_builderState.step--;render()':'_builderState=null;navigate(\'#/plan\')'}">‹</button>
      <span class="stitle">${s.editingExisting?'Edit Plan':'New Plan'}</span>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:16px">${stepDots}</div>
    <div style="font-size:12px;color:var(--text3);text-align:center;margin-bottom:20px;text-transform:uppercase;letter-spacing:.05em">Step ${s.step+1}: ${STEPS[s.step]}</div>
    ${renderBuilderStep(s)}`;
}

function renderBuilderStep(s) {
  const rm = getRecipeMap();
  const bases = state.recipes.filter(r=>r.isBase);
  const finishes = state.recipes.filter(r=>r.isFinish);
  const lunches = state.recipes.filter(r=>(r.tags||[]).some(t=>['lunch','salad'].includes(t)));
  const batchEntries = s.entries.filter(e=>e.meal==='batch');
  const dinnerEntries = s.entries.filter(e=>e.meal==='dinner');
  const lunchEntries = s.entries.filter(e=>e.meal==='lunch');
  const baseIds = batchEntries.map(e=>e.recipeId);

  if (s.step === 0) {
    return `
      <div class="card" style="margin-bottom:16px;border:1.5px solid var(--pr)">
        <div style="font-size:16px;font-weight:600;margin-bottom:4px">✨ Suggest a plan for me</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:12px">Auto-build a balanced 2-week bulk-prep plan from your library — favorites first, cuisines spread out, week 2 from the freezer. You can tweak it before saving.</div>
        <button class="btn-p" onclick="suggestPlan()">✨ Suggest a full plan</button>
      </div>
      <div class="ssec" style="margin-top:0">Or build it yourself</div>
      <div class="fld"><label>Plan label</label><input id="plan-label" value="${s.label}" oninput="_builderState.label=this.value"></div>
      <div class="ssec" style="margin-top:0">Template</div>
      ${[['bulk-2week','🍱 2-Week Bulk Prep','Batch cook 2 protein bases, 6 finishes/week. Week 1 fresh, Week 2 freezer.'],
         ['weekly','📅 1-Week (6 dinners)','Fresh or batch-cook for one week.'],
         ['custom','✏ Custom','Add any mix of meals.']].map(([k,t,d])=>`
        <div class="card ${s.kind===k?'card-alt':''}" style="margin-bottom:8px;cursor:pointer;${s.kind===k?'border:1.5px solid var(--pr)':''}" onclick="_builderState.kind='${k}';render()">
          <div style="font-size:17px;font-weight:600">${t}</div>
          <div style="font-size:13px;color:var(--text3);margin-top:4px">${d}</div>
          ${s.kind===k?'<div style="color:var(--pr);font-size:13px;margin-top:8px">✓ Selected</div>':''}
        </div>`).join('')}
      <div class="sticky"><button class="btn-p" onclick="_builderState.step=1;render()">Next →</button></div>`;
  }

  if (s.step === 1) {
    return `
      <div class="ssec" style="margin-top:0">Select Base Proteins (${batchEntries.length} selected)</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Bases are cooked in bulk (12 servings). Freeze half for week 2.</div>
      ${bases.map(r=>{
          const sel = batchEntries.some(e=>e.recipeId===r.id);
          return `<div class="pick-row ${sel?'sel-row':''}" style="padding:12px 0;border-bottom:1px solid var(--bdr)" onclick="toggleBase('${r.id}')">
            <div class="pick-info">
              <div class="pick-ttl">${r.title}</div>
              <div class="pick-meta">⏱ ${r.timeMinutes}min · ${r.servings} servings batch</div>
            </div>
            ${sel?'<span style="color:var(--pr);font-size:22px">✓</span>':''}
          </div>`;
        }).join('')}
      <div class="sticky"><button class="btn-p" onclick="${batchEntries.length>0?'_builderState.step=2;render()':'showToast(\'Select at least 1 base\')'}">Next → (${batchEntries.length} bases)</button></div>`;
  }

  if (s.step === 2) {
    const w1 = dinnerEntries.filter(e=>e.week===1||!e.week);
    const availFinishes = finishes.filter(f=>baseIds.includes(f.baseRecipeId));
    return `
      <div class="ssec" style="margin-top:0">Week 1 Dinners (${w1.length} of 6)</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:12px">Pick finishes for your selected bases. These will be fresh in week 1.</div>
      ${w1.length<6?`<button class="btn-s" style="width:100%;margin-bottom:16px" onclick="autoFillWeek1()">✨ Auto-fill balanced dinners</button>`:''}
      ${w1.map((e,i)=>{
        const r=rm[e.recipeId];
        return `<div class="card card-alt" style="margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <div style="flex:1"><div style="font-weight:600">${r?.title.replace('Finish — ','')}</div><div style="font-size:12px;color:var(--text3)">${e.dayLabel||'Unscheduled'}</div></div>
          <button class="btn-t" style="color:var(--danger);font-size:20px;min-height:44px" onclick="removeBuilderEntry('dinner',${i})">×</button>
        </div>`;
      }).join('')}
      ${w1.length < 6 ? `
        <div class="ssec">Add Finish</div>
        ${availFinishes.filter(f=>!w1.some(e=>e.recipeId===f.id)).map(f=>`<div class="pick-row" style="padding:12px 0;border-bottom:1px solid var(--bdr)" onclick="addBuilderFinish('${f.id}',1)">
            <div class="pick-info">
              <div class="pick-ttl">${f.title.replace('Finish — ','')}</div>
              <div class="pick-meta"><span class="chip ${cuisineOf(f)}" style="height:18px">${cuisineOf(f)}</span> · ${rm[f.baseRecipeId]?.title||f.baseRecipeId} · ⏱ ${f.timeMinutes}min ${w1.some(e=>cuisineOf(rm[e.recipeId])===cuisineOf(f))?'· <span style="color:var(--warn)">repeat</span>':''}</div>
            </div>
            <span style="color:var(--pr)">+</span>
          </div>`).join('')}
          ${availFinishes.length === 0 ? '<div style="padding:16px;color:var(--text3);font-size:13px">No finishes found for selected bases</div>' : ''}` : ''}
      <div class="sticky"><button class="btn-p" onclick="_builderState.step=3;render()">Next → Week 2</button></div>`;
  }

  if (s.step === 3) {
    const w1dinners = dinnerEntries.filter(e=>e.week===1||!e.week);
    const w2dinners = dinnerEntries.filter(e=>e.week===2);
    return `
      <div class="ssec" style="margin-top:0">Week 2 (${w2dinners.length} of 6)</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Week 2 auto-fills with frozen week-1 finishes. You can add a fresh cook or leave gaps.</div>
      <button class="btn-s" style="width:100%;margin-bottom:16px" onclick="autoFillWeek2()">↻ Auto-fill from Week 1 (frozen)</button>
      ${w2dinners.map((e,i)=>{
        const r=rm[e.recipeId];
        const weekIdx = dinnerEntries.filter(x=>x.week===2).indexOf(e);
        return `<div class="card card-alt" style="margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <div style="flex:1"><div style="font-weight:600">${r?.title.replace('Finish — ','')}</div><div style="font-size:12px;color:var(--text3)">${e.dayLabel||''} ${e.freezer?'❄ freezer':''}</div></div>
          <button class="btn-t" style="color:var(--danger);font-size:20px;min-height:44px" onclick="removeBuilderWeek2(${weekIdx})">×</button>
        </div>`;
      }).join('')}
      <div class="sticky"><button class="btn-p" onclick="_builderState.step=4;render()">Next → Lunches</button></div>`;
  }

  if (s.step === 4) {
    const ulunches = [...new Map(lunchEntries.map(e=>[e.recipeId,e])).values()];
    return `
      <div class="ssec" style="margin-top:0">Lunch Salads (${ulunches.length} selected)</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Pick 1-2 meal-prep salads for Mon-Thu lunches. The full batch will be purchased once.</div>
      ${ulunches.map(e=>{
        const r=rm[e.recipeId];
        return `<div class="card card-alt" style="margin-bottom:8px;display:flex;align-items:center;gap:12px">
          <div style="flex:1"><div style="font-weight:600">${r?.title||e.recipeId}</div><div style="font-size:12px;color:var(--text3)">Mon–Thu · 2 servings/day</div></div>
          <button class="btn-t" style="color:var(--danger);font-size:20px;min-height:44px" onclick="removeBuilderLunch('${e.recipeId}')">×</button>
        </div>`;
      }).join('')}
      <div class="ssec">Add Lunch Salad</div>
      ${lunches.filter(l=>!ulunches.some(e=>e.recipeId===l.id)).map(l=>`<div class="pick-row" style="padding:12px 0;border-bottom:1px solid var(--bdr)" onclick="addBuilderLunch('${l.id}')">
          <div class="pick-info"><div class="pick-ttl">${l.title}</div><div class="pick-meta">${l.servings} servings total · ⏱ ${l.timeMinutes}min prep</div></div>
          <span style="color:var(--pr)">+</span>
        </div>`).join('')}
      <div class="sticky"><button class="btn-p" onclick="_builderState.step=5;render()">Next → Review</button></div>`;
  }

  if (s.step === 5) {
    // Calorie roll-up
    const rm2 = getRecipeMap();
    const dEs = s.entries.filter(e=>e.meal==='dinner');
    const band = CALORIE_WARN_BAND();
    const calRows = dEs.map(e=>{
      const cals = calcPairCals(e, rm2);
      const cls = cals ? (cals>=band[0]&&cals<=band[1]?'cal-ok':'cal-warn') : '';
      const day = (e.dayLabel||'').split(' ').slice(0,2).join(' ');
      const title = (rm2[e.recipeId]?.title||e.recipeId).replace('Finish — ','');
      return `<div class="cal-row"><span class="cal-lbl">${day} ${title}</span><span class="cal-v ${cls}">${cals?cals+' cal':'–'}</span></div>`;
    }).join('');

    return `
      <div class="ssec" style="margin-top:0">Review Plan</div>
      <div class="card" style="margin-bottom:12px">
        <div style="font-weight:600;margin-bottom:12px">Summary</div>
        <div style="font-size:13px;color:var(--text2)">
          <div>Batch cooks: ${s.entries.filter(e=>e.meal==='batch').length}</div>
          <div>Dinners: ${dEs.length}</div>
          <div>Lunches: ${[...new Set(s.entries.filter(e=>e.meal==='lunch').map(e=>e.recipeId))].length} recipes</div>
          <div style="margin-top:8px;font-size:12px;color:var(--text3)">Target: ~1,400 cal/pair</div>
        </div>
      </div>
      ${calRows?`<div class="card" style="margin-bottom:12px"><div style="font-weight:600;margin-bottom:8px">Calorie Roll-up</div>${calRows}</div>`:''}
      <div class="sticky"><button class="btn-p" onclick="savePlan()">✓ Save &amp; Activate Plan</button></div>`;
  }
  return '';
}

// ── Smart planner ─────────────────────────────────────────────────────────────
function cuisineOf(r){ return (r?.tags||[]).find(t=>CUISINE_TAGS.includes(t)) || 'other'; }
function likeScore(r){ return (r?.ratings?.liked ?? 3); }

function pickBalancedFinishes(baseIds, count, excludeIds){
  const finishes = state.recipes.filter(r=>r.isFinish && baseIds.includes(r.baseRecipeId) && !excludeIds.includes(r.id));
  const items = finishes.map(f=>({f, cu:cuisineOf(f), like:likeScore(f)}));
  const picked=[]; const cuisineCount={}; let lastCu=null;
  while(picked.length<count){
    const cands = items.filter(x=>!picked.includes(x));
    if(!cands.length) break;
    const pref = cands.filter(x=>x.cu!==lastCu);
    const use = (pref.length?pref:cands).slice();
    use.sort((a,b)=>((cuisineCount[a.cu]||0)-(cuisineCount[b.cu]||0))||(b.like-a.like));
    const pick=use[0];
    picked.push(pick); cuisineCount[pick.cu]=(cuisineCount[pick.cu]||0)+1; lastCu=pick.cu;
  }
  return reorderNoAdjacent(picked.map(x=>x.f), cuisineOf);
}

function reorderNoAdjacent(list, cuf){
  const pool=list.slice(); const out=[]; let last=null;
  while(pool.length){
    const counts={}; pool.forEach(x=>{const c=cuf(x);counts[c]=(counts[c]||0)+1;});
    let cands=pool.filter(x=>cuf(x)!==last);
    if(!cands.length) cands=pool.slice();
    cands.sort((a,b)=>counts[cuf(b)]-counts[cuf(a)]);
    const pick=cands[0];
    out.push(pick); pool.splice(pool.indexOf(pick),1); last=cuf(pick);
  }
  return out;
}

function baseFinishVariety(b){
  const fs=state.recipes.filter(r=>r.isFinish&&r.baseRecipeId===b.id);
  return new Set(fs.map(cuisineOf)).size;
}

function dinnerDate(idx, week){
  const d=new Date('2026-06-23'); d.setDate(d.getDate()+idx+(week===2?7:0));
  const dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return {dayDate:d.toISOString().split('T')[0], dayLabel:`${dayNames[d.getDay()]} ${monthNames[d.getMonth()]} ${d.getDate()}`};
}

function fillWeek1(baseIds){
  const s=_builderState;
  const existing=s.entries.filter(e=>e.meal==='dinner'&&(e.week===1||!e.week));
  const need=6-existing.length; if(need<=0) return 0;
  const excl=existing.map(e=>e.recipeId);
  const picks=pickBalancedFinishes(baseIds, need, excl);
  picks.forEach(f=>{
    const i=s.entries.filter(e=>e.meal==='dinner'&&(e.week===1||!e.week)).length;
    const {dayDate,dayLabel}=dinnerDate(i,1);
    s.entries.push({recipeId:f.id,servings:2,dayDate,dayLabel,meal:'dinner',week:1,cooked:false,ruleWarningDismissed:false});
  });
  return picks.length;
}

function autoFillWeek1(){
  const s=_builderState;
  const baseIds=s.entries.filter(e=>e.meal==='batch').map(e=>e.recipeId);
  if(!baseIds.length){ showToast('Pick a base first'); return; }
  const n=fillWeek1(baseIds);
  render(); showToast(n?`Added ${n} balanced dinners`:'Week 1 is already full');
}

function fillWeek2Silent(){
  const s=_builderState;
  const w1=s.entries.filter(e=>e.meal==='dinner'&&(e.week===1||!e.week));
  s.entries=s.entries.filter(e=>!(e.meal==='dinner'&&e.week===2));
  w1.forEach(e=>{
    const d=new Date(e.dayDate||'2026-06-23'); d.setDate(d.getDate()+7);
    const {dayDate,dayLabel}=dinnerDate(s.entries.filter(x=>x.meal==='dinner'&&x.week===2).length,2);
    s.entries.push({...e, dayDate, dayLabel, week:2, freezer:true, cooked:false});
  });
}

function suggestPlan(){
  const s=_builderState;
  const bases=state.recipes.filter(r=>r.isBase);
  if(!bases.length){ showToast('No base recipes in your library yet'); return; }
  const chicken=bases.filter(b=>(b.tags||[]).includes('chicken')).sort((a,b)=>(baseFinishVariety(b)-baseFinishVariety(a))||(likeScore(b)-likeScore(a)));
  const beef=bases.filter(b=>(b.tags||[]).includes('beef')).sort((a,b)=>(baseFinishVariety(b)-baseFinishVariety(a))||(likeScore(b)-likeScore(a)));
  const chosen=[]; if(chicken[0])chosen.push(chicken[0]); if(beef[0])chosen.push(beef[0]);
  for(const b of bases){ if(chosen.length<2 && !chosen.includes(b)) chosen.push(b); }
  s.kind='bulk-2week';
  s.entries=[];
  chosen.forEach(b=>s.entries.push({recipeId:b.id,servings:b.servings||12,dayDate:'2026-06-22',dayLabel:'Sun Jun 22 (batch cook)',meal:'batch',cooked:false,ruleWarningDismissed:false}));
  fillWeek1(chosen.map(b=>b.id));
  fillWeek2Silent();
  const lunches=state.recipes.filter(r=>(r.tags||[]).some(t=>['lunch','salad'].includes(t)));
  const lc=lunches.filter(l=>(l.tags||[]).includes('chicken'))[0];
  const lb=lunches.filter(l=>(l.tags||[]).includes('beef'))[0];
  const chosenL=[lc,lb].filter(Boolean);
  for(const l of lunches){ if(chosenL.length<2 && !chosenL.includes(l)) chosenL.push(l); }
  const mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const wkLunch=(start)=>{ const out=[]; for(let i=0;i<4;i++){ const d=new Date(start); d.setDate(d.getDate()+i); out.push({date:d.toISOString().split('T')[0], label:`${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]} ${mn[d.getMonth()]} ${d.getDate()}`}); } return out; };
  const lunchDays=[...wkLunch(new Date('2026-06-23')), ...wkLunch(new Date('2026-06-30'))]; // Mon–Thu, both weeks
  chosenL.forEach(l=>lunchDays.forEach(ld=>s.entries.push({recipeId:l.id,servings:2,dayDate:ld.date,dayLabel:ld.label,meal:'lunch',cooked:false,ruleWarningDismissed:false})));
  s.step=5; render(); showToast('Suggested a plan ✨ — tweak or save');
}

function startSuggested(){ navigate('#/plan/build'); suggestPlan(); }

function toggleBase(recipeId) {
  const s = _builderState;
  const existing = s.entries.findIndex(e=>e.recipeId===recipeId&&e.meal==='batch');
  if (existing >= 0) {
    s.entries.splice(existing,1);
  } else {
    const r = state.recipes.find(x=>x.id===recipeId);
    s.entries.push({recipeId, servings: r?.servings||12, dayDate:'2026-06-22', dayLabel:'Sun Jun 22 (batch cook)', meal:'batch', cooked:false, ruleWarningDismissed:false});
  }
  render();
}

function addBuilderFinish(recipeId, week) {
  const s = _builderState;
  const r = state.recipes.find(x=>x.id===recipeId);
  const weekDinners = s.entries.filter(e=>e.meal==='dinner'&&(e.week===week||(!e.week&&week===1)));
  const dayOffset = weekDinners.length;
  const baseDate = new Date('2026-06-23');
  baseDate.setDate(baseDate.getDate() + dayOffset + (week===2?7:0));
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayLabel = `${dayNames[baseDate.getDay()]} ${monthNames[baseDate.getMonth()]} ${baseDate.getDate()}`;
  s.entries.push({recipeId, servings:2, dayDate:baseDate.toISOString().split('T')[0], dayLabel, meal:'dinner', week, cooked:false, ruleWarningDismissed:false});
  render();
}

function removeBuilderEntry(meal, relIdx) {
  const s = _builderState;
  const filtered = s.entries.filter(e=>e.meal===meal);
  const entry = filtered[relIdx];
  const absIdx = s.entries.indexOf(entry);
  if (absIdx >= 0) s.entries.splice(absIdx,1);
  render();
}

function removeBuilderWeek2(relIdx) {
  const s = _builderState;
  const w2 = s.entries.filter(e=>e.meal==='dinner'&&e.week===2);
  const entry = w2[relIdx];
  const absIdx = s.entries.indexOf(entry);
  if (absIdx >= 0) s.entries.splice(absIdx,1);
  render();
}

function autoFillWeek2() {
  const s = _builderState;
  const w1 = s.entries.filter(e=>e.meal==='dinner'&&(e.week===1||!e.week));
  // Remove existing w2
  s.entries = s.entries.filter(e=>!(e.meal==='dinner'&&e.week===2));
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  w1.forEach((e,i)=>{
    const d = new Date(e.dayDate||'2026-06-23');
    d.setDate(d.getDate()+7);
    const dayLabel = `${dayNames[d.getDay()]} ${monthNames[d.getMonth()]} ${d.getDate()}`;
    s.entries.push({...e, dayDate:d.toISOString().split('T')[0], dayLabel, week:2, freezer:true, cooked:false});
  });
  render();
}

function addBuilderLunch(recipeId) {
  const s = _builderState;
  const days = ['2026-06-23','2026-06-24','2026-06-25','2026-06-26'];
  const labels = ['Mon Jun 23','Tue Jun 24','Wed Jun 25','Thu Jun 26'];
  days.forEach((d,i)=>s.entries.push({recipeId, servings:2, dayDate:d, dayLabel:labels[i], meal:'lunch', cooked:false, ruleWarningDismissed:false}));
  render();
}

function removeBuilderLunch(recipeId) {
  const s = _builderState;
  s.entries = s.entries.filter(e=>!(e.meal==='lunch'&&e.recipeId===recipeId));
  render();
}

async function savePlan() {
  const s = _builderState;
  const id = s.existingId || slugify(s.label) + '-' + Date.now().toString(36);
  const now = new Date().toISOString();
  const plan = {
    id, label: s.label, servingsDefault:2, note:null,
    entries: s.entries, kind: s.kind, isActive:true,
    createdAt: s.editingExisting ? (getActivePlan()?.createdAt||now) : now,
    updatedAt: now, _key: id,
  };
  // Deactivate other plans
  for (const p of state.mealPlans) {
    if (p.id !== id && p.isActive) {
      p.isActive = false;
      await dbPut('mealPlans', {...p, _key:p.id});
    }
  }
  await dbPut('mealPlans', plan);
  const idx = state.mealPlans.findIndex(p=>p.id===id);
  if (idx >= 0) state.mealPlans[idx] = plan;
  else state.mealPlans.push(plan);
  state.mealPlans.forEach(p=>{ if(p.id!==id) p.isActive=false; });
  _builderState = null;
  showToast('Plan saved & activated!');
  navigate('#/plan');
}

