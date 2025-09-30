"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeMatcherStack = void 0;
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const cognito = require("aws-cdk-lib/aws-cognito");
const s3 = require("aws-cdk-lib/aws-s3");
const events = require("aws-cdk-lib/aws-events");
const targets = require("aws-cdk-lib/aws-events-targets");
const sns = require("aws-cdk-lib/aws-sns");
const sqs = require("aws-cdk-lib/aws-sqs");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
class RecipeMatcherStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3 Bucket for recipe images
        const recipeImagesBucket = new s3.Bucket(this, 'RecipeImagesBucket', {
            bucketName: `recipe-matcher-images-${this.account}-${this.region}`,
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        // DynamoDB Tables
        const usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: 'recipe-matcher-users',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const recipesTable = new dynamodb.Table(this, 'RecipesTable', {
            tableName: 'recipe-matcher-recipes',
            partitionKey: { name: 'recipeId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for searching recipes by ingredients
        recipesTable.addGlobalSecondaryIndex({
            indexName: 'ingredients-index',
            partitionKey: { name: 'ingredient', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'recipeId', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for user's recipes
        recipesTable.addGlobalSecondaryIndex({
            indexName: 'user-recipes-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for users by email
        usersTable.addGlobalSecondaryIndex({
            indexName: 'email-index',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
        });
        const ingredientsTable = new dynamodb.Table(this, 'IngredientsTable', {
            tableName: 'recipe-matcher-ingredients',
            partitionKey: { name: 'ingredientId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const userIngredientsTable = new dynamodb.Table(this, 'UserIngredientsTable', {
            tableName: 'recipe-matcher-user-ingredients',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'ingredientId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const matchesTable = new dynamodb.Table(this, 'MatchesTable', {
            tableName: 'recipe-matcher-matches',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'recipeId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
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
    }
}
exports.RecipeMatcherStack = RecipeMatcherStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjaXBlLW1hdGNoZXItc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWNpcGUtbWF0Y2hlci1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsaURBQWlEO0FBQ2pELHlEQUF5RDtBQUN6RCxxREFBcUQ7QUFDckQsbURBQW1EO0FBQ25ELHlDQUF5QztBQUV6QyxpREFBaUQ7QUFDakQsMERBQTBEO0FBQzFELDJDQUEyQztBQUMzQywyQ0FBMkM7QUFFM0MscUVBQStEO0FBRS9ELE1BQWEsa0JBQW1CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw4QkFBOEI7UUFDOUIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ25FLFVBQVUsRUFBRSx5QkFBeUIsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2xFLFNBQVMsRUFBRSxJQUFJO1lBQ2YsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1NBQ3hCLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLFVBQVUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUN4RCxTQUFTLEVBQUUsc0JBQXNCO1lBQ2pDLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMs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ICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cyc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuXG5leHBvcnQgY2xhc3MgUmVjaXBlTWF0Y2hlclN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gUzMgQnVja2V0IGZvciByZWNpcGUgaW1hZ2VzXG4gICAgY29uc3QgcmVjaXBlSW1hZ2VzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnUmVjaXBlSW1hZ2VzQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYHJlY2lwZS1tYXRjaGVyLWltYWdlcy0ke3RoaXMuYWNjb3VudH0tJHt0aGlzLnJlZ2lvbn1gLFxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gRHluYW1vREIgVGFibGVzXG4gICAgY29uc3QgdXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3JlY2lwZS1tYXRjaGVyLXVzZXJzJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcmVjaXBlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdSZWNpcGVzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6ICdyZWNpcGUtbWF0Y2hlci1yZWNpcGVzJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncmVjaXBlSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIEdTSSBmb3Igc2VhcmNoaW5nIHJlY2lwZXMgYnkgaW5ncmVkaWVudHNcbiAgICByZWNpcGVzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnaW5ncmVkaWVudHMtaW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdpbmdyZWRpZW50JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3JlY2lwZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXIncyByZWNpcGVzXG4gICAgcmVjaXBlc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ3VzZXItcmVjaXBlcy1pbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIEdTSSBmb3IgdXNlcnMgYnkgZW1haWxcbiAgICB1c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ2VtYWlsLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgaW5ncmVkaWVudHNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnSW5ncmVkaWVudHNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3JlY2lwZS1tYXRjaGVyLWluZ3JlZGllbnRzJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaW5ncmVkaWVudElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXNlckluZ3JlZGllbnRzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1VzZXJJbmdyZWRpZW50c1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAncmVjaXBlLW1hdGNoZXItdXNlci1pbmdyZWRpZW50cycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdpbmdyZWRpZW50SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICBjb25zdCBtYXRjaGVzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ01hdGNoZXNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ3JlY2lwZS1tYXRjaGVyLW1hdGNoZXMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAncmVjaXBlSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBFdmVudEJyaWRnZSBmb3IgZXZlbnQtZHJpdmVuIGFyY2hpdGVjdHVyZVxuICAgIGNvbnN0IGV2ZW50QnVzID0gbmV3IGV2ZW50cy5FdmVudEJ1cyh0aGlzLCAnUmVjaXBlTWF0Y2hlckV2ZW50QnVzJywge1xuICAgICAgZXZlbnRCdXNOYW1lOiAncmVjaXBlLW1hdGNoZXItZXZlbnRzJyxcbiAgICB9KTtcblxuICAgIC8vIFNOUyBUb3BpYyBmb3Igbm90aWZpY2F0aW9uc1xuICAgIGNvbnN0IG5vdGlmaWNhdGlvbnNUb3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ05vdGlmaWNhdGlvbnNUb3BpYycsIHtcbiAgICAgIHRvcGljTmFtZTogJ3JlY2lwZS1tYXRjaGVyLW5vdGlmaWNhdGlvbnMnLFxuICAgICAgZGlzcGxheU5hbWU6ICdSZWNpcGUgTWF0Y2hlciBOb3RpZmljYXRpb25zJyxcbiAgICB9KTtcblxuICAgIC8vIFNRUyBEZWFkIExldHRlciBRdWV1ZSBmb3IgZmFpbGVkIGV2ZW50c1xuICAgIGNvbnN0IGRlYWRMZXR0ZXJRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0V2ZW50RGVhZExldHRlclF1ZXVlJywge1xuICAgICAgcXVldWVOYW1lOiAncmVjaXBlLW1hdGNoZXItZXZlbnRzLWRscScsXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcbiAgICB9KTtcblxuICAgIC8vIFNRUyBRdWV1ZSBmb3IgZXZlbnQgcHJvY2Vzc2luZ1xuICAgIGNvbnN0IGV2ZW50UHJvY2Vzc2luZ1F1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnRXZlbnRQcm9jZXNzaW5nUXVldWUnLCB7XG4gICAgICBxdWV1ZU5hbWU6ICdyZWNpcGUtbWF0Y2hlci1ldmVudHMtcHJvY2Vzc2luZycsXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgcXVldWU6IGRlYWRMZXR0ZXJRdWV1ZSxcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLFxuICAgICAgfSxcbiAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICB9KTtcblxuICAgIC8vIENvZ25pdG8gVXNlciBQb29sXG4gICAgY29uc3QgdXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnUmVjaXBlTWF0Y2hlclVzZXJQb29sJywge1xuICAgICAgdXNlclBvb2xOYW1lOiAncmVjaXBlLW1hdGNoZXItdXNlcnMnLFxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XG4gICAgICAgIGVtYWlsOiB0cnVlLFxuICAgICAgICB1c2VybmFtZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBzdGFuZGFyZEF0dHJpYnV0ZXM6IHtcbiAgICAgICAgZW1haWw6IHtcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHBhc3N3b3JkUG9saWN5OiB7XG4gICAgICAgIG1pbkxlbmd0aDogOCxcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVVwcGVyY2FzZTogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJQb29sQ2xpZW50ID0gbmV3IGNvZ25pdG8uVXNlclBvb2xDbGllbnQodGhpcywgJ1JlY2lwZU1hdGNoZXJVc2VyUG9vbENsaWVudCcsIHtcbiAgICAgIHVzZXJQb29sLFxuICAgICAgYXV0aEZsb3dzOiB7XG4gICAgICAgIHVzZXJQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgY29tbW9uTGFtYmRhUHJvcHMgPSB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFVTRVJTX1RBQkxFOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgUkVDSVBFU19UQUJMRTogcmVjaXBlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgSU5HUkVESUVOVFNfVEFCTEU6IGluZ3JlZGllbnRzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBVU0VSX0lOR1JFRElFTlRTX1RBQkxFOiB1c2VySW5ncmVkaWVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIE1BVENIRVNfVEFCTEU6IG1hdGNoZXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIFJFQ0lQRV9JTUFHRVNfQlVDS0VUOiByZWNpcGVJbWFnZXNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgICBVU0VSX1BPT0xfQ0xJRU5UX0lEOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICBKV1RfU0VDUkVUOiAneW91ci1zdXBlci1zZWNyZXQtand0LWtleS1jaGFuZ2UtaW4tcHJvZHVjdGlvbi1yZWNpcGUtbWF0Y2hlci0yMDI0JyxcbiAgICAgICAgRVZFTlRfQlVTX05BTUU6IGV2ZW50QnVzLmV2ZW50QnVzTmFtZSxcbiAgICAgICAgTk9USUZJQ0FUSU9OU19UT1BJQ19BUk46IG5vdGlmaWNhdGlvbnNUb3BpYy50b3BpY0FybixcbiAgICAgICAgRVZFTlRfUFJPQ0VTU0lOR19RVUVVRV9VUkw6IGV2ZW50UHJvY2Vzc2luZ1F1ZXVlLnF1ZXVlVXJsLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgLy8gQXV0aCBMYW1iZGFcbiAgICBjb25zdCBhdXRoTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdBdXRoTGFtYmRhJywge1xuICAgICAgLi4uY29tbW9uTGFtYmRhUHJvcHMsXG4gICAgICBmdW5jdGlvbk5hbWU6ICdyZWNpcGUtbWF0Y2hlci1hdXRoJyxcbiAgICAgIGVudHJ5OiAnc3JjL2xhbWJkYS1mdW5jdGlvbnMvYXV0aC50cycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgfSk7XG5cbiAgICAvLyBSZWNpcGVzIExhbWJkYVxuICAgIGNvbnN0IHJlY2lwZXNMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1JlY2lwZXNMYW1iZGEnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3JlY2lwZS1tYXRjaGVyLXJlY2lwZXMnLFxuICAgICAgZW50cnk6ICdzcmMvbGFtYmRhLWZ1bmN0aW9ucy9yZWNpcGVzLnRzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICB9KTtcblxuICAgIC8vIEluZ3JlZGllbnRzIExhbWJkYVxuICAgIGNvbnN0IGluZ3JlZGllbnRzTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdJbmdyZWRpZW50c0xhbWJkYScsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiAncmVjaXBlLW1hdGNoZXItaW5ncmVkaWVudHMnLFxuICAgICAgZW50cnk6ICdzcmMvbGFtYmRhLWZ1bmN0aW9ucy9pbmdyZWRpZW50cy50cycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgfSk7XG5cbiAgICAvLyBNYXRjaGluZyBMYW1iZGFcbiAgICBjb25zdCBtYXRjaGluZ0xhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnTWF0Y2hpbmdMYW1iZGEnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3JlY2lwZS1tYXRjaGVyLW1hdGNoaW5nJyxcbiAgICAgIGVudHJ5OiAnc3JjL2xhbWJkYS1mdW5jdGlvbnMvbWF0Y2hpbmcudHMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgIH0pO1xuXG4gICAgLy8gRXZlbnQgSGFuZGxlciBMYW1iZGEgRnVuY3Rpb25zXG4gICAgY29uc3QgZXZlbnRIYW5kbGVyTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdFdmVudEhhbmRsZXJMYW1iZGEnLCB7XG4gICAgICAuLi5jb21tb25MYW1iZGFQcm9wcyxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3JlY2lwZS1tYXRjaGVyLWV2ZW50LWhhbmRsZXInLFxuICAgICAgZW50cnk6ICdzcmMvbGFtYmRhLWZ1bmN0aW9ucy9ldmVudC1oYW5kbGVyLnRzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uSGFuZGxlckxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnTm90aWZpY2F0aW9uSGFuZGxlckxhbWJkYScsIHtcbiAgICAgIC4uLmNvbW1vbkxhbWJkYVByb3BzLFxuICAgICAgZnVuY3Rpb25OYW1lOiAncmVjaXBlLW1hdGNoZXItbm90aWZpY2F0aW9uLWhhbmRsZXInLFxuICAgICAgZW50cnk6ICdzcmMvbGFtYmRhLWZ1bmN0aW9ucy9ub3RpZmljYXRpb24taGFuZGxlci50cycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBMYW1iZGEgZnVuY3Rpb25zXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYXV0aExhbWJkYSk7XG4gICAgcmVjaXBlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyZWNpcGVzTGFtYmRhKTtcbiAgICBpbmdyZWRpZW50c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShpbmdyZWRpZW50c0xhbWJkYSk7XG4gICAgdXNlckluZ3JlZGllbnRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGluZ3JlZGllbnRzTGFtYmRhKTtcbiAgICBtYXRjaGVzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG1hdGNoaW5nTGFtYmRhKTtcbiAgICByZWNpcGVJbWFnZXNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUocmVjaXBlc0xhbWJkYSk7XG5cbiAgICAvLyBHcmFudCBFdmVudEJyaWRnZSBwZXJtaXNzaW9uc1xuICAgIGV2ZW50QnVzLmdyYW50UHV0RXZlbnRzVG8oYXV0aExhbWJkYSk7XG4gICAgZXZlbnRCdXMuZ3JhbnRQdXRFdmVudHNUbyhyZWNpcGVzTGFtYmRhKTtcbiAgICBldmVudEJ1cy5ncmFudFB1dEV2ZW50c1RvKGluZ3JlZGllbnRzTGFtYmRhKTtcbiAgICBldmVudEJ1cy5ncmFudFB1dEV2ZW50c1RvKG1hdGNoaW5nTGFtYmRhKTtcblxuICAgIC8vIEdyYW50IFNOUyBwZXJtaXNzaW9ucyBmb3Igbm90aWZpY2F0aW9uc1xuICAgIG5vdGlmaWNhdGlvbnNUb3BpYy5ncmFudFB1Ymxpc2gobm90aWZpY2F0aW9uSGFuZGxlckxhbWJkYSk7XG4gICAgbm90aWZpY2F0aW9uc1RvcGljLmdyYW50UHVibGlzaChldmVudEhhbmRsZXJMYW1iZGEpO1xuXG4gICAgLy8gR3JhbnQgU1FTIHBlcm1pc3Npb25zXG4gICAgZXZlbnRQcm9jZXNzaW5nUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXMoZXZlbnRIYW5kbGVyTGFtYmRhKTtcbiAgICBldmVudFByb2Nlc3NpbmdRdWV1ZS5ncmFudENvbnN1bWVNZXNzYWdlcyhldmVudEhhbmRsZXJMYW1iZGEpO1xuXG4gICAgLy8gRXZlbnQgUnVsZXMgLSBSb3V0ZSBldmVudHMgdG8gaGFuZGxlcnNcbiAgICBjb25zdCB1c2VyRXZlbnRzUnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnVXNlckV2ZW50c1J1bGUnLCB7XG4gICAgICBldmVudEJ1cyxcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFsncmVjaXBlLW1hdGNoZXIudXNlciddLFxuICAgICAgICBkZXRhaWxUeXBlOiBbJ1VzZXJSZWdpc3RlcmVkJywgJ1VzZXJQcm9maWxlVXBkYXRlZCcsICdVc2VySW5ncmVkaWVudHNVcGRhdGVkJ10sXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHVzZXJFdmVudHNSdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5MYW1iZGFGdW5jdGlvbihldmVudEhhbmRsZXJMYW1iZGEpKTtcblxuICAgIGNvbnN0IHJlY2lwZUV2ZW50c1J1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ1JlY2lwZUV2ZW50c1J1bGUnLCB7XG4gICAgICBldmVudEJ1cyxcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFsncmVjaXBlLW1hdGNoZXIucmVjaXBlJ10sXG4gICAgICAgIGRldGFpbFR5cGU6IFsnUmVjaXBlQ3JlYXRlZCcsICdSZWNpcGVVcGRhdGVkJywgJ1JlY2lwZVJhdGVkJywgJ1JlY2lwZVNoYXJlZCddLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICByZWNpcGVFdmVudHNSdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5MYW1iZGFGdW5jdGlvbihldmVudEhhbmRsZXJMYW1iZGEpKTtcblxuICAgIGNvbnN0IG1hdGNoaW5nRXZlbnRzUnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnTWF0Y2hpbmdFdmVudHNSdWxlJywge1xuICAgICAgZXZlbnRCdXMsXG4gICAgICBldmVudFBhdHRlcm46IHtcbiAgICAgICAgc291cmNlOiBbJ3JlY2lwZS1tYXRjaGVyLm1hdGNoaW5nJ10sXG4gICAgICAgIGRldGFpbFR5cGU6IFsnUmVjaXBlTWF0Y2hlZCcsICdNYXRjaFBlcmNlbnRhZ2VVcGRhdGVkJ10sXG4gICAgICB9LFxuICAgIH0pO1xuICAgIG1hdGNoaW5nRXZlbnRzUnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24oZXZlbnRIYW5kbGVyTGFtYmRhKSk7XG5cbiAgICAvLyBOb3RpZmljYXRpb24gcnVsZSAtIHNlbmQgdG8gU05TXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uUnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnTm90aWZpY2F0aW9uUnVsZScsIHtcbiAgICAgIGV2ZW50QnVzLFxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgIHNvdXJjZTogWydyZWNpcGUtbWF0Y2hlciddLFxuICAgICAgICBkZXRhaWxUeXBlOiBbJ1JlY2lwZU1hdGNoZWQnLCAnUmVjaXBlU2hhcmVkJywgJ1VzZXJSZWdpc3RlcmVkJ10sXG4gICAgICB9LFxuICAgIH0pO1xuICAgIG5vdGlmaWNhdGlvblJ1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLlNuc1RvcGljKG5vdGlmaWNhdGlvbnNUb3BpYykpO1xuXG4gICAgLy8gQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdSZWNpcGVNYXRjaGVyQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdSZWNpcGUgTWF0Y2hlciBBUEknLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIFJlY2lwZSBNYXRjaGVyIGFwcGxpY2F0aW9uJyxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbiddLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEF1dGggZW5kcG9pbnRzXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2F1dGgnKTtcbiAgICBhdXRoUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExhbWJkYSkpO1xuICAgIFxuICAgIGNvbnN0IGxvZ2luUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ2luJyk7XG4gICAgbG9naW5SZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoTGFtYmRhKSk7XG4gICAgXG4gICAgY29uc3QgcmVnaXN0ZXJSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVnaXN0ZXInKTtcbiAgICByZWdpc3RlclJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhMYW1iZGEpKTtcbiAgICBcbiAgICBjb25zdCB2ZXJpZnlSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgndmVyaWZ5Jyk7XG4gICAgdmVyaWZ5UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oYXV0aExhbWJkYSkpO1xuICAgIFxuICAgIGNvbnN0IHByb2ZpbGVSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncHJvZmlsZScpO1xuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGF1dGhMYW1iZGEpKTtcbiAgICBwcm9maWxlUmVzb3VyY2UuYWRkTWV0aG9kKCdQVVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihhdXRoTGFtYmRhKSk7XG5cbiAgICAvLyBSZWNpcGVzIGVuZHBvaW50c1xuICAgIGNvbnN0IHJlY2lwZXNSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdyZWNpcGVzJyk7XG4gICAgcmVjaXBlc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24ocmVjaXBlc0xhbWJkYSkpO1xuICAgIHJlY2lwZXNSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihyZWNpcGVzTGFtYmRhKSk7XG4gICAgXG4gICAgY29uc3QgcmVjaXBlUmVzb3VyY2UgPSByZWNpcGVzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tpZH0nKTtcbiAgICByZWNpcGVSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJlY2lwZXNMYW1iZGEpKTtcbiAgICByZWNpcGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJlY2lwZXNMYW1iZGEpKTtcbiAgICByZWNpcGVSZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKHJlY2lwZXNMYW1iZGEpKTtcblxuICAgIC8vIEluZ3JlZGllbnRzIGVuZHBvaW50c1xuICAgIGNvbnN0IGluZ3JlZGllbnRzUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnaW5ncmVkaWVudHMnKTtcbiAgICBpbmdyZWRpZW50c1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oaW5ncmVkaWVudHNMYW1iZGEpKTtcbiAgICBpbmdyZWRpZW50c1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGluZ3JlZGllbnRzTGFtYmRhKSk7XG5cbiAgICBjb25zdCB1c2VySW5ncmVkaWVudHNSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCd1c2VyLWluZ3JlZGllbnRzJyk7XG4gICAgdXNlckluZ3JlZGllbnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihpbmdyZWRpZW50c0xhbWJkYSkpO1xuICAgIHVzZXJJbmdyZWRpZW50c1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGluZ3JlZGllbnRzTGFtYmRhKSk7XG4gICAgdXNlckluZ3JlZGllbnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdERUxFVEUnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihpbmdyZWRpZW50c0xhbWJkYSkpO1xuXG4gICAgLy8gTWF0Y2hpbmcgZW5kcG9pbnRzXG4gICAgY29uc3QgbWF0Y2hpbmdSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdtYXRjaGluZycpO1xuICAgIG1hdGNoaW5nUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24obWF0Y2hpbmdMYW1iZGEpKTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcbiAgICAgIHZhbHVlOiB1c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xDbGllbnRJZCcsIHtcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JlY2lwZUltYWdlc0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogcmVjaXBlSW1hZ2VzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEJ1Y2tldCBmb3IgcmVjaXBlIGltYWdlcycsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRXZlbnRCdXNOYW1lJywge1xuICAgICAgdmFsdWU6IGV2ZW50QnVzLmV2ZW50QnVzTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRXZlbnRCcmlkZ2UgRXZlbnQgQnVzIE5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ05vdGlmaWNhdGlvbnNUb3BpY0FybicsIHtcbiAgICAgIHZhbHVlOiBub3RpZmljYXRpb25zVG9waWMudG9waWNBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ1NOUyBOb3RpZmljYXRpb25zIFRvcGljIEFSTicsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==