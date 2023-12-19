import {
    APIGatewayProxyEventV2,
    APIGatewayProxyStructuredResultV2,
    Context
} from 'aws-lambda';

import { Logger } from '@aws-lambda-powertools/logger';

import { getParameter } from '@aws-lambda-powertools/parameters/ssm';

const console = new Logger({ serviceName: 'put-item' });

// wrap getParameter with a console.info log on the named parameter
function logParameter(name: string): Promise<string> {
    console.info('getting ssm parameter', { name });
    return getParameter(name) as Promise<string>;
}

export async function putItemHandler(
    event: APIGatewayProxyEventV2,
    context: Context

): Promise<APIGatewayProxyStructuredResultV2> {

    console.warn("putItemHandler called");

    if (event?.requestContext?.http?.method !== 'POST') {
        console.error(`LOG: postMethod only accepts POST method, you tried: ${event?.requestContext?.http?.method} method.`);
        throw new Error(`postMethod only accepts POST method, you tried: ${event?.requestContext?.http?.method} method.`);
    }

    console.debug("will you see me?")
    const parameter = await logParameter('/dev/message');
    console.debug("or mee?")

    return {
        statusCode: 200,
        body: JSON.stringify({
            version: process.env['VERSION'],
            message: parameter,
        }),
    };
};
