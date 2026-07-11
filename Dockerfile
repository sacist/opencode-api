FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++

RUN npm install -g opencode-ai

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY .example.env ./.example.env
COPY .opencode ./.opencode

EXPOSE 3000

CMD ["sh", "-c", "npm run init && npm run start"]
