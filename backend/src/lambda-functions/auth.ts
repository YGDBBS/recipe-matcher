import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { EventPublisher } from '../utils/event-publisher';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Event publisher
const eventPublisher = new EventPublisher(process.env.EVENT_BUS_NAME || 'recipe-matcher-events');

interface User {
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

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  dietaryRestrictions?: string[];
  preferences?: {
    cookingTime?: number;
    difficultyLevel?: string;
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  try {
    const { httpMethod, path } = event;
    const body = event.body ? JSON.parse(event.body) : {};

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    // Handle different auth operations based on the request body or query params
    if (path === '/auth' && httpMethod === 'POST') {
      const { operation } = body;
      
      if (operation === 'login') {
        return await loginUser(body as LoginRequest);
      } else if (operation === 'register') {
        return await registerUser(body as RegisterRequest);
      } else if (operation === 'verify') {
        return await verifyToken(event.headers.Authorization);
      } else {
        // Default to register for backward compatibility
        return await registerUser(body as RegisterRequest);
      }
    }

    if (path === '/auth' && httpMethod === 'GET') {
      return await getUserProfile(event.headers.Authorization);
    }

    if (path === '/auth' && httpMethod === 'PUT') {
      return await updateUserProfile(event.headers.Authorization, body);
    }

    // Handle direct path routing for new endpoints
    if (path === '/auth/login' && httpMethod === 'POST') {
      return await loginUser(body as LoginRequest);
    }

    if (path === '/auth/register' && httpMethod === 'POST') {
      return await registerUser(body as RegisterRequest);
    }

    if (path === '/auth/profile' && httpMethod === 'GET') {
      return await getUserProfile(event.headers.Authorization);
    }

    if (path === '/auth/profile' && httpMethod === 'PUT') {
      return await updateUserProfile(event.headers.Authorization, body);
    }

    if (path === '/auth/verify' && httpMethod === 'POST') {
      return await verifyToken(event.headers.Authorization);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function loginUser(loginData: LoginRequest): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { email, password } = loginData;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
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
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    const user = result.Items[0] as User;

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        user: userWithoutPassword,
        token 
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Login failed' }),
    };
  }
}

async function registerUser(userData: RegisterRequest): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

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
    const token = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Publish UserRegistered event
    try {
      await eventPublisher.publishUserRegistered({
        userId: user.userId,
        email: user.email,
        username: user.username,
        timestamp: user.createdAt,
        metadata: {
          registrationSource: 'web',
        },
      });
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Registration failed' }),
    };
  }
}

async function getUserProfile(authorization?: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get user profile' }),
    };
  }
}

async function updateUserProfile(authorization: string | undefined, userData: any): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    if (!authorization) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' }),
      };
    }

    const userId = extractUserIdFromToken(authorization);
    
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to update user profile' }),
    };
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

function extractUserIdFromToken(authorization: string): string | null {
  try {
    const token = authorization.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded.userId;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

async function verifyToken(authorization?: string): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

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
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid token' }),
    };
  }
}
