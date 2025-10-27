import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;

  // Handle different message types
  switch (routeKey) {
    case '$default':
      // Handle general messages
      try {
        const body = event.body ? JSON.parse(event.body) : {};
        
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
      } catch (error) {
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
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unknown route' }),
      };
  }
};
