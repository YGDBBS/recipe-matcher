import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class StatefulStack extends cdk.Stack {
  // Export table references so they can be imported by other stacks
  public readonly usersTable: dynamodb.Table;
  public readonly recipesTable: dynamodb.Table;
  public readonly ingredientsTable: dynamodb.Table;
  public readonly userIngredientsTable: dynamodb.Table;
  public readonly matchesTable: dynamodb.Table;
  public readonly connectionsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Users Table
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'recipe-matcher-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for users by email
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    // Recipes Table
    this.recipesTable = new dynamodb.Table(this, 'RecipesTable', {
      tableName: 'recipe-matcher-recipes',
      partitionKey: { name: 'recipeId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI for searching recipes by ingredients
    this.recipesTable.addGlobalSecondaryIndex({
      indexName: 'ingredients-index',
      partitionKey: { name: 'ingredient', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'recipeId', type: dynamodb.AttributeType.STRING },
    });

    // Add GSI for user's recipes
    this.recipesTable.addGlobalSecondaryIndex({
      indexName: 'user-recipes-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Ingredients Table
    this.ingredientsTable = new dynamodb.Table(this, 'IngredientsTable', {
      tableName: 'recipe-matcher-ingredients',
      partitionKey: { name: 'ingredientId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // User Ingredients Table
    this.userIngredientsTable = new dynamodb.Table(this, 'UserIngredientsTable', {
      tableName: 'recipe-matcher-user-ingredients',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'ingredientId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Matches Table
    this.matchesTable = new dynamodb.Table(this, 'MatchesTable', {
      tableName: 'recipe-matcher-matches',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'recipeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // WebSocket Connections Table
    this.connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: 'recipe-matcher-websocket-connections',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Outputs for cross-stack references
    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'Users Table Name',
      exportName: 'UsersTableName',
    });

    new cdk.CfnOutput(this, 'RecipesTableName', {
      value: this.recipesTable.tableName,
      description: 'Recipes Table Name',
      exportName: 'RecipesTableName',
    });

    new cdk.CfnOutput(this, 'IngredientsTableName', {
      value: this.ingredientsTable.tableName,
      description: 'Ingredients Table Name',
      exportName: 'IngredientsTableName',
    });

    new cdk.CfnOutput(this, 'UserIngredientsTableName', {
      value: this.userIngredientsTable.tableName,
      description: 'User Ingredients Table Name',
      exportName: 'UserIngredientsTableName',
    });

    new cdk.CfnOutput(this, 'MatchesTableName', {
      value: this.matchesTable.tableName,
      description: 'Matches Table Name',
      exportName: 'MatchesTableName',
    });

    new cdk.CfnOutput(this, 'ConnectionsTableName', {
      value: this.connectionsTable.tableName,
      description: 'WebSocket Connections Table Name',
      exportName: 'ConnectionsTableName',
    });
  }
}
