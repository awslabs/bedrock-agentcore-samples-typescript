.PHONY: help dev build-and-push deploy outputs delete

ECR_REPO_NAME := customer-support-multiagent
STACK_NAME := CustomerSupportMultiagent
AWS_REGION ?= us-east-1

AWS_ACCOUNT_ID = $(shell aws sts get-caller-identity --query Account --output text)
IMAGE_TAG := $(shell date +%Y%m%d-%H%M%S)
ECR_URI = $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
IMAGE_URI = $(ECR_URI)/$(ECR_REPO_NAME):$(IMAGE_TAG)

help:
	@echo "make dev            - Run locally"
	@echo "make build-and-push - Build and push to ECR"
	@echo "make deploy         - Deploy to AgentCore (CDK)"
	@echo "make delete         - Delete stack"

dev:
	npm run dev

build-and-push:
	@aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_URI)
	@aws ecr describe-repositories --repository-names $(ECR_REPO_NAME) --region $(AWS_REGION) 2>/dev/null || \
		aws ecr create-repository --repository-name $(ECR_REPO_NAME) --region $(AWS_REGION)
	docker build --platform linux/arm64 -t $(IMAGE_URI) .
	docker push $(IMAGE_URI)
	@echo $(IMAGE_URI) > .image-uri

deploy:
	@test -f .image-uri || (echo "Run 'make build-and-push' first" && exit 1)
	npx cdk deploy --parameters ContainerImageUri=$$(cat .image-uri) --require-approval never

outputs:
	@aws cloudformation describe-stacks --stack-name $(STACK_NAME) --region $(AWS_REGION) --query 'Stacks[0].Outputs' --output table

delete:
	npx cdk destroy --force
