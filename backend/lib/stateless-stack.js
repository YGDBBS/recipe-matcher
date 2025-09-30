"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatelessStack = void 0;
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const cognito = require("aws-cdk-lib/aws-cognito");
const s3 = require("aws-cdk-lib/aws-s3");
const events = require("aws-cdk-lib/aws-events");
const targets = require("aws-cdk-lib/aws-events-targets");
const sns = require("aws-cdk-lib/aws-sns");
const sqs = require("aws-cdk-lib/aws-sqs");
const websocket = require("aws-cdk-lib/aws-apigatewayv2");
const websocketIntegrations = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
class StatelessStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        const authLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'AuthLambda', {
            ...commonLambdaProps,
            functionName: 'recipe-matcher-auth',
            entry: 'src/lambda-functions/auth.ts',
            handler: 'handler',
        });
        // Recipes Lambda
        const recipesLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'RecipesLambda', {
            ...commonLambdaProps,
            functionName: 'recipe-matcher-recipes',
            entry: 'src/lambda-functions/recipes.ts',
            handler: 'handler',
        });
        // Ingredients Lambda
        const ingredientsLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'IngredientsLambda', {
            ...commonLambdaProps,
            functionName: 'recipe-matcher-ingredients',
            entry: 'src/lambda-functions/ingredients.ts',
            handler: 'handler',
        });
        // Matching Lambda
        const matchingLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'MatchingLambda', {
            ...commonLambdaProps,
            functionName: 'recipe-matcher-matching',
            entry: 'src/lambda-functions/matching.ts',
            handler: 'handler',
        });
        // Event Handler Lambda Functions
        const eventHandlerLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'EventHandlerLambda', {
            ...commonLambdaProps,
            functionName: 'recipe-matcher-event-handler',
            entry: 'src/lambda-functions/event-handler.ts',
            handler: 'handler',
            timeout: cdk.Duration.minutes(5),
        });
        const notificationHandlerLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'NotificationHandlerLambda', {
            ...commonLambdaProps,
            functionName: 'recipe-matcher-notification-handler',
            entry: 'src/lambda-functions/notification-handler.ts',
            handler: 'handler',
        });
        // WebSocket Lambda Functions
        const connectLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'WebSocketConnectLambda', {
            ...commonLambdaProps,
            functionName: 'recipe-matcher-websocket-connect',
            entry: 'src/lambda-functions/websocket-connect.ts',
            handler: 'handler',
            environment: {
                ...commonLambdaProps.environment,
                CONNECTIONS_TABLE: connectionsTable.tableName,
            },
        });
        const disconnectLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'WebSocketDisconnectLambda', {
            ...commonLambdaProps,
            functionName: 'recipe-matcher-websocket-disconnect',
            entry: 'src/lambda-functions/websocket-disconnect.ts',
            handler: 'handler',
            environment: {
                ...commonLambdaProps.environment,
                CONNECTIONS_TABLE: connectionsTable.tableName,
            },
        });
        const defaultLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'WebSocketDefaultLambda', {
            ...commonLambdaProps,
            functionName: 'recipe-matcher-websocket-default',
            entry: 'src/lambda-functions/websocket-default.ts',
            handler: 'handler',
            environment: {
                ...commonLambdaProps.environment,
                CONNECTIONS_TABLE: connectionsTable.tableName,
            },
        });
        const websocketEventHandlerLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'WebSocketEventHandlerLambda', {
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
exports.StatelessStack = StatelessStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGVsZXNzLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3RhdGVsZXNzLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxpREFBaUQ7QUFDakQseURBQXlEO0FBQ3pELG1EQUFtRDtBQUNuRCx5Q0FBeUM7QUFDekMsaURBQWlEO0FBQ2pELDBEQUEwRDtBQUMxRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDBEQUEwRDtBQUMxRCxtRkFBbUY7QUFFbkYscUVBQStEO0FBRy9ELE1BQWEsY0FBZSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0Q7UUFDaEcsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLGFBQWEsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUVoQyw4QkFBOEI7UUFDOUIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ25FLFVBQVUsRUFBRSx5QkFBeUIsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2xFLFNBQVMsRUFBRSxJQUFJO1lBQ2YsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1NBQ3hCLENBQUMsQ0FBQztRQUVILGdEQUFnRDtRQUNoRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsVUFBVSxDQUFDO1FBQzVDLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxZQUFZLENBQUM7UUFDaEQsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUM7UUFDeEQsTUFBTSxvQkFBb0IsR0FBRyxhQUFhLENBQUMsb0JBQW9CLENBQUM7UUFDaEUsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLFlB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LENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdEMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxZQUFZO1lBQzVCLFdBQVcsRUFBRSw0QkFBNEI7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvQyxLQUFLLEVBQUUsa0JBQWtCLENBQUMsUUFBUTtZQUNsQyxXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDekMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxHQUFHO1lBQ3pCLFdBQVcsRUFBRSxtQkFBbUI7U0FDakMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUs7WUFDekIsV0FBVyxFQUFFLGtCQUFrQjtTQUNoQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF6WUQsd0NBeVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgc25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMnO1xuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xuaW1wb3J0ICogYXMgd2Vic29ja2V0IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xuaW1wb3J0ICogYXMgd2Vic29ja2V0SW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5pbXBvcnQgeyBTdGF0ZWZ1bFN0YWNrIH0gZnJvbSAnLi9zdGF0ZWZ1bC1zdGFjayc7XG5cbmV4cG9ydCBjbGFzcyBTdGF0ZWxlc3NTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBjZGsuU3RhY2tQcm9wcyAmIHsgc3RhdGVmdWxTdGFjazogU3RhdGVmdWxTdGFjayB9KSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgXG4gICAgY29uc3QgeyBzdGF0ZWZ1bFN0YWNrIH0gPSBwcm9wcztcblxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgcmVjaXBlIGltYWdlc1xuICAgIGNvbnN0IHJlY2lwZUltYWdlc0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1JlY2lwZUltYWdlc0J1Y2tldCcsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGByZWNpcGUtbWF0Y2hlci1pbWFnZXMtJHt0aGlzLmFjY291bnR9LSR7dGhpcy5yZWdpb259YCxcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIFJlZmVyZW5jZSBEeW5hbW9EQiB0YWJsZXMgZnJvbSBzdGF0ZWZ1bCBzdGFja1xuICAgIGNvbnN0IHVzZXJzVGFibGUgPSBzdGF0ZWZ1bFN0YWNrLnVzZXJzVGFibGU7XG4gICAgY29uc3QgcmVjaXBlc1RhYmxlID0gc3RhdGVmdWxTdGFjay5yZWNpcGVzVGFibGU7XG4gICAgY29uc3QgaW5ncmVkaWVudHNUYWJsZSA9IHN0YXRlZnVsU3RhY2suaW5ncmVkaWVudHNUYWJsZTtcbiAgICBjb25zdCB1c2VySW5ncmVkaWVudHNUYWJsZSA9IHN0YXRlZnVsU3RhY2sudXNlckluZ3JlZGllbnRzVGFibGU7XG4gICAgY29uc3QgbWF0Y2hlc1RhYmxlID0gc3RhdGVmdWxTdGFjay5tYXRjaGVzVGFibGU7XG5cbiAgICAvLyBFdmVudEJyaWRnZSBmb3IgZXZlbnQtZHJpdmVuIGFyY2hpdGVjdHVyZVxuICAgIGNvbnN0IGV2ZW50QnVzID0gbmV3IGV2ZW50cy5FdmVudEJ1cyh0aGlzLCAnUmVjaXBlTWF0Y2hlckV2ZW50QnVzJywge1xuICAgICAgZXZlbnRCdXNOYW1lOiAncmVjaXBlLW1hdGNoZXItZXZlbnRzJyxcbiAgICB9KTtcblxuICAgIC8vIFNOUyBUb3BpYyBmb3Igbm90aWZpY2F0aW9uc1xuICAgIGNvbnN0IG5vdGlmaWNhdGlvbnNUb3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ05vdGlmaWNhdGlvbnNUb3BpYycsIHtcbiAgICAgIHRvcGljTmFtZTogJ3JlY2lwZS1tYXRjaGVyLW5vdGlmaWNhdGlvbnMnLFxuICAgICAgZGlzcGxheU5hbWU6ICdSZWNpcGUgTWF0Y2hlciBOb3RpZmljYXRpb25zJyxcbiAgICB9KTtcblxuICAgIC8vIFNRUyBEZWFkIExldHRlciBRdWV1ZSBmb3IgZmFpbGVkIGV2ZW50c1xuICAgIGNvbnN0IGRlYWRMZXR0ZXJRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0V2ZW50RGVhZExldHRlclF1ZXVlJywge1xuICAgICAgcXVldWVOYW1lOiAncmVjaXBlLW1hdGNoZXItZXZlbnRzLWRscScsXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcbiAgICB9KTtcblxuICAgIC8vIFNRUyBRdWV1ZSBmb3IgZXZlbnQgcHJvY2Vzc2luZ1xuICAgIGNvbnN0IGV2ZW50UHJvY2Vzc2luZ1F1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnRXZlbnRQcm9jZXNzaW5nUXVldWUnLCB7XG4gICAgICBxdWV1ZU5hbWU6ICdyZWNpcGUtbWF0Y2hlci1ldmVudHMtcHJvY2Vzc2luZycsXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgcXVldWU6IGRlYWRMZXR0ZXJRdWV1ZSxcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLFxuICAgICAgfSxcbiAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcblxuICAgIC8vIFJlZmVyZW5jZSBXZWJTb2NrZXQgY29ubmVjdGlvbnMgdGFibGUgZnJvbSBzdGF0ZWZ1bCBzdGFja1xuICAgIGNvbnN0IGNvbm5lY3Rpb25zVGFibGUgPSBzdGF0ZWZ1bFN0YWNrLmNvbm5lY3Rpb25zVGFibGU7XG5cbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbFxuICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1JlY2lwZU1hdGNoZXJVc2VyUG9vbCcsIHtcbiAgICAgIHVzZXJQb29sTmFtZTogJ3JlY2lwZS1tYXRjaGVyLXVzZXJzJyxcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxuICAgICAgc2lnbkluQWxpYXNlczoge1xuICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgICAgdXNlcm5hbWU6IHRydWUsXG4gICAgICB9LFxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBwYXNzd29yZFBvbGljeToge1xuICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IG5ldyBjb2duaXRvLlVzZXJQb29sQ2xpZW50KHRoaXMsICdSZWNpcGVNYXRjaGVyVXNlclBvb2xDbGllbnQnLCB7XG4gICAgICB1c2VyUG9vbCxcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgIHVzZXJTcnA6IHRydWUsXG4gICAgICB9LFxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGNvbW1vbkxhbWJkYVByb3BzID0ge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFJFQ0lQRVNfVEFCTEU6IHJlY2lwZXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIElOR1JFRElFTlRTX1RBQkxFOiBpbmdyZWRpZW50c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgVVNFUl9JTkdSRURJRU5UU19UQUJMRTogdXNlckluZ3JlZGllbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBNQVRDSEVTX1RBQkxFOiBtYXRjaGVzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBDT05ORUNUSU9OU19UQUJMRTogY29ubmVjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFJFQ0lQRV9JTUFHRVNfQlVDS0VUOiByZWNpcGVJbWFnZXNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICBKV1RfU0VDUkVUOiAneW91ci1zdXBlci1zZWNyZXQtand0LWtleS1jaGFuZ2UtaW4tcHJvZHVjdGlvbi1yZWNpcGUtbWF0Y2hlci0yMDI0JyxcbiAgICAgICAgRVZFTlRfQlVTX05BTUU6IGV2ZW50QnVzLmV2ZW50QnVzTmFtZSxcbiAgICAgICAgTk9USUZJQ0FUSU9OU19UT1BJQ19BUk46IG5vdGlmaWNhdGlvbnNUb3BpYy50b3BpY0FybixcbiAgICAgICAgRVZFTlRfUFJPQ0VTU0lOR19RVUVVRV9VUkw6IGV2ZW50UHJvY2Vzc2luZ1F1ZXVlLnF1ZXVlVXJsLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gQXV0aCBMYW1iZGFcbiAgICBjb25zdCBhdXRoTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdBdXRoTGFtYmRhJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6ICdyZWNpcGUtbWF0Y2hlci1hdXRoJyxcbiAgICAgIGVudHJ5OiAnc3JjL2xhbWJkYS1mdW5jdGlvbnMvYXV0aC50cycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgfSk7XG5cbiAgICAvLyBSZWNpcGVzIExhbWJkYVxuICAgIGNvbnN0IHJlY2lwZXNMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1JlY2lwZXNMYW1iZGEnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3JlY2lwZS1tYXRjaGVyLXJlY2lwZXMnLFxuICAgICAgZW50cnk6ICdzcmMvbGFtYmRhLWZ1bmN0aW9ucy9yZWNpcGVzLnRzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICB9KTtcblxuICAgIC8vIEluZ3JlZGllbnRzIExhbWJkYVxuICAgIGNvbnN0IGluZ3JlZGllbnRzTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdJbmdyZWRpZW50c0xhbWJkYScsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiAncmVjaXBlLW1hdGNoZXItaW5ncmVkaWVudHMnLFxuICAgICAgZW50cnk6ICdzcmMvbGFtYmRhLWZ1bmN0aW9ucy9pbmdyZWRpZW50cy50cycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgfSk7XG5cbiAgICAvLyBNYXRjaGluZyBMYW1iZGFcbiAgICBjb25zdCBtYXRjaGluZ0xhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnTWF0Y2hpbmdMYW1iZGEnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3JlY2lwZS1tYXRjaGVyLW1hdGNoaW5nJyxcbiAgICAgIGVudHJ5OiAnc3JjL2xhbWJkYS1mdW5jdGlvbnMvbWF0Y2hpbmcudHMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgIH0pO1xuXG4gICAgLy8gRXZlbnQgSGFuZGxlciBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgZXZlbnRIYW5kbGVyTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdFdmVudEhhbmRsZXJMYW1iZGEnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3JlY2lwZS1tYXRjaGVyLWV2ZW50LWhhbmRsZXInLFxuICAgICAgZW50cnk6ICdzcmMvbGFtYmRhLWZ1bmN0aW9ucy9ldmVudC1oYW5kbGVyLnRzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uSGFuZGxlckxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnTm90aWZpY2F0aW9uSGFuZGxlckxhbWJkYScsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiAncmVjaXBlLW1hdGNoZXItbm90aWZpY2F0aW9uLWhhbmRsZXInLFxuICAgICAgZW50cnk6ICdzcmMvbGFtYmRhLWZ1bmN0aW9ucy9ub3RpZmljYXRpb24taGFuZGxlci50cycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgfSk7XG5cbiAgICAvLyBXZWJTb2NrZXQgTGFtYmRhIEZ1bmN0aW9uc1xuICAgIGNvbnN0IGNvbm5lY3RMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1dlYlNvY2tldENvbm5lY3RMYW1iZGEnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3JlY2lwZS1tYXRjaGVyLXdlYnNvY2tldC1jb25uZWN0JyxcbiAgICAgIGVudHJ5OiAnc3JjL2xhbWJkYS1mdW5jdGlvbnMvd2Vic29ja2V0LWNvbm5lY3QudHMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMuZW52aXJvbm1lbnQsXG4gICAgICAgIENPTk5FQ1RJT05TX1RBQkxFOiBjb25uZWN0aW9uc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBkaXNjb25uZWN0TGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdXZWJTb2NrZXREaXNjb25uZWN0TGFtYmRhJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6ICdyZWNpcGUtbWF0Y2hlci13ZWJzb2NrZXQtZGlzY29ubmVjdCcsXG4gICAgICBlbnRyeTogJ3NyYy9sYW1iZGEtZnVuY3Rpb25zL3dlYnNvY2tldC1kaXNjb25uZWN0LnRzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBDT05ORUNUSU9OU19UQUJMRTogY29ubmVjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmYXVsdExhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnV2ViU29ja2V0RGVmYXVsdExhbWJkYScsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiAncmVjaXBlLW1hdGNoZXItd2Vic29ja2V0LWRlZmF1bHQnLFxuICAgICAgZW50cnk6ICdzcmMvbGFtYmRhLWZ1bmN0aW9ucy93ZWJzb2NrZXQtZGVmYXVsdC50cycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAuLi5jb21tb25MYW1iZGFQcm9wcy5lbnZpcm9ubWVudCxcbiAgICAgICAgQ09OTkVDVElPTlNfVEFCTEU6IGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHdlYnNvY2tldEV2ZW50SGFuZGxlckxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnV2ViU29ja2V0RXZlbnRIYW5kbGVyTGFtYmRhJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6ICdyZWNpcGUtbWF0Y2hlci13ZWJzb2NrZXQtZXZlbnQtaGFuZGxlcicsXG4gICAgICBlbnRyeTogJ3NyYy9sYW1iZGEtZnVuY3Rpb25zL3dlYnNvY2tldC1ldmVudC1oYW5kbGVyLnRzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLmVudmlyb25tZW50LFxuICAgICAgICBDT05ORUNUSU9OU19UQUJMRTogY29ubmVjdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gV2ViU29ja2V0IEFQSSBHYXRld2F5XG4gICAgY29uc3Qgd2ViU29ja2V0QXBpID0gbmV3IHdlYnNvY2tldC5XZWJTb2NrZXRBcGkodGhpcywgJ1JlY2lwZU1hdGNoZXJXZWJTb2NrZXRBcGknLCB7XG4gICAgICBhcGlOYW1lOiAncmVjaXBlLW1hdGNoZXItd2Vic29ja2V0JyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2ViU29ja2V0IEFQSSBmb3IgcmVhbC10aW1lIGV2ZW50cycsXG4gICAgICBjb25uZWN0Um91dGVPcHRpb25zOiB7XG4gICAgICAgIGludGVncmF0aW9uOiBuZXcgd2Vic29ja2V0SW50ZWdyYXRpb25zLldlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdDb25uZWN0SW50ZWdyYXRpb24nLCBjb25uZWN0TGFtYmRhKSxcbiAgICAgIH0sXG4gICAgICBkaXNjb25uZWN0Um91dGVPcHRpb25zOiB7XG4gICAgICAgIGludGVncmF0aW9uOiBuZXcgd2Vic29ja2V0SW50ZWdyYXRpb25zLldlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdEaXNjb25uZWN0SW50ZWdyYXRpb24nLCBkaXNjb25uZWN0TGFtYmRhKSxcbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Um91dGVPcHRpb25zOiB7XG4gICAgICAgIGludGVncmF0aW9uOiBuZXcgd2Vic29ja2V0SW50ZWdyYXRpb25zLldlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdEZWZhdWx0SW50ZWdyYXRpb24nLCBkZWZhdWx0TGFtYmRhKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB3ZWJTb2NrZXRTdGFnZSA9IG5ldyB3ZWJzb2NrZXQuV2ViU29ja2V0U3RhZ2UodGhpcywgJ1JlY2lwZU1hdGNoZXJXZWJTb2NrZXRTdGFnZScsIHtcbiAgICAgIHdlYlNvY2tldEFwaSxcbiAgICAgIHN0YWdlTmFtZTogJ3Byb2QnLFxuICAgICAgYXV0b0RlcGxveTogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIFVwZGF0ZSBXZWJTb2NrZXQgZXZlbnQgaGFuZGxlciB3aXRoIHRoZSBhY3R1YWwgQVBJIGVuZHBvaW50XG4gICAgd2Vic29ja2V0RXZlbnRIYW5kbGVyTGFtYmRhLmFkZEVudmlyb25tZW50KCdXRUJTT0NLRVRfQVBJX0VORFBPSU5UJywgd2ViU29ja2V0U3RhZ2UudXJsKTtcblxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIExhbWJkYSBmdW5jdGlvbnNcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhdXRoTGFtYmRhKTtcbiAgICByZWNpcGVzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHJlY2lwZXNMYW1iZGEpO1xuICAgIGluZ3JlZGllbnRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGluZ3JlZGllbnRzTGFtYmRhKTtcbiAgICB1c2VySW5ncmVkaWVudHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoaW5ncmVkaWVudHNMYW1iZGEpO1xuICAgIG1hdGNoZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobWF0Y2hpbmdMYW1iZGEpO1xuICAgIHJlY2lwZUltYWdlc0J1Y2tldC5ncmFudFJlYWRXcml0ZShyZWNpcGVzTGFtYmRhKTtcblxuICAgIC8vIEdyYW50IEV2ZW50QnJpZGdlIHBlcm1pc3Npb25zXG4gICAgZXZlbnRCdXMuZ3JhbnRQdXRFdmVudHNUbyhhdXRoTGFtYmRhKTtcbiAgICBldmVudEJ1cy5ncmFudFB1dEV2ZW50c1RvKHJlY2lwZXNMYW1iZGEpO1xuICAgIGV2ZW50QnVzLmdyYW50UHV0RXZlbnRzVG8oaW5ncmVkaWVudHNMYW1iZGEpO1xuICAgIGV2ZW50QnVzLmdyYW50UHV0RXZlbnRzVG8obWF0Y2hpbmdMYW1iZGEpO1xuXG4gICAgLy8gR3JhbnQgU05TIHBlcm1pc3Npb25zIGZvciBub3RpZmljYXRpb25zXG4gICAgbm90aWZpY2F0aW9uc1RvcGljLmdyYW50UHVibGlzaChub3RpZmljYXRpb25IYW5kbGVyTGFtYmRhKTtcbiAgICBub3RpZmljYXRpb25zVG9waWMuZ3JhbnRQdWJsaXNoKGV2ZW50SGFuZGxlckxhbWJkYSk7XG5cbiAgICAvLyBHcmFudCBTUVMgcGVybWlzc2lvbnNcbiAgICBldmVudFByb2Nlc3NpbmdRdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyhldmVudEhhbmRsZXJMYW1iZGEpO1xuICAgIGV2ZW50UHJvY2Vzc2luZ1F1ZXVlLmdyYW50Q29uc3VtZU1lc3NhZ2VzKGV2ZW50SGFuZGxlckxhbWJkYSk7XG5cbiAgICAvLyBHcmFudCBXZWJTb2NrZXQgcGVybWlzc2lvbnNcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjb25uZWN0TGFtYmRhKTtcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShkaXNjb25uZWN0TGFtYmRhKTtcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShkZWZhdWx0TGFtYmRhKTtcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh3ZWJzb2NrZXRFdmVudEhhbmRsZXJMYW1iZGEpO1xuXG4gICAgLy8gR3JhbnQgV2ViU29ja2V0IEFQSSBwZXJtaXNzaW9uc1xuICAgIHdlYlNvY2tldEFwaS5ncmFudE1hbmFnZUNvbm5lY3Rpb25zKHdlYnNvY2tldEV2ZW50SGFuZGxlckxhbWJkYSk7XG5cbiAgICAvLyBFdmVudCBSdWxlcyAtIFJvdXRlIGV2ZW50cyB0byBoYW5kbGVyc1xuICAgIGNvbnN0IHVzZXJFdmVudHNSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdVc2VyRXZlbnRzUnVsZScsIHtcbiAgICAgIGV2ZW50QnVzLFxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgIHNvdXJjZTogWydyZWNpcGUtbWF0Y2hlci51c2VyJ10sXG4gICAgICAgIGRldGFpbFR5cGU6IFsnVXNlclJlZ2lzdGVyZWQnLCAnVXNlclByb2ZpbGVVcGRhdGVkJywgJ1VzZXJJbmdyZWRpZW50c1VwZGF0ZWQnXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdXNlckV2ZW50c1J1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKGV2ZW50SGFuZGxlckxhbWJkYSkpO1xuXG4gICAgY29uc3QgcmVjaXBlRXZlbnRzUnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnUmVjaXBlRXZlbnRzUnVsZScsIHtcbiAgICAgIGV2ZW50QnVzLFxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgIHNvdXJjZTogWydyZWNpcGUtbWF0Y2hlci5yZWNpcGUnXSxcbiAgICAgICAgZGV0YWlsVHlwZTogWydSZWNpcGVDcmVhdGVkJywgJ1JlY2lwZVVwZGF0ZWQnLCAnUmVjaXBlUmF0ZWQnLCAnUmVjaXBlU2hhcmVkJ10sXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHJlY2lwZUV2ZW50c1J1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKGV2ZW50SGFuZGxlckxhbWJkYSkpO1xuXG4gICAgY29uc3QgbWF0Y2hpbmdFdmVudHNSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdNYXRjaGluZ0V2ZW50c1J1bGUnLCB7XG4gICAgICBldmVudEJ1cyxcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFsncmVjaXBlLW1hdGNoZXIubWF0Y2hpbmcnXSxcbiAgICAgICAgZGV0YWlsVHlwZTogWydSZWNpcGVNYXRjaGVkJywgJ01hdGNoUGVyY2VudGFnZVVwZGF0ZWQnXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgbWF0Y2hpbmdFdmVudHNSdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5MYW1iZGFGdW5jdGlvbihldmVudEhhbmRsZXJMYW1iZGEpKTtcblxuICAgIC8vIE5vdGlmaWNhdGlvbiBydWxlIC0gc2VuZCB0byBTTlNcbiAgICBjb25zdCBub3RpZmljYXRpb25SdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdOb3RpZmljYXRpb25SdWxlJywge1xuICAgICAgZXZlbnRCdXMsXG4gICAgICBldmVudFBhdHRlcm46IHtcbiAgICAgICAgc291cmNlOiBbJ3JlY2lwZS1tYXRjaGVyJ10sXG4gICAgICAgIGRldGFpbFR5cGU6IFsnUmVjaXBlTWF0Y2hlZCcsICdSZWNpcGVTaGFyZWQnLCAnVXNlclJlZ2lzdGVyZWQnXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgbm90aWZpY2F0aW9uUnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuU25zVG9waWMobm90aWZpY2F0aW9uc1RvcGljKSk7XG5cbiAgICAvLyBXZWJTb2NrZXQgcnVsZSAtIHNlbmQgZXZlbnRzIHRvIFdlYlNvY2tldCBoYW5kbGVyXG4gICAgY29uc3Qgd2Vic29ja2V0UnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnV2ViU29ja2V0UnVsZScsIHtcbiAgICAgIGV2ZW50QnVzLFxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgIHNvdXJjZTogWydyZWNpcGUtbWF0Y2hlciddLFxuICAgICAgICBkZXRhaWxUeXBlOiBbJ1JlY2lwZU1hdGNoZWQnLCAnUmVjaXBlU2hhcmVkJywgJ1VzZXJSZWdpc3RlcmVkJywgJ1VzZXJJbmdyZWRpZW50c1VwZGF0ZWQnXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgd2Vic29ja2V0UnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24od2Vic29ja2V0RXZlbnRIYW5kbGVyTGFtYmRhKSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1JlY2lwZU1hdGNoZXJBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ1JlY2lwZSBNYXRjaGVyIEFQSScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBmb3IgUmVjaXBlIE1hdGNoZXIgYXBwbGljYXRpb24nLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJ10sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQXV0aCBlbmRwb2ludHNcbiAgICBjb25zdCBhdXRoUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpO1xuICAgIGF1dGhSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoTGFtYmRhKSk7XG4gICAgXG4gICAgY29uc3QgbG9naW5SZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnbG9naW4nKTtcbiAgICBsb2dpblJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhMYW1iZGEpKTtcbiAgICBcbiAgICBjb25zdCByZWdpc3RlclJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdyZWdpc3RlcicpO1xuICAgIHJlZ2lzdGVyUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExhbWJkYSkpO1xuICAgIFxuICAgIGNvbnN0IHZlcmlmeVJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCd2ZXJpZnknKTtcbiAgICB2ZXJpZnlSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoTGFtYmRhKSk7XG4gICAgXG4gICAgY29uc3QgcHJvZmlsZVJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdwcm9maWxlJyk7XG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExhbWJkYSkpO1xuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhMYW1iZGEpKTtcblxuICAgIC8vIFJlY2lwZXMgZW5kcG9pbnRzXG4gICAgY29uc3QgcmVjaXBlc1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3JlY2lwZXMnKTtcbiAgICByZWNpcGVzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyZWNpcGVzTGFtYmRhKSk7XG4gICAgcmVjaXBlc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJlY2lwZXNMYW1iZGEpKTtcbiAgICBcbiAgICBjb25zdCByZWNpcGVSZXNvdXJjZSA9IHJlY2lwZXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2lkfScpO1xuICAgIHJlY2lwZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmVjaXBlc0xhbWJkYSkpO1xuICAgIHJlY2lwZVJlc291cmNlLmFkZE1ldGhvZCgnUFVUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmVjaXBlc0xhbWJkYSkpO1xuICAgIHJlY2lwZVJlc291cmNlLmFkZE1ldGhvZCgnREVMRVRFJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmVjaXBlc0xhbWJkYSkpO1xuXG4gICAgLy8gSW5ncmVkaWVudHMgZW5kcG9pbnRzXG4gICAgY29uc3QgaW5ncmVkaWVudHNSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdpbmdyZWRpZW50cycpO1xuICAgIGluZ3JlZGllbnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihpbmdyZWRpZW50c0xhbWJkYSkpO1xuICAgIGluZ3JlZGllbnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oaW5ncmVkaWVudHNMYW1iZGEpKTtcblxuICAgIGNvbnN0IHVzZXJJbmdyZWRpZW50c1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3VzZXItaW5ncmVkaWVudHMnKTtcbiAgICB1c2VySW5ncmVkaWVudHNSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGluZ3JlZGllbnRzTGFtYmRhKSk7XG4gICAgdXNlckluZ3JlZGllbnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oaW5ncmVkaWVudHNMYW1iZGEpKTtcbiAgICB1c2VySW5ncmVkaWVudHNSZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGluZ3JlZGllbnRzTGFtYmRhKSk7XG5cbiAgICAvLyBNYXRjaGluZyBlbmRwb2ludHNcbiAgICBjb25zdCBtYXRjaGluZ1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ21hdGNoaW5nJyk7XG4gICAgbWF0Y2hpbmdSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihtYXRjaGluZ0xhbWJkYSkpO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xuICAgICAgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xuICAgICAgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVjaXBlSW1hZ2VzQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiByZWNpcGVJbWFnZXNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQnVja2V0IGZvciByZWNpcGUgaW1hZ2VzJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFdmVudEJ1c05hbWUnLCB7XG4gICAgICB2YWx1ZTogZXZlbnRCdXMuZXZlbnRCdXNOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdFdmVudEJyaWRnZSBFdmVudCBCdXMgTmFtZScsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTm90aWZpY2F0aW9uc1RvcGljQXJuJywge1xuICAgICAgdmFsdWU6IG5vdGlmaWNhdGlvbnNUb3BpYy50b3BpY0FybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnU05TIE5vdGlmaWNhdGlvbnMgVG9waWMgQVJOJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJTb2NrZXRBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogd2ViU29ja2V0U3RhZ2UudXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdXZWJTb2NrZXQgQVBJIFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2ViU29ja2V0QXBpSWQnLCB7XG4gICAgICB2YWx1ZTogd2ViU29ja2V0QXBpLmFwaUlkLFxuICAgICAgZGVzY3JpcHRpb246ICdXZWJTb2NrZXQgQVBJIElEJyxcbiAgICB9KTtcbiAgfVxufVxuIl19