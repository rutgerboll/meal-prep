// ── Cookbook Backlog ──────────────────────────────────────────────────────────
function renderBacklogScreen() {
  const backlog = state.cookbookBacklog || [];
  const notCaptured = backlog.filter(b=>b.captureStatus==='not-captured');
  const captured = backlog.filter(b=>b.captureStatus!=='not-captured');
  const rm = getRecipeMap();

  return `
    <div class="sh"><button class="back" onclick="navigate('#/more')">‹</button><span class="stitle">Cookbook Backlog</span></div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:16px">${backlog.length} photos · ${notCaptured.length} not yet captured</div>
    ${notCaptured.length ? `
      <div class="ssec" style="margin-top:0">Not Captured (${notCaptured.length})</div>
      <div style="font-size:12px;color:var(--text3);margin:-4px 0 10px">Tap a photo to capture it into a recipe (the capture flow runs in Claude).</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
        ${notCaptured.map(b=>`<div style="position:relative;aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--bg-in);cursor:pointer" onclick="captureFromBacklog('${b.filename}')">
          ${b.thumbnail?`<img src="${b.thumbnail}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px">📷</div>`}
          <div style="position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,0,.72));color:#fff;font-size:10px;padding:10px 6px 4px;font-weight:600">＋ Capture</div>
        </div>`).join('')}
      </div>` : ''}
    ${captured.length ? `
      <div class="ssec">Captured (${captured.length})</div>
      ${captured.map(b=>{
          const recipe = b.recipeId ? rm[b.recipeId] : null;
          return `<div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--bdr)">
            ${b.thumbnail?`<img src="${b.thumbnail}" alt="" loading="lazy" style="width:48px;height:48px;border-radius:8px;object-fit:cover">`:`<div style="width:48px;height:48px;background:#14532D;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px">✅</div>`}
            <div style="flex:1">
              <div style="font-size:14px;color:var(--text2)">${b.filename}</div>
              ${recipe?`<div style="font-size:12px;color:var(--pr);cursor:pointer" onclick="navigate('#/recipes/${recipe.id}')">${recipe.title}</div>`:'<div style="font-size:12px;color:var(--text3)">Captured</div>'}
            </div>
          </div>`;
        }).join('')}` : ''}`;
}

async function captureFromBacklog(filename) {
  // Navigate to capture pre-tagged with cookbook source
  navigate('#/recipes/new');
  // After render, set defaults
  setTimeout(() => {
    const form = document.querySelector('#capture-form');
    if (form) {
      const src = form.querySelector('[name="source"]');
      if (src) src.value = 'cookbook';
    }
  }, 100);
}

