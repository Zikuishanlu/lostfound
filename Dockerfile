# ==================== 构建阶段：前端 ====================
FROM node:22-bookworm-slim AS web-builder

WORKDIR /app/web
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN npm run build

# ==================== 构建阶段：后端依赖 ====================
# better-sqlite3 优先使用预编译二进制；保留编译工具链以备源码编译
FROM node:22-bookworm-slim AS server-deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev

# ==================== 运行阶段 ====================
FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app/server

COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY --from=web-builder /app/web/dist ../web/dist

# 数据与上传目录（由 docker-compose 挂载持久化）
RUN mkdir -p data uploads

EXPOSE 3000

CMD ["node", "src/index.js"]
