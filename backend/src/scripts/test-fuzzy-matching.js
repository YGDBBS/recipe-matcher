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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1mdXp6eS1tYXRjaGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QtZnV6enktbWF0Y2hpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1RUFBK0Q7QUFFL0QsTUFBTSxtQkFBbUI7SUFHdkI7UUFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksNEJBQWlCLEVBQUUsQ0FBQztJQUN6QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVE7UUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7UUFFdEQsK0NBQStDO1FBQy9DLE1BQU0sU0FBUyxHQUFHO1lBQ2hCO2dCQUNFLElBQUksRUFBRSxlQUFlO2dCQUNyQixlQUFlLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQztnQkFDekUsV0FBVyxFQUFFLG1EQUFtRDthQUNqRTtZQUNEO2dCQUNFLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLGVBQWUsRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDO2dCQUNuRCxXQUFXLEVBQUUscURBQXFEO2FBQ25FO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLG1CQUFtQjtnQkFDekIsZUFBZSxFQUFFLENBQUMsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDO2dCQUN4RSxXQUFXLEVBQUUsaURBQWlEO2FBQy9EO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLGVBQWUsRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDO2dCQUMvQyxXQUFXLEVBQUUsbURBQW1EO2FBQ2pFO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLGVBQWUsRUFBRSxDQUFDLGNBQWMsRUFBRSxlQUFlLEVBQUUsWUFBWSxDQUFDO2dCQUNoRSxXQUFXLEVBQUUsdURBQXVEO2FBQ3JFO1NBQ0YsQ0FBQztRQUVGLEtBQUssTUFBTSxR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LENBQUMsQ0FBQztnQkFDL0csQ0FBQztxQkFBTSxDQUFDO29CQUNOLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDdkMsQ0FBQztnQkFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7Z0JBQ3JFLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBRUQsa0RBQWtEO0FBQ2xELElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztJQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDekMsTUFBTSxDQUFDLFFBQVEsRUFBRTtTQUNkLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDcEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUM7U0FDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztBQUNQLENBQUM7QUFFRCxrQkFBZSxtQkFBbUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBJbmdyZWRpZW50TWF0Y2hlciBmcm9tICcuLi9zZXJ2aWNlcy9pbmdyZWRpZW50LW1hdGNoZXInO1xuXG5jbGFzcyBGdXp6eU1hdGNoaW5nVGVzdGVyIHtcbiAgcHJpdmF0ZSBtYXRjaGVyOiBJbmdyZWRpZW50TWF0Y2hlcjtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm1hdGNoZXIgPSBuZXcgSW5ncmVkaWVudE1hdGNoZXIoKTtcbiAgfVxuXG4gIGFzeW5jIHJ1blRlc3RzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnNvbGUubG9nKCfwn6eqIFRlc3RpbmcgRnV6enkgSW5ncmVkaWVudCBNYXRjaGluZ1xcbicpO1xuXG4gICAgLy8gVGVzdCBjYXNlcyB3aXRoIGRpZmZlcmVudCBsZXZlbHMgb2YgbWF0Y2hpbmdcbiAgICBjb25zdCB0ZXN0Q2FzZXMgPSBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdFeGFjdCBNYXRjaGVzJyxcbiAgICAgICAgdXNlckluZ3JlZGllbnRzOiBbJ2NoaWNrZW4gYnJlYXN0JywgJ2JlbGwgcGVwcGVycycsICdicm9jY29saScsICdnYXJsaWMnXSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdTaG91bGQgZmluZCByZWNpcGVzIHdpdGggZXhhY3QgaW5ncmVkaWVudCBtYXRjaGVzJ1xuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ1BhcnRpYWwgTWF0Y2hlcycsXG4gICAgICAgIHVzZXJJbmdyZWRpZW50czogWydjaGlja2VuJywgJ3BlcHBlcnMnLCAnYnJvY2NvbGknXSxcbiAgICAgICAgZGVzY3JpcHRpb246ICdTaG91bGQgZmluZCByZWNpcGVzIHdpdGggcGFydGlhbCBpbmdyZWRpZW50IG1hdGNoZXMnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnVmFyaWF0aW9uIE1hdGNoZXMnLFxuICAgICAgICB1c2VySW5ncmVkaWVudHM6IFsnY2hpY2tlbiB0aGlnaCcsICdyZWQgYmVsbCBwZXBwZXJzJywgJ2ZyZXNoIGJyb2Njb2xpJ10sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU2hvdWxkIGZpbmQgcmVjaXBlcyB1c2luZyBpbmdyZWRpZW50IHZhcmlhdGlvbnMnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnRnV6enkgTWF0Y2hlcycsXG4gICAgICAgIHVzZXJJbmdyZWRpZW50czogWydjaGlja2VuJywgJ3RvbWF0bycsICdwYXN0YSddLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Nob3VsZCBmaW5kIHJlY2lwZXMgd2l0aCBmdXp6eSBpbmdyZWRpZW50IG1hdGNoZXMnXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnTm8gTWF0Y2hlcycsXG4gICAgICAgIHVzZXJJbmdyZWRpZW50czogWyd1bmljb3JuIG1lYXQnLCAnZHJhZ29uIHNjYWxlcycsICdmYWlyeSBkdXN0J10sXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU2hvdWxkIHJldHVybiBubyBtYXRjaGVzIGZvciBub24tZXhpc3RlbnQgaW5ncmVkaWVudHMnXG4gICAgICB9XG4gICAgXTtcblxuICAgIGZvciAoY29uc3QgdGVzdENhc2Ugb2YgdGVzdENhc2VzKSB7XG4gICAgICBjb25zb2xlLmxvZyhgXFxu8J+TnSBUZXN0OiAke3Rlc3RDYXNlLm5hbWV9YCk7XG4gICAgICBjb25zb2xlLmxvZyhgICAgRGVzY3JpcHRpb246ICR7dGVzdENhc2UuZGVzY3JpcHRpb259YCk7XG4gICAgICBjb25zb2xlLmxvZyhgICAgVXNlciBJbmdyZWRpZW50czogWyR7dGVzdENhc2UudXNlckluZ3JlZGllbnRzLmpvaW4oJywgJyl9XWApO1xuICAgICAgXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBtYXRjaGVzID0gYXdhaXQgdGhpcy5tYXRjaGVyLmZpbmRNYXRjaGluZ1JlY2lwZXModGVzdENhc2UudXNlckluZ3JlZGllbnRzLCB7XG4gICAgICAgICAgbWluTWF0Y2hQZXJjZW50YWdlOiAzMCwgLy8gTG93ZXIgdGhyZXNob2xkIGZvciB0ZXN0aW5nXG4gICAgICAgICAgbWF4UmVzdWx0czogNVxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zb2xlLmxvZyhgICAgUmVzdWx0czogJHttYXRjaGVzLmxlbmd0aH0gcmVjaXBlcyBmb3VuZGApO1xuICAgICAgICBcbiAgICAgICAgaWYgKG1hdGNoZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCcgICBUb3AgbWF0Y2hlczonKTtcbiAgICAgICAgICBtYXRjaGVzLnNsaWNlKDAsIDMpLmZvckVhY2goKG1hdGNoLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYCAgICAgJHtpbmRleCArIDF9LiAke21hdGNoLnRpdGxlfSAoJHttYXRjaC5tYXRjaFBlcmNlbnRhZ2V9JSBtYXRjaClgKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICAgICAgIE1hdGNoZWQ6IFske21hdGNoLm1hdGNoZWRJbmdyZWRpZW50cy5qb2luKCcsICcpfV1gKTtcbiAgICAgICAgICAgIGlmIChtYXRjaC5taXNzaW5nSW5ncmVkaWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAgICAgICBNaXNzaW5nOiBbJHttYXRjaC5taXNzaW5nSW5ncmVkaWVudHMuam9pbignLCAnKX1dYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5sb2coJyAgIE5vIG1hdGNoZXMgZm91bmQnKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgICAg4p2MIEVycm9yOiAke2Vycm9yfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRlc3Qgc3BlY2lmaWMgaW5ncmVkaWVudCBxdWVyaWVzXG4gICAgY29uc29sZS5sb2coJ1xcbvCflI0gVGVzdGluZyBTcGVjaWZpYyBJbmdyZWRpZW50IFF1ZXJpZXMnKTtcbiAgICBhd2FpdCB0aGlzLnRlc3RTcGVjaWZpY0luZ3JlZGllbnRRdWVyaWVzKCk7XG5cbiAgICAvLyBUZXN0IGRldGFpbGVkIGFuYWx5c2lzXG4gICAgY29uc29sZS5sb2coJ1xcbvCfk4ogVGVzdGluZyBEZXRhaWxlZCBBbmFseXNpcycpO1xuICAgIGF3YWl0IHRoaXMudGVzdERldGFpbGVkQW5hbHlzaXMoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdGVzdFNwZWNpZmljSW5ncmVkaWVudFF1ZXJpZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgaW5ncmVkaWVudHMgPSBbJ2NoaWNrZW4nLCAndG9tYXRvJywgJ3Bhc3RhJywgJ2dhcmxpYyddO1xuICAgIFxuICAgIGZvciAoY29uc3QgaW5ncmVkaWVudCBvZiBpbmdyZWRpZW50cykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVjaXBlSWRzID0gYXdhaXQgdGhpcy5tYXRjaGVyLmZpbmRSZWNpcGVzQnlJbmdyZWRpZW50KGluZ3JlZGllbnQpO1xuICAgICAgICBjb25zb2xlLmxvZyhgICAgXCIke2luZ3JlZGllbnR9XCIg4oaSICR7cmVjaXBlSWRzLmxlbmd0aH0gcmVjaXBlczogWyR7cmVjaXBlSWRzLmpvaW4oJywgJyl9XWApO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgICAg4p2MIEVycm9yIHF1ZXJ5aW5nIFwiJHtpbmdyZWRpZW50fVwiOiAke2Vycm9yfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdGVzdERldGFpbGVkQW5hbHlzaXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEdldCB0aGUgZmlyc3QgcmVjaXBlIElEIGZvciBhbmFseXNpc1xuICAgICAgY29uc3QgYWxsUmVjaXBlcyA9IGF3YWl0IHRoaXMubWF0Y2hlclsnZ2V0QWxsUmVjaXBlcyddKCk7XG4gICAgICBpZiAoYWxsUmVjaXBlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY29uc29sZS5sb2coJyAgIE5vIHJlY2lwZXMgYXZhaWxhYmxlIGZvciBhbmFseXNpcycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGZpcnN0UmVjaXBlID0gYWxsUmVjaXBlc1swXTtcbiAgICAgIGNvbnN0IHJlY2lwZUlkID0gZmlyc3RSZWNpcGUuUEsucmVwbGFjZSgnUkVDSVBFIycsICcnKTtcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coYCAgIEFuYWx5emluZyByZWNpcGU6ICR7Zmlyc3RSZWNpcGUudGl0bGV9YCk7XG4gICAgICBcbiAgICAgIGNvbnN0IGFuYWx5c2lzID0gYXdhaXQgdGhpcy5tYXRjaGVyLmFuYWx5emVJbmdyZWRpZW50TWF0Y2hpbmcoXG4gICAgICAgIFsnY2hpY2tlbicsICd0b21hdG8nLCAnZ2FybGljJ10sXG4gICAgICAgIHJlY2lwZUlkXG4gICAgICApO1xuICAgICAgXG4gICAgICBjb25zb2xlLmxvZyhgICAgUmVjaXBlOiAke2FuYWx5c2lzLnJlY2lwZVRpdGxlfWApO1xuICAgICAgYW5hbHlzaXMuYW5hbHlzaXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coYCAgICAgVXNlcjogXCIke2l0ZW0udXNlckluZ3JlZGllbnR9XCJgKTtcbiAgICAgICAgaWYgKGl0ZW0uYmVzdE1hdGNoKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYCAgICAgICBCZXN0IE1hdGNoOiBcIiR7aXRlbS5iZXN0TWF0Y2gucmVjaXBlSW5ncmVkaWVudH1cIiAoc2NvcmU6ICR7aXRlbS5iZXN0TWF0Y2gubWF0Y2hTY29yZX0pYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYCAgICAgICBObyBtYXRjaCBmb3VuZGApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpdGVtLmFsbE1hdGNoZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGAgICAgICAgQWxsIG1hdGNoZXM6ICR7aXRlbS5hbGxNYXRjaGVzLmxlbmd0aH0gZm91bmRgKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYCAgIOKdjCBFcnJvciBpbiBkZXRhaWxlZCBhbmFseXNpczogJHtlcnJvcn1gKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gUnVuIHRoZSB0ZXN0cyBpZiB0aGlzIGZpbGUgaXMgZXhlY3V0ZWQgZGlyZWN0bHlcbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBjb25zdCB0ZXN0ZXIgPSBuZXcgRnV6enlNYXRjaGluZ1Rlc3RlcigpO1xuICB0ZXN0ZXIucnVuVGVzdHMoKVxuICAgIC50aGVuKCgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdcXG7wn46JIEZ1enp5IG1hdGNoaW5nIHRlc3RzIGNvbXBsZXRlZCEnKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICB9KVxuICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ/CfkqUgRnV6enkgbWF0Y2hpbmcgdGVzdHMgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgRnV6enlNYXRjaGluZ1Rlc3RlcjtcbiJdfQ==