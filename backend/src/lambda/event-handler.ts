/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { EventBridgeEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});
const USERS_TABLE = process.env.USERS_TABLE!;
const RECIPES_TABLE = process.env.RECIPES_TABLE!;
const MATCHES_TABLE = process.env.MATCHES_TABLE!;
const NOTIFICATIONS_TOPIC_ARN = process.env.NOTIFICATIONS_TOPIC_ARN!;

export const handler = async (event: EventBridgeEvent<string, any>) => {
  try {
    const { 'detail-type': detailType, detail } = event;

    switch (detailType) {
      case 'UserRegistered':
        await handleUserRegistered(detail);
        break;
      
      case 'UserProfileUpdated':
        await handleUserProfileUpdated(detail);
        break;
      
      case 'UserIngredientsUpdated':
        await handleUserIngredientsUpdated(detail);
        break;
      
      case 'RecipeCreated':
        await handleRecipeCreated(detail);
        break;
      
      case 'RecipeUpdated':
        await handleRecipeUpdated(detail);
        break;
      
      case 'RecipeRated':
        await handleRecipeRated(detail);
        break;
      
      case 'RecipeShared':
        await handleRecipeShared(detail);
        break;
      
      case 'RecipeMatched':
        await handleRecipeMatched(detail);
        break;
      
      case 'MatchPercentageUpdated':
        await handleMatchPercentageUpdated(detail);
        break;
      
      default:
        console.error('Unknown event type:', detailType);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Event processed successfully' }),
    };
  } catch (error) {
    console.error('Error processing event:', error);
    throw error;
  }
};

async function handleUserRegistered(detail: any) {
  // Send welcome notification
  await sendNotification({
    userId: detail.userId,
    notificationType: 'welcome',
    title: 'Welcome to Recipe Matcher!',
    message: `Hi ${detail.username}! Start adding your ingredients to discover amazing recipes.`,
    data: { userId: detail.userId },
  });

  // Update user analytics
  await updateUserAnalytics(detail.userId, 'registered');
}

async function handleUserProfileUpdated(detail: any) {
  // Update user preferences in database
  await docClient.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId: detail.userId },
    UpdateExpression: 'SET preferences = :prefs, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':prefs': detail.changes,
      ':timestamp': new Date().toISOString(),
    },
  }));

  // Trigger recipe re-matching if dietary restrictions changed
  if (detail.changes.dietaryRestrictions) {
    // This would trigger a re-matching process
  }
}

async function handleUserIngredientsUpdated(detail: any) {
  // Trigger recipe matching for new ingredients
  if (detail.ingredients.added && detail.ingredients.added.length > 0) {
    // This would trigger the matching algorithm
  }
}

async function handleRecipeCreated(detail: any) {
  // Update recipe analytics
  await updateRecipeAnalytics(detail.recipeId, 'created');
  
  // Notify users who might be interested in this recipe
  await notifyInterestedUsers(detail);
}

async function handleRecipeUpdated(detail: any) {
  // Update recipe analytics
  await updateRecipeAnalytics(detail.recipeId, 'updated');
  
  // Trigger re-matching for users who have this recipe saved
}

async function handleRecipeRated(detail: any) {
  // Update recipe rating in database
  await docClient.send(new UpdateCommand({
    TableName: RECIPES_TABLE,
    Key: { 
      recipeId: detail.recipeId,
      createdAt: detail.timestamp, // Assuming this is the sort key
    },
    UpdateExpression: 'ADD ratingCount :one SET ratingSum = ratingSum + :rating, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':one': 1,
      ':rating': detail.rating,
      ':timestamp': new Date().toISOString(),
    },
  }));

  // Update recipe analytics
  await updateRecipeAnalytics(detail.recipeId, 'rated');
}

async function handleRecipeShared(detail: any) {
  // Send notification to recipient if shared to specific user
  if (detail.toUserId) {
    await sendNotification({
      userId: detail.toUserId,
      notificationType: 'recipe_shared',
      title: 'Recipe Shared with You',
      message: `A recipe has been shared with you!`,
      data: { recipeId: detail.recipeId, fromUserId: detail.fromUserId },
    });
  }

  // Update sharing analytics
  await updateRecipeAnalytics(detail.recipeId, 'shared');
}

async function handleRecipeMatched(detail: any) {
  // Store match in database
  await docClient.send(new UpdateCommand({
    TableName: MATCHES_TABLE,
    Key: { 
      userId: detail.userId,
      recipeId: detail.recipeId,
    },
    UpdateExpression: 'SET matchPercentage = :percentage, availableIngredients = :available, missingIngredients = :missing, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':percentage': detail.matchPercentage,
      ':available': detail.availableIngredients,
      ':missing': detail.missingIngredients,
      ':timestamp': new Date().toISOString(),
    },
  }));

  // Send notification if match percentage is high enough
  if (detail.matchPercentage >= 80) {
    await sendNotification({
      userId: detail.userId,
      notificationType: 'recipe_matched',
      title: 'Great Match Found!',
      message: `We found a recipe with ${detail.matchPercentage}% ingredient match!`,
      data: { 
        recipeId: detail.recipeId, 
        matchPercentage: detail.matchPercentage,
        availableIngredients: detail.availableIngredients,
        missingIngredients: detail.missingIngredients,
      },
    });
  }
}

async function handleMatchPercentageUpdated(detail: any) {
  // Update match in database
  await docClient.send(new UpdateCommand({
    TableName: MATCHES_TABLE,
    Key: { 
      userId: detail.userId,
      recipeId: detail.recipeId,
    },
    UpdateExpression: 'SET matchPercentage = :percentage, updatedAt = :timestamp',
    ExpressionAttributeValues: {
      ':percentage': detail.newMatchPercentage,
      ':timestamp': new Date().toISOString(),
    },
  }));
}

async function sendNotification(notification: {
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  data?: any;
}) {
  try {
    await snsClient.send(new PublishCommand({
      TopicArn: NOTIFICATIONS_TOPIC_ARN,
      Message: JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString(),
      }),
      MessageAttributes: {
        userId: {
          DataType: 'String',
          StringValue: notification.userId,
        },
        notificationType: {
          DataType: 'String',
          StringValue: notification.notificationType,
        },
      },
    }));
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// TODO: Implement user analytics
async function updateUserAnalytics(userId: string, action: string) {
  // This would update user analytics in a separate analytics table
}

async function updateRecipeAnalytics(recipeId: string, action: string) {
  // This would update recipe analytics in a separate analytics table
}

async function notifyInterestedUsers(recipeDetail: any) {
  // This would find users who might be interested in this recipe based on their ingredients
}
