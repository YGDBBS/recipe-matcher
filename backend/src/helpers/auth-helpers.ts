import { APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { getJwtSecret } from '../utils/secrets';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const eventBridge = new EventBridgeClient({});

const JWT_EXPIRES_IN = '7d';


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

export interface LoginResponse {
  statusCode: number;
  headers: { [header: string]: string | number | boolean };
  body: string;
  message?: string
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

export async function loginUser(loginData: LoginRequest, response: LoginResponse): Promise<APIGatewayProxyResult> {
  try {
    const { email, password } = loginData;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: response.headers,
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    // Find user by email (using scan for now since GSI might not be ready)
    const result = await docClient.send(new ScanCommand({
      TableName: process.env.USERS_TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase(),
      },
    }));

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 401,
        headers: response.headers,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    const user = result.Items[0] as User;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers: response.headers,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Generate JWT token
    const jwtSecret = await getJwtSecret();
    const token = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email,
        username: user.username 
      },
      jwtSecret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password hash from response
    const userWithoutPassword = { ...user };

    return {
      statusCode: 200,
      headers: response.headers,
      body: JSON.stringify({ 
        user: userWithoutPassword,
        token 
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function registerUser(userData: RegisterRequest, headers: any): Promise<APIGatewayProxyResult> {
  try {
    const { email, password, username, dietaryRestrictions, preferences } = userData;

    if (!email || !password || !username) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email, password, and username are required' }),
      };
    }

    // Check if user already exists (using scan for now since GSI might not be ready)
    const existingUser = await docClient.send(new ScanCommand({
      TableName: process.env.USERS_TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase(),
      },
    }));

    if (existingUser.Items && existingUser.Items.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'User already exists with this email' }),
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const userId = generateId();
    const user: User = {
      userId,
      email: email.toLowerCase(),
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
      dietaryRestrictions: dietaryRestrictions || [],
      preferences: preferences || {},
    };

    await docClient.send(new PutCommand({
      TableName: process.env.USERS_TABLE,
      Item: user,
    }));

    // Generate JWT token
    const jwtSecret = await getJwtSecret();
    const token = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email,
        username: user.username 
      },
      jwtSecret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Publish UserRegistered event
    try {
      await eventBridge.send(new PutEventsCommand({
        Entries: [{
          Source: 'recipe-matcher.user',
          DetailType: 'UserRegistered',
          Detail: JSON.stringify({
            userId: user.userId,
            email: user.email,
            username: user.username,
            timestamp: user.createdAt,
            metadata: {
              registrationSource: 'web',
            },
          }),
          EventBusName: process.env.EVENT_BUS_NAME || 'recipe-matcher-events',
        }],
      }));
    } catch (error) {
      console.error('Error publishing UserRegistered event:', error);
      // Don't fail registration if event publishing fails
    }

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        user: userWithoutPassword,
        token 
      }),
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export async function getUserProfile(userId: string, headers: any): Promise<APIGatewayProxyResult> {
  try {
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User ID is required' }),
      };
    }
    
    const result = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId },
    }));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = result.Item as User;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ user: userWithoutPassword }),
    };
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
}

export async function updateUserProfile(userId: string, userData: any, headers: any): Promise<APIGatewayProxyResult> {
  try {
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User ID is required' }),
      };
    }
    
    // Get existing user
    const existingUser = await docClient.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId },
    }));

    if (!existingUser.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    // Update user data
    const updatedUser = {
      ...existingUser.Item,
      ...userData,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: process.env.USERS_TABLE,
      Item: updatedUser,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ user: updatedUser }),
    };
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

export async function verifyToken(authorization: string | undefined, headers: any): Promise<APIGatewayProxyResult> {
  try {
    if (!authorization) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' }),
      };
    }

    const userId = extractUserIdFromToken(authorization);
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: true, userId }),
    };
  } catch (error) {
    console.error('Token verification error:', error);
    throw error;
  }
}

export async function extractUserIdFromToken(authorization: string): Promise<string | null> {
  try {
    const token = authorization.replace('Bearer ', '');
    const jwtSecret = await getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret) as any;
    return decoded.userId;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
