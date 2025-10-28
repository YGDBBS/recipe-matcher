import { APIGatewayAuthorizerResult } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/secrets';

export const handler = async (event: any): Promise<APIGatewayAuthorizerResult> => {
  const methodArn = event.methodArn;
  const authorizationToken = event.authorizationToken || 
    (event.headers && event.headers.Authorization) ||
    (event.headers && event.headers.authorization);
  const httpMethod = event.httpMethod || event.requestContext?.httpMethod;

  // Allow OPTIONS requests to pass through for CORS preflight
  if (httpMethod === 'OPTIONS' || !authorizationToken) {
    return {
      principalId: 'anonymous',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow' as const,
            Resource: methodArn
          }
        ]
      },
      context: {
        userId: ''
      }
    };
  }

  try {
    // Remove 'Bearer ' prefix if present
    const token = authorizationToken.replace('Bearer ', '');

    // Get JWT secret
    const jwtSecret = await getJwtSecret();

    // Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };

    // Extract user ID from the token
    const userId = decoded.userId;

    if (!userId) {
      throw new Error('Token does not contain userId');
    }

    return {
      principalId: userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow' as const,
            Resource: methodArn
          }
        ]
      },
      context: {
        userId
      }
    };
  } catch (error) {
    console.error('Authorization error:', error);
    // Return a deny policy instead of throwing
    return {
      principalId: 'unauthorized',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: methodArn
          }
        ]
      },
      context: {
        userId: ''
      }
    };
  }
};

