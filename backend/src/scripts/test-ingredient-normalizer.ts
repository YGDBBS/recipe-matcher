import { 
  normalizeIngredient, 
  generateIngredientVariations, 
  createNormalizedIngredient,
  areIngredientsSimilar,
  findBestIngredientMatch 
} from '../utils/ingredient-normalizer';

// Test the ingredient normalizer
console.log('🧪 Testing Ingredient Normalizer\n');

// Test cases
const testIngredients = [
  'Chicken Breast',
  'Fresh Tomatoes',
  'Diced Onions',
  'Ground Beef',
  'Cherry Tomatoes',
  'Red Bell Peppers',
  'Chopped Garlic',
  'Olive Oil',
  'Sea Salt',
  'Fresh Basil Leaves'
];

console.log('📝 Testing normalizeIngredient:');
testIngredients.forEach(ingredient => {
  const normalized = normalizeIngredient(ingredient);
  console.log(`  "${ingredient}" → "${normalized}"`);
});

console.log('\n🔄 Testing generateIngredientVariations:');
testIngredients.slice(0, 3).forEach(ingredient => {
  const variations = generateIngredientVariations(ingredient);
  console.log(`  "${ingredient}":`);
  console.log(`    Variations: [${variations.join(', ')}]`);
});

console.log('\n📦 Testing createNormalizedIngredient:');
testIngredients.slice(0, 2).forEach(ingredient => {
  const result = createNormalizedIngredient(ingredient);
  console.log(`  Original: "${result.original}"`);
  console.log(`  Normalized: "${result.normalized}"`);
  console.log(`  Variations: [${result.variations.join(', ')}]`);
  console.log('');
});

console.log('🔍 Testing areIngredientsSimilar:');
const similarityTests = [
  ['chicken', 'chicken breast'],
  ['tomato', 'tomatoes'],
  ['onion', 'diced onion'],
  ['beef', 'ground beef'],
  ['garlic', 'garlic clove'],
  ['oil', 'olive oil']
];

similarityTests.forEach(([ing1, ing2]) => {
  const similar = areIngredientsSimilar(ing1, ing2);
  console.log(`  "${ing1}" vs "${ing2}": ${similar ? '✅ Similar' : '❌ Different'}`);
});

console.log('\n🎯 Testing findBestIngredientMatch:');
const pantryIngredients = ['chicken', 'tomato', 'onion', 'garlic'];
const recipeIngredients = [
  'chicken breast',
  'cherry tomatoes', 
  'diced onions',
  'garlic cloves',
  'olive oil',
  'salt'
];

pantryIngredients.forEach(pantryIngredient => {
  const match = findBestIngredientMatch(pantryIngredient, recipeIngredients);
  console.log(`  Pantry: "${pantryIngredient}"`);
  if (match) {
    console.log(`    Best match: "${match.ingredient}" (score: ${match.score})`);
  } else {
    console.log(`    No match found`);
  }
});

console.log('\n✅ Ingredient normalizer tests completed!');
