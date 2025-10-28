import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { getUserIdFromEvent } from '../helpers/authorizer-helper';
import { getUserProfile, loginUser, registerUser, updateUserProfile, verifyToken } from '../helpers/auth-helpers';
import { getCorsHeaders } from '../helpers/common';
import { LoginSchema, RegisterSchema, UpdateProfileSchema } from '../types/schemas';



export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = getCorsHeaders();
  const { httpMethod, path } = event;
  const body = event.body ? JSON.parse(event.body) : {};

  try {
    if (httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    if (path === '/auth/login' && httpMethod === 'POST') {
      const result = LoginSchema.safeParse(body);
      if (!result.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid login data', details: result.error.format() }),
        };
      }
      return await loginUser(result.data, {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.data),
        message: 'Login successful',
      });
    }

    if (path === '/auth/register' && httpMethod === 'POST') {
      const result = RegisterSchema.safeParse(body);
      if (!result.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid registration data', details: result.error.format() }),
        };
      }
      return await registerUser(result.data, {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.data),
        message: 'Registration successful',
      });
    }

    // === PUBLIC: /auth/verify ===
    if (path === '/auth/verify' && httpMethod === 'POST') {
      return await verifyToken(event.headers.Authorization, {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: true, userId: event.headers.Authorization }),
        message: 'Token verified',
      });
    }

    // === PROTECTED: /auth/profile (GET) ===
    if (path === '/auth/profile' && httpMethod === 'GET') {
      const userId = getUserIdFromEvent(event);
      if (!userId) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
      }
      return await getUserProfile(userId, {
        statusCode: 200,
        headers,
        body: JSON.stringify({ user: userId }),
        message: 'Profile retrieved',
      });
    }

    // === PROTECTED: /auth/profile (PUT) ===
    if (path === '/auth/profile' && httpMethod === 'PUT') {
      const userId = getUserIdFromEvent(event);
      if (!userId) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
      }

      const result = UpdateProfileSchema.safeParse(body);
      if (!result.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid update data', details: result.error.format() }),
        };
      }

      return await updateUserProfile(userId, result.data, {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.data),
        message: 'Update successful',
      });
    }

    // // === LEGACY: /auth (POST with operation) — DEPRECATE SOON ===
    // if (path === '/auth' && httpMethod === 'POST') {
    //   console.warn('DEPRECATED: Use /auth/login or /auth/register instead of /auth with operation');
    //   const { operation } = body;

    //   if (operation === 'login') {
    //     const result = LoginSchema.safeParse(body);
    //     if (!result.success) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid login' }) };
    //     return await loginUser(result.data, {
    //       statusCode: 200,
    //       headers,
    //       body: JSON.stringify(result.data),
    //       message: 'Login successful',
    //     });
    //   }

    //   if (operation === 'register') {
    //     const result = RegisterSchema.safeParse(body);
    //     if (!result.success) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid register' }) };
    //     return await registerUser(result.data);
    //   }

    //   if (operation === 'verify') {
    //     return await verifyToken(event.headers.Authorization);
    //   }

    //   return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid operation' }) };
    // }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Auth handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
