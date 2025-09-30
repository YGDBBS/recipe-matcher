"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// @ts-ignore: Ignore missing type declarations for this import
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const apiGateway = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({
    endpoint: process.env.WEBSOCKET_API_ENDPOINT,
});
const handler = async (event) => {
    console.info('🚀 WebSocket Event Handler received event:', JSON.stringify(event, null, 2));
    console.info('📅 Event timestamp:', new Date().toISOString());
    console.info('🎯 Event source:', event.source);
    console.info('📋 Event detail type:', event['detail-type']);
    try {
        // Get all active connections
        const connections = await docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: process.env.CONNECTIONS_TABLE,
        }));
        if (!connections.Items || connections.Items.length === 0) {
            console.warn('⚠️ No active WebSocket connections found');
            return;
        }
        console.info(`🔗 Found ${connections.Items.length} active WebSocket connections`);
        connections.Items.forEach((conn, index) => {
            console.info(`   ${index + 1}. Connection: ${conn.connectionId}, User: ${conn.userId}`);
        });
        // Transform the event for frontend consumption
        const frontendEvent = transformEventForFrontend(event);
        console.info('🔄 Transformed event for frontend:', JSON.stringify(frontendEvent, null, 2));
        // Send event to all connected clients
        console.info('📤 Sending event to all connected clients...');
        const sendPromises = connections.Items.map(async (connection) => {
            try {
                console.info(`📨 Sending to connection: ${connection.connectionId} (User: ${connection.userId})`);
                await apiGateway.send(new client_apigatewaymanagementapi_1.PostToConnectionCommand({
                    ConnectionId: connection.connectionId,
                    Data: JSON.stringify(frontendEvent),
                }));
                console.info(`✅ Event sent successfully to connection: ${connection.connectionId}`);
            }
            catch (error) {
                console.error(`❌ Failed to send event to connection ${connection.connectionId}:`, error);
                // If connection is stale, remove it from the table
                if (error === 'GoneException') {
                    console.warn(`🗑️ Removing stale connection: ${connection.connectionId}`);
                    // Note: In production, you might want to add a cleanup Lambda or use TTL
                }
            }
        });
        const results = await Promise.allSettled(sendPromises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.info(`📊 Event broadcast results: ${successful} successful, ${failed} failed`);
        console.info(`🎉 Event processing completed for ${event['detail-type']} event`);
    }
    catch (error) {
        console.error('Error processing WebSocket event:', error);
        throw error;
    }
};
exports.handler = handler;
function transformEventForFrontend(event) {
    const { 'detail-type': detailType, detail, source, time } = event;
    // Transform backend events to frontend event format
    switch (detailType) {
        case 'UserRegistered':
            return {
                type: 'user_registered',
                data: {
                    userId: detail.userId,
                    username: detail.username,
                    email: detail.email,
                    timestamp: detail.timestamp,
                },
                timestamp: time,
                source,
            };
        case 'RecipeMatched':
            return {
                type: 'recipe_matched',
                data: {
                    userId: detail.userId,
                    recipeId: detail.recipeId,
                    matchPercentage: detail.matchPercentage,
                    missingIngredients: detail.missingIngredients,
                    availableIngredients: detail.availableIngredients,
                    timestamp: detail.timestamp,
                },
                timestamp: time,
                source,
            };
        case 'RecipeShared':
            return {
                type: 'recipe_shared',
                data: {
                    recipeId: detail.recipeId,
                    sharerUserId: detail.sharerUserId,
                    recipientUserId: detail.recipientUserId,
                    shareMethod: detail.shareMethod,
                    timestamp: detail.timestamp,
                },
                timestamp: time,
                source,
            };
        case 'UserIngredientsUpdated':
            return {
                type: 'ingredients_updated',
                data: {
                    userId: detail.userId,
                    ingredientsAdded: detail.ingredientsAdded,
                    ingredientsRemoved: detail.ingredientsRemoved,
                    timestamp: detail.timestamp,
                },
                timestamp: time,
                source,
            };
        default:
            return {
                type: 'unknown_event',
                data: detail,
                timestamp: time,
                source,
            };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic29ja2V0LWV2ZW50LWhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJzb2NrZXQtZXZlbnQtaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw4REFBMEQ7QUFDMUQsd0RBQTRFO0FBQzVFLCtEQUErRDtBQUMvRCw0RkFBaUg7QUFFakgsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sU0FBUyxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUM1RCxNQUFNLFVBQVUsR0FBRyxJQUFJLDhEQUE2QixDQUFDO0lBQ25ELFFBQVEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQjtDQUM3QyxDQUFDLENBQUM7QUFFSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBb0MsRUFBaUIsRUFBRTtJQUNuRixPQUFPLENBQUMsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNGLE9BQU8sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzlELE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFFNUQsSUFBSSxDQUFDO1FBQ0gsNkJBQTZCO1FBQzdCLE1BQU0sV0FBVyxHQUFHLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLDBCQUFXLENBQUM7WUFDdkQsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCO1NBQ3pDLENBQUMsQ0FBQyxDQUFDO1FB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QUFNLENBQUMsZUFBZTtvQkFDdkMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO29CQUMvQixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7aUJBQzVCO2dCQUNELFNBQVMsRUFBRSxJQUFJO2dCQUNmLE1BQU07YUFDUCxDQUFDO1FBRUosS0FBSyx3QkFBd0I7WUFDM0IsT0FBTztnQkFDTCxJQUFJLEVBQUUscUJBQXFCO2dCQUMzQixJQUFJLEVBQUU7b0JBQ0osTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO29CQUNyQixnQkFBZ0IsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO29CQUN6QyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsa0JBQWtCO29CQUM3QyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7aUJBQzVCO2dCQUNELFNBQVMsRUFBRSxJQUFJO2dCQUNmLE1BQU07YUFDUCxDQUFDO1FBRUo7WUFDRSxPQUFPO2dCQUNMLElBQUksRUFBRSxlQUFlO2dCQUNyQixJQUFJLEVBQUUsTUFBTTtnQkFDWixTQUFTLEVBQUUsSUFBSTtnQkFDZixNQUFNO2FBQ1AsQ0FBQztJQUNOLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXZlbnRCcmlkZ2VFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgU2NhbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuLy8gQHRzLWlnbm9yZTogSWdub3JlIG1pc3NpbmcgdHlwZSBkZWNsYXJhdGlvbnMgZm9yIHRoaXMgaW1wb3J0XG5pbXBvcnQgeyBBcGlHYXRld2F5TWFuYWdlbWVudEFwaUNsaWVudCwgUG9zdFRvQ29ubmVjdGlvbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtYXBpZ2F0ZXdheW1hbmFnZW1lbnRhcGknO1xuXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGR5bmFtb0NsaWVudCk7XG5jb25zdCBhcGlHYXRld2F5ID0gbmV3IEFwaUdhdGV3YXlNYW5hZ2VtZW50QXBpQ2xpZW50KHtcbiAgZW5kcG9pbnQ6IHByb2Nlc3MuZW52LldFQlNPQ0tFVF9BUElfRU5EUE9JTlQsXG59KTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEV2ZW50QnJpZGdlRXZlbnQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gIGNvbnNvbGUuaW5mbygn8J+agCBXZWJTb2NrZXQgRXZlbnQgSGFuZGxlciByZWNlaXZlZCBldmVudDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xuICBjb25zb2xlLmluZm8oJ/Cfk4UgRXZlbnQgdGltZXN0YW1wOicsIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7XG4gIGNvbnNvbGUuaW5mbygn8J+OryBFdmVudCBzb3VyY2U6JywgZXZlbnQuc291cmNlKTtcbiAgY29uc29sZS5pbmZvKCfwn5OLIEV2ZW50IGRldGFpbCB0eXBlOicsIGV2ZW50WydkZXRhaWwtdHlwZSddKTtcblxuICB0cnkge1xuICAgIC8vIEdldCBhbGwgYWN0aXZlIGNvbm5lY3Rpb25zXG4gICAgY29uc3QgY29ubmVjdGlvbnMgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5DT05ORUNUSU9OU19UQUJMRSxcbiAgICB9KSk7XG5cbiAgICBpZiAoIWNvbm5lY3Rpb25zLkl0ZW1zIHx8IGNvbm5lY3Rpb25zLkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc29sZS53YXJuKCfimqDvuI8gTm8gYWN0aXZlIFdlYlNvY2tldCBjb25uZWN0aW9ucyBmb3VuZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnNvbGUuaW5mbyhg8J+UlyBGb3VuZCAke2Nvbm5lY3Rpb25zLkl0ZW1zLmxlbmd0aH0gYWN0aXZlIFdlYlNvY2tldCBjb25uZWN0aW9uc2ApO1xuICAgIGNvbm5lY3Rpb25zLkl0ZW1zLmZvckVhY2goKGNvbm4sIGluZGV4KSA9PiB7XG4gICAgICBjb25zb2xlLmluZm8oYCAgICR7aW5kZXggKyAxfS4gQ29ubmVjdGlvbjogJHtjb25uLmNvbm5lY3Rpb25JZH0sIFVzZXI6ICR7Y29ubi51c2VySWR9YCk7XG4gICAgfSk7XG5cbiAgICAvLyBUcmFuc2Zvcm0gdGhlIGV2ZW50IGZvciBmcm9udGVuZCBjb25zdW1wdGlvblxuICAgIGNvbnN0IGZyb250ZW5kRXZlbnQgPSB0cmFuc2Zvcm1FdmVudEZvckZyb250ZW5kKGV2ZW50KTtcbiAgICBjb25zb2xlLmluZm8oJ/CflIQgVHJhbnNmb3JtZWQgZXZlbnQgZm9yIGZyb250ZW5kOicsIEpTT04uc3RyaW5naWZ5KGZyb250ZW5kRXZlbnQsIG51bGwsIDIpKTtcblxuICAgIC8vIFNlbmQgZXZlbnQgdG8gYWxsIGNvbm5lY3RlZCBjbGllbnRzXG4gICAgY29uc29sZS5pbmZvKCfwn5OkIFNlbmRpbmcgZXZlbnQgdG8gYWxsIGNvbm5lY3RlZCBjbGllbnRzLi4uJyk7XG4gICAgY29uc3Qgc2VuZFByb21pc2VzID0gY29ubmVjdGlvbnMuSXRlbXMubWFwKGFzeW5jIChjb25uZWN0aW9uKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zb2xlLmluZm8oYPCfk6ggU2VuZGluZyB0byBjb25uZWN0aW9uOiAke2Nvbm5lY3Rpb24uY29ubmVjdGlvbklkfSAoVXNlcjogJHtjb25uZWN0aW9uLnVzZXJJZH0pYCk7XG4gICAgICAgIGF3YWl0IGFwaUdhdGV3YXkuc2VuZChuZXcgUG9zdFRvQ29ubmVjdGlvbkNvbW1hbmQoe1xuICAgICAgICAgIENvbm5lY3Rpb25JZDogY29ubmVjdGlvbi5jb25uZWN0aW9uSWQsXG4gICAgICAgICAgRGF0YTogSlNPTi5zdHJpbmdpZnkoZnJvbnRlbmRFdmVudCksXG4gICAgICAgIH0pKTtcbiAgICAgICAgY29uc29sZS5pbmZvKGDinIUgRXZlbnQgc2VudCBzdWNjZXNzZnVsbHkgdG8gY29ubmVjdGlvbjogJHtjb25uZWN0aW9uLmNvbm5lY3Rpb25JZH1gKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYOKdjCBGYWlsZWQgdG8gc2VuZCBldmVudCB0byBjb25uZWN0aW9uICR7Y29ubmVjdGlvbi5jb25uZWN0aW9uSWR9OmAsIGVycm9yKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGNvbm5lY3Rpb24gaXMgc3RhbGUsIHJlbW92ZSBpdCBmcm9tIHRoZSB0YWJsZVxuICAgICAgICBpZiAoZXJyb3IgPT09ICdHb25lRXhjZXB0aW9uJykge1xuICAgICAgICAgIGNvbnNvbGUud2Fybihg8J+Xke+4jyBSZW1vdmluZyBzdGFsZSBjb25uZWN0aW9uOiAke2Nvbm5lY3Rpb24uY29ubmVjdGlvbklkfWApO1xuICAgICAgICAgIC8vIE5vdGU6IEluIHByb2R1Y3Rpb24sIHlvdSBtaWdodCB3YW50IHRvIGFkZCBhIGNsZWFudXAgTGFtYmRhIG9yIHVzZSBUVExcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChzZW5kUHJvbWlzZXMpO1xuICAgIGNvbnN0IHN1Y2Nlc3NmdWwgPSByZXN1bHRzLmZpbHRlcihyID0+IHIuc3RhdHVzID09PSAnZnVsZmlsbGVkJykubGVuZ3RoO1xuICAgIGNvbnN0IGZhaWxlZCA9IHJlc3VsdHMuZmlsdGVyKHIgPT4gci5zdGF0dXMgPT09ICdyZWplY3RlZCcpLmxlbmd0aDtcbiAgICBcbiAgICBjb25zb2xlLmluZm8oYPCfk4ogRXZlbnQgYnJvYWRjYXN0IHJlc3VsdHM6ICR7c3VjY2Vzc2Z1bH0gc3VjY2Vzc2Z1bCwgJHtmYWlsZWR9IGZhaWxlZGApO1xuICAgIGNvbnNvbGUuaW5mbyhg8J+OiSBFdmVudCBwcm9jZXNzaW5nIGNvbXBsZXRlZCBmb3IgJHtldmVudFsnZGV0YWlsLXR5cGUnXX0gZXZlbnRgKTtcblxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHByb2Nlc3NpbmcgV2ViU29ja2V0IGV2ZW50OicsIGVycm9yKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxuZnVuY3Rpb24gdHJhbnNmb3JtRXZlbnRGb3JGcm9udGVuZChldmVudDogRXZlbnRCcmlkZ2VFdmVudDxzdHJpbmcsIGFueT4pIHtcbiAgY29uc3QgeyAnZGV0YWlsLXR5cGUnOiBkZXRhaWxUeXBlLCBkZXRhaWwsIHNvdXJjZSwgdGltZSB9ID0gZXZlbnQ7XG5cbiAgLy8gVHJhbnNmb3JtIGJhY2tlbmQgZXZlbnRzIHRvIGZyb250ZW5kIGV2ZW50IGZvcm1hdFxuICBzd2l0Y2ggKGRldGFpbFR5cGUpIHtcbiAgICBjYXNlICdVc2VyUmVnaXN0ZXJlZCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAndXNlcl9yZWdpc3RlcmVkJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHVzZXJJZDogZGV0YWlsLnVzZXJJZCxcbiAgICAgICAgICB1c2VybmFtZTogZGV0YWlsLnVzZXJuYW1lLFxuICAgICAgICAgIGVtYWlsOiBkZXRhaWwuZW1haWwsXG4gICAgICAgICAgdGltZXN0YW1wOiBkZXRhaWwudGltZXN0YW1wLFxuICAgICAgICB9LFxuICAgICAgICB0aW1lc3RhbXA6IHRpbWUsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgIH07XG5cbiAgICBjYXNlICdSZWNpcGVNYXRjaGVkJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdyZWNpcGVfbWF0Y2hlZCcsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICB1c2VySWQ6IGRldGFpbC51c2VySWQsXG4gICAgICAgICAgcmVjaXBlSWQ6IGRldGFpbC5yZWNpcGVJZCxcbiAgICAgICAgICBtYXRjaFBlcmNlbnRhZ2U6IGRldGFpbC5tYXRjaFBlcmNlbnRhZ2UsXG4gICAgICAgICAgbWlzc2luZ0luZ3JlZGllbnRzOiBkZXRhaWwubWlzc2luZ0luZ3JlZGllbnRzLFxuICAgICAgICAgIGF2YWlsYWJsZUluZ3JlZGllbnRzOiBkZXRhaWwuYXZhaWxhYmxlSW5ncmVkaWVudHMsXG4gICAgICAgICAgdGltZXN0YW1wOiBkZXRhaWwudGltZXN0YW1wLFxuICAgICAgICB9LFxuICAgICAgICB0aW1lc3RhbXA6IHRpbWUsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgIH07XG5cbiAgICBjYXNlICdSZWNpcGVTaGFyZWQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3JlY2lwZV9zaGFyZWQnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgcmVjaXBlSWQ6IGRldGFpbC5yZWNpcGVJZCxcbiAgICAgICAgICBzaGFyZXJVc2VySWQ6IGRldGFpbC5zaGFyZXJVc2VySWQsXG4gICAgICAgICAgcmVjaXBpZW50VXNlcklkOiBkZXRhaWwucmVjaXBpZW50VXNlcklkLFxuICAgICAgICAgIHNoYXJlTWV0aG9kOiBkZXRhaWwuc2hhcmVNZXRob2QsXG4gICAgICAgICAgdGltZXN0YW1wOiBkZXRhaWwudGltZXN0YW1wLFxuICAgICAgICB9LFxuICAgICAgICB0aW1lc3RhbXA6IHRpbWUsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgIH07XG5cbiAgICBjYXNlICdVc2VySW5ncmVkaWVudHNVcGRhdGVkJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdpbmdyZWRpZW50c191cGRhdGVkJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHVzZXJJZDogZGV0YWlsLnVzZXJJZCxcbiAgICAgICAgICBpbmdyZWRpZW50c0FkZGVkOiBkZXRhaWwuaW5ncmVkaWVudHNBZGRlZCxcbiAgICAgICAgICBpbmdyZWRpZW50c1JlbW92ZWQ6IGRldGFpbC5pbmdyZWRpZW50c1JlbW92ZWQsXG4gICAgICAgICAgdGltZXN0YW1wOiBkZXRhaWwudGltZXN0YW1wLFxuICAgICAgICB9LFxuICAgICAgICB0aW1lc3RhbXA6IHRpbWUsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgIH07XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ3Vua25vd25fZXZlbnQnLFxuICAgICAgICBkYXRhOiBkZXRhaWwsXG4gICAgICAgIHRpbWVzdGFtcDogdGltZSxcbiAgICAgICAgc291cmNlLFxuICAgICAgfTtcbiAgfVxufVxuIl19