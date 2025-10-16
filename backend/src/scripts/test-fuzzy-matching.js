"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ingredient_matcher_1 = require("../services/ingredient-matcher");
class FuzzyMatchingTester {
    constructor() {
        this.matcher = new ingredient_matcher_1.default();
    }
    async runTests() {
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
                }
                else {
                    console.log('   No matches found');
                }
            }
            catch (error) {
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
    async testSpecificIngredientQueries() {
        const ingredients = ['chicken', 'tomato', 'pasta', 'garlic'];
        for (const ingredient of ingredients) {
            try {
                const recipeIds = await this.matcher.findRecipesByIngredient(ingredient);
                console.log(`   "${ingredient}" → ${recipeIds.length} recipes: [${recipeIds.join(', ')}]`);
            }
            catch (error) {
                console.error(`   ❌ Error querying "${ingredient}": ${error}`);
            }
        }
    }
    async testDetailedAnalysis() {
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
            const analysis = await this.matcher.analyzeIngredientMatching(['chicken', 'tomato', 'garlic'], recipeId);
            console.log(`   Recipe: ${analysis.recipeTitle}`);
            analysis.analysis.forEach(item => {
                console.log(`     User: "${item.userIngredient}"`);
                if (item.bestMatch) {
                    console.log(`       Best Match: "${item.bestMatch.recipeIngredient}" (score: ${item.bestMatch.matchScore})`);
                }
                else {
                    console.log(`       No match found`);
                }
                if (item.allMatches.length > 1) {
                    console.log(`       All matches: ${item.allMatches.length} found`);
                }
            });
        }
        catch (error) {
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
exports.default = FuzzyMatchingTester;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1mdXp6eS1tYXRjaGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QtZnV6enktbWF0Y2hpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1RUFBZ0Y7QUFFaEYsTUFBTSxtQkFBbUI7SUFHdkI7UUFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksNEJBQWlCLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVE7UUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7UUFFdEQsK0NBQStDO1FBQy9DLE1BQU0sU0FBUyxHQUFHO1lBQ2hCO2dCQUNFLElBQUksRUFBRSxlQUFlO2dCQUNyQixlQUFlLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQztnQkFDekUsV0FBVyxFQUFFLG1EQUFtRDthQUNqRTtZQUNEO2dCQUNFLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLGVBQWUsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO2dCQUNuRCxXQUFXLEVBQUUscURBQXFEO2FBQ25FO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLG1CQUFtQjtnQkFDekIsZUFBZSxFQUFFLENBQUMsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDO2dCQUN4RSxXQUFXLEVBQUUsaURBQWlEO2FBQy9EO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLGVBQWUsRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDO2dCQUMvQyxXQUFXLEVBQUUsbURBQW1EO2FBQ2pFO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLGVBQWUsRUFBRSxDQUFDLGNBQWMsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDO2dCQUNoRSxXQUFXLEVBQUUsdURBQXVEO2FBQ3JFO1NBQ0YsQ0FBQztRQUVGLEtBQUssTUFBTSxR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LENBQUMsQ0FBQztnQkFDL0csQ0FBQztxQkFBTSxDQUFDO29CQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDdkMsQ0FBQztnQkFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7Z0JBQ3JFLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBRUQsa0RBQWtEO0FBQ2xELElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztJQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDekMsTUFBTSxDQUFDLFFBQVEsRUFBRTtTQUNkLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDcEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUFFRCxrQkFBZSxtQkFBbUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBJbmdyZWRpZW50TWF0Y2hlciwgeyBSZWNpcGVNYXRjaCB9IGZyb20gJy4uL3NlcnZpY2VzL2luZ3JlZGllbnQtbWF0Y2hlcic7XG5cbmNsYXNzIEZ1enp5TWF0Y2hpbmdUZXN0ZXIge1xuICBwcml2YXRlIG1hdGNoZXI6IEluZ3JlZGllbnRNYXRjaGVyO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubWF0Y2hlciA9IG5ldyBJbmdyZWRpZW50TWF0Y2hlcigpO1xuICB9XG5cbiAgYXN5bmMgcnVuVGVzdHMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc29sZS5sb2coJ/Cfp6ogVGVzdGluZyBGdXp6eSBJbmdyZWRpZW50IE1hdGNoaW5nXFxuJyk7XG5cbiAgICAvLyBUZXN0IGNhc2VzIHdpdGggZGlmZmVyZW50IGxldmVscyBvZiBtYXRjaGluZ1xuICAgIGNvbnN0IHRlc3RDYXNlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0V4YWN0IE1hdGNoZXMnLFxuICAgICAgICB1c2VySW5ncmVkaWVudHM6IFsnY2hpY2tlbiBicmVhc3QnLCAnYmVsbCBwZXBwZXJzJywgJ2Jyb2Njb2xpJywgJ2dhcmxpYyddLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Nob3VsZCBmaW5kIHJlY2lwZXMgd2l0aCBleGFjdCBpbmdyZWRpZW50IG1hdGNoZXMnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnUGFydGlhbCBNYXRjaGVzJyxcbiAgICAgICAgdXNlckluZ3JlZGllbnRzOiBbJ2NoaWNrZW4nLCAncGVwcGVycycsICdicm9jY29saSddLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Nob3VsZCBmaW5kIHJlY2lwZXMgd2l0aCBwYXJ0aWFsIGluZ3JlZGllbnQgbWF0Y2hlcydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdWYXJpYXRpb24gTWF0Y2hlcycsXG4gICAgICAgIHVzZXJJbmdyZWRpZW50czogWydjaGlja2VuIHRoaWdoJywgJ3JlZCBiZWxsIHBlcHBlcnMnLCAnZnJlc2ggYnJvY2NvbGknXSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdTaG91bGQgZmluZCByZWNpcGVzIHVzaW5nIGluZ3JlZGllbnQgdmFyaWF0aW9ucydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdGdXp6eSBNYXRjaGVzJyxcbiAgICAgICAgdXNlckluZ3JlZGllbnRzOiBbJ2NoaWNrZW4nLCAndG9tYXRvJywgJ3Bhc3RhJ10sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU2hvdWxkIGZpbmQgcmVjaXBlcyB3aXRoIGZ1enp5IGluZ3JlZGllbnQgbWF0Y2hlcydcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdObyBNYXRjaGVzJyxcbiAgICAgICAgdXNlckluZ3JlZGllbnRzOiBbJ3VuaWNvcm4gbWVhdCcsICdkcmFnb24gc2NhbGVzJywgJ2ZhaXJ5IGR1c3QnXSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdTaG91bGQgcmV0dXJuIG5vIG1hdGNoZXMgZm9yIG5vbi1leGlzdGVudCBpbmdyZWRpZW50cydcbiAgICAgIH1cbiAgICBdO1xuXG4gICAgZm9yIChjb25zdCB0ZXN0Q2FzZSBvZiB0ZXN0Q2FzZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBcXG7wn5OdIFRlc3Q6ICR7dGVzdENhc2UubmFtZX1gKTtcbiAgICAgIGNvbnNvbGUubG9nKGAgICBEZXNjcmlwdGlvbjogJHt0ZXN0Q2FzZS5kZXNjcmlwdGlvbn1gKTtcbiAgICAgIGNvbnNvbGUubG9nKGAgICBVc2VyIEluZ3JlZGllbnRzOiBbJHt0ZXN0Q2FzZS51c2VySW5ncmVkaWVudHMuam9pbignLCAnKX1dYCk7XG4gICAgICBcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IG1hdGNoZXMgPSBhd2FpdCB0aGlzLm1hdGNoZXIuZmluZE1hdGNoaW5nUmVjaXBlcyh0ZXN0Q2FzZS51c2VySW5ncmVkaWVudHMsIHtcbiAgICAgICAgICBtaW5NYXRjaFBlcmNlbnRhZ2U6IDMwLCAvLyBMb3dlciB0aHJlc2hvbGQgZm9yIHRlc3RpbmdcbiAgICAgICAgICBtYXhSZXN1bHRzOiA1XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGAgICBSZXN1bHRzOiAke21hdGNoZXMubGVuZ3RofSByZWNpcGVzIGZvdW5kYCk7XG4gICAgICAgIFxuICAgICAgICBpZiAobWF0Y2hlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJyAgIFRvcCBtYXRjaGVzOicpO1xuICAgICAgICAgIG1hdGNoZXMuc2xpY2UoMCwgMykuZm9yRWFjaCgobWF0Y2gsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgICAgICAke2luZGV4ICsgMX0uICR7bWF0Y2gudGl0bGV9ICgke21hdGNoLm1hdGNoUGVyY2VudGFnZX0lIG1hdGNoKWApO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYCAgICAgICAgTWF0Y2hlZDogWyR7bWF0Y2gubWF0Y2hlZEluZ3JlZGllbnRzLmpvaW4oJywgJyl9XWApO1xuICAgICAgICAgICAgaWYgKG1hdGNoLm1pc3NpbmdJbmdyZWRpZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICAgICAgIE1pc3Npbmc6IFske21hdGNoLm1pc3NpbmdJbmdyZWRpZW50cy5qb2luKCcsICcpfV1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnICAgTm8gbWF0Y2hlcyBmb3VuZCcpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGAgICDinYwgRXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGVzdCBzcGVjaWZpYyBpbmdyZWRpZW50IHF1ZXJpZXNcbiAgICBjb25zb2xlLmxvZygnXFxu8J+UjSBUZXN0aW5nIFNwZWNpZmljIEluZ3JlZGllbnQgUXVlcmllcycpO1xuICAgIGF3YWl0IHRoaXMudGVzdFNwZWNpZmljSW5ncmVkaWVudFF1ZXJpZXMoKTtcblxuICAgIC8vIFRlc3QgZGV0YWlsZWQgYW5hbHlzaXNcbiAgICBjb25zb2xlLmxvZygnXFxu8J+TiiBUZXN0aW5nIERldGFpbGVkIEFuYWx5c2lzJyk7XG4gICAgYXdhaXQgdGhpcy50ZXN0RGV0YWlsZWRBbmFseXNpcygpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB0ZXN0U3BlY2lmaWNJbmdyZWRpZW50UXVlcmllcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBpbmdyZWRpZW50cyA9IFsnY2hpY2tlbicsICd0b21hdG8nLCAncGFzdGEnLCAnZ2FybGljJ107XG4gICAgXG4gICAgZm9yIChjb25zdCBpbmdyZWRpZW50IG9mIGluZ3JlZGllbnRzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZWNpcGVJZHMgPSBhd2FpdCB0aGlzLm1hdGNoZXIuZmluZFJlY2lwZXNCeUluZ3JlZGllbnQoaW5ncmVkaWVudCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAgICBcIiR7aW5ncmVkaWVudH1cIiDihpIgJHtyZWNpcGVJZHMubGVuZ3RofSByZWNpcGVzOiBbJHtyZWNpcGVJZHMuam9pbignLCAnKX1dYCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGAgICDinYwgRXJyb3IgcXVlcnlpbmcgXCIke2luZ3JlZGllbnR9XCI6ICR7ZXJyb3J9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB0ZXN0RGV0YWlsZWRBbmFseXNpcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgLy8gR2V0IHRoZSBmaXJzdCByZWNpcGUgSUQgZm9yIGFuYWx5c2lzXG4gICAgICBjb25zdCBhbGxSZWNpcGVzID0gYXdhaXQgdGhpcy5tYXRjaGVyWydnZXRBbGxSZWNpcGVzJ10oKTtcbiAgICAgIGlmIChhbGxSZWNpcGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBjb25zb2xlLmxvZygnICAgTm8gcmVjaXBlcyBhdmFpbGFibGUgZm9yIGFuYWx5c2lzJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZmlyc3RSZWNpcGUgPSBhbGxSZWNpcGVzWzBdO1xuICAgICAgY29uc3QgcmVjaXBlSWQgPSBmaXJzdFJlY2lwZS5QSy5yZXBsYWNlKCdSRUNJUEUjJywgJycpO1xuICAgICAgXG4gICAgICBjb25zb2xlLmxvZyhgICAgQW5hbHl6aW5nIHJlY2lwZTogJHtmaXJzdFJlY2lwZS50aXRsZX1gKTtcbiAgICAgIFxuICAgICAgY29uc3QgYW5hbHlzaXMgPSBhd2FpdCB0aGlzLm1hdGNoZXIuYW5hbHl6ZUluZ3JlZGllbnRNYXRjaGluZyhcbiAgICAgICAgWydjaGlja2VuJywgJ3RvbWF0bycsICdnYXJsaWMnXSxcbiAgICAgICAgcmVjaXBlSWRcbiAgICAgICk7XG4gICAgICBcbiAgICAgIGNvbnNvbGUubG9nKGAgICBSZWNpcGU6ICR7YW5hbHlzaXMucmVjaXBlVGl0bGV9YCk7XG4gICAgICBhbmFseXNpcy5hbmFseXNpcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhgICAgICBVc2VyOiBcIiR7aXRlbS51c2VySW5ncmVkaWVudH1cImApO1xuICAgICAgICBpZiAoaXRlbS5iZXN0TWF0Y2gpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAgICAgIEJlc3QgTWF0Y2g6IFwiJHtpdGVtLmJlc3RNYXRjaC5yZWNpcGVJbmdyZWRpZW50fVwiIChzY29yZTogJHtpdGVtLmJlc3RNYXRjaC5tYXRjaFNjb3JlfSlgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAgICAgIE5vIG1hdGNoIGZvdW5kYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGl0ZW0uYWxsTWF0Y2hlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYCAgICAgICBBbGwgbWF0Y2hlczogJHtpdGVtLmFsbE1hdGNoZXMubGVuZ3RofSBmb3VuZGApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihgICAg4p2MIEVycm9yIGluIGRldGFpbGVkIGFuYWx5c2lzOiAke2Vycm9yfWApO1xuICAgIH1cbiAgfVxufVxuXG4vLyBSdW4gdGhlIHRlc3RzIGlmIHRoaXMgZmlsZSBpcyBleGVjdXRlZCBkaXJlY3RseVxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIGNvbnN0IHRlc3RlciA9IG5ldyBGdXp6eU1hdGNoaW5nVGVzdGVyKCk7XG4gIHRlc3Rlci5ydW5UZXN0cygpXG4gICAgLnRoZW4oKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ1xcbvCfjokgRnV6enkgbWF0Y2hpbmcgdGVzdHMgY29tcGxldGVkIScpO1xuICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIH0pXG4gICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcign8J+SpSBGdXp6eSBtYXRjaGluZyB0ZXN0cyBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBGdXp6eU1hdGNoaW5nVGVzdGVyO1xuIl19