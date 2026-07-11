FROM node:22-bookworm-slim

WORKDIR /app

RUN npm install -g opencode-ai

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY .example.env ./.example.env
COPY .opencode ./.opencode

EXPOSE 3000

CMD ["sh", "-c", "npm run init && npm run start"]