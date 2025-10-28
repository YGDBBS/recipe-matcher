// Common utility functions used across multiple Lambda functions

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function getCorsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };
}

// Error handling with plain objects - simpler and cleaner

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

// Convert unknown errors to a safe API Gateway response
export function errorResponseFromError(err: unknown) {
  // Check if it's a plain object with statusCode and message
  if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
    const errorObj = err as { statusCode: number; message: string };
    return createErrorResponse(errorObj.statusCode, errorObj.message);
  }
  
  console.error('Unhandled error:', err);
  return createErrorResponse(500, 'Internal server error');
}
