import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Extract userId from API Gateway request context (set by authorizer)
 */
export function getUserIdFromEvent(event: APIGatewayProxyEvent): string | undefined {
  return event.requestContext.authorizer?.userId as string | undefined;
}

/**
 * Require userId from event - throws error if not authenticated
 */
export function requireUserId(event: APIGatewayProxyEvent): string {
  const userId = getUserIdFromEvent(event);
  
  if (!userId) {
    throw new Error('Authentication required');
  }
  
  return userId;
}

