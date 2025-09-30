const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

const eventBridge = new EventBridgeClient({ region: 'eu-west-1' });

async function testWebSocketEvents() {
  console.log('Testing WebSocket events...');

  // Test UserRegistered event
  try {
    const userRegisteredEvent = {
      Entries: [
        {
          Source: 'recipe-matcher.user',
          DetailType: 'UserRegistered',
          Detail: JSON.stringify({
            userId: 'test-user-123',
            email: 'test@example.com',
            username: 'testuser',
            timestamp: new Date().toISOString(),
            metadata: {
              registrationSource: 'test',
            },
          }),
          EventBusName: 'recipe-matcher-events',
        },
      ],
    };

    console.log('Sending UserRegistered event...');
    await eventBridge.send(new PutEventsCommand(userRegisteredEvent));
    console.log('✅ UserRegistered event sent successfully');
  } catch (error) {
    console.error('❌ Error sending UserRegistered event:', error);
  }

  // Test RecipeMatched event
  try {
    const recipeMatchedEvent = {
      Entries: [
        {
          Source: 'recipe-matcher.matching',
          DetailType: 'RecipeMatched',
          Detail: JSON.stringify({
            userId: 'test-user-123',
            recipeId: 'recipe-456',
            matchPercentage: 85,
            missingIngredients: ['salt', 'pepper'],
            availableIngredients: ['chicken', 'onions', 'garlic'],
            timestamp: new Date().toISOString(),
          }),
          EventBusName: 'recipe-matcher-events',
        },
      ],
    };

    console.log('Sending RecipeMatched event...');
    await eventBridge.send(new PutEventsCommand(recipeMatchedEvent));
    console.log('✅ RecipeMatched event sent successfully');
  } catch (error) {
    console.error('❌ Error sending RecipeMatched event:', error);
  }

  // Test UserIngredientsUpdated event
  try {
    const ingredientsUpdatedEvent = {
      Entries: [
        {
          Source: 'recipe-matcher.user',
          DetailType: 'UserIngredientsUpdated',
          Detail: JSON.stringify({
            userId: 'test-user-123',
            ingredientsAdded: ['tomatoes', 'basil'],
            ingredientsRemoved: ['old-herbs'],
            timestamp: new Date().toISOString(),
          }),
          EventBusName: 'recipe-matcher-events',
        },
      ],
    };

    console.log('Sending UserIngredientsUpdated event...');
    await eventBridge.send(new PutEventsCommand(ingredientsUpdatedEvent));
    console.log('✅ UserIngredientsUpdated event sent successfully');
  } catch (error) {
    console.error('❌ Error sending UserIngredientsUpdated event:', error);
  }

  console.log('\n🎉 All test events sent! Check your frontend for real-time notifications.');
}

testWebSocketEvents().catch(console.error);
