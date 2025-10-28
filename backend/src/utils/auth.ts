import {
    APIGatewayProxyResult,
    APIGatewayProxyEventHeaders,
} from 'aws-lambda';
import {
    ScanCommand,
    GetCommand,
    PutCommand,
    DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
  
  
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
import { getJwtSecret } from './secrets';
import { publishEvent } from './eventbridge';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
  
  const JWT_EXPIRES_IN = '7d';
  
  // Shared CORS headers
  const corsHeaders = (origin = '*'): Record<string, string> => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
});
  
export interface User {
    userId: string;
    email: string;
    username: string;
    passwordHash: string;
    createdAt: string;
    dietaryRestrictions?: string[];
    preferences?: {
      cookingTime?: number;
      difficultyLevel?: string;
    };
}
  
export interface LoginRequest {
    email: string;
    password: string;
}
  
export interface RegisterRequest {
    email: string;
    password: string;
    username: string;
    dietaryRestrictions?: string[];
    preferences?: {
      cookingTime?: number;
      difficultyLevel?: string;
    };
}
  

export const generateId = (): string => Math.random().toString(36).substr(2, 9);
  

export const loginUser = async (
    loginData: LoginRequest,
    headers?: APIGatewayProxyEventHeaders
): Promise<APIGatewayProxyResult> => {
    const h = corsHeaders(headers?.origin);
  
    try {
      const { email, password } = loginData;
      if (!email || !password) {
        return {
          statusCode: 400,
          headers: h,
          body: JSON.stringify({ error: 'Email and password are required' }),
        };
      }
  
      const result = await docClient.send(
        new ScanCommand({
          TableName: process.env.USERS_TABLE!,
          FilterExpression: 'email = :email',
          ExpressionAttributeValues: { ':email': email.toLowerCase() },
        })
      );
  
      if (!result.Items?.length) {
        return {
          statusCode: 401,
          headers: h,
          body: JSON.stringify({ error: 'Invalid credentials' }),
        };
      }
  
      const user = result.Items[0] as User;
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return {
          statusCode: 401,
          headers: h,
          body: JSON.stringify({ error: 'Invalid credentials' }),
        };
      }
  
      const secret = await getJwtSecret();
      const token = jwt.sign(
        { userId: user.userId, email: user.email, username: user.username },
        secret,
        { expiresIn: JWT_EXPIRES_IN }
      );
  
      const { passwordHash, ...safeUser } = user;
  
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ user: safeUser, token }),
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        statusCode: 500,
        headers: h,
        body: JSON.stringify({ error: 'Login failed' }),
      };
    }
  };
  
export const registerUser = async (
    userData: RegisterRequest,
    headers?: APIGatewayProxyEventHeaders
): Promise<APIGatewayProxyResult> => {
    const h = corsHeaders(headers?.origin);
  
    try {
      const { email, password, username, dietaryRestrictions, preferences } = userData;
      if (!email || !password || !username) {
        return {
          statusCode: 400,
          headers: h,
          body: JSON.stringify({ error: 'Email, password, and username are required' }),
        };
      }
  
      // Check for existing user
      const existing = await docClient.send(
        new ScanCommand({
          TableName: process.env.USERS_TABLE!,
          FilterExpression: 'email = :email',
          ExpressionAttributeValues: { ':email': email.toLowerCase() },
        })
      );
  
      if (existing.Items?.length) {
        return {
          statusCode: 409,
          headers: h,
          body: JSON.stringify({ error: 'User already exists with this email' }),
        };
      }
  
      // Create user
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = generateId();
      const now = new Date().toISOString();
  
      const user: User = {
        userId,
        email: email.toLowerCase(),
        username,
        passwordHash,
        createdAt: now,
        dietaryRestrictions: dietaryRestrictions ?? [],
        preferences: preferences ?? {},
      };
  
      await docClient.send(
        new PutCommand({
          TableName: process.env.USERS_TABLE!,
          Item: user,
        })
      );
  
      // Generate JWT
      const secret = await getJwtSecret();
      const token = jwt.sign(
        { userId, email: user.email, username },
        secret,
        { expiresIn: JWT_EXPIRES_IN }
      );
  
      // Fire-and-forget event
      try {
        await publishEvent({
          Source: 'recipe-matcher.user',
          DetailType: 'UserRegistered',
          Detail: JSON.stringify({
            userId,
            email: user.email,
            username,
            timestamp: now,
            metadata: { registrationSource: 'web' },
          }),
          EventBusName: process.env.EVENT_BUS_NAME,
        });
      } catch (error) {
        console.error('Failed to publish UserRegistered (non-blocking):', error);
      }
  
      // Remove password hash from response
      const safeUser: Omit<User, 'passwordHash'> = {
        userId: user.userId,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        dietaryRestrictions: user.dietaryRestrictions,
        preferences: user.preferences,
      };
  
      return {
        statusCode: 201,
        headers: h,
        body: JSON.stringify({ user: safeUser, token }),
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        statusCode: 500,
        headers: h,
        body: JSON.stringify({ error: 'Registration failed' }),
      };
    }
};
  
export const getUserProfile = async (
    userId: string | undefined,
    headers?: APIGatewayProxyEventHeaders
): Promise<APIGatewayProxyResult> => {
    const h = corsHeaders(headers?.origin);
  
    try {
      if (!userId) {
        return {
          statusCode: 401,
          headers: h,
          body: JSON.stringify({ error: 'Authorization required' }),
        };
      }
  
      const result = await docClient.send(
        new GetCommand({
          TableName: process.env.USERS_TABLE!,
          Key: { userId },
        })
      );
  
      if (!result.Item) {
        return {
          statusCode: 404,
          headers: h,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }
  
      // Remove password hash from response
      const safeUser: Omit<User, 'passwordHash'> = {
        userId: (result.Item as User).userId,
        email: (result.Item as User).email,
        username: (result.Item as User).username,
        createdAt: (result.Item as User).createdAt,
        dietaryRestrictions: (result.Item as User).dietaryRestrictions,
        preferences: (result.Item as User).preferences,
      };
  
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ user: safeUser }),
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        statusCode: 500,
        headers: h,
        body: JSON.stringify({ error: 'Failed to get user profile' }),
      };
    }
};
  
export const updateUserProfile = async (
    userId: string | undefined,
    userData: Partial<User>,
    headers?: APIGatewayProxyEventHeaders
): Promise<APIGatewayProxyResult> => {
    const h = corsHeaders(headers?.origin);
  
    try {
      if (!userId) {
        return {
          statusCode: 401,
          headers: h,
          body: JSON.stringify({ error: 'Authorization required' }),
        };
      }
  
      const existing = await docClient.send(
        new GetCommand({
          TableName: process.env.USERS_TABLE!,
          Key: { userId },
        })
      );
  
      if (!existing.Item) {
        return {
          statusCode: 404,
          headers: h,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }
  
      const updatedUser = {
        ...existing.Item,
        ...userData,
        updatedAt: new Date().toISOString(),
      };
  
      await docClient.send(
        new PutCommand({
          TableName: process.env.USERS_TABLE!,
          Item: updatedUser,
        })
      );
  
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ user: updatedUser }),
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        statusCode: 500,
        headers: h,
        body: JSON.stringify({ error: 'Failed to update user profile' }),
      };
    }
};
  

export const verifyToken = async (
    authorization: string | undefined,
    headers?: APIGatewayProxyEventHeaders
): Promise<APIGatewayProxyResult> => {
    const h = corsHeaders(headers?.origin);
  
    try {
      if (!authorization) {
        return {
          statusCode: 401,
          headers: h,
          body: JSON.stringify({ error: 'Authorization required' }),
        };
      }
  
      const token = authorization.replace(/^Bearer\s+/i, '');
      const secret = await getJwtSecret();
      const decoded = jwt.verify(token, secret) as { userId: string };
  
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ valid: true, userId: decoded.userId }),
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        statusCode: 401,
        headers: h,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }
};