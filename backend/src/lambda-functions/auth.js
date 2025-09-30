"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const event_publisher_1 = require("../utils/event-publisher");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
// Event publisher
const eventPublisher = new event_publisher_1.EventPublisher(process.env.EVENT_BUS_NAME || 'recipe-matcher-events');
const handler = async (event) => {
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
                return await loginUser(body);
            }
            else if (operation === 'register') {
                return await registerUser(body);
            }
            else if (operation === 'verify') {
                return await verifyToken(event.headers.Authorization);
            }
            else {
                // Default to register for backward compatibility
                return await registerUser(body);
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
            return await loginUser(body);
        }
        if (path === '/auth/register' && httpMethod === 'POST') {
            return await registerUser(body);
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
    }
    catch (error) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
async function loginUser(loginData) {
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
        const result = await docClient.send(new lib_dynamodb_1.ScanCommand({
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
        const user = result.Items[0];
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
        const token = jwt.sign({
            userId: user.userId,
            email: user.email,
            username: user.username
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
    }
    catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Login failed' }),
        };
    }
}
async function registerUser(userData) {
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
        const existingUser = await docClient.send(new lib_dynamodb_1.ScanCommand({
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
        const user = {
            userId,
            email: email.toLowerCase(),
            username,
            passwordHash,
            createdAt: new Date().toISOString(),
            dietaryRestrictions: dietaryRestrictions || [],
            preferences: preferences || {},
        };
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.USERS_TABLE,
            Item: user,
        }));
        // Generate JWT token
        const token = jwt.sign({
            userId: user.userId,
            email: user.email,
            username: user.username
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
        }
        catch (error) {
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
    }
    catch (error) {
        console.error('Registration error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Registration failed' }),
        };
    }
}
async function getUserProfile(authorization) {
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
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
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
        const { passwordHash, ...userWithoutPassword } = result.Item;
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ user: userWithoutPassword }),
        };
    }
    catch (error) {
        console.error('Get profile error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to get user profile' }),
        };
    }
}
async function updateUserProfile(authorization, userData) {
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
        const existingUser = await docClient.send(new lib_dynamodb_1.GetCommand({
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
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: process.env.USERS_TABLE,
            Item: updatedUser,
        }));
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ user: updatedUser }),
        };
    }
    catch (error) {
        console.error('Update profile error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to update user profile' }),
        };
    }
}
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
function extractUserIdFromToken(authorization) {
    try {
        const token = authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.userId;
    }
    catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}
async function verifyToken(authorization) {
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
    }
    catch (error) {
        console.error('Token verification error:', error);
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid token' }),
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsOERBQTBEO0FBQzFELHdEQUFrSDtBQUNsSCxvQ0FBb0M7QUFDcEMsbUNBQW1DO0FBQ25DLDhEQUEwRDtBQUUxRCxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUMsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRTVELHVEQUF1RDtBQUN2RCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxnREFBZ0QsQ0FBQztBQUM5RixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUM7QUFFNUIsa0JBQWtCO0FBQ2xCLE1BQU0sY0FBYyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSx1QkFBdUIsQ0FBQyxDQUFDO0FBK0IxRixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLE9BQU8sR0FBRztRQUNkLGNBQWMsRUFBRSxrQkFBa0I7UUFDbEMsNkJBQTZCLEVBQUUsR0FBRztRQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7UUFDNUQsOEJBQThCLEVBQUUsNkJBQTZCO0tBQzlELENBQUM7SUFFRixJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQztRQUNuQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRXRELElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzdCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JB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QUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHdCQUF3QixFQUFFLENBQUM7YUFDMUQsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU87Z0JBQ1AsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLENBQUM7YUFDakQsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPO1lBQ1AsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO1NBQzlDLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTztZQUNQLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxDQUFDO1NBQ2pELENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIEdldENvbW1hbmQsIFF1ZXJ5Q29tbWFuZCwgU2NhbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0ICogYXMgand0IGZyb20gJ2pzb253ZWJ0b2tlbic7XG5pbXBvcnQgKiBhcyBiY3J5cHQgZnJvbSAnYmNyeXB0anMnO1xuaW1wb3J0IHsgRXZlbnRQdWJsaXNoZXIgfSBmcm9tICcuLi91dGlscy9ldmVudC1wdWJsaXNoZXInO1xuXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGR5bmFtb0NsaWVudCk7XG5cbi8vIEpXVCBzZWNyZXQgLSBpbiBwcm9kdWN0aW9uLCB1c2UgZW52aXJvbm1lbnQgdmFyaWFibGVcbmNvbnN0IEpXVF9TRUNSRVQgPSBwcm9jZXNzLmVudi5KV1RfU0VDUkVUIHx8ICd5b3VyLXN1cGVyLXNlY3JldC1qd3Qta2V5LWNoYW5nZS1pbi1wcm9kdWN0aW9uJztcbmNvbnN0IEpXVF9FWFBJUkVTX0lOID0gJzdkJztcblxuLy8gRXZlbnQgcHVibGlzaGVyXG5jb25zdCBldmVudFB1Ymxpc2hlciA9IG5ldyBFdmVudFB1Ymxpc2hlcihwcm9jZXNzLmVudi5FVkVOVF9CVVNfTkFNRSB8fCAncmVjaXBlLW1hdGNoZXItZXZlbnRzJyk7XG5cbmludGVyZmFjZSBVc2VyIHtcbiAgdXNlcklkOiBzdHJpbmc7XG4gIGVtYWlsOiBzdHJpbmc7XG4gIHVzZXJuYW1lOiBzdHJpbmc7XG4gIHBhc3N3b3JkSGFzaDogc3RyaW5nO1xuICBjcmVhdGVkQXQ6IHN0cmluZztcbiAgZGlldGFyeVJlc3RyaWN0aW9ucz86IHN0cmluZ1tdO1xuICBwcmVmZXJlbmNlcz86IHtcbiAgICBjb29raW5nVGltZT86IG51bWJlcjtcbiAgICBkaWZmaWN1bHR5TGV2ZWw/OiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBMb2dpblJlcXVlc3Qge1xuICBlbWFpbDogc3RyaW5nO1xuICBwYXNzd29yZDogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgUmVnaXN0ZXJSZXF1ZXN0IHtcbiAgZW1haWw6IHN0cmluZztcbiAgcGFzc3dvcmQ6IHN0cmluZztcbiAgdXNlcm5hbWU6IHN0cmluZztcbiAgZGlldGFyeVJlc3RyaWN0aW9ucz86IHN0cmluZ1tdO1xuICBwcmVmZXJlbmNlcz86IHtcbiAgICBjb29raW5nVGltZT86IG51bWJlcjtcbiAgICBkaWZmaWN1bHR5TGV2ZWw/OiBzdHJpbmc7XG4gIH07XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsUE9TVCxQVVQsREVMRVRFLE9QVElPTlMnLFxuICB9O1xuXG4gIHRyeSB7XG4gICAgY29uc3QgeyBodHRwTWV0aG9kLCBwYXRoIH0gPSBldmVudDtcbiAgICBjb25zdCBib2R5ID0gZXZlbnQuYm9keSA/IEpTT04ucGFyc2UoZXZlbnQuYm9keSkgOiB7fTtcblxuICAgIGlmIChodHRwTWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgICAgaGVhZGVycyxcbiAgICAgICAgYm9keTogJycsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgYXV0aCBvcGVyYXRpb25zIGJhc2VkIG9uIHRoZSByZXF1ZXN0IGJvZHkgb3IgcXVlcnkgcGFyYW1zXG4gICAgaWYgKHBhdGggPT09ICcvYXV0aCcgJiYgaHR0cE1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICBjb25zdCB7IG9wZXJhdGlvbiB9ID0gYm9keTtcbiAgICAgIFxuICAgICAgaWYgKG9wZXJhdGlvbiA9PT0gJ2xvZ2luJykge1xuICAgICAgICByZXR1cm4gYXdhaXQgbG9naW5Vc2VyKGJvZHkgYXMgTG9naW5SZXF1ZXN0KTtcbiAgICAgIH0gZWxzZSBpZiAob3BlcmF0aW9uID09PSAncmVnaXN0ZXInKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCByZWdpc3RlclVzZXIoYm9keSBhcyBSZWdpc3RlclJlcXVlc3QpO1xuICAgICAgfSBlbHNlIGlmIChvcGVyYXRpb24gPT09ICd2ZXJpZnknKSB7XG4gICAgICAgIHJldHVybiBhd2FpdCB2ZXJpZnlUb2tlbihldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGVmYXVsdCB0byByZWdpc3RlciBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgICAgICByZXR1cm4gYXdhaXQgcmVnaXN0ZXJVc2VyKGJvZHkgYXMgUmVnaXN0ZXJSZXF1ZXN0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocGF0aCA9PT0gJy9hdXRoJyAmJiBodHRwTWV0aG9kID09PSAnR0VUJykge1xuICAgICAgcmV0dXJuIGF3YWl0IGdldFVzZXJQcm9maWxlKGV2ZW50LmhlYWRlcnMuQXV0aG9yaXphdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKHBhdGggPT09ICcvYXV0aCcgJiYgaHR0cE1ldGhvZCA9PT0gJ1BVVCcpIHtcbiAgICAgIHJldHVybiBhd2FpdCB1cGRhdGVVc2VyUHJvZmlsZShldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24sIGJvZHkpO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBkaXJlY3QgcGF0aCByb3V0aW5nIGZvciBuZXcgZW5kcG9pbnRzXG4gICAgaWYgKHBhdGggPT09ICcvYXV0aC9sb2dpbicgJiYgaHR0cE1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICByZXR1cm4gYXdhaXQgbG9naW5Vc2VyKGJvZHkgYXMgTG9naW5SZXF1ZXN0KTtcbiAgICB9XG5cbiAgICBpZiAocGF0aCA9PT0gJy9hdXRoL3JlZ2lzdGVyJyAmJiBodHRwTWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgIHJldHVybiBhd2FpdCByZWdpc3RlclVzZXIoYm9keSBhcyBSZWdpc3RlclJlcXVlc3QpO1xuICAgIH1cblxuICAgIGlmIChwYXRoID09PSAnL2F1dGgvcHJvZmlsZScgJiYgaHR0cE1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgIHJldHVybiBhd2FpdCBnZXRVc2VyUHJvZmlsZShldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24pO1xuICAgIH1cblxuICAgIGlmIChwYXRoID09PSAnL2F1dGgvcHJvZmlsZScgJiYgaHR0cE1ldGhvZCA9PT0gJ1BVVCcpIHtcbiAgICAgIHJldHVybiBhd2FpdCB1cGRhdGVVc2VyUHJvZmlsZShldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24sIGJvZHkpO1xuICAgIH1cblxuICAgIGlmIChwYXRoID09PSAnL2F1dGgvdmVyaWZ5JyAmJiBodHRwTWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgIHJldHVybiBhd2FpdCB2ZXJpZnlUb2tlbihldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA0MDQsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ05vdCBmb3VuZCcgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdBdXRoIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0pLFxuICAgIH07XG4gIH1cbn07XG5cbmFzeW5jIGZ1bmN0aW9uIGxvZ2luVXNlcihsb2dpbkRhdGE6IExvZ2luUmVxdWVzdCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICB9O1xuXG4gIHRyeSB7XG4gICAgY29uc3QgeyBlbWFpbCwgcGFzc3dvcmQgfSA9IGxvZ2luRGF0YTtcblxuICAgIGlmICghZW1haWwgfHwgIXBhc3N3b3JkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdFbWFpbCBhbmQgcGFzc3dvcmQgYXJlIHJlcXVpcmVkJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRmluZCB1c2VyIGJ5IGVtYWlsICh1c2luZyBzY2FuIGZvciBub3cgc2luY2UgR1NJIG1pZ2h0IG5vdCBiZSByZWFkeSlcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5VU0VSU19UQUJMRSxcbiAgICAgIEZpbHRlckV4cHJlc3Npb246ICdlbWFpbCA9IDplbWFpbCcsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6ZW1haWwnOiBlbWFpbC50b0xvd2VyQ2FzZSgpLFxuICAgICAgfSxcbiAgICB9KSk7XG5cbiAgICBpZiAoIXJlc3VsdC5JdGVtcyB8fCByZXN1bHQuSXRlbXMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIGNyZWRlbnRpYWxzJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgdXNlciA9IHJlc3VsdC5JdGVtc1swXSBhcyBVc2VyO1xuXG4gICAgLy8gVmVyaWZ5IHBhc3N3b3JkXG4gICAgY29uc3QgaXNWYWxpZFBhc3N3b3JkID0gYXdhaXQgYmNyeXB0LmNvbXBhcmUocGFzc3dvcmQsIHVzZXIucGFzc3dvcmRIYXNoKTtcbiAgICBpZiAoIWlzVmFsaWRQYXNzd29yZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxuICAgICAgICBoZWFkZXJzLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW52YWxpZCBjcmVkZW50aWFscycgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIEpXVCB0b2tlblxuICAgIGNvbnN0IHRva2VuID0gand0LnNpZ24oXG4gICAgICB7IFxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLCBcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXG4gICAgICAgIHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lIFxuICAgICAgfSxcbiAgICAgIEpXVF9TRUNSRVQsXG4gICAgICB7IGV4cGlyZXNJbjogSldUX0VYUElSRVNfSU4gfVxuICAgICk7XG5cbiAgICAvLyBSZW1vdmUgcGFzc3dvcmQgaGFzaCBmcm9tIHJlc3BvbnNlXG4gICAgY29uc3QgeyBwYXNzd29yZEhhc2gsIC4uLnVzZXJXaXRob3V0UGFzc3dvcmQgfSA9IHVzZXI7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgIHVzZXI6IHVzZXJXaXRob3V0UGFzc3dvcmQsXG4gICAgICAgIHRva2VuIFxuICAgICAgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdMb2dpbiBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTG9naW4gZmFpbGVkJyB9KSxcbiAgICB9O1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyVXNlcih1c2VyRGF0YTogUmVnaXN0ZXJSZXF1ZXN0KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcbiAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gIH07XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGVtYWlsLCBwYXNzd29yZCwgdXNlcm5hbWUsIGRpZXRhcnlSZXN0cmljdGlvbnMsIHByZWZlcmVuY2VzIH0gPSB1c2VyRGF0YTtcblxuICAgIGlmICghZW1haWwgfHwgIXBhc3N3b3JkIHx8ICF1c2VybmFtZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnRW1haWwsIHBhc3N3b3JkLCBhbmQgdXNlcm5hbWUgYXJlIHJlcXVpcmVkJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBhbHJlYWR5IGV4aXN0cyAodXNpbmcgc2NhbiBmb3Igbm93IHNpbmNlIEdTSSBtaWdodCBub3QgYmUgcmVhZHkpXG4gICAgY29uc3QgZXhpc3RpbmdVc2VyID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQobmV3IFNjYW5Db21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEUsXG4gICAgICBGaWx0ZXJFeHByZXNzaW9uOiAnZW1haWwgPSA6ZW1haWwnLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOmVtYWlsJzogZW1haWwudG9Mb3dlckNhc2UoKSxcbiAgICAgIH0sXG4gICAgfSkpO1xuXG4gICAgaWYgKGV4aXN0aW5nVXNlci5JdGVtcyAmJiBleGlzdGluZ1VzZXIuSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDA5LFxuICAgICAgICBoZWFkZXJzLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnVXNlciBhbHJlYWR5IGV4aXN0cyB3aXRoIHRoaXMgZW1haWwnIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBIYXNoIHBhc3N3b3JkXG4gICAgY29uc3QgcGFzc3dvcmRIYXNoID0gYXdhaXQgYmNyeXB0Lmhhc2gocGFzc3dvcmQsIDEwKTtcblxuICAgIGNvbnN0IHVzZXJJZCA9IGdlbmVyYXRlSWQoKTtcbiAgICBjb25zdCB1c2VyOiBVc2VyID0ge1xuICAgICAgdXNlcklkLFxuICAgICAgZW1haWw6IGVtYWlsLnRvTG93ZXJDYXNlKCksXG4gICAgICB1c2VybmFtZSxcbiAgICAgIHBhc3N3b3JkSGFzaCxcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgZGlldGFyeVJlc3RyaWN0aW9uczogZGlldGFyeVJlc3RyaWN0aW9ucyB8fCBbXSxcbiAgICAgIHByZWZlcmVuY2VzOiBwcmVmZXJlbmNlcyB8fCB7fSxcbiAgICB9O1xuXG4gICAgYXdhaXQgZG9jQ2xpZW50LnNlbmQobmV3IFB1dENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5VU0VSU19UQUJMRSxcbiAgICAgIEl0ZW06IHVzZXIsXG4gICAgfSkpO1xuXG4gICAgLy8gR2VuZXJhdGUgSldUIHRva2VuXG4gICAgY29uc3QgdG9rZW4gPSBqd3Quc2lnbihcbiAgICAgIHsgXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsIFxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcbiAgICAgICAgdXNlcm5hbWU6IHVzZXIudXNlcm5hbWUgXG4gICAgICB9LFxuICAgICAgSldUX1NFQ1JFVCxcbiAgICAgIHsgZXhwaXJlc0luOiBKV1RfRVhQSVJFU19JTiB9XG4gICAgKTtcblxuICAgIC8vIFB1Ymxpc2ggVXNlclJlZ2lzdGVyZWQgZXZlbnRcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXZlbnRQdWJsaXNoZXIucHVibGlzaFVzZXJSZWdpc3RlcmVkKHtcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXG4gICAgICAgIHVzZXJuYW1lOiB1c2VyLnVzZXJuYW1lLFxuICAgICAgICB0aW1lc3RhbXA6IHVzZXIuY3JlYXRlZEF0LFxuICAgICAgICBtZXRhZGF0YToge1xuICAgICAgICAgIHJlZ2lzdHJhdGlvblNvdXJjZTogJ3dlYicsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHVibGlzaGluZyBVc2VyUmVnaXN0ZXJlZCBldmVudDonLCBlcnJvcik7XG4gICAgICAvLyBEb24ndCBmYWlsIHJlZ2lzdHJhdGlvbiBpZiBldmVudCBwdWJsaXNoaW5nIGZhaWxzXG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHBhc3N3b3JkIGhhc2ggZnJvbSByZXNwb25zZVxuICAgIGNvbnN0IHsgcGFzc3dvcmRIYXNoOiBfLCAuLi51c2VyV2l0aG91dFBhc3N3b3JkIH0gPSB1c2VyO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMSxcbiAgICAgIGhlYWRlcnMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICB1c2VyOiB1c2VyV2l0aG91dFBhc3N3b3JkLFxuICAgICAgICB0b2tlbiBcbiAgICAgIH0pLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignUmVnaXN0cmF0aW9uIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdSZWdpc3RyYXRpb24gZmFpbGVkJyB9KSxcbiAgICB9O1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFVzZXJQcm9maWxlKGF1dGhvcml6YXRpb24/OiBzdHJpbmcpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xuICBjb25zdCBoZWFkZXJzID0ge1xuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgfTtcblxuICB0cnkge1xuICAgIGlmICghYXV0aG9yaXphdGlvbikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxuICAgICAgICBoZWFkZXJzLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnQXV0aG9yaXphdGlvbiByZXF1aXJlZCcgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHVzZXJJZCA9IGV4dHJhY3RVc2VySWRGcm9tVG9rZW4oYXV0aG9yaXphdGlvbik7XG4gICAgaWYgKCF1c2VySWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcbiAgICAgICAgaGVhZGVycyxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgdG9rZW4nIH0pLFxuICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5VU0VSU19UQUJMRSxcbiAgICAgIEtleTogeyB1c2VySWQgfSxcbiAgICB9KSk7XG5cbiAgICBpZiAoIXJlc3VsdC5JdGVtKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdVc2VyIG5vdCBmb3VuZCcgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFJlbW92ZSBwYXNzd29yZCBoYXNoIGZyb20gcmVzcG9uc2VcbiAgICBjb25zdCB7IHBhc3N3b3JkSGFzaCwgLi4udXNlcldpdGhvdXRQYXNzd29yZCB9ID0gcmVzdWx0Lkl0ZW0gYXMgVXNlcjtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyB1c2VyOiB1c2VyV2l0aG91dFBhc3N3b3JkIH0pLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignR2V0IHByb2ZpbGUgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ZhaWxlZCB0byBnZXQgdXNlciBwcm9maWxlJyB9KSxcbiAgICB9O1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZVVzZXJQcm9maWxlKGF1dGhvcml6YXRpb246IHN0cmluZyB8IHVuZGVmaW5lZCwgdXNlckRhdGE6IGFueSk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICB9O1xuXG4gIHRyeSB7XG4gICAgaWYgKCFhdXRob3JpemF0aW9uKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdBdXRob3JpemF0aW9uIHJlcXVpcmVkJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgdXNlcklkID0gZXh0cmFjdFVzZXJJZEZyb21Ub2tlbihhdXRob3JpemF0aW9uKTtcbiAgICBcbiAgICAvLyBHZXQgZXhpc3RpbmcgdXNlclxuICAgIGNvbnN0IGV4aXN0aW5nVXNlciA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKG5ldyBHZXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEUsXG4gICAgICBLZXk6IHsgdXNlcklkIH0sXG4gICAgfSkpO1xuXG4gICAgaWYgKCFleGlzdGluZ1VzZXIuSXRlbSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxuICAgICAgICBoZWFkZXJzLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnVXNlciBub3QgZm91bmQnIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgdXNlciBkYXRhXG4gICAgY29uc3QgdXBkYXRlZFVzZXIgPSB7XG4gICAgICAuLi5leGlzdGluZ1VzZXIuSXRlbSxcbiAgICAgIC4uLnVzZXJEYXRhLFxuICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgfTtcblxuICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEUsXG4gICAgICBJdGVtOiB1cGRhdGVkVXNlcixcbiAgICB9KSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgdXNlcjogdXBkYXRlZFVzZXIgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdVcGRhdGUgcHJvZmlsZSBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnMsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnRmFpbGVkIHRvIHVwZGF0ZSB1c2VyIHByb2ZpbGUnIH0pLFxuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVJZCgpOiBzdHJpbmcge1xuICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDkpO1xufVxuXG5mdW5jdGlvbiBleHRyYWN0VXNlcklkRnJvbVRva2VuKGF1dGhvcml6YXRpb246IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICB0cnkge1xuICAgIGNvbnN0IHRva2VuID0gYXV0aG9yaXphdGlvbi5yZXBsYWNlKCdCZWFyZXIgJywgJycpO1xuICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBKV1RfU0VDUkVUKSBhcyBhbnk7XG4gICAgcmV0dXJuIGRlY29kZWQudXNlcklkO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1Rva2VuIHZlcmlmaWNhdGlvbiBlcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gdmVyaWZ5VG9rZW4oYXV0aG9yaXphdGlvbj86IHN0cmluZyk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XG4gIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICB9O1xuXG4gIHRyeSB7XG4gICAgaWYgKCFhdXRob3JpemF0aW9uKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXG4gICAgICAgIGhlYWRlcnMsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdBdXRob3JpemF0aW9uIHJlcXVpcmVkJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgdXNlcklkID0gZXh0cmFjdFVzZXJJZEZyb21Ub2tlbihhdXRob3JpemF0aW9uKTtcbiAgICBpZiAoIXVzZXJJZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxuICAgICAgICBoZWFkZXJzLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW52YWxpZCB0b2tlbicgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyB2YWxpZDogdHJ1ZSwgdXNlcklkIH0pLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignVG9rZW4gdmVyaWZpY2F0aW9uIGVycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNDAxLFxuICAgICAgaGVhZGVycyxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIHRva2VuJyB9KSxcbiAgICB9O1xuICB9XG59XG4iXX0=