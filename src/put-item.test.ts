import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { putItemHandler } from './put-item';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';

jest.mock('@aws-lambda-powertools/parameters/ssm', () => ({
    getParameter: jest.fn(),
}));

const mockedGetParameter = getParameter as jest.MockedFunction<
    typeof getParameter
>;

describe('Test putItemHandler', function () {

    beforeEach(() => {
        mockedGetParameter.mockClear();
    });

    it('should handle PUT request', async () => {
        mockedGetParameter.mockResolvedValue('hello from ssm!');

        const result = await putItemHandler({
            requestContext: {
                http: {
                    method: 'POST',
                    path: '/api/unknown'
                }
            },
        } as APIGatewayProxyEventV2);

        expect(result.statusCode).toBe(200);

        if (typeof result.body !== 'string') {
            throw new Error('Result body is undefined or not a string');
        }
        const body = JSON.parse(result.body);
        expect(body.message).toBe("hello from ssm!")
    });

});
