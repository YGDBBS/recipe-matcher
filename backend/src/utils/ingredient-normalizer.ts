/**
 * Ingredient normalization utilities for consistent ingredient matching
 */

export interface NormalizedIngredient {
  original: string;
  normalized: string;
  variations: string[];
}

/**
 * Normalizes an ingredient name for consistent matching
 */
export function normalizeIngredient(ingredient: string): string {
  return ingredient
    .toLowerCase()
    .trim()
    // Remove common prefixes
    .replace(/^(fresh|dried|frozen|canned|organic|free-range)\s+/i, '')
    // Remove common suffixes
    .replace(/\s+(chopped|diced|sliced|minced|grated|shredded|crushed|ground|whole|pieces?)$/i, '')
    // Remove measurements in parentheses
    .replace(/\s*\([^)]*\)\s*$/, '')
    // Remove plural forms (handle special cases first)
    .replace(/ies$/, 'y')  // cherries -> cherry
    .replace(/es$/, '')    // tomatoes -> tomato
    .replace(/s$/, '')     // apples -> apple
    // Replace spaces and special characters with hyphens
    .replace(/[\s\-_]+/g, '-')
    // Remove extra hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates multiple variations of an ingredient for better matching
 */
export function generateIngredientVariations(ingredient: string): string[] {
  const normalized = normalizeIngredient(ingredient);
  const variations = new Set<string>();
  
  // Add the normalized version
  variations.add(normalized);
  
  // Add without hyphens
  const withoutHyphens = normalized.replace(/-/g, '');
  if (withoutHyphens !== normalized) {
    variations.add(withoutHyphens);
  }
  
  // Add with spaces instead of hyphens
  const withSpaces = normalized.replace(/-/g, ' ');
  if (withSpaces !== normalized) {
    variations.add(withSpaces);
  }
  
  // Add singular/plural variations
  if (normalized.endsWith('y')) {
    variations.add(normalized.slice(0, -1) + 'ies');
  } else if (!normalized.endsWith('s')) {
    variations.add(normalized + 's');
  }
  
  // Add common alternative names
  const alternatives = getIngredientAlternatives(normalized);
  alternatives.forEach(alt => variations.add(alt));
  
  return Array.from(variations);
}

/**
 * Gets common alternative names for ingredients
 */
function getIngredientAlternatives(ingredient: string): string[] {
  const alternatives: Record<string, string[]> = {
    'tomato': ['cherry-tomato', 'plum-tomato', 'beef-tomato'],
    'onion': ['red-onion', 'white-onion', 'yellow-onion', 'sweet-onion'],
    'pepper': ['bell-pepper', 'red-pepper', 'green-pepper', 'yellow-pepper'],
    'chicken': ['chicken-breast', 'chicken-thigh', 'chicken-drumstick'],
    'beef': ['ground-beef', 'beef-strip', 'beef-tenderloin'],
    'cheese': ['cheddar-cheese', 'mozzarella-cheese', 'parmesan-cheese'],
    'milk': ['whole-milk', 'skim-milk', 'almond-milk', 'soy-milk'],
    'oil': ['olive-oil', 'vegetable-oil', 'coconut-oil', 'sesame-oil'],
    'flour': ['all-purpose-flour', 'whole-wheat-flour', 'bread-flour'],
    'sugar': ['white-sugar', 'brown-sugar', 'powdered-sugar'],
    'salt': ['sea-salt', 'kosher-salt', 'table-salt'],
    'garlic': ['garlic-clove', 'garlic-powder', 'minced-garlic'],
    'ginger': ['fresh-ginger', 'ginger-powder', 'minced-ginger'],
    'potato': ['russet-potato', 'red-potato', 'sweet-potato'],
    'carrot': ['baby-carrot', 'carrot-stick'],
    'broccoli': ['broccoli-floret', 'broccoli-crown'],
    'spinach': ['baby-spinach', 'fresh-spinach'],
    'mushroom': ['button-mushroom', 'portobello-mushroom', 'shiitake-mushroom'],
    'basil': ['fresh-basil', 'dried-basil'],
    'oregano': ['fresh-oregano', 'dried-oregano'],
    'thyme': ['fresh-thyme', 'dried-thyme'],
    'parsley': ['fresh-parsley', 'flat-leaf-parsley'],
    'cilantro': ['fresh-cilantro', 'coriander'],
    'lemon': ['lemon-juice', 'lemon-zest'],
    'lime': ['lime-juice', 'lime-zest'],
    'orange': ['orange-juice', 'orange-zest'],
    'apple': ['granny-smith-apple', 'red-apple', 'green-apple'],
    'banana': ['ripe-banana', 'overripe-banana'],
    'bread': ['white-bread', 'whole-wheat-bread', 'sourdough-bread'],
    'rice': ['white-rice', 'brown-rice', 'jasmine-rice', 'basmati-rice'],
    'pasta': ['spaghetti', 'penne', 'fettuccine', 'linguine'],
    'noodle': ['egg-noodle', 'rice-noodle', 'soba-noodle'],
    'bean': ['black-bean', 'kidney-bean', 'chickpea', 'lentil'],
    'nut': ['almond', 'walnut', 'pecan', 'cashew', 'peanut'],
    'seed': ['sesame-seed', 'sunflower-seed', 'pumpkin-seed'],
    'spice': ['paprika', 'cumin', 'coriander', 'turmeric', 'cinnamon'],
    'herb': ['rosemary', 'sage', 'bay-leaf', 'tarragon'],
    'vinegar': ['balsamic-vinegar', 'white-vinegar', 'apple-cider-vinegar'],
    'sauce': ['soy-sauce', 'worcestershire-sauce', 'hot-sauce', 'barbecue-sauce'],
    'butter': ['unsalted-butter', 'salted-butter', 'clarified-butter'],
    'egg': ['large-egg', 'free-range-egg', 'organic-egg'],
    'yogurt': ['greek-yogurt', 'plain-yogurt', 'vanilla-yogurt'],
    'cream': ['heavy-cream', 'light-cream', 'sour-cream'],
    'wine': ['white-wine', 'red-wine', 'cooking-wine'],
    'stock': ['chicken-stock', 'beef-stock', 'vegetable-stock', 'bone-broth'],
    'broth': ['chicken-broth', 'beef-broth', 'vegetable-broth']
  };
  
  // Check for exact matches
  if (alternatives[ingredient]) {
    return alternatives[ingredient];
  }
  
  // Check for partial matches
  const partialMatches: string[] = [];
  for (const [key, values] of Object.entries(alternatives)) {
    if (ingredient.includes(key) || key.includes(ingredient)) {
      partialMatches.push(...values);
    }
  }
  
  return partialMatches;
}

/**
 * Creates a comprehensive normalized ingredient object
 */
export function createNormalizedIngredient(original: string): NormalizedIngredient {
  const normalized = normalizeIngredient(original);
  const variations = generateIngredientVariations(original);
  
  return {
    original,
    normalized,
    variations: Array.from(new Set(variations)) // Remove duplicates
  };
}

/**
 * Checks if two ingredients are likely the same
 */
export function areIngredientsSimilar(ingredient1: string, ingredient2: string): boolean {
  const norm1 = normalizeIngredient(ingredient1);
  const norm2 = normalizeIngredient(ingredient2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // Check if one is contained in the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Check variations
  const variations1 = generateIngredientVariations(ingredient1);
  const variations2 = generateIngredientVariations(ingredient2);
  
  return variations1.some(v1 => variations2.includes(v1));
}

/**
 * Finds the best matching ingredient from a list
 */
export function findBestIngredientMatch(
  targetIngredient: string, 
  candidateIngredients: string[]
): { ingredient: string; score: number } | null {
  const targetNorm = normalizeIngredient(targetIngredient);
  const targetVariations = generateIngredientVariations(targetIngredient);
  
  let bestMatch: { ingredient: string; score: number } | null = null;
  
  for (const candidate of candidateIngredients) {
    const candidateNorm = normalizeIngredient(candidate);
    let score = 0;
    
    // Exact match gets highest score
    if (targetNorm === candidateNorm) {
      score = 100;
    }
    // Check if target is contained in candidate
    else if (candidateNorm.includes(targetNorm)) {
      score = 80;
    }
    // Check if candidate is contained in target
    else if (targetNorm.includes(candidateNorm)) {
      score = 70;
    }
    // Check variations
    else {
      const candidateVariations = generateIngredientVariations(candidate);
      const commonVariations = targetVariations.filter(v => candidateVariations.includes(v));
      if (commonVariations.length > 0) {
        score = 60 + (commonVariations.length * 10);
      }
    }
    
    if (score > (bestMatch?.score || 0)) {
      bestMatch = { ingredient: candidate, score };
    }
  }
  
  return bestMatch;
}
