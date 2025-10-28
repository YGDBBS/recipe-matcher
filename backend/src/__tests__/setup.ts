// Test setup for backend
import { jest } from '@jest/globals'

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(),
  GetItemCommand: jest.fn(),
  PutItemCommand: jest.fn(),
  QueryCommand: jest.fn(),
  ScanCommand: jest.fn(),
}))

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(),
  },
  GetCommand: jest.fn(),
  PutCommand: jest.fn(),
  QueryCommand: jest.fn(),
  ScanCommand: jest.fn(),
}))


jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn(),
  PublishCommand: jest.fn(),
}))

jest.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: jest.fn(),
  PutEventsCommand: jest.fn(),
}))

jest.mock('@aws-sdk/client-apigatewaymanagementapi', () => ({
  ApiGatewayManagementApiClient: jest.fn(),
  PostToConnectionCommand: jest.fn(),
}))

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(),
  GetSecretValueCommand: jest.fn(),
}))

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}))

// Set test environment variables
process.env.AWS_REGION = 'eu-west-1'
process.env.JWT_SECRET = 'test-secret'
process.env.USER_TABLE_NAME = 'test-users'
process.env.RECIPE_TABLE_NAME = 'test-recipes'
