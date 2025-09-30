"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_sns_1 = require("@aws-sdk/client-sns");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new client_sns_1.SNSClient({});
const USERS_TABLE = process.env.USERS_TABLE;
const RECIPES_TABLE = process.env.RECIPES_TABLE;
const MATCHES_TABLE = process.env.MATCHES_TABLE;
const NOTIFICATIONS_TOPIC_ARN = process.env.NOTIFICATIONS_TOPIC_ARN;
const handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));
    try {
        const { 'detail-type': detailType, source, detail } = event;
        switch (detailType) {
            case 'UserRegistered':
                await handleUserRegistered(detail);
                break;
            case 'UserProfileUpdated':
                await handleUserProfileUpdated(detail);
                break;
            case 'UserIngredientsUpdated':
                await handleUserIngredientsUpdated(detail);
                break;
            case 'RecipeCreated':
                await handleRecipeCreated(detail);
                break;
            case 'RecipeUpdated':
                await handleRecipeUpdated(detail);
                break;
            case 'RecipeRated':
                await handleRecipeRated(detail);
                break;
            case 'RecipeShared':
                await handleRecipeShared(detail);
                break;
            case 'RecipeMatched':
                await handleRecipeMatched(detail);
                break;
            case 'MatchPercentageUpdated':
                await handleMatchPercentageUpdated(detail);
                break;
            default:
                console.log('Unknown event type:', detailType);
        }
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Event processed successfully' }),
        };
    }
    catch (error) {
        console.error('Error processing event:', error);
        throw error;
    }
};
exports.handler = handler;
async function handleUserRegistered(detail) {
    console.log('Processing UserRegistered event:', detail);
    // Send welcome notification
    await sendNotification({
        userId: detail.userId,
        notificationType: 'welcome',
        title: 'Welcome to Recipe Matcher!',
        message: `Hi ${detail.username}! Start adding your ingredients to discover amazing recipes.`,
        data: { userId: detail.userId },
    });
    // Update user analytics
    await updateUserAnalytics(detail.userId, 'registered');
}
async function handleUserProfileUpdated(detail) {
    console.log('Processing UserProfileUpdated event:', detail);
    // Update user preferences in database
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: USERS_TABLE,
        Key: { userId: detail.userId },
        UpdateExpression: 'SET preferences = :prefs, updatedAt = :timestamp',
        ExpressionAttributeValues: {
            ':prefs': detail.changes,
            ':timestamp': new Date().toISOString(),
        },
    }));
    // Trigger recipe re-matching if dietary restrictions changed
    if (detail.changes.dietaryRestrictions) {
        // This would trigger a re-matching process
        console.log('Dietary restrictions updated, triggering re-matching');
    }
}
async function handleUserIngredientsUpdated(detail) {
    console.log('Processing UserIngredientsUpdated event:', detail);
    // Trigger recipe matching for new ingredients
    if (detail.ingredients.added && detail.ingredients.added.length > 0) {
        console.log('New ingredients added, triggering recipe matching');
        // This would trigger the matching algorithm
    }
}
async function handleRecipeCreated(detail) {
    console.log('Processing RecipeCreated event:', detail);
    // Update recipe analytics
    await updateRecipeAnalytics(detail.recipeId, 'created');
    // Notify users who might be interested in this recipe
    await notifyInterestedUsers(detail);
}
async function handleRecipeUpdated(detail) {
    console.log('Processing RecipeUpdated event:', detail);
    // Update recipe analytics
    await updateRecipeAnalytics(detail.recipeId, 'updated');
    // Trigger re-matching for users who have this recipe saved
    console.log('Recipe updated, triggering re-matching for saved users');
}
async function handleRecipeRated(detail) {
    console.log('Processing RecipeRated event:', detail);
    // Update recipe rating in database
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: RECIPES_TABLE,
        Key: {
            recipeId: detail.recipeId,
            createdAt: detail.timestamp, // Assuming this is the sort key
        },
        UpdateExpression: 'ADD ratingCount :one SET ratingSum = ratingSum + :rating, updatedAt = :timestamp',
        ExpressionAttributeValues: {
            ':one': 1,
            ':rating': detail.rating,
            ':timestamp': new Date().toISOString(),
        },
    }));
    // Update recipe analytics
    await updateRecipeAnalytics(detail.recipeId, 'rated');
}
async function handleRecipeShared(detail) {
    console.log('Processing RecipeShared event:', detail);
    // Send notification to recipient if shared to specific user
    if (detail.toUserId) {
        await sendNotification({
            userId: detail.toUserId,
            notificationType: 'recipe_shared',
            title: 'Recipe Shared with You',
            message: `A recipe has been shared with you!`,
            data: { recipeId: detail.recipeId, fromUserId: detail.fromUserId },
        });
    }
    // Update sharing analytics
    await updateRecipeAnalytics(detail.recipeId, 'shared');
}
async function handleRecipeMatched(detail) {
    console.log('Processing RecipeMatched event:', detail);
    // Store match in database
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: MATCHES_TABLE,
        Key: {
            userId: detail.userId,
            recipeId: detail.recipeId,
        },
        UpdateExpression: 'SET matchPercentage = :percentage, availableIngredients = :available, missingIngredients = :missing, updatedAt = :timestamp',
        ExpressionAttributeValues: {
            ':percentage': detail.matchPercentage,
            ':available': detail.availableIngredients,
            ':missing': detail.missingIngredients,
            ':timestamp': new Date().toISOString(),
        },
    }));
    // Send notification if match percentage is high enough
    if (detail.matchPercentage >= 80) {
        await sendNotification({
            userId: detail.userId,
            notificationType: 'recipe_matched',
            title: 'Great Match Found!',
            message: `We found a recipe with ${detail.matchPercentage}% ingredient match!`,
            data: {
                recipeId: detail.recipeId,
                matchPercentage: detail.matchPercentage,
                availableIngredients: detail.availableIngredients,
                missingIngredients: detail.missingIngredients,
            },
        });
    }
}
async function handleMatchPercentageUpdated(detail) {
    console.log('Processing MatchPercentageUpdated event:', detail);
    // Update match in database
    await docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: MATCHES_TABLE,
        Key: {
            userId: detail.userId,
            recipeId: detail.recipeId,
        },
        UpdateExpression: 'SET matchPercentage = :percentage, updatedAt = :timestamp',
        ExpressionAttributeValues: {
            ':percentage': detail.newMatchPercentage,
            ':timestamp': new Date().toISOString(),
        },
    }));
}
async function sendNotification(notification) {
    try {
        await snsClient.send(new client_sns_1.PublishCommand({
            TopicArn: NOTIFICATIONS_TOPIC_ARN,
            Message: JSON.stringify({
                ...notification,
                timestamp: new Date().toISOString(),
            }),
            MessageAttributes: {
                userId: {
                    DataType: 'String',
                    StringValue: notification.userId,
                },
                notificationType: {
                    DataType: 'String',
                    StringValue: notification.notificationType,
                },
            },
        }));
        console.log('Notification sent:', notification);
    }
    catch (error) {
        console.error('Error sending notification:', error);
    }
}
async function updateUserAnalytics(userId, action) {
    // This would update user analytics in a separate analytics table
    console.log(`User analytics updated: ${userId} - ${action}`);
}
async function updateRecipeAnalytics(recipeId, action) {
    // This would update recipe analytics in a separate analytics table
    console.log(`Recipe analytics updated: ${recipeId} - ${action}`);
}
async function notifyInterestedUsers(recipeDetail) {
    // This would find users who might be interested in this recipe based on their ingredients
    console.log('Notifying interested users for recipe:', recipeDetail.recipeId);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImV2ZW50LWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsOERBQTBEO0FBQzFELHdEQUE0RjtBQUM1RixvREFBZ0U7QUFHaEUsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM1RCxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFcEMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFZLENBQUM7QUFDN0MsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFjLENBQUM7QUFDakQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFjLENBQUM7QUFDakQsTUFBTSx1QkFBdUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF3QixDQUFDO0FBRTlELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUFvQyxFQUFFLEVBQUU7SUFDcEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUvRCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRTVELFFBQVEsVUFBVSxFQUFFLENBQUM7WUFDbkIsS0FBSyxnQkFBZ0I7Z0JBQ25CLE1BQU0sb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25DLE1BQU07WUFFUixLQUFLLG9CQUFvQjtnQkFDdkIsTUFBTSx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FB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RTtJQUNuRSxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixRQUFRLE1BQU0sTUFBTSxFQUFFLENBQUMsQ0FBQztBQUNuRSxDQUFDO0FBRUQsS0FBSyxVQUFVLHFCQUFxQixDQUFDLFlBQWlCO0lBQ3BELDBGQUEwRjtJQUMxRixPQUFPLENBQUMsR0FBRyxDQUFDLHdDQUF3QyxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMvRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXZlbnRCcmlkZ2VFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgVXBkYXRlQ29tbWFuZCwgUXVlcnlDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IFNOU0NsaWVudCwgUHVibGlzaENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc25zJztcbmltcG9ydCB7IFJlY2lwZU1hdGNoZXJFdmVudCB9IGZyb20gJy4uL3R5cGVzL2V2ZW50cyc7XG5cbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZHluYW1vQ2xpZW50KTtcbmNvbnN0IHNuc0NsaWVudCA9IG5ldyBTTlNDbGllbnQoe30pO1xuXG5jb25zdCBVU0VSU19UQUJMRSA9IHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFITtcbmNvbnN0IFJFQ0lQRVNfVEFCTEUgPSBwcm9jZXNzLmVudi5SRUNJUEVTX1RBQkxFITtcbmNvbnN0IE1BVENIRVNfVEFCTEUgPSBwcm9jZXNzLmVudi5NQVRDSEVTX1RBQkxFITtcbmNvbnN0IE5PVElGSUNBVElPTlNfVE9QSUNfQVJOID0gcHJvY2Vzcy5lbnYuTk9USUZJQ0FUSU9OU19UT1BJQ19BUk4hO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogRXZlbnRCcmlkZ2VFdmVudDxzdHJpbmcsIGFueT4pID0+IHtcbiAgY29uc29sZS5sb2coJ0V2ZW50IHJlY2VpdmVkOicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7ICdkZXRhaWwtdHlwZSc6IGRldGFpbFR5cGUsIHNvdXJjZSwgZGV0YWlsIH0gPSBldmVudDtcblxuICAgIHN3aXRjaCAoZGV0YWlsVHlwZSkge1xuICAgICAgY2FzZSAnVXNlclJlZ2lzdGVyZWQnOlxuICAgICAgICBhd2FpdCBoYW5kbGVVc2VyUmVnaXN0ZXJlZChkZXRhaWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIFxuICAgICAgY2FzZSAnVXNlclByb2ZpbGVVcGRhdGVkJzpcbiAgICAgICAgYXdhaXQgaGFuZGxlVXNlclByb2ZpbGVVcGRhdGVkKGRldGFpbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgXG4gICAgICBjYXNlICdVc2VySW5ncmVkaWVudHNVcGRhdGVkJzpcbiAgICAgICAgYXdhaXQgaGFuZGxlVXNlckluZ3JlZGllbnRzVXBkYXRlZChkZXRhaWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIFxuICAgICAgY2FzZSAnUmVjaXBlQ3JlYXRlZCc6XG4gICAgICAgIGF3YWl0IGhhbmRsZVJlY2lwZUNyZWF0ZWQoZGV0YWlsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBcbiAgICAgIGNhc2UgJ1JlY2lwZVVwZGF0ZWQnOlxuICAgICAgICBhd2FpdCBoYW5kbGVSZWNpcGVVcGRhdGVkKGRldGFpbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgXG4gICAgICBjYXNlICdSZWNpcGVSYXRlZCc6XG4gICAgICAgIGF3YWl0IGhhbmRsZVJlY2lwZVJhdGVkKGRldGFpbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgXG4gICAgICBjYXNlICdSZWNpcGVTaGFyZWQnOlxuICAgICAgICBhd2FpdCBoYW5kbGVSZWNpcGVTaGFyZWQoZGV0YWlsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBcbiAgICAgIGNhc2UgJ1JlY2lwZU1hdGNoZWQnOlxuICAgICAgICBhd2FpdCBoYW5kbGVSZWNpcGVNYXRjaGVkKGRldGFpbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgXG4gICAgICBjYXNlICdNYXRjaFBlcmNlbnRhZ2VVcGRhdGVkJzpcbiAgICAgICAgYXdhaXQgaGFuZGxlTWF0Y2hQZXJjZW50YWdlVXBkYXRlZChkZXRhaWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIFxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgY29uc29sZS5sb2coJ1Vua25vd24gZXZlbnQgdHlwZTonLCBkZXRhaWxUeXBlKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiAnRXZlbnQgcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseScgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwcm9jZXNzaW5nIGV2ZW50OicsIGVycm9yKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlVXNlclJlZ2lzdGVyZWQoZGV0YWlsOiBhbnkpIHtcbiAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgVXNlclJlZ2lzdGVyZWQgZXZlbnQ6JywgZGV0YWlsKTtcbiAgXG4gIC8vIFNlbmQgd2VsY29tZSBub3RpZmljYXRpb25cbiAgYXdhaXQgc2VuZE5vdGlmaWNhdGlvbih7XG4gICAgdXNlcklkOiBkZXRhaWwudXNlcklkLFxuICAgIG5vdGlmaWNhdGlvblR5cGU6ICd3ZWxjb21lJyxcbiAgICB0aXRsZTogJ1dlbGNvbWUgdG8gUmVjaXBlIE1hdGNoZXIhJyxcbiAgICBtZXNzYWdlOiBgSGkgJHtkZXRhaWwudXNlcm5hbWV9ISBTdGFydCBhZGRpbmcgeW91ciBpbmdyZWRpZW50cyB0byBkaXNjb3ZlciBhbWF6aW5nIHJlY2lwZXMuYCxcbiAgICBkYXRhOiB7IHVzZXJJZDogZGV0YWlsLnVzZXJJZCB9LFxuICB9KTtcblxuICAvLyBVcGRhdGUgdXNlciBhbmFseXRpY3NcbiAgYXdhaXQgdXBkYXRlVXNlckFuYWx5dGljcyhkZXRhaWwudXNlcklkLCAncmVnaXN0ZXJlZCcpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVVc2VyUHJvZmlsZVVwZGF0ZWQoZGV0YWlsOiBhbnkpIHtcbiAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgVXNlclByb2ZpbGVVcGRhdGVkIGV2ZW50OicsIGRldGFpbCk7XG4gIFxuICAvLyBVcGRhdGUgdXNlciBwcmVmZXJlbmNlcyBpbiBkYXRhYmFzZVxuICBhd2FpdCBkb2NDbGllbnQuc2VuZChuZXcgVXBkYXRlQ29tbWFuZCh7XG4gICAgVGFibGVOYW1lOiBVU0VSU19UQUJMRSxcbiAgICBLZXk6IHsgdXNlcklkOiBkZXRhaWwudXNlcklkIH0sXG4gICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBwcmVmZXJlbmNlcyA9IDpwcmVmcywgdXBkYXRlZEF0ID0gOnRpbWVzdGFtcCcsXG4gICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgJzpwcmVmcyc6IGRldGFpbC5jaGFuZ2VzLFxuICAgICAgJzp0aW1lc3RhbXAnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfSxcbiAgfSkpO1xuXG4gIC8vIFRyaWdnZXIgcmVjaXBlIHJlLW1hdGNoaW5nIGlmIGRpZXRhcnkgcmVzdHJpY3Rpb25zIGNoYW5nZWRcbiAgaWYgKGRldGFpbC5jaGFuZ2VzLmRpZXRhcnlSZXN0cmljdGlvbnMpIHtcbiAgICAvLyBUaGlzIHdvdWxkIHRyaWdnZXIgYSByZS1tYXRjaGluZyBwcm9jZXNzXG4gICAgY29uc29sZS5sb2coJ0RpZXRhcnkgcmVzdHJpY3Rpb25zIHVwZGF0ZWQsIHRyaWdnZXJpbmcgcmUtbWF0Y2hpbmcnKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVVc2VySW5ncmVkaWVudHNVcGRhdGVkKGRldGFpbDogYW55KSB7XG4gIGNvbnNvbGUubG9nKCdQcm9jZXNzaW5nIFVzZXJJbmdyZWRpZW50c1VwZGF0ZWQgZXZlbnQ6JywgZGV0YWlsKTtcbiAgXG4gIC8vIFRyaWdnZXIgcmVjaXBlIG1hdGNoaW5nIGZvciBuZXcgaW5ncmVkaWVudHNcbiAgaWYgKGRldGFpbC5pbmdyZWRpZW50cy5hZGRlZCAmJiBkZXRhaWwuaW5ncmVkaWVudHMuYWRkZWQubGVuZ3RoID4gMCkge1xuICAgIGNvbnNvbGUubG9nKCdOZXcgaW5ncmVkaWVudHMgYWRkZWQsIHRyaWdnZXJpbmcgcmVjaXBlIG1hdGNoaW5nJyk7XG4gICAgLy8gVGhpcyB3b3VsZCB0cmlnZ2VyIHRoZSBtYXRjaGluZyBhbGdvcml0aG1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVSZWNpcGVDcmVhdGVkKGRldGFpbDogYW55KSB7XG4gIGNvbnNvbGUubG9nKCdQcm9jZXNzaW5nIFJlY2lwZUNyZWF0ZWQgZXZlbnQ6JywgZGV0YWlsKTtcbiAgXG4gIC8vIFVwZGF0ZSByZWNpcGUgYW5hbHl0aWNzXG4gIGF3YWl0IHVwZGF0ZVJlY2lwZUFuYWx5dGljcyhkZXRhaWwucmVjaXBlSWQsICdjcmVhdGVkJyk7XG4gIFxuICAvLyBOb3RpZnkgdXNlcnMgd2hvIG1pZ2h0IGJlIGludGVyZXN0ZWQgaW4gdGhpcyByZWNpcGVcbiAgYXdhaXQgbm90aWZ5SW50ZXJlc3RlZFVzZXJzKGRldGFpbCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVJlY2lwZVVwZGF0ZWQoZGV0YWlsOiBhbnkpIHtcbiAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgUmVjaXBlVXBkYXRlZCBldmVudDonLCBkZXRhaWwpO1xuICBcbiAgLy8gVXBkYXRlIHJlY2lwZSBhbmFseXRpY3NcbiAgYXdhaXQgdXBkYXRlUmVjaXBlQW5hbHl0aWNzKGRldGFpbC5yZWNpcGVJZCwgJ3VwZGF0ZWQnKTtcbiAgXG4gIC8vIFRyaWdnZXIgcmUtbWF0Y2hpbmcgZm9yIHVzZXJzIHdobyBoYXZlIHRoaXMgcmVjaXBlIHNhdmVkXG4gIGNvbnNvbGUubG9nKCdSZWNpcGUgdXBkYXRlZCwgdHJpZ2dlcmluZyByZS1tYXRjaGluZyBmb3Igc2F2ZWQgdXNlcnMnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVjaXBlUmF0ZWQoZGV0YWlsOiBhbnkpIHtcbiAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgUmVjaXBlUmF0ZWQgZXZlbnQ6JywgZGV0YWlsKTtcbiAgXG4gIC8vIFVwZGF0ZSByZWNpcGUgcmF0aW5nIGluIGRhdGFiYXNlXG4gIGF3YWl0IGRvY0NsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICBUYWJsZU5hbWU6IFJFQ0lQRVNfVEFCTEUsXG4gICAgS2V5OiB7IFxuICAgICAgcmVjaXBlSWQ6IGRldGFpbC5yZWNpcGVJZCxcbiAgICAgIGNyZWF0ZWRBdDogZGV0YWlsLnRpbWVzdGFtcCwgLy8gQXNzdW1pbmcgdGhpcyBpcyB0aGUgc29ydCBrZXlcbiAgICB9LFxuICAgIFVwZGF0ZUV4cHJlc3Npb246ICdBREQgcmF0aW5nQ291bnQgOm9uZSBTRVQgcmF0aW5nU3VtID0gcmF0aW5nU3VtICsgOnJhdGluZywgdXBkYXRlZEF0ID0gOnRpbWVzdGFtcCcsXG4gICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgJzpvbmUnOiAxLFxuICAgICAgJzpyYXRpbmcnOiBkZXRhaWwucmF0aW5nLFxuICAgICAgJzp0aW1lc3RhbXAnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfSxcbiAgfSkpO1xuXG4gIC8vIFVwZGF0ZSByZWNpcGUgYW5hbHl0aWNzXG4gIGF3YWl0IHVwZGF0ZVJlY2lwZUFuYWx5dGljcyhkZXRhaWwucmVjaXBlSWQsICdyYXRlZCcpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVSZWNpcGVTaGFyZWQoZGV0YWlsOiBhbnkpIHtcbiAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgUmVjaXBlU2hhcmVkIGV2ZW50OicsIGRldGFpbCk7XG4gIFxuICAvLyBTZW5kIG5vdGlmaWNhdGlvbiB0byByZWNpcGllbnQgaWYgc2hhcmVkIHRvIHNwZWNpZmljIHVzZXJcbiAgaWYgKGRldGFpbC50b1VzZXJJZCkge1xuICAgIGF3YWl0IHNlbmROb3RpZmljYXRpb24oe1xuICAgICAgdXNlcklkOiBkZXRhaWwudG9Vc2VySWQsXG4gICAgICBub3RpZmljYXRpb25UeXBlOiAncmVjaXBlX3NoYXJlZCcsXG4gICAgICB0aXRsZTogJ1JlY2lwZSBTaGFyZWQgd2l0aCBZb3UnLFxuICAgICAgbWVzc2FnZTogYEEgcmVjaXBlIGhhcyBiZWVuIHNoYXJlZCB3aXRoIHlvdSFgLFxuICAgICAgZGF0YTogeyByZWNpcGVJZDogZGV0YWlsLnJlY2lwZUlkLCBmcm9tVXNlcklkOiBkZXRhaWwuZnJvbVVzZXJJZCB9LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gVXBkYXRlIHNoYXJpbmcgYW5hbHl0aWNzXG4gIGF3YWl0IHVwZGF0ZVJlY2lwZUFuYWx5dGljcyhkZXRhaWwucmVjaXBlSWQsICdzaGFyZWQnKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVjaXBlTWF0Y2hlZChkZXRhaWw6IGFueSkge1xuICBjb25zb2xlLmxvZygnUHJvY2Vzc2luZyBSZWNpcGVNYXRjaGVkIGV2ZW50OicsIGRldGFpbCk7XG4gIFxuICAvLyBTdG9yZSBtYXRjaCBpbiBkYXRhYmFzZVxuICBhd2FpdCBkb2NDbGllbnQuc2VuZChuZXcgVXBkYXRlQ29tbWFuZCh7XG4gICAgVGFibGVOYW1lOiBNQVRDSEVTX1RBQkxFLFxuICAgIEtleTogeyBcbiAgICAgIHVzZXJJZDogZGV0YWlsLnVzZXJJZCxcbiAgICAgIHJlY2lwZUlkOiBkZXRhaWwucmVjaXBlSWQsXG4gICAgfSxcbiAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIG1hdGNoUGVyY2VudGFnZSA9IDpwZXJjZW50YWdlLCBhdmFpbGFibGVJbmdyZWRpZW50cyA9IDphdmFpbGFibGUsIG1pc3NpbmdJbmdyZWRpZW50cyA9IDptaXNzaW5nLCB1cGRhdGVkQXQgPSA6dGltZXN0YW1wJyxcbiAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAnOnBlcmNlbnRhZ2UnOiBkZXRhaWwubWF0Y2hQZXJjZW50YWdlLFxuICAgICAgJzphdmFpbGFibGUnOiBkZXRhaWwuYXZhaWxhYmxlSW5ncmVkaWVudHMsXG4gICAgICAnOm1pc3NpbmcnOiBkZXRhaWwubWlzc2luZ0luZ3JlZGllbnRzLFxuICAgICAgJzp0aW1lc3RhbXAnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfSxcbiAgfSkpO1xuXG4gIC8vIFNlbmQgbm90aWZpY2F0aW9uIGlmIG1hdGNoIHBlcmNlbnRhZ2UgaXMgaGlnaCBlbm91Z2hcbiAgaWYgKGRldGFpbC5tYXRjaFBlcmNlbnRhZ2UgPj0gODApIHtcbiAgICBhd2FpdCBzZW5kTm90aWZpY2F0aW9uKHtcbiAgICAgIHVzZXJJZDogZGV0YWlsLnVzZXJJZCxcbiAgICAgIG5vdGlmaWNhdGlvblR5cGU6ICdyZWNpcGVfbWF0Y2hlZCcsXG4gICAgICB0aXRsZTogJ0dyZWF0IE1hdGNoIEZvdW5kIScsXG4gICAgICBtZXNzYWdlOiBgV2UgZm91bmQgYSByZWNpcGUgd2l0aCAke2RldGFpbC5tYXRjaFBlcmNlbnRhZ2V9JSBpbmdyZWRpZW50IG1hdGNoIWAsXG4gICAgICBkYXRhOiB7IFxuICAgICAgICByZWNpcGVJZDogZGV0YWlsLnJlY2lwZUlkLCBcbiAgICAgICAgbWF0Y2hQZXJjZW50YWdlOiBkZXRhaWwubWF0Y2hQZXJjZW50YWdlLFxuICAgICAgICBhdmFpbGFibGVJbmdyZWRpZW50czogZGV0YWlsLmF2YWlsYWJsZUluZ3JlZGllbnRzLFxuICAgICAgICBtaXNzaW5nSW5ncmVkaWVudHM6IGRldGFpbC5taXNzaW5nSW5ncmVkaWVudHMsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZU1hdGNoUGVyY2VudGFnZVVwZGF0ZWQoZGV0YWlsOiBhbnkpIHtcbiAgY29uc29sZS5sb2coJ1Byb2Nlc3NpbmcgTWF0Y2hQZXJjZW50YWdlVXBkYXRlZCBldmVudDonLCBkZXRhaWwpO1xuICBcbiAgLy8gVXBkYXRlIG1hdGNoIGluIGRhdGFiYXNlXG4gIGF3YWl0IGRvY0NsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICBUYWJsZU5hbWU6IE1BVENIRVNfVEFCTEUsXG4gICAgS2V5OiB7IFxuICAgICAgdXNlcklkOiBkZXRhaWwudXNlcklkLFxuICAgICAgcmVjaXBlSWQ6IGRldGFpbC5yZWNpcGVJZCxcbiAgICB9LFxuICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgbWF0Y2hQZXJjZW50YWdlID0gOnBlcmNlbnRhZ2UsIHVwZGF0ZWRBdCA9IDp0aW1lc3RhbXAnLFxuICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICc6cGVyY2VudGFnZSc6IGRldGFpbC5uZXdNYXRjaFBlcmNlbnRhZ2UsXG4gICAgICAnOnRpbWVzdGFtcCc6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB9LFxuICB9KSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNlbmROb3RpZmljYXRpb24obm90aWZpY2F0aW9uOiB7XG4gIHVzZXJJZDogc3RyaW5nO1xuICBub3RpZmljYXRpb25UeXBlOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIG1lc3NhZ2U6IHN0cmluZztcbiAgZGF0YT86IGFueTtcbn0pIHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzbnNDbGllbnQuc2VuZChuZXcgUHVibGlzaENvbW1hbmQoe1xuICAgICAgVG9waWNBcm46IE5PVElGSUNBVElPTlNfVE9QSUNfQVJOLFxuICAgICAgTWVzc2FnZTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAuLi5ub3RpZmljYXRpb24sXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfSksXG4gICAgICBNZXNzYWdlQXR0cmlidXRlczoge1xuICAgICAgICB1c2VySWQ6IHtcbiAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXG4gICAgICAgICAgU3RyaW5nVmFsdWU6IG5vdGlmaWNhdGlvbi51c2VySWQsXG4gICAgICAgIH0sXG4gICAgICAgIG5vdGlmaWNhdGlvblR5cGU6IHtcbiAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXG4gICAgICAgICAgU3RyaW5nVmFsdWU6IG5vdGlmaWNhdGlvbi5ub3RpZmljYXRpb25UeXBlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KSk7XG4gICAgXG4gICAgY29uc29sZS5sb2coJ05vdGlmaWNhdGlvbiBzZW50OicsIG5vdGlmaWNhdGlvbik7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBub3RpZmljYXRpb246JywgZXJyb3IpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZVVzZXJBbmFseXRpY3ModXNlcklkOiBzdHJpbmcsIGFjdGlvbjogc3RyaW5nKSB7XG4gIC8vIFRoaXMgd291bGQgdXBkYXRlIHVzZXIgYW5hbHl0aWNzIGluIGEgc2VwYXJhdGUgYW5hbHl0aWNzIHRhYmxlXG4gIGNvbnNvbGUubG9nKGBVc2VyIGFuYWx5dGljcyB1cGRhdGVkOiAke3VzZXJJZH0gLSAke2FjdGlvbn1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlUmVjaXBlQW5hbHl0aWNzKHJlY2lwZUlkOiBzdHJpbmcsIGFjdGlvbjogc3RyaW5nKSB7XG4gIC8vIFRoaXMgd291bGQgdXBkYXRlIHJlY2lwZSBhbmFseXRpY3MgaW4gYSBzZXBhcmF0ZSBhbmFseXRpY3MgdGFibGVcbiAgY29uc29sZS5sb2coYFJlY2lwZSBhbmFseXRpY3MgdXBkYXRlZDogJHtyZWNpcGVJZH0gLSAke2FjdGlvbn1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbm90aWZ5SW50ZXJlc3RlZFVzZXJzKHJlY2lwZURldGFpbDogYW55KSB7XG4gIC8vIFRoaXMgd291bGQgZmluZCB1c2VycyB3aG8gbWlnaHQgYmUgaW50ZXJlc3RlZCBpbiB0aGlzIHJlY2lwZSBiYXNlZCBvbiB0aGVpciBpbmdyZWRpZW50c1xuICBjb25zb2xlLmxvZygnTm90aWZ5aW5nIGludGVyZXN0ZWQgdXNlcnMgZm9yIHJlY2lwZTonLCByZWNpcGVEZXRhaWwucmVjaXBlSWQpO1xufVxuIl19