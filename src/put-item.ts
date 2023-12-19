import {
    type APIGatewayProxyEventV2,
    type APIGatewayProxyStructuredResultV2,
} from 'aws-lambda'

import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger'

import { getParameter } from '@aws-lambda-powertools/parameters/ssm'

import { createError } from '@middy/util'

export type SecretRetriever = (
    environmentName: string,
    parameterName: string
) => Promise<string | null>

export interface HandlerArgs {
    environment?: string
    secretRetriever?: SecretRetriever
}

const logger = new Logger({ serviceName: 'put-item' })

async function logParameter(name: string): Promise<string> {
    logger.debug('getting ssm parameter', { name })
    return await (getParameter(name) as Promise<string>)
}

export async function putItemHandler(
    event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
    logger.info('putItemHandler called')

    if (event?.requestContext?.http?.method !== 'POST') {
        logger.error(`LOG: postMethod only accepts POST method, you tried: ${event?.requestContext?.http?.method} method.`)
        throw new Error(`postMethod only accepts POST method, you tried: ${event?.requestContext?.http?.method} method.`)
    }

    const errorCodeStr = event.queryStringParameters?.errorCode ?? ''
    if (errorCodeStr.trim()) {
        logger.error(`LOG: errorCode: ${errorCodeStr}`)
        const errorCode = parseInt(errorCodeStr)
        throw createError(errorCode, 'random message')
    }

    const debugMsg = event.queryStringParameters?.debugmsg ?? ''
    if (debugMsg.trim()) {
        logger.debug(`LOG: debugmsg: ${debugMsg}`)
    }

    const parameter = await logParameter('/dev/message')

    return {
        statusCode: 200,
        body: JSON.stringify({
            version: process.env.VERSION,
            message: parameter
        })
    }
}

export function newHandler(args: HandlerArgs) {
    console.log('environment', args.environment)
    return middy<APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2>()
        .use(injectLambdaContext(logger))
        .use(httpErrorHandler())
        .handler(putItemHandler)
}

export const handler = newHandler({
    environment: process.env.ENV || ''
})

export async function ssmSecretRetriever(
    parameter: string
): Promise<string | null> {
    return (await getParameter(parameter, { decrypt: true })) ?? null
}
