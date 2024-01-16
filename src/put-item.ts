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

import { Segment, Subsegment, getSegment } from "aws-xray-sdk-core";

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
  return (await ssmProvider.get("/dev/message", { maxAge })) ?? "";
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

  const response = await fetch("https://httpbin.org/delay/1");
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

function captureNativeFetch(): void {
  const fetch = globalThis.fetch;
  globalThis.fetch = async function (resource, options) {
    const headers = resolveHeaders(resource, options);
    const traceHeader = headers?.get("X-Amzn-Trace-Id");

    if (!traceHeader) {
      const parent = getSegment();

      if (parent) {
        const url = resolveUrl(resource);
        const method = resolveMethod(resource);
        const { hostname } = new URL(url);
        const subsegment = parent.notTraced
          ? parent.addNewSubsegmentWithoutSampling(hostname)
          : parent.addNewSubsegment(hostname);
        const root = getRootSegment(parent);
        subsegment.namespace = "remote";

        if (!options) {
          options = {};
        }

        if (!options.headers) {
          options.headers = new Headers();
        }

        (options.headers as Headers).set(
          "X-Amzn-Trace-Id",
          `Root=${root.trace_id};Parent=${subsegment.id};Sampled=${
            subsegment.notTraced ? 0 : 1
          }`,
        );

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        subsegment.http = {
          request: {
            url,
            method,
          },
        };

        try {
          const res = await fetch.call(globalThis, resource, options);
          if (res.status === 429) {
            subsegment.addThrottleFlag();
          } else if (res.status >= 400 && res.status < 500) {
            subsegment.addErrorFlag();
          } else if (res.status >= 500) {
            subsegment.addFaultFlag();
          }

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore-next-line
          subsegment.http = {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore-next-line
            ...subsegment.http,
            response: {
              status: res.status,
              ...(res.headers.has("content-length") && {
                content_length: res.headers.get("content-length"),
              }),
            },
          };
          subsegment.close();

          return res;
        } catch (err) {
          subsegment.close(err as Error | string);
          throw err;
        }
      }
    }

    return await fetch.call(globalThis, resource, options);
  };
}

const resolveHeaders = (
  input: RequestInfo | URL,
  options?: RequestInit,
): Headers | undefined => {
  if (input instanceof Request) {
    return input.headers;
  } else if (options?.headers) {
    return new Headers(options.headers);
  }

  return undefined;
};

const resolveUrl = (input: RequestInfo | URL): string => {
  if (input instanceof Request) {
    return input.url;
  } else if (input instanceof URL) {
    return input.href;
  }

  return input;
};

const resolveMethod = (
  input: RequestInfo | URL,
  options?: RequestInit,
): string => {
  if (input instanceof Request) {
    return input.method;
  } else if (options?.method) {
    return options.method;
  }

  return "GET";
};

const getRootSegment = (segment: Segment | Subsegment): Segment => {
  if (segment instanceof Segment) {
    return segment;
  }

  return segment.segment;
};
