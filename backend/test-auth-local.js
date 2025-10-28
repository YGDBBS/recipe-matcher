#!/usr/bin/env node

// Simple local test for auth lambda
const { handler } = require('./src/lambda/auth');

// Mock environment variables
process.env.USERS_TABLE = 'recipe-matcher-users';
process.env.EVENT_BUS_NAME = 'recipe-matcher-events';

// Test data
const testLoginData = {
  email: 'test@example.com',
  password: 'password123'
};

const testRegisterData = {
  email: 'newuser@example.com',
  password: 'password123',
  username: 'newuser',
  dietaryRestrictions: ['vegetarian'],
  preferences: {
    cookingTime: 30,
    difficultyLevel: 'easy'
  }
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

// Mock event for register
const registerEvent = {
  httpMethod: 'POST',
  path: '/auth/register',
  body: JSON.stringify(testRegisterData),
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

async function runTests() {
  console.log('🧪 Testing Auth Lambda...\n');

  try {
    // Test 1: Register
    console.log('1️⃣ Testing registration...');
    const registerResult = await handler(registerEvent);
    console.log('Register result:', {
      statusCode: registerResult.statusCode,
      body: JSON.parse(registerResult.body)
    });
    console.log('');

    // Test 2: Login
    console.log('2️⃣ Testing login...');
    const loginResult = await handler(loginEvent);
    console.log('Login result:', {
      statusCode: loginResult.statusCode,
      body: JSON.parse(loginResult.body)
    });
    console.log('');

    // Test 3: Profile (protected)
    console.log('3️⃣ Testing profile access...');
    const profileResult = await handler(profileEvent);
    console.log('Profile result:', {
      statusCode: profileResult.statusCode,
      body: JSON.parse(profileResult.body)
    });
    console.log('');

    // Test 4: Invalid path
    console.log('4️⃣ Testing invalid path...');
    const invalidEvent = { ...loginEvent, path: '/auth/invalid' };
    const invalidResult = await handler(invalidEvent);
    console.log('Invalid path result:', {
      statusCode: invalidResult.statusCode,
      body: JSON.parse(invalidResult.body)
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();
