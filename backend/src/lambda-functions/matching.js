"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    };
    try {
        const { httpMethod, path, body } = event;
        if (httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: '',
            };
        }
        if (path === '/matching/find-recipes' && httpMethod === 'POST') {
            const requestBody = body ? JSON.parse(body) : {};
            return await findMatchingRecipes(requestBody, event.headers.Authorization);
        }
        if (path === '/matching/calculate-match' && httpMethod === 'POST') {
            const requestBody = body ? JSON.parse(body) : {};
            return await calculateMatchPercentage(requestBody);
        }
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Not found' }),
        };
    }
    catch (error) {
        console.error('Matching error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
async function findMatchingRecipes(requestBody, authorization) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };
    try {
        if (!authorization) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'Authorization required' }),
            };
        }
        const userId = extractUserIdFromToken(authorization);
        const { userIngredients, dietaryRestrictions = [], maxCookingTime, difficultyLevel, limit = 20 } = requestBody;
        // Get user's ingredients if not provided
        let ingredientsToMatch = userIngredients;
        if (!ingredientsToMatch || ingredientsToMatch.length === 0) {
            const userIngredientsResult = await docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: process.env.USER_INGREDIENTS_TABLE,
                KeyConditionExpression: 'userId = :userId',
                ExpressionAttributeValues: {
                    ':userId': userId,
                },
            }));
            ingredientsToMatch = (userIngredientsResult.Items || []).map(ui => ui.name);
        }
        // Get all recipes
        const recipesResult = await docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: process.env.RECIPES_TABLE,
            FilterExpression: 'attribute_exists(recipeId) AND attribute_exists(title)',
        }));
        const allRecipes = recipesResult.Items || [];
        // Calculate matches for each recipe
        const recipeMatches = [];
        for (const recipe of allRecipes) {
            if (!recipe.ingredients || !Array.isArray(recipe.ingredients))
                continue;
            const recipeIngredients = recipe.ingredients.map((ing) => ing.name.toLowerCase());
            const matchResult = calculateIngredientMatch(ingredientsToMatch, recipeIngredients);
            // Apply filters
            if (dietaryRestrictions.length > 0) {
                const hasDietaryMatch = recipe.dietaryTags?.some((tag) => dietaryRestrictions.includes(tag));
                if (!hasDietaryMatch)
                    continue;
            }
            if (maxCookingTime && recipe.cookingTime > maxCookingTime)
                continue;
            if (difficultyLevel && recipe.difficultyLevel !== difficultyLevel)
                continue;
            // Only include recipes with at least 20% match
            if (matchResult.matchPercentage >= 20) {
                recipeMatches.push({
                    recipeId: recipe.recipeId,
                    title: recipe.title,
                    description: recipe.description,
                    ingredients: recipe.ingredients,
                    instructions: recipe.instructions || [],
                    cookingTime: recipe.cookingTime,
                    difficultyLevel: recipe.difficultyLevel,
                    servings: recipe.servings,
                    dietaryTags: recipe.dietaryTags || [],
                    imageUrl: recipe.imageUrl,
                    matchPercentage: matchResult.matchPercentage,
                    missingIngredients: matchResult.missingIngredients,
                    availableIngredients: matchResult.availableIngredients,
                    userId: recipe.userId,
                    createdAt: recipe.createdAt,
                    rating: recipe.rating,
                    reviewCount: recipe.reviewCount,
                });
            }
        }
        // Sort by match percentage (highest first)
        recipeMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);
        // Limit results
        const limitedMatches = recipeMatches.slice(0, parseInt(limit));
        // Save matches for analytics
        await saveMatches(userId, limitedMatches);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                matches: limitedMatches,
                totalMatches: recipeMatches.length,
                userIngredients: ingredientsToMatch,
            }),
        };
    }
    catch (error) {
        console.error('Find matching recipes error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to find matching recipes' }),
        };
    }
}
async function calculateMatchPercentage(requestBody) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };
    try {
        const { userIngredients, recipeIngredients } = requestBody;
        if (!userIngredients || !recipeIngredients) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'User ingredients and recipe ingredients are required' }),
            };
        }
        const matchResult = calculateIngredientMatch(userIngredients, recipeIngredients);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(matchResult),
        };
    }
    catch (error) {
        console.error('Calculate match percentage error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to calculate match percentage' }),
        };
    }
}
function calculateIngredientMatch(userIngredients, recipeIngredients) {
    const userIngredientsLower = userIngredients.map(ing => ing.toLowerCase());
    const recipeIngredientsLower = recipeIngredients.map(ing => ing.toLowerCase());
    const availableIngredients = [];
    const missingIngredients = [];
    // Check which recipe ingredients the user has
    for (const recipeIngredient of recipeIngredientsLower) {
        const hasIngredient = userIngredientsLower.some(userIngredient => userIngredient.includes(recipeIngredient) || recipeIngredient.includes(userIngredient));
        if (hasIngredient) {
            availableIngredients.push(recipeIngredient);
        }
        else {
            missingIngredients.push(recipeIngredient);
        }
    }
    // Calculate match percentage
    const matchPercentage = Math.round((availableIngredients.length / recipeIngredientsLower.length) * 100);
    return {
        matchPercentage,
        availableIngredients,
        missingIngredients,
    };
}
async function saveMatches(userId, matches) {
    try {
        const timestamp = new Date().toISOString();
        for (const match of matches) {
            await docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: process.env.MATCHES_TABLE,
                Item: {
                    userId,
                    recipeId: match.recipeId,
                    matchPercentage: match.matchPercentage,
                    createdAt: timestamp,
                },
            }));
        }
    }
    catch (error) {
        console.error('Error saving matches:', error);
        // Don't throw error as this is not critical for the main functionality
    }
}
function extractUserIdFromToken(authorization) {
    const token = authorization.replace('Bearer ', '');
    return token;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2hpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYXRjaGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw4REFBMEQ7QUFDMUQsd0RBQXNHO0FBRXRHLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFvQ3JELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sT0FBTyxHQUFHO1FBQ2QsY0FBYyxFQUFFLGtCQUFrQjtRQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1FBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtRQUM1RCw4QkFBOEIsRUFBRSw2QkFBNkI7S0FDOUQsQ0FBQztJQUVGLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV6QyxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM3QixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU87Z0JBQ1AsSUFBSSxFQUFFLEVBQUU7YUFDVCxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksSUFBSSxLQUFLLHdCQUF3QixJQUFJLFVBQVUsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUMvRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNqRCxPQUFPLE1BQU0sbUJBQW1CLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUVELElBQUksSUFBSSxLQUFLLDJCQUEyQixJQUFJLFVBQVUsS0FBSyxNQUFNLEVBQUUsQ0FB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SSxPQUFPLEVBQUUsQ0FBQztZQUM1QixNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSx5QkFBVSxDQUFDO2dCQUNsQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhO2dCQUNwQyxJQUFJLEVBQUU7b0JBQ0osTUFBTTtvQkFDTixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7b0JBQ3hCLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZTtvQkFDdEMsU0FBUyxFQUFFLFNBQVM7aUJBQ3JCO2FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDTixDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzlDLHVFQUF1RTtJQUN6RSxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsYUFBcUI7SUFDbkQsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUXVlcnlDb21tYW5kLCBTY2FuQ29tbWFuZCwgUHV0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5cbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZHluYW1vQ2xpZW50KTtcblxuaW50ZXJmYWNlIFJlY2lwZU1hdGNoIHtcbiAgcmVjaXBlSWQ6IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgaW5ncmVkaWVudHM6IHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgcXVhbnRpdHk6IHN0cmluZztcbiAgICB1bml0OiBzdHJpbmc7XG4gIH1bXTtcbiAgaW5zdHJ1Y3Rpb25zOiBzdHJpbmdbXTtcbiAgY29va2luZ1RpbWU6IG51bWJlcjtcbiAgZGlmZmljdWx0eUxldmVsOiBzdHJpbmc7XG4gIHNlcnZpbmdzOiBudW1iZXI7XG4gIGRpZXRhcnlUYWdzOiBzdHJpbmdbXTtcbiAgaW1hZ2VVcmw/OiBzdHJpbmc7XG4gIG1hdGNoUGVyY2VudGFnZTogbnVtYmVyO1xuICBtaXNzaW5nSW5ncmVkaWVudHM6IHN0cmluZ1tdO1xuICBhdmFpbGFibGVJbmdyZWRpZW50czogc3RyaW5nW107XG4gIHVzZXJJZDogc3RyaW5nO1xuICBjcmVhdGVkQXQ6IHN0cmluZztcbiAgcmF0aW5nPzogbnVtYmVyO1xuICByZXZpZXdDb3VudD86IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIFVzZXJJbmdyZWRpZW50IHtcbiAgdXNlcklkOiBzdHJpbmc7XG4gIGluZ3JlZGllbnRJZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHF1YW50aXR5OiBudW1iZXI7XG4gIHVuaXQ6IHN0cmluZztcbiAgZXhwaXJ5RGF0ZT86IHN0cmluZztcbiAgYWRkZWRBdDogc3RyaW5nO1xufVxuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnR0VULFBPU1QsUFVULERFTEVURSxPUFRJT05TJyxcbiAgfTtcblxuICB0cnkge1xuICAgIGNvbnN0IHsgaHR0cE1ldGhvZCwgcGF0aCwgYm9keSB9ID0gZXZlbnQ7XG5cbiAgICBpZiAoaHR0cE1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6ICcnLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAocGF0aCA9PT0gJy9tYXRjaGluZy9maW5kLXJlY2lwZXMnICYmIGh0dHBNZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgY29uc3QgcmVxdWVzdEJvZHkgPSBib2R5ID8gSlNPTi5wYXJzZShib2R5KSA6IHt9O1xuICAgICAgcmV0dXJuIGF3YWl0IGZpbmRNYXRjaGluZ1JlY2lwZXMocmVxdWVzdEJvZHksIGV2ZW50LmhlYWRlcnMuQXV0aG9yaXphdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKHBhdGggPT09ICcvbWF0Y2hpbmcvY2FsY3VsYXRlLW1hdGNoJyAmJiBodHRwTWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgIGNvbnN0IHJlcXVlc3RCb2R5ID0gYm9keSA/IEpTT04ucGFyc2UoYm9keSkgOiB7fTtcbiAgICAgIHJldHVybiBhd2FpdCBjYWxjdWxhdGVNYXRjaFBlcmNlbnRhZ2UocmVxdWVzdEJvZHkpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA0MDQsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ05vdCBmb3VuZCcgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdNYXRjaGluZyBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KSxcbiAgICB9O1xuICB9XG59O1xuXG5hc3luYyBmdW5jdGlvbiBmaW5kTWF0Y2hpbmdSZWNpcGVzKHJlcXVlc3RCb2R5OiBhbnksIGF1dGhvcml6YXRpb24/OiBzdHJpbmcpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgfTtcblxuICB0cnkge1xuICAgIGlmICghYXV0aG9yaXphdGlvbikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxuICAgICAgICBoZWFkZXJzLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnQXV0aG9yaXphdGlvbiByZXF1aXJlZCcgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHVzZXJJZCA9IGV4dHJhY3RVc2VySWRGcm9tVG9rZW4oYXV0aG9yaXphdGlvbik7XG4gICAgY29uc3QgeyBcbiAgICAgIHVzZXJJbmdyZWRpZW50cywgXG4gICAgICBkaWV0YXJ5UmVzdHJpY3Rpb25zID0gW10sIFxuICAgICAgbWF4Q29va2luZ1RpbWUsIFxuICAgICAgZGlmZmljdWx0eUxldmVsLFxuICAgICAgbGltaXQgPSAyMCBcbiAgICB9ID0gcmVxdWVzdEJvZHk7XG5cbiAgICAvLyBHZXQgdXNlcidzIGluZ3JlZGllbnRzIGlmIG5vdCBwcm92aWRlZFxuICAgIGxldCBpbmdyZWRpZW50c1RvTWF0Y2ggPSB1c2VySW5ncmVkaWVudHM7XG4gICAgaWYgKCFpbmdyZWRpZW50c1RvTWF0Y2ggfHwgaW5ncmVkaWVudHNUb01hdGNoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3QgdXNlckluZ3JlZGllbnRzUmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZCh7XG4gICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuVVNFUl9JTkdSRURJRU5UU19UQUJMRSxcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3VzZXJJZCA9IDp1c2VySWQnLFxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICAgJzp1c2VySWQnOiB1c2VySWQsXG4gICAgICAgIH0sXG4gICAgICB9KSk7XG4gICAgICBpbmdyZWRpZW50c1RvTWF0Y2ggPSAodXNlckluZ3JlZGllbnRzUmVzdWx0Lkl0ZW1zIGFzIFVzZXJJbmdyZWRpZW50W10gfHwgW10pLm1hcCh1aSA9PiB1aS5uYW1lKTtcbiAgICB9XG5cbiAgICAvLyBHZXQgYWxsIHJlY2lwZXNcbiAgICBjb25zdCByZWNpcGVzUmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQobmV3IFNjYW5Db21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuUkVDSVBFU19UQUJMRSxcbiAgICAgIEZpbHRlckV4cHJlc3Npb246ICdhdHRyaWJ1dGVfZXhpc3RzKHJlY2lwZUlkKSBBTkQgYXR0cmlidXRlX2V4aXN0cyh0aXRsZSknLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IGFsbFJlY2lwZXMgPSByZWNpcGVzUmVzdWx0Lkl0ZW1zIHx8IFtdO1xuICAgIFxuICAgIC8vIENhbGN1bGF0ZSBtYXRjaGVzIGZvciBlYWNoIHJlY2lwZVxuICAgIGNvbnN0IHJlY2lwZU1hdGNoZXM6IFJlY2lwZU1hdGNoW10gPSBbXTtcbiAgICBcbiAgICBmb3IgKGNvbnN0IHJlY2lwZSBvZiBhbGxSZWNpcGVzKSB7XG4gICAgICBpZiAoIXJlY2lwZS5pbmdyZWRpZW50cyB8fCAhQXJyYXkuaXNBcnJheShyZWNpcGUuaW5ncmVkaWVudHMpKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgcmVjaXBlSW5ncmVkaWVudHMgPSByZWNpcGUuaW5ncmVkaWVudHMubWFwKChpbmc6IGFueSkgPT4gaW5nLm5hbWUudG9Mb3dlckNhc2UoKSk7XG4gICAgICBjb25zdCBtYXRjaFJlc3VsdCA9IGNhbGN1bGF0ZUluZ3JlZGllbnRNYXRjaChpbmdyZWRpZW50c1RvTWF0Y2gsIHJlY2lwZUluZ3JlZGllbnRzKTtcbiAgICAgIFxuICAgICAgLy8gQXBwbHkgZmlsdGVyc1xuICAgICAgaWYgKGRpZXRhcnlSZXN0cmljdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBoYXNEaWV0YXJ5TWF0Y2ggPSByZWNpcGUuZGlldGFyeVRhZ3M/LnNvbWUoKHRhZzogc3RyaW5nKSA9PiBcbiAgICAgICAgICBkaWV0YXJ5UmVzdHJpY3Rpb25zLmluY2x1ZGVzKHRhZylcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKCFoYXNEaWV0YXJ5TWF0Y2gpIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAobWF4Q29va2luZ1RpbWUgJiYgcmVjaXBlLmNvb2tpbmdUaW1lID4gbWF4Q29va2luZ1RpbWUpIGNvbnRpbnVlO1xuICAgICAgaWYgKGRpZmZpY3VsdHlMZXZlbCAmJiByZWNpcGUuZGlmZmljdWx0eUxldmVsICE9PSBkaWZmaWN1bHR5TGV2ZWwpIGNvbnRpbnVlO1xuXG4gICAgICAvLyBPbmx5IGluY2x1ZGUgcmVjaXBlcyB3aXRoIGF0IGxlYXN0IDIwJSBtYXRjaFxuICAgICAgaWYgKG1hdGNoUmVzdWx0Lm1hdGNoUGVyY2VudGFnZSA+PSAyMCkge1xuICAgICAgICByZWNpcGVNYXRjaGVzLnB1c2goe1xuICAgICAgICAgIHJlY2lwZUlkOiByZWNpcGUucmVjaXBlSWQsXG4gICAgICAgICAgdGl0bGU6IHJlY2lwZS50aXRsZSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogcmVjaXBlLmRlc2NyaXB0aW9uLFxuICAgICAgICAgIGluZ3JlZGllbnRzOiByZWNpcGUuaW5ncmVkaWVudHMsXG4gICAgICAgICAgaW5zdHJ1Y3Rpb25zOiByZWNpcGUuaW5zdHJ1Y3Rpb25zIHx8IFtdLFxuICAgICAgICAgIGNvb2tpbmdUaW1lOiByZWNpcGUuY29va2luZ1RpbWUsXG4gICAgICAgICAgZGlmZmljdWx0eUxldmVsOiByZWNpcGUuZGlmZmljdWx0eUxldmVsLFxuICAgICAgICAgIHNlcnZpbmdzOiByZWNpcGUuc2VydmluZ3MsXG4gICAgICAgICAgZGlldGFyeVRhZ3M6IHJlY2lwZS5kaWV0YXJ5VGFncyB8fCBbXSxcbiAgICAgICAgICBpbWFnZVVybDogcmVjaXBlLmltYWdlVXJsLFxuICAgICAgICAgIG1hdGNoUGVyY2VudGFnZTogbWF0Y2hSZXN1bHQubWF0Y2hQZXJjZW50YWdlLFxuICAgICAgICAgIG1pc3NpbmdJbmdyZWRpZW50czogbWF0Y2hSZXN1bHQubWlzc2luZ0luZ3JlZGllbnRzLFxuICAgICAgICAgIGF2YWlsYWJsZUluZ3JlZGllbnRzOiBtYXRjaFJlc3VsdC5hdmFpbGFibGVJbmdyZWRpZW50cyxcbiAgICAgICAgICB1c2VySWQ6IHJlY2lwZS51c2VySWQsXG4gICAgICAgICAgY3JlYXRlZEF0OiByZWNpcGUuY3JlYXRlZEF0LFxuICAgICAgICAgIHJhdGluZzogcmVjaXBlLnJhdGluZyxcbiAgICAgICAgICByZXZpZXdDb3VudDogcmVjaXBlLnJldmlld0NvdW50LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBTb3J0IGJ5IG1hdGNoIHBlcmNlbnRhZ2UgKGhpZ2hlc3QgZmlyc3QpXG4gICAgcmVjaXBlTWF0Y2hlcy5zb3J0KChhLCBiKSA9PiBiLm1hdGNoUGVyY2VudGFnZSAtIGEubWF0Y2hQZXJjZW50YWdlKTtcblxuICAgIC8vIExpbWl0IHJlc3VsdHNcbiAgICBjb25zdCBsaW1pdGVkTWF0Y2hlcyA9IHJlY2lwZU1hdGNoZXMuc2xpY2UoMCwgcGFyc2VJbnQobGltaXQpKTtcblxuICAgIC8vIFNhdmUgbWF0Y2hlcyBmb3IgYW5hbHl0aWNzXG4gICAgYXdhaXQgc2F2ZU1hdGNoZXModXNlcklkLCBsaW1pdGVkTWF0Y2hlcyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgIG1hdGNoZXM6IGxpbWl0ZWRNYXRjaGVzLFxuICAgICAgICB0b3RhbE1hdGNoZXM6IHJlY2lwZU1hdGNoZXMubGVuZ3RoLFxuICAgICAgICB1c2VySW5ncmVkaWVudHM6IGluZ3JlZGllbnRzVG9NYXRjaCxcbiAgICAgIH0pLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmluZCBtYXRjaGluZyByZWNpcGVzIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdGYWlsZWQgdG8gZmluZCBtYXRjaGluZyByZWNpcGVzJyB9KSxcbiAgICB9O1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNhbGN1bGF0ZU1hdGNoUGVyY2VudGFnZShyZXF1ZXN0Qm9keTogYW55KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gIH07XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IHVzZXJJbmdyZWRpZW50cywgcmVjaXBlSW5ncmVkaWVudHMgfSA9IHJlcXVlc3RCb2R5O1xuXG4gICAgaWYgKCF1c2VySW5ncmVkaWVudHMgfHwgIXJlY2lwZUluZ3JlZGllbnRzKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdVc2VyIGluZ3JlZGllbnRzIGFuZCByZWNpcGUgaW5ncmVkaWVudHMgYXJlIHJlcXVpcmVkJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgbWF0Y2hSZXN1bHQgPSBjYWxjdWxhdGVJbmdyZWRpZW50TWF0Y2godXNlckluZ3JlZGllbnRzLCByZWNpcGVJbmdyZWRpZW50cyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KG1hdGNoUmVzdWx0KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0NhbGN1bGF0ZSBtYXRjaCBwZXJjZW50YWdlIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdGYWlsZWQgdG8gY2FsY3VsYXRlIG1hdGNoIHBlcmNlbnRhZ2UnIH0pLFxuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlSW5ncmVkaWVudE1hdGNoKHVzZXJJbmdyZWRpZW50czogc3RyaW5nW10sIHJlY2lwZUluZ3JlZGllbnRzOiBzdHJpbmdbXSk6IHtcbiAgbWF0Y2hQZXJjZW50YWdlOiBudW1iZXI7XG4gIGF2YWlsYWJsZUluZ3JlZGllbnRzOiBzdHJpbmdbXTtcbiAgbWlzc2luZ0luZ3JlZGllbnRzOiBzdHJpbmdbXTtcbn0ge1xuICBjb25zdCB1c2VySW5ncmVkaWVudHNMb3dlciA9IHVzZXJJbmdyZWRpZW50cy5tYXAoaW5nID0+IGluZy50b0xvd2VyQ2FzZSgpKTtcbiAgY29uc3QgcmVjaXBlSW5ncmVkaWVudHNMb3dlciA9IHJlY2lwZUluZ3JlZGllbnRzLm1hcChpbmcgPT4gaW5nLnRvTG93ZXJDYXNlKCkpO1xuXG4gIGNvbnN0IGF2YWlsYWJsZUluZ3JlZGllbnRzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBtaXNzaW5nSW5ncmVkaWVudHM6IHN0cmluZ1tdID0gW107XG5cbiAgLy8gQ2hlY2sgd2hpY2ggcmVjaXBlIGluZ3JlZGllbnRzIHRoZSB1c2VyIGhhc1xuICBmb3IgKGNvbnN0IHJlY2lwZUluZ3JlZGllbnQgb2YgcmVjaXBlSW5ncmVkaWVudHNMb3dlcikge1xuICAgIGNvbnN0IGhhc0luZ3JlZGllbnQgPSB1c2VySW5ncmVkaWVudHNMb3dlci5zb21lKHVzZXJJbmdyZWRpZW50ID0+IFxuICAgICAgdXNlckluZ3JlZGllbnQuaW5jbHVkZXMocmVjaXBlSW5ncmVkaWVudCkgfHwgcmVjaXBlSW5ncmVkaWVudC5pbmNsdWRlcyh1c2VySW5ncmVkaWVudClcbiAgICApO1xuICAgIFxuICAgIGlmIChoYXNJbmdyZWRpZW50KSB7XG4gICAgICBhdmFpbGFibGVJbmdyZWRpZW50cy5wdXNoKHJlY2lwZUluZ3JlZGllbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBtaXNzaW5nSW5ncmVkaWVudHMucHVzaChyZWNpcGVJbmdyZWRpZW50KTtcbiAgICB9XG4gIH1cblxuICAvLyBDYWxjdWxhdGUgbWF0Y2ggcGVyY2VudGFnZVxuICBjb25zdCBtYXRjaFBlcmNlbnRhZ2UgPSBNYXRoLnJvdW5kKChhdmFpbGFibGVJbmdyZWRpZW50cy5sZW5ndGggLyByZWNpcGVJbmdyZWRpZW50c0xvd2VyLmxlbmd0aCkgKiAxMDApO1xuXG4gIHJldHVybiB7XG4gICAgbWF0Y2hQZXJjZW50YWdlLFxuICAgIGF2YWlsYWJsZUluZ3JlZGllbnRzLFxuICAgIG1pc3NpbmdJbmdyZWRpZW50cyxcbiAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gc2F2ZU1hdGNoZXModXNlcklkOiBzdHJpbmcsIG1hdGNoZXM6IFJlY2lwZU1hdGNoW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgXG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBtYXRjaGVzKSB7XG4gICAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChuZXcgUHV0Q29tbWFuZCh7XG4gICAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuTUFUQ0hFU19UQUJMRSxcbiAgICAgICAgSXRlbToge1xuICAgICAgICAgIHVzZXJJZCxcbiAgICAgICAgICByZWNpcGVJZDogbWF0Y2gucmVjaXBlSWQsXG4gICAgICAgICAgbWF0Y2hQZXJjZW50YWdlOiBtYXRjaC5tYXRjaFBlcmNlbnRhZ2UsXG4gICAgICAgICAgY3JlYXRlZEF0OiB0aW1lc3RhbXAsXG4gICAgICAgIH0sXG4gICAgICB9KSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHNhdmluZyBtYXRjaGVzOicsIGVycm9yKTtcbiAgICAvLyBEb24ndCB0aHJvdyBlcnJvciBhcyB0aGlzIGlzIG5vdCBjcml0aWNhbCBmb3IgdGhlIG1haW4gZnVuY3Rpb25hbGl0eVxuICB9XG59XG5cbmZ1bmN0aW9uIGV4dHJhY3RVc2VySWRGcm9tVG9rZW4oYXV0aG9yaXphdGlvbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgdG9rZW4gPSBhdXRob3JpemF0aW9uLnJlcGxhY2UoJ0JlYXJlciAnLCAnJyk7XG4gIHJldHVybiB0b2tlbjtcbn1cbiJdfQ==