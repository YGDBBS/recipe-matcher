#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StatefulStack } from '../lib/stateful-stack';
import { StatelessStack } from '../lib/stateless-stack';

const app = new cdk.App();

// Deploy stateful resources first (DynamoDB tables)
const statefulStack = new StatefulStack(app, 'RecipeMatcherStatefulStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Deploy stateless resources (Lambda functions, API Gateway, etc.)
new StatelessStack(app, 'RecipeMatcherStatelessStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  // Pass stateful stack as dependency
  statefulStack,
});
