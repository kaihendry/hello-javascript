import {
  type APIGatewayProxyEventV2,
  type APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";

import { Logger, injectLambdaContext } from "@aws-lambda-powertools/logger";
import { Tracer, captureLambdaHandler } from "@aws-lambda-powertools/tracer";

import { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";

const tracer = new Tracer();
const ssmProvider = new SSMProvider();
tracer.captureAWSv3Client(ssmProvider.client);

// Log Xray calls
const logger = new Logger();
tracer.provider.setLogger(logger);

interface aadConfig {
  thing1: string;
  thing2: string;
  thing3: string;
  thing4: string;
}

export async function getAadConfig(aadName: string): Promise<aadConfig> {
  const env = process.env["ENV"] ?? "local";
  if (env === "local") {
    return {
      thing1: "local-thing1",
      thing2: "local-thing2",
      thing3: "local-thing3",
      thing4: "local-thing4",
    };
  }

  if (!aadName) {
    throw new Error("aadName is required");
  }

  const ssmValues = await ssmProvider.getMultiple(`/product/${env}/${aadName}`);

  // these can be secrets so we can't just log them

  return {
    // not sure it makes sense to have defaults here
    thing1: ssmValues?.thing1 || "default1",
    thing2: ssmValues?.thing2 || "default2",
    thing3: ssmValues?.thing3 || "default3",
    thing4: ssmValues?.thing4 || "default4",
  };
}

async function simulateDelay(duration: number): Promise<void> {
  logger.info(`Simulating delay of ${duration}ms`);
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export async function putItemHandler(): Promise<APIGatewayProxyStructuredResultV2> {
  logger.info("putItemHandler");
  // delay for one second and create and xray subsegment for it
  const subsegment = tracer.getSegment()?.addNewSubsegment("simulateDelay");

  await simulateDelay(250);

  const subsegment2 = tracer.getSegment()?.addNewSubsegment("anotherDelay");

  await simulateDelay(250);

  // Close the subsegment once the delay is over
  if (subsegment2) {
    subsegment2.close();
  }

  // Close the subsegment once the delay is over
  if (subsegment) {
    subsegment.close();
  }

  const config = await getAadConfig("bar");

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
