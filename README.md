Fattening up https://github.com/aws-powertools/powertools-lambda-typescript/tree/main/examples/sam

# Goals

Faciliate local development without:

    sam build --beta-features
    sam local start-api

Keep complexity low. ~1000 lines of code.

# Features

- [X] Fast local development with reloader via `npm run dev`
- [X] Testing via `npm run test`
- [X] CI/CD pipeline via GitHub Actions
- [X] Fat lambda via Express
- [X] Structured logging via [powertools](https://docs.powertools.aws.dev/lambda/typescript/latest/core/logger/)
- [X] Git hash in lambda version
- [ ] Dependabot package.json updates


