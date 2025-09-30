import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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
    await docClient.send(new PutCommand({
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
  } catch (error) {
    console.error('Error storing WebSocket connection:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to store connection' }),
    };
  }
};
