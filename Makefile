STACK = powertools-demo
AWS_REGION = eu-west-2
VERSION = $(shell git rev-parse --abbrev-ref HEAD)-$(shell git rev-parse --short HEAD)
SAM_CLI_TELEMETRY=0

build:
	sam build --beta-features

test:
	npm run test

deploy: build
	sam deploy --no-progressbar --resolve-s3 \
	 --stack-name $(STACK) --parameter-overrides Version=$(VERSION) \
	 --no-confirm-changeset --no-fail-on-empty-changeset --capabilities CAPABILITY_IAM

validate:
	sam validate

destroy:
	aws cloudformation delete-stack --stack-name $(STACK)

sam-tail-logs:
	sam logs --stack-name $(STACK) --tail

developslowly: build
	export DOCKER_HOST="unix://$HOME/.colima/docker.sock"
	sam local start-api

sync:
	sam sync --watch --stack-name $(STACK)

sam-list-endpoints:
	sam list stack-outputs --stack-name $(STACK)

sloc:
	scc --ci
