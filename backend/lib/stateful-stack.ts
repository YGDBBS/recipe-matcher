import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class StatefulStack extends cdk.Stack {
  // Export table references so they can be imported by other stacks
  public readonly usersTable: dynamodb.Table;
  public readonly connectionsTable: dynamodb.Table;
  
  // New single-table design for recipes (primary)
  public readonly recipesTable: dynamodb.Table;

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

    // Note: We'll use the existing recipe-matcher-recipes table as legacy
    // No need to create a new legacy table

    // WebSocket Connections Table
    this.connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      tableName: 'recipe-matcher-websocket-connections',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Primary Recipes Table (Single-Table Design)
    this.recipesTable = new dynamodb.Table(this, 'RecipesTable', {
      tableName: 'recipe-matcher-recipes-v2',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GSI1: Find recipes by author
    this.recipesTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI2: Find recipes by tag
    this.recipesTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI3: Find recipes by ingredient
    this.recipesTable.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
    });

    // Outputs for cross-stack references
    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'Users Table Name',
      exportName: 'UsersTableName',
    });

    new cdk.CfnOutput(this, 'RecipesTableName', {
      value: this.recipesTable.tableName,
      description: 'Recipes Table Name (Single-Table Design)',
      exportName: 'RecipesTableName',
    });

    new cdk.CfnOutput(this, 'RecipesTableLegacyName', {
      value: 'recipe-matcher-recipes', // Existing table name
      description: 'Legacy Recipes Table Name (existing table)',
      exportName: 'RecipesTableLegacyName',
    });

    new cdk.CfnOutput(this, 'ConnectionsTableName', {
      value: this.connectionsTable.tableName,
      description: 'WebSocket Connections Table Name',
      exportName: 'ConnectionsTableName',
    });
  }
}
