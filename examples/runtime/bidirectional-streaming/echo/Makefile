.PHONY: help build dev build-and-push deploy outputs delete

# Configuration
ECR_REPO_NAME := bidirectional-streaming
STACK_NAME := bidirectional-streaming
AWS_REGION ?= us-east-1

# Derived
AWS_ACCOUNT_ID = $(shell aws sts get-caller-identity --query Account --output text)
IMAGE_TAG := $(shell date +%Y%m%d-%H%M%S)
ECR_URI = $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com
IMAGE_URI = $(ECR_URI)/$(ECR_REPO_NAME):$(IMAGE_TAG)

help:
	@echo "Usage:"
	@echo "  make dev            - Run locally"
	@echo "  make build-and-push - Build and push to ECR"
	@echo "  make deploy         - Deploy to AgentCore"
	@echo "  make outputs        - Show stack outputs"
	@echo "  make delete         - Delete stack"

build:
	npm run build

dev:
	docker-compose up --build

build-and-push:
	@aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(ECR_URI)
	@aws ecr describe-repositories --repository-names $(ECR_REPO_NAME) --region $(AWS_REGION) 2>/dev/null || \
		aws ecr create-repository --repository-name $(ECR_REPO_NAME) --region $(AWS_REGION)
	docker build --platform linux/arm64 -t $(IMAGE_URI) .
	docker push $(IMAGE_URI)
	@echo $(IMAGE_URI) > .image-uri

deploy:
	@test -f .image-uri || (echo "Run 'make build-and-push' first" && exit 1)
	aws cloudformation deploy \
		--template-file template.yaml \
		--stack-name $(STACK_NAME) \
		--region $(AWS_REGION) \
		--parameter-overrides ContainerImageUri=$$(cat .image-uri) \
		--capabilities CAPABILITY_IAM
	@$(MAKE) outputs

outputs:
	@aws cloudformation describe-stacks \
		--stack-name $(STACK_NAME) \
		--region $(AWS_REGION) \
		--query 'Stacks[0].Outputs' \
		--output table

delete:
	@read -p "Are you sure you want to delete all resources? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@read -p "Also delete ECR repository '$(ECR_REPO_NAME)'? [y/N] " delete_ecr; \
	echo "Deleting CloudFormation stack..."; \
	aws cloudformation delete-stack --stack-name $(STACK_NAME) --region $(AWS_REGION); \
	aws cloudformation wait stack-delete-complete --stack-name $(STACK_NAME) --region $(AWS_REGION); \
	echo "Stack deleted."; \
	if [ "$$delete_ecr" = "y" ]; then \
		aws ecr delete-repository --repository-name $(ECR_REPO_NAME) --region $(AWS_REGION) --force; \
		echo "ECR repository deleted."; \
	fi
