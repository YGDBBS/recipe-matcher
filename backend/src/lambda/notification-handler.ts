/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
// TODO: Revisit notification-handler implementation and remove unused variable suppressions after refactor
import { SNSEvent, SNSHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USERS_TABLE = process.env.USERS_TABLE!;

interface NotificationMessage {
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

export const handler: SNSHandler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    try {
      const message: NotificationMessage = JSON.parse(record.Sns.Message);

      // Get user preferences for notification delivery
      const user = await getUserPreferences(message.userId);
      
      if (!user) {
        continue;
      }

      // Process notification based on type
      await processNotification(message, user);

    } catch (error) {
      console.error('Error processing notification:', error);
    }
  }
};

async function getUserPreferences(userId: string) {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }));

    return result.Items?.[0];
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}

async function processNotification(notification: NotificationMessage, user: any) {
  const { notificationType } = notification;

  switch (notificationType) {
    case 'welcome':
      await handleWelcomeNotification(notification, user);
      break;
    
    case 'recipe_matched':
      await handleRecipeMatchedNotification(notification, user);
      break;
    
    case 'recipe_shared':
      await handleRecipeSharedNotification(notification, user);
      break;
    
    case 'recipe_updated':
      await handleRecipeUpdatedNotification(notification, user);
      break;
    
    default:
      // Unknown notification type
  }
}

async function handleWelcomeNotification(notification: NotificationMessage, user: any) {
  // In a real implementation, you would:
  // 1. Send email via SES
  // 2. Send push notification if user has mobile app
  // 3. Store in user's notification history
  
  // For now, just log it (keeping comment but removing console.log)
  const welcomeNotification = {
    to: user.email,
    title: notification.title,
    message: notification.message,
  };
}

async function handleRecipeMatchedNotification(notification: NotificationMessage, user: any) {
  // In a real implementation, you would:
  // 1. Send email with recipe details
  // 2. Send push notification
  // 3. Store in user's notification history
  
  const recipeMatchNotification = {
    to: user.email,
    title: notification.title,
    message: notification.message,
    data: notification.data,
  };
}

async function handleRecipeSharedNotification(notification: NotificationMessage, user: any) {
  // In a real implementation, you would:
  // 1. Send email with shared recipe
  // 2. Send push notification
  // 3. Store in user's notification history
  
  const recipeSharedNotification = {
    to: user.email,
    title: notification.title,
    message: notification.message,
    data: notification.data,
  };
}

async function handleRecipeUpdatedNotification(notification: NotificationMessage, user: any) {
  // In a real implementation, you would:
  // 1. Send email about recipe updates
  // 2. Send push notification
  // 3. Store in user's notification history
  
  const recipeUpdatedNotification = {
    to: user.email,
    title: notification.title,
    message: notification.message,
    data: notification.data,
  };
}
