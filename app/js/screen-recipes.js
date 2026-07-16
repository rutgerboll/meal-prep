// ── Recipes Screen ────────────────────────────────────────────────────────────
function renderRecipesScreen() {
  const q = (window._recipeSearch||'').toLowerCase();
  const filter = window._recipeFilter || '';
  let recipes = state.recipes;
  if (q) recipes = recipes.filter(r => r.title.toLowerCase().includes(q) || (r.tags||[]).some(t=>t.includes(q)));
  if (filter === 'base') recipes = recipes.filter(r=>r.isBase);
  else if (filter === 'finish') recipes = recipes.filter(r=>r.isFinish);
  else if (filter === 'fav') recipes = recipes.filter(r=>r.ratings?.liked >= 4);
  else if (filter === 'new') recipes = recipes.filter(r=>!r.ratings?.cookCount);
  else if (filter) recipes = recipes.filter(r=>(r.tags||[]).includes(filter));

  const filters = [
    {k:'',l:'All'},{k:'base',l:'Bases'},{k:'finish',l:'Finishes'},
    {k:'fav',l:'⭐ Liked'},{k:'new',l:'Never Cooked'},
    {k:'chicken',l:'Chicken'},{k:'beef',l:'Beef'},{k:'salad',l:'Salads'},
  ];

  return `
    <div class="sh"><span class="stitle">Recipes</span></div>
    <div class="sb"><span>🔍</span><input placeholder="Search recipes…" value="${(window._recipeSearch||'').replace(/"/g,'&quot;')}" oninput="window._recipeSearch=this.value;render()"></div>
    <div class="chip-row" style="margin-bottom:12px">
      ${filters.map(f=>`<span class="chip ${filter===f.k?'sel':''}" onclick="window._recipeFilter='${f.k}';render()">${f.l}</span>`).join('')}
    </div>
    ${recipes.length ? recipes.map(r => renderRecipeCard(r)).join('') : '<div style="padding:32px;text-align:center;color:var(--text3)">No recipes found</div>'}
    <button class="fab" onclick="navigate('#/recipes/new')">+</button>`;
}

function renderRecipeCard(r) {
  const col = getAvatarColor(r.tags||[]);
  const liked = r.ratings?.liked ? '★'.repeat(Math.round(r.ratings.liked)) : '';
  const badge = r.isBase ? '<span class="badge badge-b">BASE</span>' : r.isFinish ? '<span class="badge badge-f">FINISH</span>' : '';
  return `<div class="rc" onclick="navigate('#/recipes/${r.id}')">
    ${r.thumbnail?`<img class="av" src="${r.thumbnail}" alt="" style="object-fit:cover">`:`<div class="av" style="background:${col}">${r.title[0]}</div>`}
    <div class="rc-info">
      <div class="rc-ttl">${r.title.replace('Finish — ','')}</div>
      <div class="tr">${(r.tags||[]).slice(0,3).map(t=>`<span class="chip ${t}">${t}</span>`).join('')} ${badge}</div>
      <div class="rc-meta"><span>⏱ ${r.timeMinutes}m</span>${r.caloriesPerServing?`<span>🔥 ${r.caloriesPerServing} cal</span>`:''}${liked?`<span style="color:var(--pr)">${liked}</span>`:''}</div>
    </div>
  </div>`;
}

// ── Recipe Detail ─────────────────────────────────────────────────────────────
function renderRecipeDetail(id) {
  const r = state.recipes.find(x=>x.id===id);
  if (!r) return '<div class="sh"><button class="back" onclick="navigate(state.prevRoute||\'#/recipes\')">‹</button><span class="stitle">Not found</span></div>';
  const rm = getRecipeMap();
  const col = getAvatarColor(r.tags||[]);
  const base = r.baseRecipeId ? rm[r.baseRecipeId] : null;
  const finishes = r.isBase ? state.recipes.filter(x=>x.baseRecipeId===r.id) : [];
  const band = CALORIE_WARN_BAND();
  const planEntryIdx = (() => {
    const plan = getActivePlan();
    if (!plan) return -1;
    return plan.entries.findIndex(e=>e.recipeId===r.id&&!e.cooked);
  })();

  return `
    <div class="sh">
      <button class="back" onclick="navigate(state.prevRoute||'#/recipes')">‹</button>
      <span class="stitle" style="font-size:18px;line-height:1.2">${r.title.replace('Finish — ','')}</span>
    </div>
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;gap:12px;align-items:flex-start">
        ${r.thumbnail?`<img src="${r.thumbnail}" alt="" style="width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0">`:`<div class="av" style="background:${col};width:64px;height:64px;font-size:28px">${r.title[0]}</div>`}
        <div>
          <div class="tr">${(r.tags||[]).map(t=>`<span class="chip ${t}">${t}</span>`).join('')}</div>
          <div style="font-size:13px;color:var(--text3);display:flex;gap:16px;margin-top:8px">
            <span>⏱ ${r.timeMinutes} min</span>
            <span>👥 ${r.servings} servings</span>
            ${r.caloriesPerServing?`<span>🔥 ${r.caloriesPerServing} cal/serving</span>`:''}
          </div>
          ${r.isBase?`<span class="badge badge-b" style="margin-top:8px;display:inline-flex">BASE</span>`:''}
          ${r.isFinish?`<span class="badge badge-f" style="margin-top:8px;display:inline-flex">FINISH</span>`:''}
        </div>
      </div>
      ${r.note?`<div style="margin-top:12px;font-size:13px;color:var(--text3)">${r.note}</div>`:''}
    </div>
    ${(()=>{const steps=r.prepAhead||[];const th=thawHoursFor(r,rm);if(!steps.length&&th==null)return '';const thawTxt=th==null?'':(th>=24?`${th/24} ${th/24===1?'day':'days'}`:`${th} h`);return `<div class="card" style="margin-bottom:12px;border-left:4px solid var(--pr)"><div style="font-weight:600;font-size:14px;margin-bottom:6px">🌙 Prep ahead</div>${th!=null?`<div style="font-size:13px;color:var(--text2);padding:3px 0">• Thaw from the freezer ~${thawTxt} ahead${r.thawHoursAhead==null?' (base protein)':''}.</div>`:''}${steps.map(s=>`<div style="font-size:13px;color:var(--text2);padding:3px 0">• ${esc(s)}</div>`).join('')}</div>`;})()}
    ${base?(()=>{const need=baseQtyFor(r,base);return `<div class="card" style="margin-bottom:12px"><div style="font-size:13px;color:var(--text3)">Uses base protein →</div><div class="day-row" style="padding:8px 0;border:none" onclick="navigate('#/recipes/${base.id}')"><div class="day-ctr"><div class="day-ttl">${base.title}</div>${need?`<div style="font-size:12px;color:var(--text3)">Needs ${fmtQty(need.qty)} ${need.unit} ${esc(need.item)}</div>`:''}</div><span style="color:var(--pr)">›</span></div></div>`;})():''}
    ${finishes.length?`<div class="card" style="margin-bottom:12px"><div style="font-size:13px;color:var(--text3);margin-bottom:8px">Finish recipes using this base:</div>${finishes.map(f=>{const need=baseQtyFor(f,r);return `<div class="day-row" style="padding:8px 0;border-bottom:1px solid var(--bdrs)" onclick="navigate('#/recipes/${f.id}')"><div class="day-ctr"><div class="day-ttl">${f.title.replace('Finish — ','')}</div>${need?`<div style="font-size:12px;color:var(--text3)">Needs ${fmtQty(need.qty)} ${need.unit} ${esc(need.item)}</div>`:''}</div><span style="color:var(--pr)">›</span></div>`;}).join('')}</div>`:''}
    <div class="card" style="margin-bottom:12px">
      <div class="ssec" style="margin-top:0">Ingredients</div>
      ${(()=>{const rows=[];const baseNeed=r.isFinish&&base?baseQtyFor(r,base):null;if(baseNeed)rows.push(`<div class="ing-row"><span class="ii">${esc(baseNeed.item)}</span><span class="iq">${fmtQty(baseNeed.qty)}</span><span class="iu">${baseNeed.unit}</span><span style="font-size:11px;color:var(--pr)">from base</span></div>`);rows.push(...r.ingredients.map(ing=>`<div class="ing-row"><span class="ii">${ing.item}</span><span class="iq">${fmtQty(ing.qty)}</span><span class="iu">${ing.unit}</span>${ing.staple?'<span style="font-size:11px;color:var(--text3)">✓pantry</span>':''}</div>`));return rows.length?rows.join(''):`<div style="font-size:13px;color:var(--text3)">${r.isFinish?'None — everything comes prepped and portioned from the base.':'None listed.'}</div>`;})()}
    </div>
    ${r.steps?.length?`<div class="card" style="margin-bottom:12px"><div class="ssec" style="margin-top:0">Steps</div>${r.steps.map((s,i)=>`<div class="step-txt"><span class="step-n">${i+1}.</span>${s.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</div>`).join('')}</div>`:''}
    ${r.ratings?.cookCount?`<div class="card" style="margin-bottom:12px"><div class="ssec" style="margin-top:0">Ratings</div><div class="ratings-row"><div class="rat-item"><div class="rat-v">${r.ratings.cookCount}</div><div class="rat-l">Cooks</div></div><div class="rat-item"><div class="rat-v">${fmtStars(r.ratings.liked)}</div><div class="rat-l">Liked</div></div><div class="rat-item"><div class="rat-v">${r.ratings.avgDifficulty?.toFixed(1)||'–'}/5</div><div class="rat-l">Difficulty</div></div><div class="rat-item"><div class="rat-v">${r.ratings.avgActualMinutes ? Math.round(r.ratings.avgActualMinutes)+'m' : '–'}</div><div class="rat-l">Avg Time</div></div></div></div>`:''}
    ${r.feedbackLog?.length?`<div class="card" style="margin-bottom:12px"><div class="ssec" style="margin-top:0">Feedback Log</div>${[...r.feedbackLog].reverse().map(e=>`<div class="feed-entry"><div class="feed-date">${e.date}</div>${e.text}</div>`).join('')}</div>`:''}
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn-s" style="flex:1" onclick="navigate('#/recipes/edit/${r.id}')">Edit</button>
      <button class="btn-s" style="flex:1" onclick="navigate('#/plan/build')">Add to plan</button>
    </div>
    <div style="margin-top:8px${r.feedbackLog?.length?';display:flex;gap:8px':''}">
      ${r.feedbackLog?.length?`<button class="btn-p" style="flex:1;height:44px" onclick="quickLogRecipe('${r.id}', ${planEntryIdx >= 0 ? planEntryIdx : -1})">Log</button>
      <button class="btn-s" style="flex:1;height:44px" onclick="startCookLog(${planEntryIdx >= 0 ? planEntryIdx : -1})">Rate & Log</button>`
      :`<button class="btn-p" style="width:100%;height:44px" onclick="startCookLog(${planEntryIdx >= 0 ? planEntryIdx : -1})">Log a Cook</button>`}
    </div>`;
}


// ── Recipe Capture / Edit ─────────────────────────────────────────────────────
function renderCapture() {
  const editId = state.activeRoute.startsWith('#/recipes/edit/') ? state.activeRoute.split('/')[3] : null;
  const existing = editId ? state.recipes.find(r=>r.id===editId) : null;
  const r = existing || {title:'',servings:2,timeMinutes:30,tags:[],source:'own',caloriesPerServing:'',note:'',isBase:false,isFinish:false,baseRecipeId:'',ingredients:[],steps:[]};
  
  const bases = state.recipes.filter(x=>x.isBase);
  const aisles = ['meat','produce','dairy','refrigerated','frozen','spices','international','canned','pasta-grains','condiments','bakery'];
  const ings = (r.ingredients.length ? r.ingredients : [{item:'',qty:1,unit:'each',aisle:'produce',staple:false}]);

  return `
    <div class="sh">
      <button class="back" onclick="navigate(state.prevRoute||'#/recipes')">‹</button>
      <span class="stitle">${existing?'Edit Recipe':'New Recipe'}</span>
    </div>
    <form id="capture-form" onsubmit="saveCapture(event,'${editId||''}')">
      <div class="fld"><label>Title *</label><input name="title" value="${(r.title||'').replace(/"/g,'&quot;')}" placeholder="Recipe title" required></div>
      <div style="display:flex;gap:8px">
        <div class="fld" style="flex:1"><label>Servings</label><input name="servings" type="number" value="${r.servings}" min="1" inputmode="numeric"></div>
        <div class="fld" style="flex:1"><label>Time (min)</label><input name="timeMinutes" type="number" value="${r.timeMinutes}" min="1" inputmode="numeric"></div>
        <div class="fld" style="flex:1"><label>Cal/serving</label><input name="calories" type="number" value="${r.caloriesPerServing||''}" inputmode="numeric" placeholder="optional"></div>
      </div>
      <div class="fld"><label>Type</label>
        <select name="type" onchange="updateCaptureType(this)">
          <option value="standalone" ${!r.isBase&&!r.isFinish?'selected':''}>Standalone</option>
          <option value="base" ${r.isBase?'selected':''}>Base (bulk protein)</option>
          <option value="finish" ${r.isFinish?'selected':''}>Finish (uses a base)</option>
        </select>
      </div>
      <div class="fld" id="base-picker-field" style="${r.isFinish?'':'display:none'}"><label>Base recipe *</label>
        <select name="baseRecipeId">
          <option value="">-- select base --</option>
          ${bases.map(b=>`<option value="${b.id}" ${r.baseRecipeId===b.id?'selected':''}>${b.title}</option>`).join('')}
        </select>
      </div>
      <div class="fld"><label>Source</label>
        <select name="source">
          ${['own','generated','web','cookbook'].map(s=>`<option value="${s}" ${r.source===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="fld"><label>Tags (comma-separated)</label><input name="tags" value="${(r.tags||[]).join(', ')}" placeholder="chicken, italian, batch-friendly…"></div>
      <div class="fld"><label>Note</label><textarea name="note" placeholder="Optional notes">${r.note||''}</textarea></div>
      
      <div class="ssec">Ingredients</div>
      <div id="ing-editor">
        ${ings.map((ing,i)=>`<div class="ing-row" id="ing-${i}" style="gap:4px;flex-wrap:wrap">
          <input style="flex:2;min-width:100px;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);height:36px;padding:0 8px;font-size:14px" placeholder="item" value="${(ing.item||'').replace(/"/g,'&quot;')}" name="ing_item_${i}">
          <input style="width:52px;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);height:36px;padding:0 6px;font-size:14px;text-align:right" type="number" step="0.01" placeholder="qty" value="${ing.qty||''}" name="ing_qty_${i}">
          <input style="width:64px;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);height:36px;padding:0 6px;font-size:14px" placeholder="unit" value="${ing.unit||''}" name="ing_unit_${i}">
          <select style="width:90px;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);height:36px;padding:0 4px;font-size:13px" name="ing_aisle_${i}">
            ${aisles.map(a=>`<option value="${a}" ${ing.aisle===a?'selected':''}>${a}</option>`).join('')}
          </select>
          <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text3)"><input type="checkbox" name="ing_staple_${i}" ${ing.staple?'checked':''}> pantry</label>
          <button type="button" onclick="removeIngRow(${i})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:20px;width:32px">×</button>
        </div>`).join('')}
      </div>
      <button type="button" class="btn-t" style="margin:8px 0" onclick="addIngRow()">+ Add ingredient</button>
      
      <div class="ssec">Steps</div>
      <div id="steps-editor">
        ${(r.steps.length?r.steps:['']).map((s,i)=>`<div style="display:flex;gap:8px;margin-bottom:8px">
          <span style="color:var(--pr);font-weight:700;padding-top:12px">${i+1}.</span>
          <textarea name="step_${i}" style="flex:1;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:60px;resize:vertical;font-family:var(--font)">${s}</textarea>
          <button type="button" onclick="removeStep(${i})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:20px;align-self:flex-start;padding:8px 4px">×</button>
        </div>`).join('')}
      </div>
      <button type="button" class="btn-t" style="margin:8px 0" onclick="addStep()">+ Add step</button>
      
      <div class="sticky"><button type="submit" class="btn-p">Save Recipe</button></div>
    </form>`;
}

function updateCaptureType(sel) {
  const f = document.getElementById('base-picker-field');
  if (f) f.style.display = sel.value === 'finish' ? '' : 'none';
}

function addIngRow() {
  const ed = document.getElementById('ing-editor');
  const rows = ed.querySelectorAll('.ing-row');
  const i = rows.length;
  const aisles = ['meat','produce','dairy','refrigerated','frozen','spices','international','canned','pasta-grains','condiments','bakery'];
  const div = document.createElement('div');
  div.className = 'ing-row'; div.id = `ing-${i}`; div.style.cssText = 'gap:4px;flex-wrap:wrap';
  div.innerHTML = `<input style="flex:2;min-width:100px;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);height:36px;padding:0 8px;font-size:14px" placeholder="item" name="ing_item_${i}">
    <input style="width:52px;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);height:36px;padding:0 6px;font-size:14px;text-align:right" type="number" step="0.01" placeholder="qty" name="ing_qty_${i}">
    <input style="width:64px;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);height:36px;padding:0 6px;font-size:14px" placeholder="unit" name="ing_unit_${i}">
    <select style="width:90px;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);height:36px;padding:0 4px;font-size:13px" name="ing_aisle_${i}">
      ${aisles.map(a=>`<option value="${a}">${a}</option>`).join('')}
    </select>
    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text3)"><input type="checkbox" name="ing_staple_${i}"> pantry</label>
    <button type="button" onclick="removeIngRow(${i})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:20px;width:32px">×</button>`;
  ed.appendChild(div);
}

function removeIngRow(i) {
  const row = document.getElementById(`ing-${i}`);
  if (row) row.remove();
}

function addStep() {
  const ed = document.getElementById('steps-editor');
  const n = ed.querySelectorAll('div').length;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px';
  div.innerHTML = `<span style="color:var(--pr);font-weight:700;padding-top:12px">${n+1}.</span>
    <textarea name="step_${n}" style="flex:1;background:var(--bg-in);border:1px solid var(--bdr);border-radius:6px;color:var(--text);font-size:14px;padding:8px;min-height:60px;resize:vertical;font-family:var(--font)"></textarea>
    <button type="button" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:20px;align-self:flex-start;padding:8px 4px">×</button>`;
  ed.appendChild(div);
}

function removeStep(i) { /* handled inline */ }

async function saveCapture(e, editId) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const type = fd.get('type');
  const title = fd.get('title').trim();
  if (!title) { showToast('Title required'); return; }
  
  const ingredients = [];
  let i = 0;
  while (true) {
    const item = fd.get(`ing_item_${i}`);
    if (item === null) break;
    if (item.trim()) {
      ingredients.push({
        item: item.trim(),
        qty: parseFloat(fd.get(`ing_qty_${i}`)) || 0,
        unit: (fd.get(`ing_unit_${i}`) || 'each').trim(),
        aisle: fd.get(`ing_aisle_${i}`) || 'produce',
        staple: !!fd.get(`ing_staple_${i}`),
      });
    }
    i++;
  }
  
  const steps = [];
  let s = 0;
  while (true) {
    const step = fd.get(`step_${s}`);
    if (step === null) break;
    if (step.trim()) steps.push(step.trim());
    s++;
  }
  
  const tags = (fd.get('tags')||'').split(',').map(t=>t.trim()).filter(Boolean);
  const baseRecipeId = fd.get('baseRecipeId') || null;
  
  const now = new Date().toISOString();
  const id = editId || slugify(title) + '-' + Date.now().toString(36);
  const recipe = {
    id, title,
    servings: parseInt(fd.get('servings'))||2,
    timeMinutes: parseInt(fd.get('timeMinutes'))||30,
    tags, source: fd.get('source')||'own',
    caloriesPerServing: fd.get('calories') ? parseInt(fd.get('calories')) : null,
    note: fd.get('note')||null,
    isBase: type==='base', isFinish: type==='finish',
    baseRecipeId: type==='finish' ? baseRecipeId : null,
    ingredients, steps,
    ratings: editId ? (state.recipes.find(r=>r.id===editId)?.ratings || {cookCount:0,avgDifficulty:null,avgActualMinutes:null,liked:null}) : {cookCount:0,avgDifficulty:null,avgActualMinutes:null,liked:null},
    feedbackLog: editId ? (state.recipes.find(r=>r.id===editId)?.feedbackLog || []) : [],
    sourcePhotoRef: null,
    createdAt: editId ? (state.recipes.find(r=>r.id===editId)?.createdAt||now) : now,
    updatedAt: now, _key: id,
  };
  
  await dbPut('recipes', recipe);
  if (editId) {
    const idx = state.recipes.findIndex(r=>r.id===editId);
    if (idx >= 0) state.recipes[idx] = recipe;
    else state.recipes.push(recipe);
  } else {
    state.recipes.push(recipe);
  }
  showToast(editId ? 'Recipe updated!' : 'Recipe saved!');
  navigate(`#/recipes/${id}`);
}

