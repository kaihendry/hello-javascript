import { Segment, Subsegment, getSegment } from "aws-xray-sdk-core";

export function captureNativeFetch(): void {
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
          `Root=${root.trace_id};Parent=${subsegment.id};Sampled=${subsegment.notTraced ? 0 : 1}`,
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
