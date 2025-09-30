const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = new DynamoDBClient({ region: 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function checkWebSocketConnections() {
  console.log('Checking WebSocket connections...');

  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'recipe-matcher-websocket-connections',
    }));

    console.log(`Found ${result.Items?.length || 0} active WebSocket connections:`);
    
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach((connection, index) => {
        console.log(`${index + 1}. Connection ID: ${connection.connectionId}`);
        console.log(`   User ID: ${connection.userId}`);
        console.log(`   Connected At: ${connection.connectedAt}`);
        console.log(`   TTL: ${connection.ttl}`);
        console.log('');
      });
    } else {
      console.log('No active connections found. Make sure the frontend is running and connected.');
    }
  } catch (error) {
    console.error('Error checking connections:', error);
  }
}

checkWebSocketConnections().catch(console.error);
