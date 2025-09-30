"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const handler = async (event) => {
    console.info('🔌 WebSocket Connect event received');
    console.info('📅 Connection timestamp:', new Date().toISOString());
    const connectionId = event.requestContext.connectionId;
    const userId = event.queryStringParameters?.userId || 'anonymous';
    console.info(`🆔 Connection ID: ${connectionId}`);
    console.info(`👤 User ID: ${userId}`);
    if (!connectionId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Connection ID is required' }),
        };
    }
    try {
        // Store connection in DynamoDB
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.CONNECTIONS_TABLE,
            Item: {
                connectionId,
                userId,
                connectedAt: new Date().toISOString(),
                ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours TTL
            },
        }));
        console.info(`✅ WebSocket connection established: ${connectionId} for user: ${userId}`);
        console.info('🎉 Connection stored in DynamoDB successfully');
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Connected successfully',
                connectionId,
                userId,
            }),
        };
    }
    catch (error) {
        console.error('Error storing WebSocket connection:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to store connection' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic29ja2V0LWNvbm5lY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJzb2NrZXQtY29ubmVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw4REFBMEQ7QUFDMUQsd0RBQTJFO0FBRTNFLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFFckQsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsT0FBTyxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0lBQ3BELE9BQU8sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBRW5FLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDO0lBQ3ZELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLElBQUksV0FBVyxDQUFDO0lBRWxFLE9BQU8sQ0FBQyxJQUFJLENBQUMscUJBQXFCLFlBQVksRUFBRSxDQUFDLENBQUM7SUFDbEQsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFFdEMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ2xCLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLDJCQUEyQixFQUFFLENBQUM7U0FDN0QsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCwrQkFBK0I7UUFDL0IsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUkseUJBQVUsQ0FBQztZQUNsQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUI7WUFDeEMsSUFBSSxFQUFFO2dCQUNKLFlBQVk7Z0JBQ1osTUFBTTtnQkFDTixXQUFXLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3JDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsZUFBZTthQUNyRTtTQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUosT0FBTyxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsWUFBWSxjQUFjLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDeEYsT0FBTyxDQUFDLElBQUksQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO1FBRTlELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsd0JBQXdCO2dCQUNqQyxZQUFZO2dCQUNaLE1BQU07YUFDUCxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSw0QkFBNEIsRUFBRSxDQUFDO1NBQzlELENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBL0NXLFFBQUEsT0FBTyxXQStDbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcblxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShkeW5hbW9DbGllbnQpO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICBjb25zb2xlLmluZm8oJ/CflIwgV2ViU29ja2V0IENvbm5lY3QgZXZlbnQgcmVjZWl2ZWQnKTtcbiAgY29uc29sZS5pbmZvKCfwn5OFIENvbm5lY3Rpb24gdGltZXN0YW1wOicsIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSk7XG5cbiAgY29uc3QgY29ubmVjdGlvbklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuY29ubmVjdGlvbklkO1xuICBjb25zdCB1c2VySWQgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnVzZXJJZCB8fCAnYW5vbnltb3VzJztcbiAgXG4gIGNvbnNvbGUuaW5mbyhg8J+GlCBDb25uZWN0aW9uIElEOiAke2Nvbm5lY3Rpb25JZH1gKTtcbiAgY29uc29sZS5pbmZvKGDwn5GkIFVzZXIgSUQ6ICR7dXNlcklkfWApO1xuXG4gIGlmICghY29ubmVjdGlvbklkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdDb25uZWN0aW9uIElEIGlzIHJlcXVpcmVkJyB9KSxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBTdG9yZSBjb25uZWN0aW9uIGluIER5bmFtb0RCXG4gICAgYXdhaXQgZG9jQ2xpZW50LnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5DT05ORUNUSU9OU19UQUJMRSxcbiAgICAgIEl0ZW06IHtcbiAgICAgICAgY29ubmVjdGlvbklkLFxuICAgICAgICB1c2VySWQsXG4gICAgICAgIGNvbm5lY3RlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHR0bDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkgKyAoMjQgKiA2MCAqIDYwKSwgLy8gMjQgaG91cnMgVFRMXG4gICAgICB9LFxuICAgIH0pKTtcblxuICAgIGNvbnNvbGUuaW5mbyhg4pyFIFdlYlNvY2tldCBjb25uZWN0aW9uIGVzdGFibGlzaGVkOiAke2Nvbm5lY3Rpb25JZH0gZm9yIHVzZXI6ICR7dXNlcklkfWApO1xuICAgIGNvbnNvbGUuaW5mbygn8J+OiSBDb25uZWN0aW9uIHN0b3JlZCBpbiBEeW5hbW9EQiBzdWNjZXNzZnVsbHknKTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBtZXNzYWdlOiAnQ29ubmVjdGVkIHN1Y2Nlc3NmdWxseScsXG4gICAgICAgIGNvbm5lY3Rpb25JZCxcbiAgICAgICAgdXNlcklkLFxuICAgICAgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzdG9yaW5nIFdlYlNvY2tldCBjb25uZWN0aW9uOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ZhaWxlZCB0byBzdG9yZSBjb25uZWN0aW9uJyB9KSxcbiAgICB9O1xuICB9XG59O1xuIl19