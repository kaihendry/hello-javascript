import {
  type APIGatewayProxyEventV2,
  type APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";

import { Logger, injectLambdaContext } from "@aws-lambda-powertools/logger";

import { getParameter } from "@aws-lambda-powertools/parameters/ssm";

import { createError } from "@middy/util";

import { Tracer, captureLambdaHandler } from "@aws-lambda-powertools/tracer";

const tracer = new Tracer();
tracer.getSegment();

export type SecretRetriever = (
  environmentName: string,
  parameterName: string,
) => Promise<string | null>;

export interface HandlerArgs {
  environment?: string;
  secretRetriever?: SecretRetriever;
}

const logger = new Logger({ serviceName: "put-item" });

async function logParameter(name: string): Promise<string> {
  logger.debug("getting ssm parameter", { name });
  const parameterValue = await tracer.captureAWSv3Client(async () => {
    return await getParameter("/my/parameter", { maxAge: 30 });
  })();
  return parameterValue ?? "";
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

  const debugMsg = event.queryStringParameters?.debugmsg ?? "";
  if (debugMsg.trim()) {
    logger.debug(`LOG: debugmsg: ${debugMsg}`);
  }

  const parameter = await logParameter("/dev/message");

  return {
    statusCode: 200,
    body: JSON.stringify({
      version: process.env.VERSION,
      message: parameter,
    }),
  };
}

export function newHandler(args: HandlerArgs) {
  console.log("environment", args.environment);
  return middy<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>()
    .use(injectLambdaContext(logger))
    .use(httpErrorHandler())
    .use(captureLambdaHandler(tracer))
    .handler(putItemHandler);
}

export const handler = newHandler({
  environment: process.env.ENV || "",
});

export async function ssmSecretRetriever(
  parameter: string,
): Promise<string | null> {
  return (await getParameter(parameter)) ?? null;
}
