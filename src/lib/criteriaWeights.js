export function calculateSmartWeight(opt, currentCriteria) {
  let score = 10;
  const text = `${opt.label} ${opt.desc || ''}`.toLowerCase();

  if (currentCriteria.budget >= 4) {
    if (text.includes('free') || text.includes('home') || text.includes('cheap') || text.includes('sourdough') || text.includes('simple') || text.includes('sheet-pan')) score += 5;
    if (text.includes('wagyu') || text.includes('truffle') || text.includes('luxury') || text.includes('resort') || text.includes('spa')) score -= 4;
  }

  if (currentCriteria.time >= 4) {
    if (text.includes('quick') || text.includes('sprint') || text.includes('fast') || text.includes('smash') || text.includes('instant') || text.includes('gyro')) score += 5;
    if (text.includes('risotto') || text.includes('cabin') || text.includes('odyssey') || text.includes('slow')) score -= 3;
  }

  if (currentCriteria.effort >= 4) {
    if (text.includes('minimalist') || text.includes('easy') || text.includes('bowl') || text.includes('salad') || text.includes('takeout')) score += 5;
    if (text.includes('shader') || text.includes('build') || text.includes('heist') || text.includes('hike')) score -= 4;
  }

  if (currentCriteria.excitement >= 4) {
    if (text.includes('spicy') || text.includes('wagyu') || text.includes('truffle') || text.includes('cyberpunk') || text.includes('wildcard') || text.includes('bold')) score += 6;
  }

  return Math.max(1, Math.min(5, Math.round(score / 3)));
}
