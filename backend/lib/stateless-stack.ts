import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as websocket from 'aws-cdk-lib/aws-apigatewayv2';
import * as websocketIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { StatefulStack } from './stateful-stack';

export class StatelessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps & { statefulStack: StatefulStack }) {
    super(scope, id, props);
    
    const { statefulStack } = props;

    // S3 Bucket for recipe images
    const recipeImagesBucket = new s3.Bucket(this, 'RecipeImagesBucket', {
      bucketName: `recipe-matcher-images-${this.account}-${this.region}`,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Reference DynamoDB tables from stateful stack
    const usersTable = statefulStack.usersTable;
    const recipesTable = statefulStack.recipesTable;
    const ingredientsTable = statefulStack.ingredientsTable;
    const userIngredientsTable = statefulStack.userIngredientsTable;
    const matchesTable = statefulStack.matchesTable;

    // EventBridge for event-driven architecture
    const eventBus = new events.EventBus(this, 'RecipeMatcherEventBus', {
      eventBusName: 'recipe-matcher-events',
    });

    // SNS Topic for notifications
    const notificationsTopic = new sns.Topic(this, 'NotificationsTopic', {
      topicName: 'recipe-matcher-notifications',
      displayName: 'Recipe Matcher Notifications',
    });

    // SQS Dead Letter Queue for failed events
    const deadLetterQueue = new sqs.Queue(this, 'EventDeadLetterQueue', {
      queueName: 'recipe-matcher-events-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // SQS Queue for event processing
    const eventProcessingQueue = new sqs.Queue(this, 'EventProcessingQueue', {
      queueName: 'recipe-matcher-events-processing',
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
      visibilityTimeout: cdk.Duration.minutes(5),
    });

    // Reference WebSocket connections table from stateful stack
    const connectionsTable = statefulStack.connectionsTable;

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'RecipeMatcherUserPool', {
      userPoolName: 'recipe-matcher-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'RecipeMatcherUserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    // Lambda Functions
    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      environment: {
        USERS_TABLE: usersTable.tableName,
        RECIPES_TABLE: recipesTable.tableName,
        INGREDIENTS_TABLE: ingredientsTable.tableName,
        USER_INGREDIENTS_TABLE: userIngredientsTable.tableName,
        MATCHES_TABLE: matchesTable.tableName,
        CONNECTIONS_TABLE: connectionsTable.tableName,
        RECIPE_IMAGES_BUCKET: recipeImagesBucket.bucketName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        JWT_SECRET: 'your-super-secret-jwt-key-change-in-production-recipe-matcher-2024',
        EVENT_BUS_NAME: eventBus.eventBusName,
        NOTIFICATIONS_TOPIC_ARN: notificationsTopic.topicArn,
        EVENT_PROCESSING_QUEUE_URL: eventProcessingQueue.queueUrl,
      },
    };

    // Auth Lambda
    const authLambda = new NodejsFunction(this, 'AuthLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-auth',
      entry: 'src/lambda-functions/auth.ts',
      handler: 'handler',
    });

    // Recipes Lambda
    const recipesLambda = new NodejsFunction(this, 'RecipesLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-recipes',
      entry: 'src/lambda-functions/recipes.ts',
      handler: 'handler',
    });

    // Ingredients Lambda
    const ingredientsLambda = new NodejsFunction(this, 'IngredientsLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-ingredients',
      entry: 'src/lambda-functions/ingredients.ts',
      handler: 'handler',
    });

    // Matching Lambda
    const matchingLambda = new NodejsFunction(this, 'MatchingLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-matching',
      entry: 'src/lambda-functions/matching.ts',
      handler: 'handler',
    });

    // Event Handler Lambda Functions
    const eventHandlerLambda = new NodejsFunction(this, 'EventHandlerLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-event-handler',
      entry: 'src/lambda-functions/event-handler.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(5),
    });

    const notificationHandlerLambda = new NodejsFunction(this, 'NotificationHandlerLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-notification-handler',
      entry: 'src/lambda-functions/notification-handler.ts',
      handler: 'handler',
    });

    // WebSocket Lambda Functions
    const connectLambda = new NodejsFunction(this, 'WebSocketConnectLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-websocket-connect',
      entry: 'src/lambda-functions/websocket-connect.ts',
      handler: 'handler',
      environment: {
        ...commonLambdaProps.environment,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const disconnectLambda = new NodejsFunction(this, 'WebSocketDisconnectLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-websocket-disconnect',
      entry: 'src/lambda-functions/websocket-disconnect.ts',
      handler: 'handler',
      environment: {
        ...commonLambdaProps.environment,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const defaultLambda = new NodejsFunction(this, 'WebSocketDefaultLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-websocket-default',
      entry: 'src/lambda-functions/websocket-default.ts',
      handler: 'handler',
      environment: {
        ...commonLambdaProps.environment,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const websocketEventHandlerLambda = new NodejsFunction(this, 'WebSocketEventHandlerLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-websocket-event-handler',
      entry: 'src/lambda-functions/websocket-event-handler.ts',
      handler: 'handler',
      environment: {
        ...commonLambdaProps.environment,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    // WebSocket API Gateway
    const webSocketApi = new websocket.WebSocketApi(this, 'RecipeMatcherWebSocketApi', {
      apiName: 'recipe-matcher-websocket',
      description: 'WebSocket API for real-time events',
      connectRouteOptions: {
        integration: new websocketIntegrations.WebSocketLambdaIntegration('ConnectIntegration', connectLambda),
      },
      disconnectRouteOptions: {
        integration: new websocketIntegrations.WebSocketLambdaIntegration('DisconnectIntegration', disconnectLambda),
      },
      defaultRouteOptions: {
        integration: new websocketIntegrations.WebSocketLambdaIntegration('DefaultIntegration', defaultLambda),
      },
    });

    const webSocketStage = new websocket.WebSocketStage(this, 'RecipeMatcherWebSocketStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // Update WebSocket event handler with the actual API endpoint
    websocketEventHandlerLambda.addEnvironment('WEBSOCKET_API_ENDPOINT', webSocketStage.url);

    // Grant permissions to Lambda functions
    usersTable.grantReadWriteData(authLambda);
    recipesTable.grantReadWriteData(recipesLambda);
    ingredientsTable.grantReadWriteData(ingredientsLambda);
    userIngredientsTable.grantReadWriteData(ingredientsLambda);
    matchesTable.grantReadWriteData(matchingLambda);
    recipeImagesBucket.grantReadWrite(recipesLambda);

    // Grant EventBridge permissions
    eventBus.grantPutEventsTo(authLambda);
    eventBus.grantPutEventsTo(recipesLambda);
    eventBus.grantPutEventsTo(ingredientsLambda);
    eventBus.grantPutEventsTo(matchingLambda);

    // Grant SNS permissions for notifications
    notificationsTopic.grantPublish(notificationHandlerLambda);
    notificationsTopic.grantPublish(eventHandlerLambda);

    // Grant SQS permissions
    eventProcessingQueue.grantSendMessages(eventHandlerLambda);
    eventProcessingQueue.grantConsumeMessages(eventHandlerLambda);

    // Grant WebSocket permissions
    connectionsTable.grantReadWriteData(connectLambda);
    connectionsTable.grantReadWriteData(disconnectLambda);
    connectionsTable.grantReadWriteData(defaultLambda);
    connectionsTable.grantReadWriteData(websocketEventHandlerLambda);

    // Grant WebSocket API permissions
    webSocketApi.grantManageConnections(websocketEventHandlerLambda);

    // Event Rules - Route events to handlers
    const userEventsRule = new events.Rule(this, 'UserEventsRule', {
      eventBus,
      eventPattern: {
        source: ['recipe-matcher.user'],
        detailType: ['UserRegistered', 'UserProfileUpdated', 'UserIngredientsUpdated'],
      },
    });
    userEventsRule.addTarget(new targets.LambdaFunction(eventHandlerLambda));

    const recipeEventsRule = new events.Rule(this, 'RecipeEventsRule', {
      eventBus,
      eventPattern: {
        source: ['recipe-matcher.recipe'],
        detailType: ['RecipeCreated', 'RecipeUpdated', 'RecipeRated', 'RecipeShared'],
      },
    });
    recipeEventsRule.addTarget(new targets.LambdaFunction(eventHandlerLambda));

    const matchingEventsRule = new events.Rule(this, 'MatchingEventsRule', {
      eventBus,
      eventPattern: {
        source: ['recipe-matcher.matching'],
        detailType: ['RecipeMatched', 'MatchPercentageUpdated'],
      },
    });
    matchingEventsRule.addTarget(new targets.LambdaFunction(eventHandlerLambda));

    // Notification rule - send to SNS
    const notificationRule = new events.Rule(this, 'NotificationRule', {
      eventBus,
      eventPattern: {
        source: ['recipe-matcher'],
        detailType: ['RecipeMatched', 'RecipeShared', 'UserRegistered'],
      },
    });
    notificationRule.addTarget(new targets.SnsTopic(notificationsTopic));

    // WebSocket rule - send events to WebSocket handler
    const websocketRule = new events.Rule(this, 'WebSocketRule', {
      eventBus,
      eventPattern: {
        source: ['recipe-matcher'],
        detailType: ['RecipeMatched', 'RecipeShared', 'UserRegistered', 'UserIngredientsUpdated'],
      },
    });
    websocketRule.addTarget(new targets.LambdaFunction(websocketEventHandlerLambda));

    // API Gateway
    const api = new apigateway.RestApi(this, 'RecipeMatcherApi', {
      restApiName: 'Recipe Matcher API',
      description: 'API for Recipe Matcher application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Auth endpoints
    const authResource = api.root.addResource('auth');
    authResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    
    const loginResource = authResource.addResource('login');
    loginResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    
    const registerResource = authResource.addResource('register');
    registerResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    
    const verifyResource = authResource.addResource('verify');
    verifyResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    
    const profileResource = authResource.addResource('profile');
    profileResource.addMethod('GET', new apigateway.LambdaIntegration(authLambda));
    profileResource.addMethod('PUT', new apigateway.LambdaIntegration(authLambda));

    // Recipes endpoints
    const recipesResource = api.root.addResource('recipes');
    recipesResource.addMethod('GET', new apigateway.LambdaIntegration(recipesLambda));
    recipesResource.addMethod('POST', new apigateway.LambdaIntegration(recipesLambda));
    
    const recipeResource = recipesResource.addResource('{id}');
    recipeResource.addMethod('GET', new apigateway.LambdaIntegration(recipesLambda));
    recipeResource.addMethod('PUT', new apigateway.LambdaIntegration(recipesLambda));
    recipeResource.addMethod('DELETE', new apigateway.LambdaIntegration(recipesLambda));

    // Ingredients endpoints
    const ingredientsResource = api.root.addResource('ingredients');
    ingredientsResource.addMethod('GET', new apigateway.LambdaIntegration(ingredientsLambda));
    ingredientsResource.addMethod('POST', new apigateway.LambdaIntegration(ingredientsLambda));

    const userIngredientsResource = api.root.addResource('user-ingredients');
    userIngredientsResource.addMethod('GET', new apigateway.LambdaIntegration(ingredientsLambda));
    userIngredientsResource.addMethod('POST', new apigateway.LambdaIntegration(ingredientsLambda));
    userIngredientsResource.addMethod('DELETE', new apigateway.LambdaIntegration(ingredientsLambda));

    // Matching endpoints
    const matchingResource = api.root.addResource('matching');
    matchingResource.addMethod('POST', new apigateway.LambdaIntegration(matchingLambda));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'RecipeImagesBucketName', {
      value: recipeImagesBucket.bucketName,
      description: 'S3 Bucket for recipe images',
    });

    new cdk.CfnOutput(this, 'EventBusName', {
      value: eventBus.eventBusName,
      description: 'EventBridge Event Bus Name',
    });

    new cdk.CfnOutput(this, 'NotificationsTopicArn', {
      value: notificationsTopic.topicArn,
      description: 'SNS Notifications Topic ARN',
    });

    new cdk.CfnOutput(this, 'WebSocketApiUrl', {
      value: webSocketStage.url,
      description: 'WebSocket API URL',
    });

    new cdk.CfnOutput(this, 'WebSocketApiId', {
      value: webSocketApi.apiId,
      description: 'WebSocket API ID',
    });
  }
}
