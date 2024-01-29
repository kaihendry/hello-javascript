import {
  type APIGatewayProxyEventV2,
  type APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";

import { Logger, injectLambdaContext } from "@aws-lambda-powertools/logger";

import { Tracer, captureLambdaHandler } from "@aws-lambda-powertools/tracer";

import { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";

const env = process.env["ENV"] ?? "local";

const tracer = new Tracer();
const ssmProvider = new SSMProvider();
tracer.captureAWSv3Client(ssmProvider.client);

const logger = new Logger();

interface aadConfig {
  thing1: string;
  thing2: string;
  thing3: string;
  thing4: string;
}

function getAadConfig(ssmValues: { [key: string]: string } = {}): aadConfig {
  logger.info("Incoming SSM values:", ssmValues);

  return {
    thing1: ssmValues.thing1 || "default",
    thing2: ssmValues.thing2 || "default",
    thing3: ssmValues.thing3 || "default",
    thing4: ssmValues.thing4 || "default",
  };
}

export async function putItemHandler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const config = getAadConfig(
    await ssmProvider.getMultiple(`/product/$env/bar`),
  );

  return {
    statusCode: 200,
    headers: {
      "X-Amzn-Trace-Id": tracer.getRootXrayTraceId() ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: process.env.VERSION,
      config,
    }),
  };
}

export const handler = middy<
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2
>()
  .use(injectLambdaContext(logger))
  .use(httpErrorHandler())
  .use(captureLambdaHandler(tracer))
  .handler(putItemHandler);
