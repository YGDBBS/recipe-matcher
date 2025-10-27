import IngredientMatcher from '../services/ingredient-matcher';

class FuzzyMatchingTester {
  private matcher: IngredientMatcher;

  constructor() {
    this.matcher = new IngredientMatcher();
  }

  async runTests(): Promise<void> {
    console.log('🧪 Testing Fuzzy Ingredient Matching\n');

    // Test cases with different levels of matching
    const testCases = [
      {
        name: 'Exact Matches',
        userIngredients: ['chicken breast', 'bell peppers', 'broccoli', 'garlic'],
        description: 'Should find recipes with exact ingredient matches'
      },
      {
        name: 'Partial Matches',
        userIngredients: ['chicken', 'peppers', 'broccoli'],
        description: 'Should find recipes with partial ingredient matches'
      },
      {
        name: 'Variation Matches',
        userIngredients: ['chicken thigh', 'red bell peppers', 'fresh broccoli'],
        description: 'Should find recipes using ingredient variations'
      },
      {
        name: 'Fuzzy Matches',
        userIngredients: ['chicken', 'tomato', 'pasta'],
        description: 'Should find recipes with fuzzy ingredient matches'
      },
      {
        name: 'No Matches',
        userIngredients: ['unicorn meat', 'dragon scales', 'fairy dust'],
        description: 'Should return no matches for non-existent ingredients'
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n📝 Test: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   User Ingredients: [${testCase.userIngredients.join(', ')}]`);
      
      try {
        const matches = await this.matcher.findMatchingRecipes(testCase.userIngredients, {
          minMatchPercentage: 30, // Lower threshold for testing
          maxResults: 5
        });

        console.log(`   Results: ${matches.length} recipes found`);
        
        if (matches.length > 0) {
          console.log('   Top matches:');
          matches.slice(0, 3).forEach((match, index) => {
            console.log(`     ${index + 1}. ${match.title} (${match.matchPercentage}% match)`);
            console.log(`        Matched: [${match.matchedIngredients.join(', ')}]`);
            if (match.missingIngredients.length > 0) {
              console.log(`        Missing: [${match.missingIngredients.join(', ')}]`);
            }
          });
        } else {
          console.log('   No matches found');
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error}`);
      }
    }

    // Test specific ingredient queries
    console.log('\n🔍 Testing Specific Ingredient Queries');
    await this.testSpecificIngredientQueries();

    // Test detailed analysis
    console.log('\n📊 Testing Detailed Analysis');
    await this.testDetailedAnalysis();
  }

  private async testSpecificIngredientQueries(): Promise<void> {
    const ingredients = ['chicken', 'tomato', 'pasta', 'garlic'];
    
    for (const ingredient of ingredients) {
      try {
        const recipeIds = await this.matcher.findRecipesByIngredient(ingredient);
        console.log(`   "${ingredient}" → ${recipeIds.length} recipes: [${recipeIds.join(', ')}]`);
      } catch (error) {
        console.error(`   ❌ Error querying "${ingredient}": ${error}`);
      }
    }
  }

  private async testDetailedAnalysis(): Promise<void> {
    try {
      // Get the first recipe ID for analysis
      const allRecipes = await this.matcher['getAllRecipes']();
      if (allRecipes.length === 0) {
        console.log('   No recipes available for analysis');
        return;
      }

      const firstRecipe = allRecipes[0];
      const recipeId = firstRecipe.PK.replace('RECIPE#', '');
      
      console.log(`   Analyzing recipe: ${firstRecipe.title}`);
      
      const analysis = await this.matcher.analyzeIngredientMatching(
        ['chicken', 'tomato', 'garlic'],
        recipeId
      );
      
      console.log(`   Recipe: ${analysis.recipeTitle}`);
      analysis.analysis.forEach(item => {
        console.log(`     User: "${item.userIngredient}"`);
        if (item.bestMatch) {
          console.log(`       Best Match: "${item.bestMatch.recipeIngredient}" (score: ${item.bestMatch.matchScore})`);
        } else {
          console.log(`       No match found`);
        }
        if (item.allMatches.length > 1) {
          console.log(`       All matches: ${item.allMatches.length} found`);
        }
      });
    } catch (error) {
      console.error(`   ❌ Error in detailed analysis: ${error}`);
    }
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const tester = new FuzzyMatchingTester();
  tester.runTests()
    .then(() => {
      console.log('\n🎉 Fuzzy matching tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fuzzy matching tests failed:', error);
      process.exit(1);
    });
}

export default FuzzyMatchingTester;
