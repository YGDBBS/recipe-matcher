# Recipe Matcher Backend

A serverless backend for the Recipe Matcher application built with AWS CDK, Lambda, DynamoDB, and API Gateway.

## Architecture

- **API Gateway**: RESTful API endpoints
- **Lambda Functions**: Serverless compute for business logic
- **DynamoDB**: NoSQL database for users, recipes, ingredients, and matches
- **Cognito**: User authentication and authorization
- **S3**: Storage for recipe images

## Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate permissions
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

3. Bootstrap CDK (first time only):
```bash
npx cdk bootstrap
```

4. Deploy the stack:
```bash
npm run deploy
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### Recipes
- `GET /recipes` - Get all recipes (with optional filters)
- `POST /recipes` - Create a new recipe
- `GET /recipes/{id}` - Get a specific recipe
- `PUT /recipes/{id}` - Update a recipe
- `DELETE /recipes/{id}` - Delete a recipe

### Ingredients
- `GET /ingredients` - Get all ingredients (with optional search/category filters)
- `POST /ingredients` - Create a new ingredient
- `GET /user-ingredients` - Get user's ingredients
- `POST /user-ingredients` - Add ingredient to user's pantry
- `DELETE /user-ingredients` - Remove ingredient from user's pantry

### Matching
- `POST /matching/find-recipes` - Find recipes matching user's ingredients
- `POST /matching/calculate-match` - Calculate match percentage for specific ingredients

## Environment Variables

The Lambda functions automatically receive these environment variables:
- `USERS_TABLE` - DynamoDB table for users
- `RECIPES_TABLE` - DynamoDB table for recipes
- `INGREDIENTS_TABLE` - DynamoDB table for ingredients
- `USER_INGREDIENTS_TABLE` - DynamoDB table for user ingredients
- `MATCHES_TABLE` - DynamoDB table for recipe matches
- `RECIPE_IMAGES_BUCKET` - S3 bucket for recipe images
- `USER_POOL_ID` - Cognito User Pool ID
- `USER_POOL_CLIENT_ID` - Cognito User Pool Client ID

## Database Schema

### Users Table
- `userId` (String) - Primary key
- `email` (String)
- `username` (String)
- `dietaryRestrictions` (String Array)
- `preferences` (Object)
- `createdAt` (String)

### Recipes Table
- `recipeId` (String) - Primary key
- `createdAt` (String) - Sort key
- `userId` (String)
- `title` (String)
- `description` (String)
- `ingredients` (Array of Objects)
- `instructions` (String Array)
- `cookingTime` (Number)
- `difficultyLevel` (String)
- `servings` (Number)
- `dietaryTags` (String Array)
- `imageUrl` (String)
- `rating` (Number)
- `reviewCount` (Number)

### Global Secondary Indexes
- `ingredients-index`: Search recipes by ingredient
- `user-recipes-index`: Get user's recipes

### Ingredients Table
- `ingredientId` (String) - Primary key
- `name` (String)
- `category` (String)
- `commonUnits` (String Array)

### User Ingredients Table
- `userId` (String) - Primary key
- `ingredientId` (String) - Sort key
- `name` (String)
- `quantity` (Number)
- `unit` (String)
- `expiryDate` (String)

### Matches Table
- `userId` (String) - Primary key
- `recipeId` (String) - Sort key
- `matchPercentage` (Number)
- `createdAt` (String)

## Development

- `npm run build` - Compile TypeScript
- `npm run watch` - Watch for changes and recompile
- `npm run synth` - Synthesize CloudFormation template
- `npm run diff` - Show differences between deployed and current stack
- `npm run deploy` - Deploy the stack
- `npm run destroy` - Destroy the stack

## Cleanup

To remove all resources:
```bash
npm run destroy
```

## Cost Optimization

- All DynamoDB tables use on-demand billing
- Lambda functions have appropriate memory and timeout settings
- S3 bucket has lifecycle policies for cost optimization
- Resources are tagged for cost tracking
