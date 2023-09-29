import serverlessHttp from 'serverless-http';
import app from './app';

const handler = serverlessHttp(app);

export const main = async (event: any, context: any) => {
    return handler(event, context);
};
