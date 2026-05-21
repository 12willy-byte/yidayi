FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 持久化数据目录（Fly.io mount）
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
