import { APIGatewayAuthorizerResult } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import * as jwt from 'jsonwebtoken';

const secretsManager = new SecretsManagerClient({});

// Cache the JWT secret
let cachedJwtSecret: string | null = null;

async function getJwtSecret(): Promise<string> {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: 'recipe-matcher-jwt-secret'
    });
    
    const response = await secretsManager.send(command);
    cachedJwtSecret = response.SecretString || '';
    if (!cachedJwtSecret) {
      throw new Error('JWT secret is empty');
    }
    return cachedJwtSecret;
  } catch (error) {
    console.error('Error retrieving JWT secret from Secrets Manager:', error);
    throw new Error('Failed to retrieve JWT secret');
  }
}

export const handler = async (event: any): Promise<APIGatewayAuthorizerResult> => {
  const { authorizationToken, methodArn, httpMethod } = event;

  console.log('Authorizer event received, httpMethod:', httpMethod);
  console.log('Has authorizationToken:', !!authorizationToken);

  // Allow OPTIONS requests to pass through for CORS preflight
  if (httpMethod === 'OPTIONS' || !authorizationToken) {
    console.log('Allowing request through - OPTIONS or no token');
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
    console.log('Attempting to verify token...');
    
    // Remove 'Bearer ' prefix if present
    const token = authorizationToken.replace('Bearer ', '');

    // Get JWT secret
    const jwtSecret = await getJwtSecret();
    console.log('JWT secret retrieved successfully');

    // Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    console.log('Token verified, userId:', decoded.userId);

    // Extract user ID from the token
    const userId = decoded.userId;

    if (!userId) {
      throw new Error('Token does not contain userId');
    }

    // Generate policy
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: methodArn
        }
      ]
    };

    // Return authorizer response
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
    throw new Error('Unauthorized');
  }
};

