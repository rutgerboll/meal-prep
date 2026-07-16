// ── Calorie roll-up ───────────────────────────────────────────────────────────
function calcPairCals(entry, recipeMap) {
  const recipe = recipeMap[entry.recipeId];
  if (!recipe) return null;
  const prefs = state.preferences;
  const hs = prefs.householdSize || 2;
  const band = CALORIE_WARN_BAND();
  if (recipe.isFinish && recipe.baseRecipeId) {
    const base = recipeMap[recipe.baseRecipeId];
    if (base && base.caloriesPerServing != null && recipe.caloriesPerServing != null) {
      return (base.caloriesPerServing + recipe.caloriesPerServing) * hs;
    }
  }
  if (recipe.caloriesPerServing != null) return recipe.caloriesPerServing * hs;
  return null;
}

// ── Rule checks ───────────────────────────────────────────────────────────────
const CUT_PORK_WORDS = ['pork chop','pork shoulder','pork roast','pork loin','pork tenderloin','bacon','ham','prosciutto'];
function ruleCheck(recipe, recipeMap) {
  const warns = [];
  if (!recipe) return warns;
  const prefs = state.preferences.dislikes || {};
  const tags = recipe.tags || [];
  if (prefs.noSoupsStews && (tags.includes('soup') || tags.includes('stew'))) warns.push('Contains soup/stew tag');
  if (prefs.asianOnlyThai) {
    const asian = ['chinese','japanese','korean','vietnamese','asian'];
    if (asian.some(a => tags.includes(a))) warns.push('Non-Thai East-Asian cuisine');
  }
  if (tags.includes('pressure-cooker') || tags.includes('instant-pot')) warns.push('Requires pressure cooker');
  if (prefs.noCutPork) {
    for (const ing of recipe.ingredients || []) {
      if (CUT_PORK_WORDS.some(w => ing.item.toLowerCase().includes(w))) {
        if (!ing.item.toLowerCase().includes('sausage')) { warns.push('Contains cut pork'); break; }
      }
    }
  }
  return warns;
}

// ── Cook log / ratings ────────────────────────────────────────────────────────
async function saveCookFeedback(recipeId, planEntryIdx, feedback) {
  const recipe = state.recipes.find(r => r.id === recipeId);
  if (!recipe) return;
  const entry = {
    date: new Date().toISOString().split('T')[0],
    difficulty: feedback.difficulty,
    actualMinutes: feedback.actualMinutes,
    liked: feedback.liked,
    changeNote: feedback.changeNote || '',
    text: `- ${new Date().toISOString().split('T')[0]} — Took ${feedback.actualMinutes} min. Difficulty ${feedback.difficulty}/5. Liked ${feedback.liked}/5.${feedback.changeNote ? ' Next: '+feedback.changeNote : ''}`,
  };
  recipe.feedbackLog = recipe.feedbackLog || [];
  recipe.feedbackLog.push(entry);
  // Recompute ratings
  const log = recipe.feedbackLog;
  const cc = log.length;
  recipe.ratings = {
    cookCount: cc,
    avgDifficulty: log.reduce((s,e) => s + e.difficulty, 0) / cc,
    avgActualMinutes: log.reduce((s,e) => s + e.actualMinutes, 0) / cc,
    liked: log.reduce((s,e) => s + e.liked, 0) / cc,
  };
  recipe.updatedAt = new Date().toISOString();
  await dbPut('recipes', {...recipe, _key: recipe.id});

  // Mark plan entry cooked
  const plan = getActivePlan();
  if (plan && planEntryIdx >= 0) {
    plan.entries[planEntryIdx].cooked = true;
    await dbPut('mealPlans', {...plan, _key: plan.id});
  }

  // Add to cookLog
  const logEntry = {id: Date.now(), recipeId, date: entry.date, ...feedback, env: dataMode(), pushed: false, _key: Date.now()};
  state.cookLog.push(logEntry);
  await dbPut('cookLog', logEntry);

  // Auto-decrement linked fridge inventory (manual override always available)
  const baseId = recipe.baseRecipeId || recipe.id;
  const invItem = (state.inventory||[]).find(x=>x.recipeId===baseId || x.recipeId===recipe.id);
  if (invItem && (invItem.fridge||0) > 0) {
    invItem.fridge = Math.max(0, (invItem.fridge||0) - 1);
    invItem.updatedAt = new Date().toISOString();
    await dbPut('inventory', {...invItem, _key: invItem.id});
  }

  showToast('Cook logged! Ratings updated.');
  render();
}

