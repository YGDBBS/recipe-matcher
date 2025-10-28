#!/usr/bin/env node

// Comprehensive test for auth lambda
const { handler } = require('./src/lambda/auth');

// Mock environment variables
process.env.USERS_TABLE = 'recipe-matcher-users';
process.env.EVENT_BUS_NAME = 'recipe-matcher-events';

// Test data with unique emails
const timestamp = Date.now();
const testRegisterData = {
  email: `test${timestamp}@example.com`,
  password: 'password123',
  username: `testuser${timestamp}`,
  dietaryRestrictions: ['vegetarian'],
  preferences: {
    cookingTime: 30,
    difficultyLevel: 'easy'
  }
};

const testLoginData = {
  email: testRegisterData.email,
  password: testRegisterData.password
};

const testInvalidLoginData = {
  email: testRegisterData.email,
  password: 'wrongpassword'
};

// Mock event for registration
const registerEvent = {
  httpMethod: 'POST',
  path: '/auth/register',
  body: JSON.stringify(testRegisterData),
  headers: {
    'Content-Type': 'application/json'
  },
  requestContext: {}
};

// Mock event for login
const loginEvent = {
  httpMethod: 'POST',
  path: '/auth/login',
  body: JSON.stringify(testLoginData),
  headers: {
    'Content-Type': 'application/json'
  },
  requestContext: {}
};

// Mock event for invalid login
const invalidLoginEvent = {
  httpMethod: 'POST',
  path: '/auth/login',
  body: JSON.stringify(testInvalidLoginData),
  headers: {
    'Content-Type': 'application/json'
  },
  requestContext: {}
};

// Mock event for profile (protected)
const profileEvent = {
  httpMethod: 'GET',
  path: '/auth/profile',
  body: null,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token'
  },
  requestContext: {
    authorizer: {
      userId: 'test-user-id'
    }
  }
};

// Mock event for verify token
const verifyEvent = {
  httpMethod: 'POST',
  path: '/auth/verify',
  body: null,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token'
  },
  requestContext: {}
};

// Mock event for invalid schema
const invalidSchemaEvent = {
  httpMethod: 'POST',
  path: '/auth/register',
  body: JSON.stringify({ email: 'invalid-email', password: '123' }), // Invalid email and short password
  headers: {
    'Content-Type': 'application/json'
  },
  requestContext: {}
};

async function runComprehensiveTests() {
  console.log('🧪 Comprehensive Auth Lambda Testing...\n');

  try {
    // Test 1: Register new user
    console.log('1️⃣ Testing registration with new user...');
    const registerResult = await handler(registerEvent);
    console.log('Register result:', {
      statusCode: registerResult.statusCode,
      body: JSON.parse(registerResult.body)
    });
    console.log('');

    // Test 2: Login with correct credentials
    console.log('2️⃣ Testing login with correct credentials...');
    const loginResult = await handler(loginEvent);
    console.log('Login result:', {
      statusCode: loginResult.statusCode,
      body: JSON.parse(loginResult.body)
    });
    console.log('');

    // Test 3: Login with incorrect credentials
    console.log('3️⃣ Testing login with incorrect credentials...');
    const invalidLoginResult = await handler(invalidLoginEvent);
    console.log('Invalid login result:', {
      statusCode: invalidLoginResult.statusCode,
      body: JSON.parse(invalidLoginResult.body)
    });
    console.log('');

    // Test 4: Verify token
    console.log('4️⃣ Testing token verification...');
    const verifyResult = await handler(verifyEvent);
    console.log('Verify result:', {
      statusCode: verifyResult.statusCode,
      body: JSON.parse(verifyResult.body)
    });
    console.log('');

    // Test 5: Profile access (protected)
    console.log('5️⃣ Testing profile access...');
    const profileResult = await handler(profileEvent);
    console.log('Profile result:', {
      statusCode: profileResult.statusCode,
      body: JSON.parse(profileResult.body)
    });
    console.log('');

    // Test 6: Invalid schema validation
    console.log('6️⃣ Testing invalid schema validation...');
    const invalidSchemaResult = await handler(invalidSchemaEvent);
    console.log('Invalid schema result:', {
      statusCode: invalidSchemaResult.statusCode,
      body: JSON.parse(invalidSchemaResult.body)
    });
    console.log('');

    // Test 7: OPTIONS request
    console.log('7️⃣ Testing OPTIONS request...');
    const optionsEvent = { ...registerEvent, httpMethod: 'OPTIONS' };
    const optionsResult = await handler(optionsEvent);
    console.log('OPTIONS result:', {
      statusCode: optionsResult.statusCode,
      headers: optionsResult.headers
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runComprehensiveTests();
