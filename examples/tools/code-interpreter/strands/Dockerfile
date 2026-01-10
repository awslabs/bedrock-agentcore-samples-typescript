FROM node:22-slim
WORKDIR /app
COPY package*.json ./
COPY *.tgz ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
EXPOSE 8080
CMD ["npm", "start"]
