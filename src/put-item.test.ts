import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { getAadConfig, putItemHandler } from "./put-item";
const ssmMock = mockClient(SSMClient);

describe("Test putItemHandler", function () {
  beforeEach(() => {
    ssmMock
      .on(GetParametersByPathCommand)
      .resolves({ Parameters: [{ Name: "thing1", Value: "foobar" }] });
  });
  it("should not use SSMClient if local", async () => {
    const result = await putItemHandler({
      requestContext: {
        http: {
          method: "POST",
          path: "/api/unknown",
        },
      },
    } as APIGatewayProxyEventV2);
    expect(ssmMock.calls()).toHaveLength(0);
    expect(result.statusCode).toBe(200);
  });

  it("should retrieve config via SSMClient when not local", async () => {
    process.env["ENV"] = "test";
    const config = await getAadConfig("/product/test/bar");
    expect(config.thing1).toBe("foobar");
    expect(config.thing2).toBe("default2");
  });
});
