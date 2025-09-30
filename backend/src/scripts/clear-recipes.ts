import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const RECIPES_TABLE = process.env.RECIPES_TABLE || 'recipe-matcher-recipes';

async function clearRecipes() {
  console.log('Clearing existing recipes...');
  
  try {
    // Get all items from the table
    const result = await docClient.send(new ScanCommand({
      TableName: RECIPES_TABLE,
    }));
    
    console.log(`Found ${result.Items?.length || 0} items to delete`);
    
    if (result.Items && result.Items.length > 0) {
      // Delete items in batches
      for (const item of result.Items) {
        try {
          await docClient.send(new DeleteCommand({
            TableName: RECIPES_TABLE,
            Key: {
              recipeId: item.recipeId,
              createdAt: item.createdAt,
            },
          }));
          console.log(`Deleted: ${item.recipeId}`);
        } catch (error) {
          console.error(`Error deleting ${item.recipeId}:`, error);
        }
      }
    }
    
    console.log('Recipe clearing completed!');
  } catch (error) {
    console.error('Error clearing recipes:', error);
    throw error;
  }
}

if (require.main === module) {
  clearRecipes().then(() => {
    console.log('Clear completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('Clear failed:', error);
    process.exit(1);
  });
}

export { clearRecipes };
