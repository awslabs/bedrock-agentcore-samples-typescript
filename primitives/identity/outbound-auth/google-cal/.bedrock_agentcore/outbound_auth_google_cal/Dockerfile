FROM node:22-slim
WORKDIR /app
COPY agent/* ./
COPY agent/src/* ./src/
RUN npm install && npm run build
EXPOSE 8080
CMD ["npm", "start"]