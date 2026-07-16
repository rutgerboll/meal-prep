// ── Grocery Algorithm (§5.3) ──────────────────────────────────────────────────
const AISLE_ORDER = ['frozen','dairy','refrigerated','spices','international','canned','pasta-grains','condiments','meat','produce','bakery'];
const PERISHABLE_AISLES = new Set(['produce','bakery']);
function planWeekCount(plan){
  const ds=plan.entries.map(e=>e.dayDate).filter(Boolean).sort();
  if(!ds.length) return 1;
  const start=new Date(ds[0]+'T00:00:00'), end=new Date(ds[ds.length-1]+'T00:00:00');
  return Math.max(1, Math.floor((end-start)/(7*86400000))+1);
}
function entryWeekIndex(plan, e){
  const ds=plan.entries.map(x=>x.dayDate).filter(Boolean).sort();
  if(!ds.length) return 1;
  const start=new Date(ds[0]+'T00:00:00'); const d=new Date((e.dayDate||ds[0])+'T00:00:00');
  return Math.max(1, Math.floor((d-start)/(7*86400000))+1);
}
function weekStartLabel(plan, k){
  const ds=plan.entries.map(e=>e.dayDate).filter(Boolean).sort();
  const start=new Date(ds[0]+'T00:00:00'); const d=new Date(start.getTime()+(k-1)*7*86400000);
  return `${d.getMonth()+1}/${d.getDate()}`;
}
function aisleIdx(a){ const i=AISLE_ORDER.indexOf(a); return i<0?AISLE_ORDER.length:i; }
function buildWeeklyLists(plan, rm, pantryItems, purchaseUnits, aliasMap){
  const weeks=planWeekCount(plan);
  const full=generateGroceryList(plan, rm, pantryItems, purchaseUnits, aliasMap, null);
  if(weeks<=1){ return { weekly:[{week:1,label:'Buy now',items:full.items}], unknownUnits:full.unknownUnits, warnings:full.warnings }; }
  const isP = it => PERISHABLE_AISLES.has(it.aisle);
  const shelf = full.items.filter(it=>!isP(it));
  const weekly=[];
  for(let k=1;k<=weeks;k++){
    const sub={...plan, entries:plan.entries.filter(e=>entryWeekIndex(plan,e)===k)};
    const wl=generateGroceryList(sub, rm, pantryItems, purchaseUnits, aliasMap, null);
    const persh=wl.items.filter(isP);
    if(k===1){
      const items=[...shelf,...persh].sort((a,b)=>aisleIdx(a.aisle)-aisleIdx(b.aisle));
      weekly.push({week:1,label:'Buy now',items});
    } else if(persh.length){
      persh.sort((a,b)=>aisleIdx(a.aisle)-aisleIdx(b.aisle));
      weekly.push({week:k,label:`Buy for week ${k} · around ${weekStartLabel(plan,k)}`,items:persh});
    }
  }
  return { weekly, unknownUnits:full.unknownUnits, warnings:full.warnings };
}

const PANTRY_AISLE_MAP = {pantry:'condiments'};
const CALORIE_WARN_BAND = () => state.preferences.calorieWarnBand || [1200, 1800];

const WEIGHT_TO_OZ = {oz:1, lb:16};
const VOL_TO_TSP = {tsp:1, tbsp:3, cup:48, 'fl oz':6};

// Name variants that must collapse to one aggregation key. Lives in code (not
// the seeded aliasMap) so already-installed apps pick fixes up with the app
// shell update; the user-editable aliasMap still wins on conflicts.
const BUILTIN_ALIASES = {
  'parmesan cheese':'parmesan', 'grated parmesan':'parmesan',
  'parmigiano-reggiano':'parmesan', 'parmigiano reggiano':'parmesan',
  'mozzarella cheese':'mozzarella', 'shredded mozzarella':'mozzarella',
  'feta':'feta cheese', 'crumbled feta':'feta cheese',
  'scallions':'green onions', 'scallion':'green onions',
  'yellow onion':'onion', 'yellow onions':'onion',
};

// Volume→weight densities (oz per cup) for items recipes measure both ways.
// Lets "¾ cup grated parmesan" merge with "1.5 oz parmesan" into one line —
// a cheese wedge reseals, so one purchase covers every recipe that uses it.
const OZ_PER_CUP = {
  'parmesan': 3,                        // grated
  'mozzarella': 4,                      // shredded
  'shredded cheddar': 4,
  'shredded mexican cheese blend': 4,
  'feta cheese': 5,                     // crumbled
};

function normItem(item, aliasMap) {
  const k = (item||'').trim().toLowerCase();
  return aliasMap[k] || BUILTIN_ALIASES[k] || k;
}

function normUnit(unit) {
  let u = (unit||'').trim().toLowerCase();
  u = u.replace(/\s*\(.*?\)/g,'').trim(); // strip (...)
  const map = {'stalk':'each','stalks':'each','bag':'each','bags':'each','jar':'each',
    'jars':'each','bottle':'each','bottles':'each','can':'each','cans':'each',
    'piece':'each','pieces':'each','cup grated':'cup','cups grated':'cup'};
  return map[u] || u;
}

// Container units whose contents don't keep once opened — a can of crushed
// tomatoes isn't a resealable block of cheese. Counts of these aggregate per
// declared size (14 oz cans separate from 28 oz cans), never as summed ounces.
const CONTAINER_WORDS = new Set(['can','jar','bottle','bag','box','packet','tin','pouch','tub','wedge','block','container','carton']);

// Parse an ingredient's raw unit into {unit, container, sizeOz}. A size
// qualifier on a container unit — "can (14 oz)", "28 oz can" — is preserved so
// different can sizes stay distinct buckets under the same item.
function parseIngredientUnit(rawUnit) {
  const raw = (rawUnit||'').trim().toLowerCase();
  const sm = raw.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz/);
  const stripped = raw.replace(/\s*\(.*?\)/g,'').replace(/^\d+(?:\.\d+)?\s*(?:fl\.?\s*)?oz\.?\s+/,'').trim();
  const base = stripped.replace(/s$/,'');
  const container = CONTAINER_WORDS.has(base) ? base : null;
  return { unit: normUnit(stripped), container, sizeOz: container && sm ? parseFloat(sm[1]) : null };
}

// A package's content, parsed from its human label ("14.5 oz can", "2 lb bag",
// "3-count pack", "12 (dozen)"), falling back to packageSize/packageUnit. The
// label is the one field that reliably carries both the amount and its unit.
function parsePkgContent(pu) {
  const lbl = (pu.packageLabel||'').toLowerCase();
  let m = lbl.match(/([\d.]+)\s*fl\.?\s*oz/); if (m) return { qty: parseFloat(m[1]), kind: 'floz' };
  m = lbl.match(/([\d.]+)\s*oz/);             if (m) return { qty: parseFloat(m[1]), kind: 'oz' };
  m = lbl.match(/([\d.]+)\s*lb/);             if (m) return { qty: parseFloat(m[1])*16, kind: 'oz' };
  m = lbl.match(/(\d+)[\s-]*count/);          if (m) return { qty: parseInt(m[1],10), kind: 'each' };
  m = lbl.match(/^(\d+)\s*\(/);               if (m) return { qty: parseInt(m[1],10), kind: 'each' };
  const u = pu.packageUnit;
  if (WEIGHT_TO_OZ[u]) return { qty: (pu.packageSize||1)*WEIGHT_TO_OZ[u], kind: 'oz' };
  if (u === 'fl oz')  return { qty: (pu.packageSize||1), kind: 'floz' };
  return { qty: pu.packageSize||1, kind: 'each' };
}

function unitFamily(u) {
  if (WEIGHT_TO_OZ[u]) return 'weight';
  if (VOL_TO_TSP[u]) return 'volume';
  return 'count';
}

function toOz(qty, unit) { return qty * (WEIGHT_TO_OZ[unit] || 1); }
function toLb(qty, unit) { return unit==='oz' ? qty/16 : qty; }
function toTsp(qty, unit) { return qty * (VOL_TO_TSP[unit] || 1); }

// ── Inventory matching (read-only; spec/inventory-sync-spec.md §4) ─────────────
// The app never edits ingredientStock; it only cross-references it so the grocery
// list can show "probably enough on hand". Match recipe/grocery item names to
// inventory items by exact name, then by fuzzy steak / braising-cut rules.
function invNorm(s){ return (s||'').trim().toLowerCase().replace(/\s*\(.*?\)/g,'').replace(/\s+/g,' ').trim(); }
const STEAK_HINTS = ['ribeye','rib-eye','new york strip','sirloin','strip steak'];
const BRAISE_INGREDIENTS = ['beef chuck','chuck roast','stew beef','beef stew meat','braising beef','arm roast','short rib','beef short rib'];
const BRAISE_INV_HINTS = ['chuck','arm roast','stew meat','short rib','oxtail'];
function _invScore(invItem, n){ // lower = closer string match
  const a = invNorm(invItem.item);
  if (a===n) return 0;
  if (a.includes(n) || n.includes(a)) return 1;
  const ta = new Set(a.split(' ')); let common=0;
  n.split(' ').forEach(t=>{ if(ta.has(t)) common++; });
  return 10 - common;
}
function _invBest(cands, n){ return cands.slice().sort((a,b)=>{ const d=_invScore(a,n)-_invScore(b,n); return d!==0 ? d : (b.qty||0)-(a.qty||0); })[0]; }
function matchInventory(itemName){
  const stock = state.ingredientStock || [];
  if (!stock.length) return null;
  const n = invNorm(itemName);
  // 1. exact (highest qty wins on ties)
  const exact = stock.filter(s=>invNorm(s.item)===n);
  if (exact.length) return _invBest(exact, n);
  // 2. steak (quick-cook cuts)
  if (/steak/.test(n) || STEAK_HINTS.some(x=>n.includes(x))) {
    const c = stock.filter(s=>s.group==='beef' && (/steak/.test(invNorm(s.item)) || /steak/.test((s.note||'').toLowerCase())));
    if (c.length) return _invBest(c, n);
  }
  // 3. braising cuts
  if (BRAISE_INGREDIENTS.some(x=>n.includes(x))) {
    const c = stock.filter(s=>s.group==='beef' && (/brais/.test((s.note||'').toLowerCase()) || BRAISE_INV_HINTS.some(h=>invNorm(s.item).includes(h))));
    if (c.length) return _invBest(c, n);
  }
  return null;
}
// Count-style units compare by piece (rough by design — a "can" on hand counts
// against a recipe that needs a "can", even though normUnit collapses can→each).
const COUNT_UNITS = new Set(['each','can','jar','bottle','bag','box','piece','clove','head','bunch','pint','dozen','stalk']);
// Does the on-hand amount cover the needed amount? true / false / null (not comparable).
function invCovers(m, neededQty, neededUnit){
  const u1=m.unit, u2=neededUnit, q=(m.qty||0);
  if (u1===u2) return q >= neededQty;
  if (WEIGHT_TO_OZ[u1] && WEIGHT_TO_OZ[u2]) return q*WEIGHT_TO_OZ[u1] >= neededQty*WEIGHT_TO_OZ[u2];
  if (VOL_TO_TSP[u1] && VOL_TO_TSP[u2]) return q*VOL_TO_TSP[u1] >= neededQty*VOL_TO_TSP[u2];
  if (COUNT_UNITS.has(u1) && COUNT_UNITS.has(u2)) return q >= neededQty;
  return null; // e.g. "each" vs "lb" — can't compare numerically
}
function computeStockStatus(itemName, neededQty, neededUnit){
  const m = matchInventory(itemName);
  if (!m) return { stockStatus:'buy', onHandQty:null, onHandUnit:null };
  let status;
  if ((m.qty||0) <= 0) status='buy';
  else { const cov = invCovers(m, neededQty, neededUnit); status = (cov===true) ? 'have' : 'low'; }
  if (m.approx && status==='have') status='low'; // never trust a rough count as "enough"
  return { stockStatus:status, onHandQty:m.qty, onHandUnit:m.unit };
}

function generateGroceryList(plan, recipeMap, pantryItems, purchaseUnits, aliasMap, existingList) {
  const pantrySet = new Set(pantryItems.map(x=>x.toLowerCase()));
  const puMap = {};
  purchaseUnits.forEach(pu => puMap[pu.itemNorm || pu._key] = pu);

  // Step 0: Collapse (recipeId, meal) groups, then collect line items
  const groups = {};
  for (const entry of plan.entries) {
    const key = entry.recipeId + '::' + entry.meal;
    if (!groups[key]) groups[key] = {recipeId: entry.recipeId, meal: entry.meal, totalServings: 0};
    groups[key].totalServings += entry.servings;
  }

  const lineItems = [];
  const warnings = [];

  for (const key of Object.keys(groups)) {
    const g = groups[key];
    const recipe = recipeMap[g.recipeId];
    if (!recipe) { warnings.push(`Missing recipe: ${g.recipeId}`); continue; }

    // Check missing base for finish recipes
    if (recipe.isFinish && recipe.baseRecipeId) {
      const baseInPlan = plan.entries.some(e => e.recipeId === recipe.baseRecipeId && e.meal === 'batch');
      if (!baseInPlan) {
        const baseRecipe = recipeMap[recipe.baseRecipeId];
        const baseName = baseRecipe ? baseRecipe.title : recipe.baseRecipeId;
        warnings.push(`⚠ Protein for "${recipe.title}" missing — add ${baseName} (batch) or buy protein separately`);
      }
    }

    const scale = g.totalServings / recipe.servings;
    for (const ing of recipe.ingredients) {
      const itemKey = normItem(ing.item, aliasMap);
      const pui = parseIngredientUnit(ing.unit);
      let aisle = ing.aisle;
      if (PANTRY_AISLE_MAP[aisle]) aisle = PANTRY_AISLE_MAP[aisle];
      const scaledQty = ing.qty * scale;
      if (scaledQty <= 0) continue;
      lineItems.push({ item: itemKey, itemRaw: ing.item, qty: scaledQty, unit: pui.unit, container: pui.container, sizeOz: pui.sizeOz, aisle, staple: !!ing.staple });
    }
  }

  // Step 1+2: Aggregate by normalized item — one grocery line per item
  // wherever units can be honestly combined. Volume merges into weight when a
  // density is known (grated cheese); container counts keep a bucket per
  // declared size so 2×"1 can (14 oz)" + 1×"1 can (28 oz)" reads
  // "2 × 14 oz can + 1 × 28 oz can", never a raw-ounce sum across can sizes.
  const agg = {};
  for (const li of lineItems) {
    if (!agg[li.item]) {
      agg[li.item] = { item: li.item, aisle: li.aisle, allStaple: true, weightOz: 0, volTsp: 0, counts: {} };
    }
    const a = agg[li.item];
    const fam = unitFamily(li.unit);
    if (fam === 'volume' && OZ_PER_CUP[li.item]) {
      a.weightOz += toTsp(li.qty, li.unit) / 48 * OZ_PER_CUP[li.item];
    } else if (fam === 'weight') {
      a.weightOz += toOz(li.qty, li.unit);
    } else if (fam === 'volume') {
      a.volTsp += toTsp(li.qty, li.unit);
    } else {
      // count: aggregate per (unit, container, declared size)
      const ck = li.unit + '|' + (li.container||'') + '|' + (li.sizeOz||'');
      if (!a.counts[ck]) a.counts[ck] = { qty: 0, unit: li.unit, container: li.container, sizeOz: li.sizeOz };
      a.counts[ck].qty += li.qty;
    }
    if (!a.aisle || a.aisle === 'pantry') a.aisle = li.aisle;
    a.allStaple = a.allStaple && li.staple;
  }

  // Step 3: Pantry subtract
  const items = [];
  const unknownUnits = [];
  for (const aggKey of Object.keys(agg)) {
    const a = agg[aggKey];
    if (a.allStaple && pantrySet.has(a.item)) continue; // drop
    items.push(a);
  }

  // Step 4: Round to purchase units & Step 5: Leftover flag.
  // Normal case: one line per item. An item emits multiple lines only when its
  // contributions genuinely can't be combined (never drop a contribution).
  const listItems = [];
  for (const a of items) {
    const pu = puMap[a.item];
    const content = (pu && pu.mode === 'package') ? parsePkgContent(pu) : null;
    let weightOz = a.weightOz, volTsp = a.volTsp;
    let buckets = Object.values(a.counts);
    const lines = [];

    // Pints are real volume (2 cups = 96 tsp): fold loose cup/tbsp needs into
    // an existing pint count (cherry tomatoes: "1 cup" + "2 pint" → 2½ pint).
    if (volTsp > 0) {
      const pb = buckets.find(b => b.unit === 'pint' && !b.container);
      if (pb) { pb.qty += volTsp / 96; volTsp = 0; }
    }

    // Special: garlic clove -> head
    const gi = buckets.findIndex(b => a.item === 'garlic' && b.unit === 'clove');
    if (gi >= 0) {
      const b = buckets.splice(gi, 1)[0];
      const heads = b.qty / 10, nHeads = Math.ceil(heads);
      lines.push({ neededQty: b.qty, neededUnit: 'clove', buyQty: nHeads, buyUnit: 'head',
        displayText: `${nHeads} head garlic (~10 cloves each)`,
        leftoverNote: heads < nHeads * 0.25 ? `(only ~${heads.toFixed(1)} heads needed)` : null });
    }

    // A bare "each" count of an item sold in cans/jars means containers too
    // (normUnit collapses can→each; the purchase unit restores the meaning).
    if (pu && CONTAINER_WORDS.has(pu.packageUnit)) {
      buckets.forEach(b => { if (!b.container && b.unit === 'each') b.container = pu.packageUnit; });
    }

    // Containers: one line per item, one part per declared size. Unsized counts
    // and loose weight/volume needs fold into default-size packages — but sizes
    // never sum into raw ounces (an opened can doesn't keep).
    const containers = buckets.filter(b => b.container);
    buckets = buckets.filter(b => !b.container);
    if (containers.length) {
      const defOz = content && content.kind !== 'each' ? content.qty : null;
      let defQty = 0; const sized = [];
      for (const b of containers) { if (b.sizeOz) sized.push(b); else defQty += b.qty; }
      let foldedOz = 0;
      if (defOz && content.kind === 'oz' && weightOz > 0) { defQty += weightOz / defOz; foldedOz = weightOz; weightOz = 0; }
      if (defOz && content.kind === 'floz' && volTsp > 0) { const fo = volTsp / 6; defQty += fo / defOz; foldedOz = fo; volTsp = 0; }
      sized.sort((x, y) => x.sizeOz - y.sizeOz);
      const parts = []; let total = 0; let leftoverNote = null;
      if (defQty > 0) {
        const n = Math.ceil(defQty - 1e-9); total += n;
        const unsized = containers.find(b => !b.sizeOz);
        parts.push({ n, label: content ? pu.packageLabel : (unsized ? unsized.container : 'each') });
        if (foldedOz && defOz && defQty < n * 0.25) leftoverNote = `(only ~${fmtQty(defQty * defOz)} oz needed — large remainder)`;
      }
      for (const b of sized) { const n = Math.ceil(b.qty - 1e-9); total += n; parts.push({ n, label: `${fmtQty(b.sizeOz)} oz ${b.container}` }); }
      const solo = parts.length === 1;
      const txt = parts.map(p => {
        if (p.n === 1) return solo ? p.label : `1 × ${p.label}`;
        return /\d/.test(p.label) ? `${p.n} × ${p.label}` : `${p.n} ${pluralItem(p.label)}`;
      }).join(' + ');
      lines.push({ neededQty: total, neededUnit: 'each', buyQty: total, buyUnit: content ? pu.packageLabel : 'each',
        displayText: `${txt} ${a.item}`, leftoverNote, missingPU: !pu });
    }

    // Weight / volume needs (after density merge and container folding). Both
    // present only when no conversion is known — then two lines, both shown.
    for (const f of [
      weightOz > 0 ? { fam: 'weight', oz: weightOz } : null,
      volTsp   > 0 ? { fam: 'volume', tsp: volTsp } : null,
    ].filter(Boolean)) {
      let neededQty, neededUnit;
      if (f.fam === 'weight') {
        neededQty = f.oz; neededUnit = 'oz';
        if (f.oz >= 16) { neededQty = f.oz / 16; neededUnit = 'lb'; }
      } else {
        neededQty = f.tsp; neededUnit = 'tsp';
        if (f.tsp >= 48) { neededQty = f.tsp / 48; neededUnit = 'cup'; }
        else if (f.tsp >= 3) { neededQty = f.tsp / 3; neededUnit = 'tbsp'; }
      }
      if (pu && pu.mode === 'by-weight') {
        const ri = pu.roundIncrement;
        const needLb = f.fam === 'weight' ? f.oz / 16 : neededQty;
        const rounded = Math.ceil(needLb / ri) * ri;
        lines.push({ neededQty, neededUnit, buyQty: rounded, buyUnit: pu.packageUnit,
          displayText: `~${rounded} ${pu.packageUnit} ${a.item}`,
          leftoverNote: needLb < rounded * 0.25 ? `(only ~${needLb.toFixed(1)} ${pu.packageUnit} needed)` : null });
      } else if (content) {
        const needInPkg = f.fam === 'weight'
          ? (content.kind === 'oz' ? f.oz / content.qty : null)
          : (content.kind === 'floz' ? f.tsp / 6 / content.qty : null);
        if (needInPkg !== null) {
          const nPkgs = Math.ceil(needInPkg - 1e-9);
          const lbl = pu.packageLabel;
          lines.push({ neededQty, neededUnit, buyQty: nPkgs, buyUnit: lbl,
            displayText: nPkgs > 1 ? `${nPkgs} × ${lbl} ${a.item}` : `${lbl} ${a.item}`,
            leftoverNote: needInPkg < nPkgs * 0.25 ? `(only ~${fmtQty(neededQty)} ${neededUnit} needed — large remainder)` : null });
        } else {
          // Cross-family with no known conversion: buy one package, show the need.
          lines.push({ neededQty, neededUnit, buyQty: 1, buyUnit: pu.packageLabel,
            displayText: `${pu.packageLabel} ${a.item} (need ~${fmtQty(neededQty)} ${neededUnit})`, leftoverNote: null });
        }
      } else {
        lines.push({ neededQty, neededUnit, buyQty: neededQty, buyUnit: neededUnit,
          displayText: `${fmtQty(neededQty)} ${neededUnit} ${a.item}`, leftoverNote: null, missingPU: true });
      }
    }

    // Remaining piece counts (each / head / bunch / pint …).
    for (const b of buckets) {
      if (content && content.kind === 'each') {
        const nPkgs = Math.ceil(b.qty / content.qty - 1e-9);
        const lbl = pu.packageLabel;
        let core;
        if (/^(1 )?each$/i.test(lbl)) core = nPkgs > 1 ? `${nPkgs} ${pluralItem(a.item)}` : `1 ${a.item}`;
        else if (nPkgs > 1) core = `${nPkgs} × ${lbl} ${a.item}`;
        else core = `${lbl} ${a.item}`;
        lines.push({ neededQty: b.qty, neededUnit: b.unit, buyQty: nPkgs, buyUnit: lbl, displayText: core,
          leftoverNote: b.qty < nPkgs * content.qty * 0.25 ? `(only ${fmtQty(b.qty)} needed)` : null });
      } else if (content) {
        // Counted by piece but sold by weight/volume — no honest conversion.
        lines.push({ neededQty: b.qty, neededUnit: b.unit, buyQty: 1, buyUnit: pu.packageLabel,
          displayText: `${pu.packageLabel} ${a.item} (need ~${fmtQty(b.qty)} ${b.unit})`, leftoverNote: null });
      } else if (pu && pu.mode === 'by-weight') {
        // Legacy behavior: treat a bare count as pounds for by-weight items.
        const ri = pu.roundIncrement;
        const rounded = Math.ceil(b.qty / ri) * ri;
        lines.push({ neededQty: b.qty, neededUnit: b.unit, buyQty: rounded, buyUnit: pu.packageUnit,
          displayText: `~${rounded} ${pu.packageUnit} ${a.item}`,
          leftoverNote: b.qty < rounded * 0.25 ? `(only ~${b.qty.toFixed(1)} ${pu.packageUnit} needed)` : null });
      } else {
        lines.push({ neededQty: b.qty, neededUnit: b.unit, buyQty: b.qty, buyUnit: b.unit,
          displayText: `${fmtQty(b.qty)} ${b.unit} ${a.item}`, leftoverNote: null, missingPU: true });
      }
    }

    for (const ln of lines) {
      if (ln.missingPU) unknownUnits.push(a.item);
      // Preserve check state
      let checked = false;
      if (existingList) {
        const found = existingList.items.find(i => i.item === a.item && i.buyUnit === ln.buyUnit)
          || existingList.items.find(i => i.item === a.item);
        if (found) checked = found.checked;
      }
      listItems.push({
        item: a.item, aisle: a.aisle || 'condiments',
        neededQty: ln.neededQty, neededUnit: ln.neededUnit, buyQty: ln.buyQty, buyUnit: ln.buyUnit,
        displayText: ln.displayText, leftoverNote: ln.leftoverNote || null,
        checked, missingPU: !!ln.missingPU,
      });
    }
  }

  // Step 6: Sort by store walk
  const aisleRank = {};
  AISLE_ORDER.forEach((a,i) => aisleRank[a] = i);
  listItems.sort((a,b) => {
    const ra = aisleRank[a.aisle] ?? 99, rb = aisleRank[b.aisle] ?? 99;
    return ra !== rb ? ra - rb : a.item.localeCompare(b.item);
  });

  // Step 7: Inventory awareness — annotate (never drop) each line with on-hand stock.
  for (const it of listItems) Object.assign(it, computeStockStatus(it.item, it.neededQty, it.neededUnit));

  return {
    id: plan.id, planId: plan.id,
    generatedAt: new Date().toISOString(),
    items: listItems,
    unknownUnits: [...new Set(unknownUnits)],
    warnings,
  };
}

function pluralItem(name) {
  const n = (name||'').trim();
  if (!n) return n;
  if (/s$/i.test(n)) return n;            // already plural (e.g. "bell peppers")
  if (/[^aeiou]y$/i.test(n)) return n.slice(0,-1)+'ies';
  if (/(ch|sh|x|z)$/i.test(n)) return n+'es';
  return n+'s';
}

/* How much of a base recipe's protein a given recipe (usually a finish) needs,
   scaled from the base's per-serving yield to the requesting recipe's servings. */
function baseQtyFor(recipe, baseRecipe) {
  if (!baseRecipe?.ingredients?.length || !baseRecipe.servings || !recipe?.servings) return null;
  const protein = baseRecipe.ingredients[0];
  return { item: protein.item, unit: protein.unit, qty: protein.qty / baseRecipe.servings * recipe.servings };
}
function fmtQty(n) {
  if (!n && n !== 0) return '';
  const r = Math.round(n * 100) / 100;
  if (Number.isInteger(r)) return String(r);
  // Try fractions
  const fracs = [[1,8,'⅛'],[1,4,'¼'],[1,3,'⅓'],[1,2,'½'],[2,3,'⅔'],[3,4,'¾']];
  const whole = Math.floor(r);
  const frac = r - whole;
  for (const [n,d,sym] of fracs) {
    if (Math.abs(frac - n/d) < 0.06) return whole > 0 ? `${whole}${sym}` : sym;
  }
  return r.toFixed(1).replace(/\.0$/,'');
}

