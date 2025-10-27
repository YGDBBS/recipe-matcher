import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
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

    // S3 Bucket for React frontend hosting
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `recipe-matcher-frontend-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA routing
      publicReadAccess: false, // CloudFront will handle access
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution for React frontend (temporarily disabled due to AWS account verification)
    // const frontendDistribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
    //   defaultBehavior: {
    //     origin: new origins.S3StaticWebsiteOrigin(frontendBucket),
    //     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //     cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    //   },
    //   errorResponses: [
    //     {
    //       httpStatus: 404,
    //       responseHttpStatus: 200,
    //       responsePagePath: '/index.html',
    //     },
    //     {
    //       httpStatus: 403,
    //       responseHttpStatus: 200,
    //       responsePagePath: '/index.html',
    //     },
    //   ],
    // });

    // Reference DynamoDB tables from stateful stack
    const usersTable = statefulStack.usersTable;
    const recipesTable = statefulStack.recipesTable;

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
        RECIPES_TABLE_LEGACY: 'recipe-matcher-recipes', // Existing table
        CONNECTIONS_TABLE: connectionsTable.tableName,
        RECIPE_IMAGES_BUCKET: recipeImagesBucket.bucketName,
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        EVENT_BUS_NAME: eventBus.eventBusName,
        NOTIFICATIONS_TOPIC_ARN: notificationsTopic.topicArn,
        EVENT_PROCESSING_QUEUE_URL: eventProcessingQueue.queueUrl,
      },
    };

    // Auth Lambda
    const authLambda = new NodejsFunction(this, 'AuthLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-auth',
      entry: 'src/lambda/auth.ts',
      handler: 'handler',
    });

    // Authorizer Lambda
    const authorizerLambda = new NodejsFunction(this, 'AuthorizerLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-authorizer',
      entry: 'src/lambda/authorizer.ts',
      handler: 'handler',
    });

    // Recipes Lambda
    const recipesLambda = new NodejsFunction(this, 'RecipesLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-recipes',
      entry: 'src/lambda/recipes.ts',
      handler: 'handler',
    });

    // Ingredients Lambda
    const ingredientsLambda = new NodejsFunction(this, 'IngredientsLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-ingredients',
      entry: 'src/lambda/ingredients.ts',
      handler: 'handler',
    });

    // Matching Lambda
    const matchingLambda = new NodejsFunction(this, 'MatchingLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-matching',
      entry: 'src/lambda/matching.ts',
      handler: 'handler',
    });

    // Matching v2 Lambda (Enhanced fuzzy matching)
    const matchingV2Lambda = new NodejsFunction(this, 'MatchingV2Lambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-matching-v2',
      entry: 'src/lambda/matching-v2.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(2), // Longer timeout for complex matching
    });

    // Event Handler Lambda Functions
    const eventHandlerLambda = new NodejsFunction(this, 'EventHandlerLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-event-handler',
      entry: 'src/lambda/event-handler.ts',
      handler: 'handler',
      timeout: cdk.Duration.minutes(5),
    });

    const notificationHandlerLambda = new NodejsFunction(this, 'NotificationHandlerLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-notification-handler',
      entry: 'src/lambda/notification-handler.ts',
      handler: 'handler',
    });

    // WebSocket Lambda Functions
    const connectLambda = new NodejsFunction(this, 'WebSocketConnectLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-websocket-connect',
      entry: 'src/lambda/websocket-connect.ts',
      handler: 'handler',
      environment: {
        ...commonLambdaProps.environment,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const disconnectLambda = new NodejsFunction(this, 'WebSocketDisconnectLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-websocket-disconnect',
      entry: 'src/lambda/websocket-disconnect.ts',
      handler: 'handler',
      environment: {
        ...commonLambdaProps.environment,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const defaultLambda = new NodejsFunction(this, 'WebSocketDefaultLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-websocket-default',
      entry: 'src/lambda/websocket-default.ts',
      handler: 'handler',
      environment: {
        ...commonLambdaProps.environment,
        CONNECTIONS_TABLE: connectionsTable.tableName,
      },
    });

    const websocketEventHandlerLambda = new NodejsFunction(this, 'WebSocketEventHandlerLambda', {
      ...commonLambdaProps,
      functionName: 'recipe-matcher-websocket-event-handler',
      entry: 'src/lambda/websocket-event-handler.ts',
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
    usersTable.grantReadWriteData(ingredientsLambda); // Grant access to users table for user ingredients
    recipesTable.grantReadWriteData(recipesLambda);
    recipesTable.grantReadWriteData(matchingV2Lambda); // Grant access to recipes table for fuzzy matching
    recipeImagesBucket.grantReadWrite(recipesLambda);

    // Grant EventBridge permissions
    eventBus.grantPutEventsTo(authLambda);
    eventBus.grantPutEventsTo(recipesLambda);
    eventBus.grantPutEventsTo(ingredientsLambda);
    eventBus.grantPutEventsTo(matchingLambda);
    eventBus.grantPutEventsTo(matchingV2Lambda);

    // Grant SNS permissions for notifications
    notificationsTopic.grantPublish(notificationHandlerLambda);
    notificationsTopic.grantPublish(eventHandlerLambda);

    // Grant Secrets Manager permissions for JWT secret
    authLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['arn:aws:secretsmanager:eu-west-1:*:secret:recipe-matcher-jwt-secret*']
    }));
    
    authorizerLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['arn:aws:secretsmanager:eu-west-1:*:secret:recipe-matcher-jwt-secret*']
    }));
    
    matchingV2Lambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: ['arn:aws:secretsmanager:eu-west-1:*:secret:recipe-matcher-jwt-secret*']
    }));

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
    });

    // Authorizer
    const authorizer = new apigateway.RequestAuthorizer(this, 'Authorizer', {
      handler: authorizerLambda,
      identitySources: [apigateway.IdentitySource.header('Authorization')],
      resultsCacheTtl: cdk.Duration.minutes(5),
    });

    // Auth endpoints
    const authResource = api.root.addResource('auth');
    authResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    authResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    
    const loginResource = authResource.addResource('login');
    loginResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    loginResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    
    const registerResource = authResource.addResource('register');
    registerResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    registerResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    
    const verifyResource = authResource.addResource('verify');
    verifyResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    verifyResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda));
    
    const profileResource = authResource.addResource('profile');
    profileResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'PUT', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    profileResource.addMethod('GET', new apigateway.LambdaIntegration(authLambda), { authorizer });
    profileResource.addMethod('PUT', new apigateway.LambdaIntegration(authLambda), { authorizer });

    // Recipes endpoints
    const recipesResource = api.root.addResource('recipes');
    recipesResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    recipesResource.addMethod('GET', new apigateway.LambdaIntegration(recipesLambda), { authorizer });
    recipesResource.addMethod('POST', new apigateway.LambdaIntegration(recipesLambda), { authorizer });
    
    const recipeResource = recipesResource.addResource('{id}');
    recipeResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    recipeResource.addMethod('GET', new apigateway.LambdaIntegration(recipesLambda), { authorizer });
    recipeResource.addMethod('PUT', new apigateway.LambdaIntegration(recipesLambda), { authorizer });
    recipeResource.addMethod('DELETE', new apigateway.LambdaIntegration(recipesLambda), { authorizer });

    // Ingredients endpoints
    const ingredientsResource = api.root.addResource('ingredients');
    ingredientsResource.addMethod('GET', new apigateway.LambdaIntegration(ingredientsLambda));
    ingredientsResource.addMethod('POST', new apigateway.LambdaIntegration(ingredientsLambda));

    const userIngredientsResource = api.root.addResource('user-ingredients');
    userIngredientsResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    userIngredientsResource.addMethod('GET', new apigateway.LambdaIntegration(ingredientsLambda), { authorizer });
    userIngredientsResource.addMethod('POST', new apigateway.LambdaIntegration(ingredientsLambda), { authorizer });
    userIngredientsResource.addMethod('DELETE', new apigateway.LambdaIntegration(ingredientsLambda), { authorizer });

    // Matching endpoints
    const matchingResource = api.root.addResource('matching');
    matchingResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    matchingResource.addMethod('POST', new apigateway.LambdaIntegration(matchingLambda), { authorizer });

    // Matching v2 endpoints (Enhanced fuzzy matching)
    const matchingV2Resource = api.root.addResource('matching-v2');
    const findRecipesResource = matchingV2Resource.addResource('find-recipes');
    findRecipesResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    findRecipesResource.addMethod('POST', new apigateway.LambdaIntegration(matchingV2Lambda), { authorizer });
    
    const calculateMatchResource = matchingV2Resource.addResource('calculate-match');
    calculateMatchResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    calculateMatchResource.addMethod('POST', new apigateway.LambdaIntegration(matchingV2Lambda), { authorizer });
    
    const ingredientAnalysisResource = matchingV2Resource.addResource('ingredient-analysis');
    ingredientAnalysisResource.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    });
    ingredientAnalysisResource.addMethod('POST', new apigateway.LambdaIntegration(matchingV2Lambda), { authorizer });

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

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 Bucket for React frontend',
    });

    // CloudFront outputs temporarily disabled
    // new cdk.CfnOutput(this, 'FrontendDistributionId', {
    //   value: frontendDistribution.distributionId,
    //   description: 'CloudFront Distribution ID for React frontend',
    // });

    // new cdk.CfnOutput(this, 'FrontendUrl', {
    //   value: `https://${frontendDistribution.distributionDomainName}`,
    //   description: 'Frontend URL',
    // });

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
