import {
    APIGatewayProxyEventV2,
    APIGatewayProxyStructuredResultV2
} from 'aws-lambda';

import { getParameter } from '@aws-lambda-powertools/parameters/ssm';


export async function putItemHandler(
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {

    console.log('vanilla console.log');
    console.info('informational');
    console.warn("You should be careful");
    console.debug("devil is in the details");
    console.error("You made a mistake");


    if (event?.requestContext?.http?.method !== 'POST') {
        throw new Error(`postMethod only accepts POST method, you tried: ${event?.requestContext?.http?.method} method.`);
    }

    const parameter = await getParameter('/dev/message');

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: parameter,
        }),
    };
};
