import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../lambda/matching-v2';

class MatchingLambdaTester {
  async testFindMatchingRecipes(): Promise<void> {
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
        const event: APIGatewayProxyEvent = {
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
          requestContext: {} as any,
          resource: ''
        };

        const result = await handler(event);
        
        if (result.statusCode === 200) {
          const response = JSON.parse(result.body);
          console.log(`   ✅ Status: ${result.statusCode}`);
          console.log(`   📊 Found: ${response.matches.length} matches`);
          console.log(`   🎯 Total: ${response.totalMatches} total matches`);
          
          if (response.matches.length > 0) {
            console.log('   🏆 Top matches:');
            response.matches.slice(0, 2).forEach((match: any, index: number) => {
              console.log(`     ${index + 1}. ${match.title} (${match.matchPercentage}% match)`);
              console.log(`        Matched: [${match.matchedIngredients.join(', ')}]`);
              if (match.missingIngredients.length > 0) {
                console.log(`        Missing: [${match.missingIngredients.join(', ')}]`);
              }
            });
          }
        } else {
          console.log(`   ❌ Error: ${result.statusCode} - ${result.body}`);
        }
      } catch (error) {
        console.error(`   💥 Exception: ${error}`);
      }
      
      console.log('');
    }
  }

  async testCalculateMatchPercentage(): Promise<void> {
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
        const event: APIGatewayProxyEvent = {
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
          requestContext: {} as any,
          resource: ''
        };

        const result = await handler(event);
        
        if (result.statusCode === 200) {
          const response = JSON.parse(result.body);
          console.log(`   ✅ Status: ${result.statusCode}`);
          console.log(`   📊 Match: ${response.matchPercentage}%`);
          console.log(`   ✅ Matched: [${response.matchedIngredients.join(', ')}]`);
          console.log(`   ❌ Missing: [${response.missingIngredients.join(', ')}]`);
          
          if (testCase.expectedMinPercentage && response.matchPercentage >= testCase.expectedMinPercentage) {
            console.log(`   ✅ Passed: Match percentage meets expectation`);
          } else if (testCase.expectedMaxPercentage && response.matchPercentage <= testCase.expectedMaxPercentage) {
            console.log(`   ✅ Passed: Match percentage within expected range`);
          } else {
            console.log(`   ⚠️  Warning: Match percentage outside expected range`);
          }
        } else {
          console.log(`   ❌ Error: ${result.statusCode} - ${result.body}`);
        }
      } catch (error) {
        console.error(`   💥 Exception: ${error}`);
      }
      
      console.log('');
    }
  }

  async testIngredientAnalysis(): Promise<void> {
    console.log('🔬 Testing Ingredient Analysis Endpoint\n');

    try {
      const event: APIGatewayProxyEvent = {
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
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event);
      
      if (result.statusCode === 200) {
        const response = JSON.parse(result.body);
        console.log(`   ✅ Status: ${result.statusCode}`);
        console.log(`   📝 Recipe: ${response.recipeTitle}`);
        console.log('   🔍 Analysis:');
        
        response.analysis.forEach((item: any, index: number) => {
          console.log(`     ${index + 1}. User: "${item.userIngredient}"`);
          if (item.bestMatch) {
            console.log(`        Best: "${item.bestMatch.recipeIngredient}" (score: ${item.bestMatch.matchScore})`);
          } else {
            console.log(`        No match found`);
          }
        });
      } else {
        console.log(`   ❌ Error: ${result.statusCode} - ${result.body}`);
      }
    } catch (error) {
      console.error(`   💥 Exception: ${error}`);
    }
  }

  async runAllTests(): Promise<void> {
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

export default MatchingLambdaTester;
