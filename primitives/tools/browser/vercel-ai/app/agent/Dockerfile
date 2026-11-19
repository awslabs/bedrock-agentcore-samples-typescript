FROM public.ecr.aws/docker/library/node:22-slim

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY main.ts ./

USER node
EXPOSE 8080
CMD ["node", "main.ts"]
