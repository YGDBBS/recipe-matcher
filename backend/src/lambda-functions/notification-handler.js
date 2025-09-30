"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const USERS_TABLE = process.env.USERS_TABLE;
const handler = async (event) => {
    console.log('SNS Event received:', JSON.stringify(event, null, 2));
    for (const record of event.Records) {
        try {
            const message = JSON.parse(record.Sns.Message);
            console.log('Processing notification:', message);
            // Get user preferences for notification delivery
            const user = await getUserPreferences(message.userId);
            if (!user) {
                console.log('User not found:', message.userId);
                continue;
            }
            // Process notification based on type
            await processNotification(message, user);
        }
        catch (error) {
            console.error('Error processing notification:', error);
        }
    }
};
exports.handler = handler;
async function getUserPreferences(userId) {
    try {
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: USERS_TABLE,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
        }));
        return result.Items?.[0];
    }
    catch (error) {
        console.error('Error fetching user preferences:', error);
        return null;
    }
}
async function processNotification(notification, user) {
    const { notificationType, title, message, data } = notification;
    switch (notificationType) {
        case 'welcome':
            await handleWelcomeNotification(notification, user);
            break;
        case 'recipe_matched':
            await handleRecipeMatchedNotification(notification, user);
            break;
        case 'recipe_shared':
            await handleRecipeSharedNotification(notification, user);
            break;
        case 'recipe_updated':
            await handleRecipeUpdatedNotification(notification, user);
            break;
        default:
            console.log('Unknown notification type:', notificationType);
    }
}
async function handleWelcomeNotification(notification, user) {
    console.log('Sending welcome notification to:', user.email);
    // In a real implementation, you would:
    // 1. Send email via SES
    // 2. Send push notification if user has mobile app
    // 3. Store in user's notification history
    // For now, just log it
    console.log('Welcome notification:', {
        to: user.email,
        title: notification.title,
        message: notification.message,
    });
}
async function handleRecipeMatchedNotification(notification, user) {
    console.log('Sending recipe match notification to:', user.email);
    // In a real implementation, you would:
    // 1. Send email with recipe details
    // 2. Send push notification
    // 3. Store in user's notification history
    console.log('Recipe match notification:', {
        to: user.email,
        title: notification.title,
        message: notification.message,
        data: notification.data,
    });
}
async function handleRecipeSharedNotification(notification, user) {
    console.log('Sending recipe shared notification to:', user.email);
    // In a real implementation, you would:
    // 1. Send email with shared recipe
    // 2. Send push notification
    // 3. Store in user's notification history
    console.log('Recipe shared notification:', {
        to: user.email,
        title: notification.title,
        message: notification.message,
        data: notification.data,
    });
}
async function handleRecipeUpdatedNotification(notification, user) {
    console.log('Sending recipe updated notification to:', user.email);
    // In a real implementation, you would:
    // 1. Send email about recipe updates
    // 2. Send push notification
    // 3. Store in user's notification history
    console.log('Recipe updated notification:', {
        to: user.email,
        title: notification.title,
        message: notification.message,
        data: notification.data,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub3RpZmljYXRpb24taGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw4REFBMEQ7QUFDMUQsd0RBQTZFO0FBRTdFLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFFNUQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFZLENBQUM7QUFXdEMsTUFBTSxPQUFPLEdBQWUsS0FBSyxFQUFFLEtBQWUsRUFBRSxFQUFFO0lBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkUsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxPQUFPLEdBQXdCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNwRSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRWpELGlEQUFpRDtZQUNqRCxNQUFNLElBQUksR0FBRyxNQUFNLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV0RCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQy9DLFNBQVM7WUFDWCxDQUFDO1lBRUQscUNBQXFDO1lBQ3JDLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxD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LENBQUMsR0FBRyxDQUFDLHdDQUF3QyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUVsRSx1Q0FBdUM7SUFDdkMsbUNBQW1DO0lBQ25DLDRCQUE0QjtJQUM1QiwwQ0FBMEM7SUFFMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRTtRQUN6QyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUs7UUFDZCxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUs7UUFDekIsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFPO1FBQzdCLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSTtLQUN4QixDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsS0FBSyxVQUFVLCtCQUErQixDQUFDLFlBQWlDLEVBQUUsSUFBUztJQUN6RixPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUVuRSx1Q0FBdUM7SUFDdkMscUNBQXFDO0lBQ3JDLDRCQUE0QjtJQUM1QiwwQ0FBMEM7SUFFMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsRUFBRTtRQUMxQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUs7UUFDZCxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUs7UUFDekIsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFPO1FBQzdCLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSTtLQUN4QixDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU05TRXZlbnQsIFNOU0hhbmRsZXIgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5cbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZHluYW1vQ2xpZW50KTtcblxuY29uc3QgVVNFUlNfVEFCTEUgPSBwcm9jZXNzLmVudi5VU0VSU19UQUJMRSE7XG5cbmludGVyZmFjZSBOb3RpZmljYXRpb25NZXNzYWdlIHtcbiAgdXNlcklkOiBzdHJpbmc7XG4gIG5vdGlmaWNhdGlvblR5cGU6IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgbWVzc2FnZTogc3RyaW5nO1xuICBkYXRhPzogYW55O1xuICB0aW1lc3RhbXA6IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IFNOU0hhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IFNOU0V2ZW50KSA9PiB7XG4gIGNvbnNvbGUubG9nKCdTTlMgRXZlbnQgcmVjZWl2ZWQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcblxuICBmb3IgKGNvbnN0IHJlY29yZCBvZiBldmVudC5SZWNvcmRzKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2U6IE5vdGlmaWNhdGlvbk1lc3NhZ2UgPSBKU09OLnBhcnNlKHJlY29yZC5TbnMuTWVzc2FnZSk7XG4gICAgICBjb25zb2xlLmxvZygnUHJvY2Vzc2luZyBub3RpZmljYXRpb246JywgbWVzc2FnZSk7XG5cbiAgICAgIC8vIEdldCB1c2VyIHByZWZlcmVuY2VzIGZvciBub3RpZmljYXRpb24gZGVsaXZlcnlcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyUHJlZmVyZW5jZXMobWVzc2FnZS51c2VySWQpO1xuICAgICAgXG4gICAgICBpZiAoIXVzZXIpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1VzZXIgbm90IGZvdW5kOicsIG1lc3NhZ2UudXNlcklkKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIFByb2Nlc3Mgbm90aWZpY2F0aW9uIGJhc2VkIG9uIHR5cGVcbiAgICAgIGF3YWl0IHByb2Nlc3NOb3RpZmljYXRpb24obWVzc2FnZSwgdXNlcik7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyBub3RpZmljYXRpb246JywgZXJyb3IpO1xuICAgIH1cbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gZ2V0VXNlclByZWZlcmVuY2VzKHVzZXJJZDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IFVTRVJTX1RBQkxFLFxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3VzZXJJZCA9IDp1c2VySWQnLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOnVzZXJJZCc6IHVzZXJJZCxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtcz8uWzBdO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIHVzZXIgcHJlZmVyZW5jZXM6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NOb3RpZmljYXRpb24obm90aWZpY2F0aW9uOiBOb3RpZmljYXRpb25NZXNzYWdlLCB1c2VyOiBhbnkpIHtcbiAgY29uc3QgeyBub3RpZmljYXRpb25UeXBlLCB0aXRsZSwgbWVzc2FnZSwgZGF0YSB9ID0gbm90aWZpY2F0aW9uO1xuXG4gIHN3aXRjaCAobm90aWZpY2F0aW9uVHlwZSkge1xuICAgIGNhc2UgJ3dlbGNvbWUnOlxuICAgICAgYXdhaXQgaGFuZGxlV2VsY29tZU5vdGlmaWNhdGlvbihub3RpZmljYXRpb24sIHVzZXIpO1xuICAgICAgYnJlYWs7XG4gICAgXG4gICAgY2FzZSAncmVjaXBlX21hdGNoZWQnOlxuICAgICAgYXdhaXQgaGFuZGxlUmVjaXBlTWF0Y2hlZE5vdGlmaWNhdGlvbihub3RpZmljYXRpb24sIHVzZXIpO1xuICAgICAgYnJlYWs7XG4gICAgXG4gICAgY2FzZSAncmVjaXBlX3NoYXJlZCc6XG4gICAgICBhd2FpdCBoYW5kbGVSZWNpcGVTaGFyZWROb3RpZmljYXRpb24obm90aWZpY2F0aW9uLCB1c2VyKTtcbiAgICAgIGJyZWFrO1xuICAgIFxuICAgIGNhc2UgJ3JlY2lwZV91cGRhdGVkJzpcbiAgICAgIGF3YWl0IGhhbmRsZVJlY2lwZVVwZGF0ZWROb3RpZmljYXRpb24obm90aWZpY2F0aW9uLCB1c2VyKTtcbiAgICAgIGJyZWFrO1xuICAgIFxuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmxvZygnVW5rbm93biBub3RpZmljYXRpb24gdHlwZTonLCBub3RpZmljYXRpb25UeXBlKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVXZWxjb21lTm90aWZpY2F0aW9uKG5vdGlmaWNhdGlvbjogTm90aWZpY2F0aW9uTWVzc2FnZSwgdXNlcjogYW55KSB7XG4gIGNvbnNvbGUubG9nKCdTZW5kaW5nIHdlbGNvbWUgbm90aWZpY2F0aW9uIHRvOicsIHVzZXIuZW1haWwpO1xuICBcbiAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQ6XG4gIC8vIDEuIFNlbmQgZW1haWwgdmlhIFNFU1xuICAvLyAyLiBTZW5kIHB1c2ggbm90aWZpY2F0aW9uIGlmIHVzZXIgaGFzIG1vYmlsZSBhcHBcbiAgLy8gMy4gU3RvcmUgaW4gdXNlcidzIG5vdGlmaWNhdGlvbiBoaXN0b3J5XG4gIFxuICAvLyBGb3Igbm93LCBqdXN0IGxvZyBpdFxuICBjb25zb2xlLmxvZygnV2VsY29tZSBub3RpZmljYXRpb246Jywge1xuICAgIHRvOiB1c2VyLmVtYWlsLFxuICAgIHRpdGxlOiBub3RpZmljYXRpb24udGl0bGUsXG4gICAgbWVzc2FnZTogbm90aWZpY2F0aW9uLm1lc3NhZ2UsXG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVSZWNpcGVNYXRjaGVkTm90aWZpY2F0aW9uKG5vdGlmaWNhdGlvbjogTm90aWZpY2F0aW9uTWVzc2FnZSwgdXNlcjogYW55KSB7XG4gIGNvbnNvbGUubG9nKCdTZW5kaW5nIHJlY2lwZSBtYXRjaCBub3RpZmljYXRpb24gdG86JywgdXNlci5lbWFpbCk7XG4gIFxuICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZDpcbiAgLy8gMS4gU2VuZCBlbWFpbCB3aXRoIHJlY2lwZSBkZXRhaWxzXG4gIC8vIDIuIFNlbmQgcHVzaCBub3RpZmljYXRpb25cbiAgLy8gMy4gU3RvcmUgaW4gdXNlcidzIG5vdGlmaWNhdGlvbiBoaXN0b3J5XG4gIFxuICBjb25zb2xlLmxvZygnUmVjaXBlIG1hdGNoIG5vdGlmaWNhdGlvbjonLCB7XG4gICAgdG86IHVzZXIuZW1haWwsXG4gICAgdGl0bGU6IG5vdGlmaWNhdGlvbi50aXRsZSxcbiAgICBtZXNzYWdlOiBub3RpZmljYXRpb24ubWVzc2FnZSxcbiAgICBkYXRhOiBub3RpZmljYXRpb24uZGF0YSxcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVJlY2lwZVNoYXJlZE5vdGlmaWNhdGlvbihub3RpZmljYXRpb246IE5vdGlmaWNhdGlvbk1lc3NhZ2UsIHVzZXI6IGFueSkge1xuICBjb25zb2xlLmxvZygnU2VuZGluZyByZWNpcGUgc2hhcmVkIG5vdGlmaWNhdGlvbiB0bzonLCB1c2VyLmVtYWlsKTtcbiAgXG4gIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkOlxuICAvLyAxLiBTZW5kIGVtYWlsIHdpdGggc2hhcmVkIHJlY2lwZVxuICAvLyAyLiBTZW5kIHB1c2ggbm90aWZpY2F0aW9uXG4gIC8vIDMuIFN0b3JlIGluIHVzZXIncyBub3RpZmljYXRpb24gaGlzdG9yeVxuICBcbiAgY29uc29sZS5sb2coJ1JlY2lwZSBzaGFyZWQgbm90aWZpY2F0aW9uOicsIHtcbiAgICB0bzogdXNlci5lbWFpbCxcbiAgICB0aXRsZTogbm90aWZpY2F0aW9uLnRpdGxlLFxuICAgIG1lc3NhZ2U6IG5vdGlmaWNhdGlvbi5tZXNzYWdlLFxuICAgIGRhdGE6IG5vdGlmaWNhdGlvbi5kYXRhLFxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUmVjaXBlVXBkYXRlZE5vdGlmaWNhdGlvbihub3RpZmljYXRpb246IE5vdGlmaWNhdGlvbk1lc3NhZ2UsIHVzZXI6IGFueSkge1xuICBjb25zb2xlLmxvZygnU2VuZGluZyByZWNpcGUgdXBkYXRlZCBub3RpZmljYXRpb24gdG86JywgdXNlci5lbWFpbCk7XG4gIFxuICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZDpcbiAgLy8gMS4gU2VuZCBlbWFpbCBhYm91dCByZWNpcGUgdXBkYXRlc1xuICAvLyAyLiBTZW5kIHB1c2ggbm90aWZpY2F0aW9uXG4gIC8vIDMuIFN0b3JlIGluIHVzZXIncyBub3RpZmljYXRpb24gaGlzdG9yeVxuICBcbiAgY29uc29sZS5sb2coJ1JlY2lwZSB1cGRhdGVkIG5vdGlmaWNhdGlvbjonLCB7XG4gICAgdG86IHVzZXIuZW1haWwsXG4gICAgdGl0bGU6IG5vdGlmaWNhdGlvbi50aXRsZSxcbiAgICBtZXNzYWdlOiBub3RpZmljYXRpb24ubWVzc2FnZSxcbiAgICBkYXRhOiBub3RpZmljYXRpb24uZGF0YSxcbiAgfSk7XG59XG4iXX0=