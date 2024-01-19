import {
  type APIGatewayProxyEventV2,
  type APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";

import { Logger, injectLambdaContext } from "@aws-lambda-powertools/logger";

import { createError } from "@middy/util";

import { Tracer, captureLambdaHandler } from "@aws-lambda-powertools/tracer";

import { SSMProvider } from "@aws-lambda-powertools/parameters/ssm";

import { captureNativeFetch } from "./captureNativeFetch";

const tracer = new Tracer();
captureNativeFetch();

// trace AWS ssm client
const ssmProvider = new SSMProvider();
tracer.captureAWSv3Client(ssmProvider.client);

export interface HandlerArgs {
  environment?: string;
}

const logger = new Logger();

async function logParameter(name: string): Promise<string> {
  const maxAge = 30;
  logger.debug("getting ssm parameter", { name, maxAge });

  const subsegment = tracer.getSegment()?.addNewSubsegment('ssmOperation');

  subsegment && subsegment.addAnnotation("ssmParameterName", name);

  const result = (await ssmProvider.get(name, { maxAge })) ?? "";

  subsegment && subsegment.close();

  return result;
}

export async function putItemHandler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  tracer.getSegment();
  if (event?.requestContext?.http?.method !== "POST") {
    logger.error("not a POST", { method: event?.requestContext?.http?.method });
    throw new Error(
      `postMethod only accepts POST method, you tried: ${event?.requestContext?.http?.method} method.`,
    );
  }

  const errorCodeStr = event.queryStringParameters?.errorCode ?? "";
  if (errorCodeStr.trim()) {
    const errorCode = parseInt(errorCodeStr);
    logger.error("triggering error", { errorCode });
    throw createError(errorCode, `random message from ${process.env.VERSION}`);
  }

  const response = await fetch("https://httpbin.org/delay/1");
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    logger.debug("content-length", { contentLength });
    tracer.putMetadata("something", contentLength);
  }
  const data = await response.json();

  tracer.putAnnotation("nonodefetch", true);

  const parameter = await logParameter("/dev/message");

  return {
    statusCode: 200,
    body: JSON.stringify({
      version: process.env.VERSION,
      message: parameter,
      fetch: data.url,
    }),
  };
}

export const handler = middy<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>()
  .use(injectLambdaContext(logger))
  .use(httpErrorHandler())
  .use(captureLambdaHandler(tracer))
  .handler(putItemHandler);
