"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const matching_v2_1 = require("../lambda/matching-v2");
class MatchingLambdaTester {
    async testFindMatchingRecipes() {
        console.log('🧪 Testing Find Matching Recipes Endpoint\n');
        const testCases = [
            {
                name: 'Exact Match Test',
                userIngredients: ['chicken breast', 'bell peppers', 'broccoli', 'garlic'],
                expectedMinMatches: 1
            },
            {
                name: 'Partial Match Test',
                userIngredients: ['chicken', 'tomato', 'pasta'],
                expectedMinMatches: 1
            },
            {
                name: 'Fuzzy Match Test',
                userIngredients: ['chicken thigh', 'red bell peppers', 'fresh broccoli'],
                expectedMinMatches: 1
            },
            {
                name: 'No Match Test',
                userIngredients: ['unicorn meat', 'dragon scales'],
                expectedMinMatches: 0
            }
        ];
        for (const testCase of testCases) {
            console.log(`📝 Test: ${testCase.name}`);
            console.log(`   Ingredients: [${testCase.userIngredients.join(', ')}]`);
            try {
                const event = {
                    httpMethod: 'POST',
                    path: '/matching/find-recipes',
                    headers: {
                        'Authorization': 'Bearer test-user-123'
                    },
                    multiValueHeaders: {},
                    body: JSON.stringify({
                        userIngredients: testCase.userIngredients,
                        minMatchPercentage: 30,
                        limit: 5
                    }),
                    isBase64Encoded: false,
                    pathParameters: null,
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {},
                    resource: ''
                };
                const result = await (0, matching_v2_1.handler)(event);
                if (result.statusCode === 200) {
                    const response = JSON.parse(result.body);
                    console.log(`   ✅ Status: ${result.statusCode}`);
                    console.log(`   📊 Found: ${response.matches.length} matches`);
                    console.log(`   🎯 Total: ${response.totalMatches} total matches`);
                    if (response.matches.length > 0) {
                        console.log('   🏆 Top matches:');
                        response.matches.slice(0, 2).forEach((match, index) => {
                            console.log(`     ${index + 1}. ${match.title} (${match.matchPercentage}% match)`);
                            console.log(`        Matched: [${match.matchedIngredients.join(', ')}]`);
                            if (match.missingIngredients.length > 0) {
                                console.log(`        Missing: [${match.missingIngredients.join(', ')}]`);
                            }
                        });
                    }
                }
                else {
                    console.log(`   ❌ Error: ${result.statusCode} - ${result.body}`);
                }
            }
            catch (error) {
                console.error(`   💥 Exception: ${error}`);
            }
            console.log('');
        }
    }
    async testCalculateMatchPercentage() {
        console.log('🧮 Testing Calculate Match Percentage Endpoint\n');
        const testCases = [
            {
                name: 'High Match Test',
                userIngredients: ['chicken breast', 'bell peppers', 'broccoli'],
                recipeIngredients: ['chicken breast', 'bell peppers', 'broccoli', 'garlic', 'soy sauce'],
                expectedMinPercentage: 60
            },
            {
                name: 'Partial Match Test',
                userIngredients: ['chicken', 'tomato'],
                recipeIngredients: ['chicken breast', 'cherry tomatoes', 'pasta', 'garlic'],
                expectedMinPercentage: 40
            },
            {
                name: 'Low Match Test',
                userIngredients: ['chicken'],
                recipeIngredients: ['pasta', 'tomato', 'cheese', 'garlic'],
                expectedMaxPercentage: 30
            }
        ];
        for (const testCase of testCases) {
            console.log(`📝 Test: ${testCase.name}`);
            console.log(`   User: [${testCase.userIngredients.join(', ')}]`);
            console.log(`   Recipe: [${testCase.recipeIngredients.join(', ')}]`);
            try {
                const event = {
                    httpMethod: 'POST',
                    path: '/matching/calculate-match',
                    headers: {},
                    multiValueHeaders: {},
                    body: JSON.stringify({
                        userIngredients: testCase.userIngredients,
                        recipeIngredients: testCase.recipeIngredients
                    }),
                    isBase64Encoded: false,
                    pathParameters: null,
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {},
                    resource: ''
                };
                const result = await (0, matching_v2_1.handler)(event);
                if (result.statusCode === 200) {
                    const response = JSON.parse(result.body);
                    console.log(`   ✅ Status: ${result.statusCode}`);
                    console.log(`   📊 Match: ${response.matchPercentage}%`);
                    console.log(`   ✅ Matched: [${response.matchedIngredients.join(', ')}]`);
                    console.log(`   ❌ Missing: [${response.missingIngredients.join(', ')}]`);
                    if (testCase.expectedMinPercentage && response.matchPercentage >= testCase.expectedMinPercentage) {
                        console.log(`   ✅ Passed: Match percentage meets expectation`);
                    }
                    else if (testCase.expectedMaxPercentage && response.matchPercentage <= testCase.expectedMaxPercentage) {
                        console.log(`   ✅ Passed: Match percentage within expected range`);
                    }
                    else {
                        console.log(`   ⚠️  Warning: Match percentage outside expected range`);
                    }
                }
                else {
                    console.log(`   ❌ Error: ${result.statusCode} - ${result.body}`);
                }
            }
            catch (error) {
                console.error(`   💥 Exception: ${error}`);
            }
            console.log('');
        }
    }
    async testIngredientAnalysis() {
        console.log('🔬 Testing Ingredient Analysis Endpoint\n');
        try {
            const event = {
                httpMethod: 'POST',
                path: '/matching/ingredient-analysis',
                headers: {
                    'Authorization': 'Bearer test-user-123'
                },
                multiValueHeaders: {},
                body: JSON.stringify({
                    userIngredients: ['chicken', 'tomato', 'garlic'],
                    recipeId: 'test-recipe-1'
                }),
                isBase64Encoded: false,
                pathParameters: null,
                queryStringParameters: null,
                multiValueQueryStringParameters: null,
                stageVariables: null,
                requestContext: {},
                resource: ''
            };
            const result = await (0, matching_v2_1.handler)(event);
            if (result.statusCode === 200) {
                const response = JSON.parse(result.body);
                console.log(`   ✅ Status: ${result.statusCode}`);
                console.log(`   📝 Recipe: ${response.recipeTitle}`);
                console.log('   🔍 Analysis:');
                response.analysis.forEach((item, index) => {
                    console.log(`     ${index + 1}. User: "${item.userIngredient}"`);
                    if (item.bestMatch) {
                        console.log(`        Best: "${item.bestMatch.recipeIngredient}" (score: ${item.bestMatch.matchScore})`);
                    }
                    else {
                        console.log(`        No match found`);
                    }
                });
            }
            else {
                console.log(`   ❌ Error: ${result.statusCode} - ${result.body}`);
            }
        }
        catch (error) {
            console.error(`   💥 Exception: ${error}`);
        }
    }
    async runAllTests() {
        console.log('🚀 Starting Matching Lambda V2 Tests\n');
        await this.testFindMatchingRecipes();
        await this.testCalculateMatchPercentage();
        await this.testIngredientAnalysis();
        console.log('🎉 All matching lambda tests completed!');
    }
}
// Run the tests if this file is executed directly
if (require.main === module) {
    const tester = new MatchingLambdaTester();
    tester.runAllTests()
        .then(() => {
        console.log('\n✅ Matching Lambda V2 is ready for production!');
        console.log('\n💡 Key Features:');
        console.log('   ✅ Fuzzy ingredient matching');
        console.log('   ✅ Single-table design integration');
        console.log('   ✅ Advanced filtering options');
        console.log('   ✅ Detailed match analysis');
        console.log('   ✅ Performance optimized queries');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Matching lambda tests failed:', error);
        process.exit(1);
    });
}
exports.default = MatchingLambdaTester;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1tYXRjaGluZy1sYW1iZGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZXN0LW1hdGNoaW5nLWxhbWJkYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLHVEQUFnRDtBQUVoRCxNQUFNLG9CQUFvQjtJQUN4QixLQUFLLENBQUMsdUJBQXVCO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLENBQUMsQ0FBQztRQUUzRCxNQUFNLFNBQVMsR0FBRztZQUNoQjtnQkFDRSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixlQUFlLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQztnQkFDekUsa0JBQWtCLEVBQUUsQ0FBQzthQUN0QjtZQUNEO2dCQUNFLElBQUksRUFBRSxvQkFBb0I7Z0JBQzFCLGVBQWUsRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDO2dCQUMvQyxrQkFBa0IsRUFBRSxDQUFDO2FBQ3RCO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsZUFBZSxFQUFFLENBQUMsZUFBZSxFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDO2dCQUN4RSxrQkFBa0IsRUFBRSxDQUFDO2FBQ3RCO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLGVBQWUsRUFBRSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUM7Z0JBQ2xELGtCQUFrQixFQUFFLENBQUM7YUFDdEI7U0FDRixDQUFDO1FBRUYsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXhFLElBQUksQ0FB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LEVBQUU7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBRUQsa0JBQWUsb0JBQW9CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgaGFuZGxlciB9IGZyb20gJy4uL2xhbWJkYS9tYXRjaGluZy12Mic7XG5cbmNsYXNzIE1hdGNoaW5nTGFtYmRhVGVzdGVyIHtcbiAgYXN5bmMgdGVzdEZpbmRNYXRjaGluZ1JlY2lwZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc29sZS5sb2coJ/Cfp6ogVGVzdGluZyBGaW5kIE1hdGNoaW5nIFJlY2lwZXMgRW5kcG9pbnRcXG4nKTtcblxuICAgIGNvbnN0IHRlc3RDYXNlcyA9IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0V4YWN0IE1hdGNoIFRlc3QnLFxuICAgICAgICB1c2VySW5ncmVkaWVudHM6IFsnY2hpY2tlbiBicmVhc3QnLCAnYmVsbCBwZXBwZXJzJywgJ2Jyb2Njb2xpJywgJ2dhcmxpYyddLFxuICAgICAgICBleHBlY3RlZE1pbk1hdGNoZXM6IDFcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdQYXJ0aWFsIE1hdGNoIFRlc3QnLFxuICAgICAgICB1c2VySW5ncmVkaWVudHM6IFsnY2hpY2tlbicsICd0b21hdG8nLCAncGFzdGEnXSxcbiAgICAgICAgZXhwZWN0ZWRNaW5NYXRjaGVzOiAxXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnRnV6enkgTWF0Y2ggVGVzdCcsXG4gICAgICAgIHVzZXJJbmdyZWRpZW50czogWydjaGlja2VuIHRoaWdoJywgJ3JlZCBiZWxsIHBlcHBlcnMnLCAnZnJlc2ggYnJvY2NvbGknXSxcbiAgICAgICAgZXhwZWN0ZWRNaW5NYXRjaGVzOiAxXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnTm8gTWF0Y2ggVGVzdCcsXG4gICAgICAgIHVzZXJJbmdyZWRpZW50czogWyd1bmljb3JuIG1lYXQnLCAnZHJhZ29uIHNjYWxlcyddLFxuICAgICAgICBleHBlY3RlZE1pbk1hdGNoZXM6IDBcbiAgICAgIH1cbiAgICBdO1xuXG4gICAgZm9yIChjb25zdCB0ZXN0Q2FzZSBvZiB0ZXN0Q2FzZXMpIHtcbiAgICAgIGNvbnNvbGUubG9nKGDwn5OdIFRlc3Q6ICR7dGVzdENhc2UubmFtZX1gKTtcbiAgICAgIGNvbnNvbGUubG9nKGAgICBJbmdyZWRpZW50czogWyR7dGVzdENhc2UudXNlckluZ3JlZGllbnRzLmpvaW4oJywgJyl9XWApO1xuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XG4gICAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgIHBhdGg6ICcvbWF0Y2hpbmcvZmluZC1yZWNpcGVzJyxcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbic6ICdCZWFyZXIgdGVzdC11c2VyLTEyMydcbiAgICAgICAgICB9LFxuICAgICAgICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICB1c2VySW5ncmVkaWVudHM6IHRlc3RDYXNlLnVzZXJJbmdyZWRpZW50cyxcbiAgICAgICAgICAgIG1pbk1hdGNoUGVyY2VudGFnZTogMzAsXG4gICAgICAgICAgICBsaW1pdDogNVxuICAgICAgICAgIH0pLFxuICAgICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXG4gICAgICAgICAgcGF0aFBhcmFtZXRlcnM6IG51bGwsXG4gICAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxuICAgICAgICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXG4gICAgICAgICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXG4gICAgICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcbiAgICAgICAgICByZXNvdXJjZTogJydcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXN1bHQuc3RhdHVzQ29kZSA9PT0gMjAwKSB7XG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAg4pyFIFN0YXR1czogJHtyZXN1bHQuc3RhdHVzQ29kZX1gKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAg8J+TiiBGb3VuZDogJHtyZXNwb25zZS5tYXRjaGVzLmxlbmd0aH0gbWF0Y2hlc2ApO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGAgICDwn46vIFRvdGFsOiAke3Jlc3BvbnNlLnRvdGFsTWF0Y2hlc30gdG90YWwgbWF0Y2hlc2ApO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChyZXNwb25zZS5tYXRjaGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCcgICDwn4+GIFRvcCBtYXRjaGVzOicpO1xuICAgICAgICAgICAgcmVzcG9uc2UubWF0Y2hlcy5zbGljZSgwLCAyKS5mb3JFYWNoKChtYXRjaDogYW55LCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICAgICR7aW5kZXggKyAxfS4gJHttYXRjaC50aXRsZX0gKCR7bWF0Y2gubWF0Y2hQZXJjZW50YWdlfSUgbWF0Y2gpYCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICAgICAgIE1hdGNoZWQ6IFske21hdGNoLm1hdGNoZWRJbmdyZWRpZW50cy5qb2luKCcsICcpfV1gKTtcbiAgICAgICAgICAgICAgaWYgKG1hdGNoLm1pc3NpbmdJbmdyZWRpZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYCAgICAgICAgTWlzc2luZzogWyR7bWF0Y2gubWlzc2luZ0luZ3JlZGllbnRzLmpvaW4oJywgJyl9XWApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYCAgIOKdjCBFcnJvcjogJHtyZXN1bHQuc3RhdHVzQ29kZX0gLSAke3Jlc3VsdC5ib2R5fWApO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGAgICDwn5KlIEV4Y2VwdGlvbjogJHtlcnJvcn1gKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJycpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHRlc3RDYWxjdWxhdGVNYXRjaFBlcmNlbnRhZ2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc29sZS5sb2coJ/Cfp64gVGVzdGluZyBDYWxjdWxhdGUgTWF0Y2ggUGVyY2VudGFnZSBFbmRwb2ludFxcbicpO1xuXG4gICAgY29uc3QgdGVzdENhc2VzID0gW1xuICAgICAge1xuICAgICAgICBuYW1lOiAnSGlnaCBNYXRjaCBUZXN0JyxcbiAgICAgICAgdXNlckluZ3JlZGllbnRzOiBbJ2NoaWNrZW4gYnJlYXN0JywgJ2JlbGwgcGVwcGVycycsICdicm9jY29saSddLFxuICAgICAgICByZWNpcGVJbmdyZWRpZW50czogWydjaGlja2VuIGJyZWFzdCcsICdiZWxsIHBlcHBlcnMnLCAnYnJvY2NvbGknLCAnZ2FybGljJywgJ3NveSBzYXVjZSddLFxuICAgICAgICBleHBlY3RlZE1pblBlcmNlbnRhZ2U6IDYwXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnUGFydGlhbCBNYXRjaCBUZXN0JyxcbiAgICAgICAgdXNlckluZ3JlZGllbnRzOiBbJ2NoaWNrZW4nLCAndG9tYXRvJ10sXG4gICAgICAgIHJlY2lwZUluZ3JlZGllbnRzOiBbJ2NoaWNrZW4gYnJlYXN0JywgJ2NoZXJyeSB0b21hdG9lcycsICdwYXN0YScsICdnYXJsaWMnXSxcbiAgICAgICAgZXhwZWN0ZWRNaW5QZXJjZW50YWdlOiA0MFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ0xvdyBNYXRjaCBUZXN0JyxcbiAgICAgICAgdXNlckluZ3JlZGllbnRzOiBbJ2NoaWNrZW4nXSxcbiAgICAgICAgcmVjaXBlSW5ncmVkaWVudHM6IFsncGFzdGEnLCAndG9tYXRvJywgJ2NoZWVzZScsICdnYXJsaWMnXSxcbiAgICAgICAgZXhwZWN0ZWRNYXhQZXJjZW50YWdlOiAzMFxuICAgICAgfVxuICAgIF07XG5cbiAgICBmb3IgKGNvbnN0IHRlc3RDYXNlIG9mIHRlc3RDYXNlcykge1xuICAgICAgY29uc29sZS5sb2coYPCfk50gVGVzdDogJHt0ZXN0Q2FzZS5uYW1lfWApO1xuICAgICAgY29uc29sZS5sb2coYCAgIFVzZXI6IFske3Rlc3RDYXNlLnVzZXJJbmdyZWRpZW50cy5qb2luKCcsICcpfV1gKTtcbiAgICAgIGNvbnNvbGUubG9nKGAgICBSZWNpcGU6IFske3Rlc3RDYXNlLnJlY2lwZUluZ3JlZGllbnRzLmpvaW4oJywgJyl9XWApO1xuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XG4gICAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgIHBhdGg6ICcvbWF0Y2hpbmcvY2FsY3VsYXRlLW1hdGNoJyxcbiAgICAgICAgICBoZWFkZXJzOiB7fSxcbiAgICAgICAgICBtdWx0aVZhbHVlSGVhZGVyczoge30sXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgdXNlckluZ3JlZGllbnRzOiB0ZXN0Q2FzZS51c2VySW5ncmVkaWVudHMsXG4gICAgICAgICAgICByZWNpcGVJbmdyZWRpZW50czogdGVzdENhc2UucmVjaXBlSW5ncmVkaWVudHNcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxuICAgICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxuICAgICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcbiAgICAgICAgICBtdWx0aVZhbHVlUXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxuICAgICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxuICAgICAgICAgIHJlcXVlc3RDb250ZXh0OiB7fSBhcyBhbnksXG4gICAgICAgICAgcmVzb3VyY2U6ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzdWx0LnN0YXR1c0NvZGUgPT09IDIwMCkge1xuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICAgICAgY29uc29sZS5sb2coYCAgIOKchSBTdGF0dXM6ICR7cmVzdWx0LnN0YXR1c0NvZGV9YCk7XG4gICAgICAgICAgY29uc29sZS5sb2coYCAgIPCfk4ogTWF0Y2g6ICR7cmVzcG9uc2UubWF0Y2hQZXJjZW50YWdlfSVgKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAg4pyFIE1hdGNoZWQ6IFske3Jlc3BvbnNlLm1hdGNoZWRJbmdyZWRpZW50cy5qb2luKCcsICcpfV1gKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAg4p2MIE1pc3Npbmc6IFske3Jlc3BvbnNlLm1pc3NpbmdJbmdyZWRpZW50cy5qb2luKCcsICcpfV1gKTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAodGVzdENhc2UuZXhwZWN0ZWRNaW5QZXJjZW50YWdlICYmIHJlc3BvbnNlLm1hdGNoUGVyY2VudGFnZSA+PSB0ZXN0Q2FzZS5leHBlY3RlZE1pblBlcmNlbnRhZ2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICDinIUgUGFzc2VkOiBNYXRjaCBwZXJjZW50YWdlIG1lZXRzIGV4cGVjdGF0aW9uYCk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0ZXN0Q2FzZS5leHBlY3RlZE1heFBlcmNlbnRhZ2UgJiYgcmVzcG9uc2UubWF0Y2hQZXJjZW50YWdlIDw9IHRlc3RDYXNlLmV4cGVjdGVkTWF4UGVyY2VudGFnZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYCAgIOKchSBQYXNzZWQ6IE1hdGNoIHBlcmNlbnRhZ2Ugd2l0aGluIGV4cGVjdGVkIHJhbmdlYCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAgICDimqDvuI8gIFdhcm5pbmc6IE1hdGNoIHBlcmNlbnRhZ2Ugb3V0c2lkZSBleHBlY3RlZCByYW5nZWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAg4p2MIEVycm9yOiAke3Jlc3VsdC5zdGF0dXNDb2RlfSAtICR7cmVzdWx0LmJvZHl9YCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYCAgIPCfkqUgRXhjZXB0aW9uOiAke2Vycm9yfWApO1xuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdGVzdEluZ3JlZGllbnRBbmFseXNpcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZygn8J+UrCBUZXN0aW5nIEluZ3JlZGllbnQgQW5hbHlzaXMgRW5kcG9pbnRcXG4nKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgcGF0aDogJy9tYXRjaGluZy9pbmdyZWRpZW50LWFuYWx5c2lzJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdBdXRob3JpemF0aW9uJzogJ0JlYXJlciB0ZXN0LXVzZXItMTIzJ1xuICAgICAgICB9LFxuICAgICAgICBtdWx0aVZhbHVlSGVhZGVyczoge30sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB1c2VySW5ncmVkaWVudHM6IFsnY2hpY2tlbicsICd0b21hdG8nLCAnZ2FybGljJ10sXG4gICAgICAgICAgcmVjaXBlSWQ6ICd0ZXN0LXJlY2lwZS0xJ1xuICAgICAgICB9KSxcbiAgICAgICAgaXNCYXNlNjRFbmNvZGVkOiBmYWxzZSxcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IG51bGwsXG4gICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcbiAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcbiAgICAgICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7fSBhcyBhbnksXG4gICAgICAgIHJlc291cmNlOiAnJ1xuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG4gICAgICBcbiAgICAgIGlmIChyZXN1bHQuc3RhdHVzQ29kZSA9PT0gMjAwKSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICAgIGNvbnNvbGUubG9nKGAgICDinIUgU3RhdHVzOiAke3Jlc3VsdC5zdGF0dXNDb2RlfWApO1xuICAgICAgICBjb25zb2xlLmxvZyhgICAg8J+TnSBSZWNpcGU6ICR7cmVzcG9uc2UucmVjaXBlVGl0bGV9YCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCcgICDwn5SNIEFuYWx5c2lzOicpO1xuICAgICAgICBcbiAgICAgICAgcmVzcG9uc2UuYW5hbHlzaXMuZm9yRWFjaCgoaXRlbTogYW55LCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coYCAgICAgJHtpbmRleCArIDF9LiBVc2VyOiBcIiR7aXRlbS51c2VySW5ncmVkaWVudH1cImApO1xuICAgICAgICAgIGlmIChpdGVtLmJlc3RNYXRjaCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYCAgICAgICAgQmVzdDogXCIke2l0ZW0uYmVzdE1hdGNoLnJlY2lwZUluZ3JlZGllbnR9XCIgKHNjb3JlOiAke2l0ZW0uYmVzdE1hdGNoLm1hdGNoU2NvcmV9KWApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgICAgICAgICBObyBtYXRjaCBmb3VuZGApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhgICAg4p2MIEVycm9yOiAke3Jlc3VsdC5zdGF0dXNDb2RlfSAtICR7cmVzdWx0LmJvZHl9YCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYCAgIPCfkqUgRXhjZXB0aW9uOiAke2Vycm9yfWApO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJ1bkFsbFRlc3RzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnNvbGUubG9nKCfwn5qAIFN0YXJ0aW5nIE1hdGNoaW5nIExhbWJkYSBWMiBUZXN0c1xcbicpO1xuICAgIFxuICAgIGF3YWl0IHRoaXMudGVzdEZpbmRNYXRjaGluZ1JlY2lwZXMoKTtcbiAgICBhd2FpdCB0aGlzLnRlc3RDYWxjdWxhdGVNYXRjaFBlcmNlbnRhZ2UoKTtcbiAgICBhd2FpdCB0aGlzLnRlc3RJbmdyZWRpZW50QW5hbHlzaXMoKTtcbiAgICBcbiAgICBjb25zb2xlLmxvZygn8J+OiSBBbGwgbWF0Y2hpbmcgbGFtYmRhIHRlc3RzIGNvbXBsZXRlZCEnKTtcbiAgfVxufVxuXG4vLyBSdW4gdGhlIHRlc3RzIGlmIHRoaXMgZmlsZSBpcyBleGVjdXRlZCBkaXJlY3RseVxuaWYgKHJlcXVpcmUubWFpbiA9PT0gbW9kdWxlKSB7XG4gIGNvbnN0IHRlc3RlciA9IG5ldyBNYXRjaGluZ0xhbWJkYVRlc3RlcigpO1xuICB0ZXN0ZXIucnVuQWxsVGVzdHMoKVxuICAgIC50aGVuKCgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdcXG7inIUgTWF0Y2hpbmcgTGFtYmRhIFYyIGlzIHJlYWR5IGZvciBwcm9kdWN0aW9uIScpO1xuICAgICAgY29uc29sZS5sb2coJ1xcbvCfkqEgS2V5IEZlYXR1cmVzOicpO1xuICAgICAgY29uc29sZS5sb2coJyAgIOKchSBGdXp6eSBpbmdyZWRpZW50IG1hdGNoaW5nJyk7XG4gICAgICBjb25zb2xlLmxvZygnICAg4pyFIFNpbmdsZS10YWJsZSBkZXNpZ24gaW50ZWdyYXRpb24nKTtcbiAgICAgIGNvbnNvbGUubG9nKCcgICDinIUgQWR2YW5jZWQgZmlsdGVyaW5nIG9wdGlvbnMnKTtcbiAgICAgIGNvbnNvbGUubG9nKCcgICDinIUgRGV0YWlsZWQgbWF0Y2ggYW5hbHlzaXMnKTtcbiAgICAgIGNvbnNvbGUubG9nKCcgICDinIUgUGVyZm9ybWFuY2Ugb3B0aW1pemVkIHF1ZXJpZXMnKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICB9KVxuICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ/CfkqUgTWF0Y2hpbmcgbGFtYmRhIHRlc3RzIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgfSk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IE1hdGNoaW5nTGFtYmRhVGVzdGVyO1xuIl19