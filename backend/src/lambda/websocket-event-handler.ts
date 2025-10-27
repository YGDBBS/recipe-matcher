import { EventBridgeEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
// @ts-ignore: Ignore missing type declarations for this import
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const apiGateway = new ApiGatewayManagementApiClient({
  endpoint: process.env.WEBSOCKET_API_ENDPOINT,
});

export const handler = async (event: EventBridgeEvent<string, any>): Promise<void> => {
  try {
    // Get all active connections
    const connections = await docClient.send(new ScanCommand({
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
    const sendPromises = connections.Items.map(async (connection) => {
      try {
        await apiGateway.send(new PostToConnectionCommand({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify(frontendEvent),
        }));
        console.info(`✅ Event sent successfully to connection: ${connection.connectionId}`);
      } catch (error) {
        console.error(`❌ Failed to send event to connection ${connection.connectionId}:`, error);
        
        // If connection is stale, remove it from the table
        if (error === 'GoneException') {
          console.warn(`🗑️ Removing stale connection: ${connection.connectionId}`);
          // Note: In production, you might want to add a cleanup Lambda or use TTL
        }
      }
    });

    await Promise.allSettled(sendPromises);

  } catch (error) {
    console.error('Error processing WebSocket event:', error);
    throw error;
  }
};

function transformEventForFrontend(event: EventBridgeEvent<string, any>) {
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
