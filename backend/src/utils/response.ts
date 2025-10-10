import { APIGatewayProxyResult } from 'aws-lambda';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body),
  };
}
