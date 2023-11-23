
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

import { putItemHandler } from './put-item';

describe('Test putItemHandler', function () {
    it('should post', async () => {
        const result = await putItemHandler({
            requestContext: {
                http: {
                    method: 'POST',
                    path: '/api/unknown'
                }
            },
            body: ''
        } as APIGatewayProxyEventV2);
        expect(result.statusCode).toBe(200)
    });
});
