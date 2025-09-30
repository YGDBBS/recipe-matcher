const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

const eventBridge = new EventBridgeClient({ region: 'eu-west-1' });

async function testUserSpecificEvents() {
  console.log('🎯 Testing user-specific events...');

  // Test RecipeMatched event with high match percentage
  try {
    const recipeMatchedEvent = {
      Entries: [
        {
          Source: 'recipe-matcher.matching',
          DetailType: 'RecipeMatched',
          Detail: JSON.stringify({
            userId: 'udq3mmukt', // Your actual user ID from the connections
            recipeId: 'recipe-pasta-123',
            matchPercentage: 95,
            missingIngredients: ['parmesan'],
            availableIngredients: ['pasta', 'tomatoes', 'garlic', 'onions', 'basil'],
            timestamp: new Date().toISOString(),
          }),
          EventBusName: 'recipe-matcher-events',
        },
      ],
    };

    console.log('🍝 Sending RecipeMatched event (95% match)...');
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
            userId: 'udq3mmukt',
            ingredientsAdded: ['fresh basil', 'parmesan cheese', 'olive oil'],
            ingredientsRemoved: ['old herbs'],
            timestamp: new Date().toISOString(),
          }),
          EventBusName: 'recipe-matcher-events',
        },
      ],
    };

    console.log('🥬 Sending UserIngredientsUpdated event...');
    await eventBridge.send(new PutEventsCommand(ingredientsUpdatedEvent));
    console.log('✅ UserIngredientsUpdated event sent successfully');
  } catch (error) {
    console.error('❌ Error sending UserIngredientsUpdated event:', error);
  }

  // Test RecipeShared event
  try {
    const recipeSharedEvent = {
      Entries: [
        {
          Source: 'recipe-matcher.recipe',
          DetailType: 'RecipeShared',
          Detail: JSON.stringify({
            recipeId: 'recipe-pasta-123',
            sharerUserId: 'friend-user-456',
            recipientUserId: 'udq3mmukt',
            shareMethod: 'in-app',
            timestamp: new Date().toISOString(),
          }),
          EventBusName: 'recipe-matcher-events',
        },
      ],
    };

    console.log('📤 Sending RecipeShared event...');
    await eventBridge.send(new PutEventsCommand(recipeSharedEvent));
    console.log('✅ RecipeShared event sent successfully');
  } catch (error) {
    console.error('❌ Error sending RecipeShared event:', error);
  }

  console.log('\n🎉 All user-specific events sent!');
  console.log('👀 Check your frontend at http://localhost:5175/ for real-time notifications!');
  console.log('🔔 Look for the notification bell in the top-right corner.');
}

testUserSpecificEvents().catch(console.error);
