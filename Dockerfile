FROM node:22-alpine

WORKDIR /app

RUN npm install -g opencode-ai@1.17.15

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY .example.env ./.example.env

EXPOSE 3000

CMD ["sh", "-c", "npm run init && npm run start"]
