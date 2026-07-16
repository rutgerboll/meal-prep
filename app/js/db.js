// ── Storage ──────────────────────────────────────────────────────────────────
const DB_NAME = 'meal-planner', DB_VER = 3;
// 'inventory' = app-owned cooked-meal-portion tracker (fridge/freezer counts).
// 'ingredientStock' = read-only raw-ingredient stock from inventory.md (skills own it),
// surfaced only as grocery-list awareness. See spec/inventory-sync-spec.md.
const STORES = ['recipes','mealPlans','groceryLists','pantry','purchaseUnits','preferences','aliasMap','cookLog','cookbookBacklog','meta','inventory','ingredientStock'];
let DB = null;

function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, {keyPath: s==='cookLog'?'id':'_key'}); });
    };
    req.onsuccess = e => { DB = e.target.result; res(DB); };
    req.onerror = e => rej(e.target.error);
  });
}

function dbGet(store, key) {
  return new Promise((res, rej) => {
    const tx = DB.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function dbPut(store, val) {
  return new Promise((res, rej) => {
    const tx = DB.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(val);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

function dbGetAll(store) {
  return new Promise((res, rej) => {
    const tx = DB.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function dbDelete(store, key) {
  return new Promise((res, rej) => {
    const tx = DB.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

function dbClear(store) {
  return new Promise((res, rej) => {
    const tx = DB.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

// ── App State ─────────────────────────────────────────────────────────────────
let state = {
  recipes: [],
  mealPlans: [],
  groceryLists: [],
  pantry: { items: [] },
  purchaseUnits: [],
  preferences: {},
  aliasMap: {},
  cookLog: [],
  cookbookBacklog: [],
  activeRoute: '#/cook',
  prevRoute: null,
};

function getRecipeMap() {
  const m = {};
  state.recipes.forEach(r => m[r.id] = r);
  return m;
}

function getActivePlan() {
  return state.mealPlans.find(p => p.isActive) || null;
}

// ── Seeding ───────────────────────────────────────────────────────────────────
// A grocery list written by Claude in chat (grocery-lists/<plan-id>.md) arrives
// through the seed/sync bundle pre-parsed into display lines. Import it as a
// one-section list; the item key (the normalized line text) carries check
// state across re-syncs. The app never writes these back to markdown.
function chatListRecord(inc) {
  const items = (inc.items||[]).map(it => ({
    item: it.item, aisle: it.aisle || null,
    neededQty: null, neededUnit: null, buyQty: null, buyUnit: null,
    displayText: it.displayText, leftoverNote: null,
    checked: !!it.checked, missingPU: false,
    stockStatus: it.stockStatus || undefined,
    onHandNote: it.onHandNote || undefined,
  }));
  return { planId: inc.planId, generatedAt: inc.generatedAt || new Date().toISOString(),
    source: 'claude', title: inc.title || inc.planId,
    weekly: [{week:1, label:'Buy now', items}], items,
    unknownUnits: [], warnings: [], _key: inc.planId };
}

async function seedDB() {
  const recipes = SEED.recipes;
  for (const r of recipes) await dbPut('recipes', {...r, _key: r.id});
  for (const p of SEED.mealPlans) await dbPut('mealPlans', {...p, _key: p.id});
  for (const g of (SEED.groceryLists||[])) await dbPut('groceryLists', chatListRecord(g));
  await dbPut('pantry', {...SEED.pantry, _key: 'singleton'});
  for (const pu of SEED.purchaseUnits) await dbPut('purchaseUnits', {...pu, _key: pu.itemNorm});
  await dbPut('preferences', {...SEED.preferences, _key: 'singleton'});
  await dbPut('aliasMap', {data: SEED.aliasMap, _key: 'singleton'});
  for (const cl of (SEED.cookLog||[])) await dbPut('cookLog', cl);
  for (const cb of (SEED.cookbookBacklog||[])) await dbPut('cookbookBacklog', {...cb, _key: cb.filename});
  for (const it of (SEED.ingredientStock||[])) await dbPut('ingredientStock', {...it, _key: it.id});
  await dbPut('meta', {_key: 'singleton', seededAt: new Date().toISOString(), schemaVersion: 3, inventoryUpdatedAt: (SEED.meta||{}).inventoryUpdatedAt || null});
}

/* Read-only ingredient stock is added in schemaVersion 3. Existing (already-seeded)
   installs won't re-run seedDB, so populate the new store from the bundled SEED the
   first time it's empty. A later "Sync from Claude" replaces it wholesale. */
async function ensureIngredientStock() {
  if ((state.ingredientStock||[]).length) return;
  const seedInv = SEED.ingredientStock || [];
  if (!seedInv.length) return;
  for (const it of seedInv) await dbPut('ingredientStock', {...it, _key: it.id});
  const meta = await dbGet('meta','singleton');
  if (meta && !meta.inventoryUpdatedAt) await dbPut('meta', {...meta, inventoryUpdatedAt: (SEED.meta||{}).inventoryUpdatedAt || null});
  state.ingredientStock = await dbGetAll('ingredientStock');
}

async function loadState() {
  const [recs, plans, gls, pantry, pus, prefs, aliasObj, cl, cb, inv, ingStock, meta] = await Promise.all([
    dbGetAll('recipes'), dbGetAll('mealPlans'), dbGetAll('groceryLists'),
    dbGet('pantry','singleton'), dbGetAll('purchaseUnits'),
    dbGet('preferences','singleton'), dbGet('aliasMap','singleton'),
    dbGetAll('cookLog'), dbGetAll('cookbookBacklog'), dbGetAll('inventory'),
    dbGetAll('ingredientStock'), dbGet('meta','singleton'),
  ]);
  state.recipes = recs;
  state.mealPlans = plans;
  state.groceryLists = gls;
  state.pantry = pantry || {items:[], _key:'singleton'};
  state.purchaseUnits = pus;
  state.preferences = prefs || {};
  state.aliasMap = aliasObj ? aliasObj.data : {};
  state.cookLog = cl;
  state.cookbookBacklog = cb;
  state.inventory = inv || [];
  state.ingredientStock = ingStock || [];
  state.inventoryUpdatedAt = (meta && meta.inventoryUpdatedAt) || null;
}

