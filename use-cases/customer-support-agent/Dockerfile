FROM node:22-slim
WORKDIR /app
RUN npm install -g npm@latest
COPY bedrock-agentcore-0.1.1.tgz ./
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
