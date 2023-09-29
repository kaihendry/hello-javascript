import { Logger } from '@aws-lambda-powertools/logger';
import { PT_VERSION } from '@aws-lambda-powertools/commons/lib/version';

const defaultValues = {
  serviceName: "hello",
  version: process.env.VERSION,
  region: process.env.AWS_REGION || 'N/A',
  executionEnv: process.env.AWS_EXECUTION_ENV || 'N/A',
};

const logger = new Logger({
  persistentLogAttributes: {
    ...defaultValues,
    logger: {
      name: '@aws-lambda-powertools/logger',
      version: PT_VERSION,
    },
  },
});


export { logger };
