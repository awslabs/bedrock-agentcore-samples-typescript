.PHONY: help dev deploy outputs delete

STACK_NAME := CustomerSupportMultiagent
AWS_REGION ?= us-east-1

help:
	@echo "make dev    - Run locally"
	@echo "make deploy - Build and deploy to AgentCore (CDK)"
	@echo "make delete - Delete stack"

dev:
	npm run dev

deploy:
	npx cdk deploy --require-approval never

outputs:
	@aws cloudformation describe-stacks --stack-name $(STACK_NAME) --region $(AWS_REGION) --query 'Stacks[0].Outputs' --output table

delete:
	npx cdk destroy --force
