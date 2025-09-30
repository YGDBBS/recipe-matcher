// Common utility functions used across multiple Lambda functions

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function extractUserIdFromToken(authorization: string): string | null {
  if (!authorization) return null;
  
  const token = authorization.replace('Bearer ', '');
  // TODO: Implement proper JWT token validation and extraction
  // For now, return the token as-is (this is a placeholder)
  return token;
}

export function getCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

export function createErrorResponse(statusCode: number, message: string) {
  return {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify({ error: message }),
  };
}

export function createSuccessResponse(data: any, statusCode: number = 200) {
  return {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(data),
  };
}
