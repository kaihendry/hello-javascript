import {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2
} from 'aws-lambda';

export async function putItemHandler(
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {

    console.info('received:', { event });

    if (event?.requestContext?.http?.method !== 'POST') {
        throw new Error(`postMethod only accepts POST method, you tried: ${event?.requestContext?.http?.method} method.`);
    }

    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: 'post method executed successfully!',
        }),
    };

    return response;
};
