import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { putItemHandler } from "./put-item";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { mockClient } from "aws-sdk-client-mock";

describe("Test putItemHandler", function () {
  const ssmMock = mockClient(SSMClient);

  beforeEach(() => {
    ssmMock.reset();
  });

  it("should handle PUT request", async () => {
    const ssmResult = {
      Parameter: {
        Name: "/dev/message",
        Value: "hello from ssm!",
      },
    };
    ssmMock.on(GetParameterCommand).resolves(ssmResult);

    const result = await putItemHandler({
      requestContext: {
        http: {
          method: "POST",
          path: "/api/unknown",
        },
      },
    } as APIGatewayProxyEventV2);

    expect(result.statusCode).toBe(200);

    if (typeof result.body !== "string") {
      throw new Error("Result body is undefined or not a string");
    }
    const body = JSON.parse(result.body);
    expect(body.message).toBe("hello from ssm!");
  });
});
