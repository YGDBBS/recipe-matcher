import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('WebSocket Disconnect event:', JSON.stringify(event, null, 2));

  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Connection ID is required' }),
    };
  }

  try {
    // Remove connection from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: {
        connectionId,
      },
    }));

    console.log(`WebSocket connection closed: ${connectionId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Disconnected successfully',
        connectionId,
      }),
    };
  } catch (error) {
    console.error('Error removing WebSocket connection:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to remove connection' }),
    };
  }
};
