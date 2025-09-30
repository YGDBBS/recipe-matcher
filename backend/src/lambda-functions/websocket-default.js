"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event) => {
    console.log('WebSocket Default event:', JSON.stringify(event, null, 2));
    const connectionId = event.requestContext.connectionId;
    const routeKey = event.requestContext.routeKey;
    console.log(`WebSocket message received on route: ${routeKey} for connection: ${connectionId}`);
    // Handle different message types
    switch (routeKey) {
        case '$default':
            // Handle general messages
            try {
                const body = event.body ? JSON.parse(event.body) : {};
                console.log('Message body:', body);
                // Echo the message back to the client
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: 'Message received',
                        connectionId,
                        routeKey,
                        data: body,
                    }),
                };
            }
            catch (error) {
                console.error('Error parsing message body:', error);
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid message format' }),
                };
            }
        case '$connect':
            // This should be handled by the connect route, but just in case
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Connected via default handler' }),
            };
        case '$disconnect':
            // This should be handled by the disconnect route, but just in case
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Disconnected via default handler' }),
            };
        default:
            console.log(`Unknown route: ${routeKey}`);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Unknown route' }),
            };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic29ja2V0LWRlZmF1bHQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJzb2NrZXQtZGVmYXVsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFTyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRXhFLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDO0lBQ3ZELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDO0lBRS9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLFFBQVEsb0JBQW9CLFlBQVksRUFBRSxDQUFDLENBQUM7SUFFaEcsaUNBQWlDO0lBQ2pDLFFBQVEsUUFBUSxFQUFFLENBQUM7UUFDakIsS0FBSyxVQUFVO1lBQ2IsMEJBQTBCO1lBQzFCLElBQUksQ0FBQztnQkFDSCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFFbkMsc0NBQXNDO2dCQUN0QyxPQUFPO29CQUNMLFVBQVUsRUFBRSxHQUFHO29CQUNmLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO3dCQUNuQixPQUFPLEVBQUUsa0JBQWtCO3dCQUMzQixZQUFZO3dCQUNaLFFBQVE7d0JBQ1IsSUFBSSxFQUFFLElBQUk7cUJBQ1gsQ0FBQztpQkFDSCxDQUFDO1lBQ0osQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDcEQsT0FBTztvQkFDTCxVQUFVLEVBQUUsR0FBRztvQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSx3QkFBd0IsRUFBRSxDQUFDO2lCQUMxRCxDQUFDO1lBQ0osQ0FBQztRQUVILEtBQUssVUFBVTtZQUNiLGdFQUFnRTtZQUNoRSxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLCtCQUErQixFQUFFLENBQUM7YUFDbkUsQ0FBQztRQUVKLEtBQUssYUFBYTtZQUNoQixtRUFBbUU7WUFDbkUsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxDQUFDO2FBQ3RFLENBQUM7UUFFSjtZQUNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDMUMsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsQ0FBQzthQUNqRCxDQUFDO0lBQ04sQ0FBQztBQUNILENBQUMsQ0FBQztBQXZEVyxRQUFBLE9BQU8sV0F1RGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICBjb25zb2xlLmxvZygnV2ViU29ja2V0IERlZmF1bHQgZXZlbnQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcblxuICBjb25zdCBjb25uZWN0aW9uSWQgPSBldmVudC5yZXF1ZXN0Q29udGV4dC5jb25uZWN0aW9uSWQ7XG4gIGNvbnN0IHJvdXRlS2V5ID0gZXZlbnQucmVxdWVzdENvbnRleHQucm91dGVLZXk7XG5cbiAgY29uc29sZS5sb2coYFdlYlNvY2tldCBtZXNzYWdlIHJlY2VpdmVkIG9uIHJvdXRlOiAke3JvdXRlS2V5fSBmb3IgY29ubmVjdGlvbjogJHtjb25uZWN0aW9uSWR9YCk7XG5cbiAgLy8gSGFuZGxlIGRpZmZlcmVudCBtZXNzYWdlIHR5cGVzXG4gIHN3aXRjaCAocm91dGVLZXkpIHtcbiAgICBjYXNlICckZGVmYXVsdCc6XG4gICAgICAvLyBIYW5kbGUgZ2VuZXJhbCBtZXNzYWdlc1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYm9keSA9IGV2ZW50LmJvZHkgPyBKU09OLnBhcnNlKGV2ZW50LmJvZHkpIDoge307XG4gICAgICAgIGNvbnNvbGUubG9nKCdNZXNzYWdlIGJvZHk6JywgYm9keSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFY2hvIHRoZSBtZXNzYWdlIGJhY2sgdG8gdGhlIGNsaWVudFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBtZXNzYWdlOiAnTWVzc2FnZSByZWNlaXZlZCcsXG4gICAgICAgICAgICBjb25uZWN0aW9uSWQsXG4gICAgICAgICAgICByb3V0ZUtleSxcbiAgICAgICAgICAgIGRhdGE6IGJvZHksXG4gICAgICAgICAgfSksXG4gICAgICAgIH07XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwYXJzaW5nIG1lc3NhZ2UgYm9keTonLCBlcnJvcik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIG1lc3NhZ2UgZm9ybWF0JyB9KSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICBcbiAgICBjYXNlICckY29ubmVjdCc6XG4gICAgICAvLyBUaGlzIHNob3VsZCBiZSBoYW5kbGVkIGJ5IHRoZSBjb25uZWN0IHJvdXRlLCBidXQganVzdCBpbiBjYXNlXG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0Nvbm5lY3RlZCB2aWEgZGVmYXVsdCBoYW5kbGVyJyB9KSxcbiAgICAgIH07XG4gICAgXG4gICAgY2FzZSAnJGRpc2Nvbm5lY3QnOlxuICAgICAgLy8gVGhpcyBzaG91bGQgYmUgaGFuZGxlZCBieSB0aGUgZGlzY29ubmVjdCByb3V0ZSwgYnV0IGp1c3QgaW4gY2FzZVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdEaXNjb25uZWN0ZWQgdmlhIGRlZmF1bHQgaGFuZGxlcicgfSksXG4gICAgICB9O1xuICAgIFxuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmxvZyhgVW5rbm93biByb3V0ZTogJHtyb3V0ZUtleX1gKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1Vua25vd24gcm91dGUnIH0pLFxuICAgICAgfTtcbiAgfVxufTtcbiJdfQ==