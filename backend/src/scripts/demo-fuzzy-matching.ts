import IngredientMatcher from '../services/ingredient-matcher';

class FuzzyMatchingDemo {
  private matcher: IngredientMatcher;

  constructor() {
    this.matcher = new IngredientMatcher();
  }

  async runDemo(): Promise<void> {
    console.log('🎭 Fuzzy Ingredient Matching Demo\n');
    console.log('This demo shows how the system handles real-world ingredient variations\n');

    // Real-world pantry scenarios
    const pantryScenarios = [
      {
        name: 'Busy Parent Pantry',
        description: 'Common ingredients with various forms and brands',
        ingredients: [
          'chicken breast',
          'frozen broccoli',
          'red bell pepper',
          'garlic cloves',
          'olive oil',
          'soy sauce'
        ]
      },
      {
        name: 'Student Pantry',
        description: 'Basic ingredients with generic names',
        ingredients: [
          'chicken',
          'pasta',
          'tomato',
          'cheese',
          'garlic',
          'oil'
        ]
      },
      {
        name: 'Health-Conscious Pantry',
        description: 'Organic and specific ingredient types',
        ingredients: [
          'organic chicken breast',
          'fresh broccoli florets',
          'red bell peppers',
          'fresh garlic',
          'extra virgin olive oil',
          'low-sodium soy sauce'
        ]
      },
      {
        name: 'International Pantry',
        description: 'Ingredients with different cultural names',
        ingredients: [
          'chicken thigh',
          'bell peppers',
          'broccoli',
          'garlic',
          'sesame oil',
          'pasta noodles'
        ]
      }
    ];

    for (const scenario of pantryScenarios) {
      console.log(`\n🏠 Scenario: ${scenario.name}`);
      console.log(`   ${scenario.description}`);
      console.log(`   Pantry: [${scenario.ingredients.join(', ')}]`);
      
      try {
        const matches = await this.matcher.findMatchingRecipes(scenario.ingredients, {
          minMatchPercentage: 40,
          maxResults: 3
        });

        if (matches.length > 0) {
          console.log(`   🎯 Found ${matches.length} matching recipes:`);
          matches.forEach((match, index) => {
            console.log(`     ${index + 1}. ${match.title}`);
            console.log(`        Match: ${match.matchPercentage}% (${match.matchedIngredients.length}/${match.totalIngredients} ingredients)`);
            console.log(`        ✅ Matched: [${match.matchedIngredients.join(', ')}]`);
            if (match.missingIngredients.length > 0) {
              console.log(`        ❌ Missing: [${match.missingIngredients.join(', ')}]`);
            }
            console.log(`        ⏱️  ${match.cookingTime} min | 👥 ${match.servings} servings | 📊 ${match.difficulty}`);
          });
        } else {
          console.log('   😔 No matching recipes found');
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error}`);
      }
    }

    // Show ingredient matching intelligence
    console.log('\n🧠 Ingredient Matching Intelligence Demo');
    await this.demonstrateMatchingIntelligence();

    // Show GSI query performance
    console.log('\n⚡ GSI Query Performance Demo');
    await this.demonstrateGSIPerformance();
  }

  private async demonstrateMatchingIntelligence(): Promise<void> {
    const testCases = [
      {
        userInput: 'chicken',
        expectedMatches: ['Chicken Breast', 'Chicken Thigh', 'Chicken Drumstick']
      },
      {
        userInput: 'tomato',
        expectedMatches: ['Cherry Tomatoes', 'Plum Tomatoes', 'Beef Tomatoes']
      },
      {
        userInput: 'pepper',
        expectedMatches: ['Bell Peppers', 'Red Bell Peppers', 'Green Peppers']
      },
      {
        userInput: 'cheese',
        expectedMatches: ['Parmesan Cheese', 'Cheddar Cheese', 'Mozzarella Cheese']
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n   🔍 User Input: "${testCase.userInput}"`);
      
      try {
        const recipeIds = await this.matcher.findRecipesByIngredient(testCase.userInput);
        console.log(`   📊 Found ${recipeIds.length} recipes containing "${testCase.userInput}"`);
        
        if (recipeIds.length > 0) {
          console.log(`   📝 Recipe IDs: [${recipeIds.join(', ')}]`);
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error}`);
      }
    }
  }

  private async demonstrateGSIPerformance(): Promise<void> {
    const ingredients = ['chicken', 'tomato', 'garlic', 'pasta', 'cheese'];
    
    console.log('   Testing GSI3 query performance for common ingredients:');
    
    for (const ingredient of ingredients) {
      const startTime = Date.now();
      
      try {
        const recipeIds = await this.matcher.findRecipesByIngredient(ingredient);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`   "${ingredient}" → ${recipeIds.length} recipes (${duration}ms)`);
      } catch (error) {
        console.error(`   ❌ Error querying "${ingredient}": ${error}`);
      }
    }
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  const demo = new FuzzyMatchingDemo();
  demo.runDemo()
    .then(() => {
      console.log('\n🎉 Fuzzy matching demo completed!');
      console.log('\n💡 Key Features Demonstrated:');
      console.log('   ✅ Ingredient normalization and variation matching');
      console.log('   ✅ Fuzzy matching with scoring system');
      console.log('   ✅ GSI-based efficient queries');
      console.log('   ✅ Real-world pantry scenarios');
      console.log('   ✅ Match percentage calculations');
      console.log('   ✅ Missing ingredient identification');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Demo failed:', error);
      process.exit(1);
    });
}

export default FuzzyMatchingDemo;
