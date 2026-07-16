// ── Cook Screen ───────────────────────────────────────────────────────────────
function dinnerPool(){
  const plan=getActivePlan(); const rm=getRecipeMap();
  const ids=[...new Set(plan.entries.filter(e=>e.meal==='dinner').map(e=>e.recipeId))];
  return ids.map(id=>({id, title:(rm[id]?.title||id).replace('Finish — ','')}));
}
function saladPool(){ const plan=getActivePlan(); return [...new Set(plan.entries.filter(e=>e.meal==='lunch').map(e=>e.recipeId))]; }
// Every day gets a lunch slot now (incl. weekends). Shown even when the salad pool is
// empty so the day always offers lunch + dinner; the carousel just falls back to "Didn't cook".
function dayHasLunch(date){ return true; }
function toggleDayExpand(date){ window._cookExpanded=window._cookExpanded||{}; window._cookExpanded[date]=!window._cookExpanded[date]; render(); }
function toggleSec(key){ window._cookSec=window._cookSec||{}; window._cookSec[key]=!window._cookSec[key]; render(); }
let _cookLogState = null;

/* Quick "log" from the recipe page for a recipe that's already been rated —
   repeats the last rating instead of opening the full rate-it modal. */
async function quickLogRecipe(recipeId, planIdx) {
  const rm = getRecipeMap();
  const r = rm[recipeId];
  const prev = (r?.feedbackLog || [])[(r?.feedbackLog || []).length - 1];
  if (!prev) { startCookLog(planIdx); return; }
  await saveCookFeedback(recipeId, planIdx, {
    difficulty: prev.difficulty, actualMinutes: prev.actualMinutes, liked: prev.liked, changeNote: '',
  });
}

function startCookLog(planIdx) {
  const plan = getActivePlan();
  const rm = getRecipeMap();
  let recipeId = null, recipe = null;
  if (planIdx >= 0 && plan) {
    recipeId = plan.entries[planIdx].recipeId;
    recipe = rm[recipeId];
  }
  _cookLogState = { planIdx, recipeId, difficulty:3, actualMinutes: recipe?.timeMinutes||30, liked:3, changeNote:'', recipeSearch:'' };
  renderCookModal();
}

function setRating(group, val){
  if(!_cookLogState) return;
  if(group==='diff') _cookLogState.difficulty=val; else _cookLogState.liked=val;
  const sel = group==='diff' ? '#diff-stars .star' : '#like-stars .star';
  document.querySelectorAll(sel).forEach((x,j)=>x.classList.toggle('on', j<val));
}
function renderCookModal() {
  const s = _cookLogState;
  const rm = getRecipeMap();
  const recipe = s.recipeId ? rm[s.recipeId] : null;
  const filtered = s.recipeSearch 
    ? state.recipes.filter(r=>r.title.toLowerCase().includes(s.recipeSearch.toLowerCase())).slice(0,20)
    : state.recipes.slice(0,20);

  const existingOv = document.getElementById('cook-modal-ov');
  if (existingOv) existingOv.remove();

  const ov = document.createElement('div');
  ov.className = 'ov';
  ov.id = 'cook-modal-ov';
  ov.innerHTML = `
    <div class="sheet">
      <div class="hdl"></div>
      <div class="shd">
        <span class="sht">Log a Cook</span>
        <button class="btn-t" onclick="document.getElementById('cook-modal-ov').remove()">✕</button>
      </div>
      <div class="shb">
        ${recipe ? `<div class="card card-alt" style="margin-bottom:16px">
          <div style="font-size:17px;font-weight:600">${recipe.title.replace('Finish — ','')}</div>
          <button class="btn-t" style="font-size:12px;padding:0" onclick="_cookLogState.recipeId=null;_cookLogState.planIdx=-1;renderCookModal()">Change recipe</button>
        </div>` : `<div style="margin-bottom:16px">
          <div class="sb"><span>🔍</span><input placeholder="Search recipes…" oninput="_cookLogState.recipeSearch=this.value;renderCookModal()" value="${s.recipeSearch}"></div>
          <div style="max-height:200px;overflow-y:auto;border:1px solid var(--bdr);border-radius:8px">
            ${filtered.map(r=>`<div class="pick-row" onclick="_cookLogState.recipeId='${r.id}';_cookLogState.recipeSearch='';renderCookModal()">
              <div class="pick-info"><div class="pick-ttl">${r.title.replace('Finish — ','')}</div></div>
            </div>`).join('')}
          </div>
        </div>`}
        
        <div class="fld"><label>Difficulty (1-5)</label>
          <div class="stars" id="diff-stars">
            ${[1,2,3,4,5].map(i=>`<span class="star ${s.difficulty>=i?'on':''}" onclick="setRating('diff',${i})">★</span>`).join('')}
          </div>
        </div>
        <div class="fld"><label>Actual time (minutes)</label>
          <div class="stepper">
            <button type="button" class="stp-btn" onclick="_cookLogState.actualMinutes=Math.max(5,_cookLogState.actualMinutes-5);document.getElementById('stp-time').textContent=_cookLogState.actualMinutes">−</button>
            <span class="stp-v" id="stp-time">${s.actualMinutes}</span>
            <button type="button" class="stp-btn" onclick="_cookLogState.actualMinutes+=5;document.getElementById('stp-time').textContent=_cookLogState.actualMinutes">+</button>
          </div>
        </div>
        <div class="fld"><label>Liked (1-5 stars)</label>
          <div class="stars" id="like-stars">
            ${[1,2,3,4,5].map(i=>`<span class="star ${s.liked>=i?'on':''}" onclick="setRating('like',${i})">★</span>`).join('')}
          </div>
        </div>
        <div class="fld"><label>What I'd change next time</label>
          <textarea placeholder="Optional notes…" oninput="_cookLogState.changeNote=this.value" style="width:100%;background:var(--bg-in);border:1px solid var(--bdr);border-radius:8px;color:var(--text);font-size:15px;padding:12px;min-height:80px;resize:vertical;font-family:var(--font)">${s.changeNote}</textarea>
        </div>
        <button class="btn-p" onclick="submitCookLog()">Save Feedback</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
}

async function submitCookLog() {
  const s = _cookLogState;
  if (!s.recipeId) { showToast('Select a recipe first'); return; }
  await saveCookFeedback(s.recipeId, s.planIdx, {
    difficulty: s.difficulty,
    actualMinutes: s.actualMinutes,
    liked: s.liked,
    changeNote: s.changeNote,
  });
  document.getElementById('cook-modal-ov')?.remove();
}

