import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const secretsManager = new SecretsManagerClient({});
let cachedJwtSecret: string | null = null;


export const getJwtSecret = async (): Promise<string> => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: 'recipe-matcher-jwt-secret',
    });

    const response = await secretsManager.send(command);
    cachedJwtSecret = response.SecretString ?? '';

    if (!cachedJwtSecret) {
      throw new Error('JWT secret is empty');
    }

    return cachedJwtSecret;
  } catch (error) {
    console.error('Error retrieving JWT secret from Secrets Manager:', error);
    throw new Error('Failed to retrieve JWT secret');
  }
};