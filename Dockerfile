FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY src/ ./src/

RUN mkdir -p dist

RUN npx tsc

RUN mkdir -p /root/.backuptool

CMD ["node", "dist/index.js"] 