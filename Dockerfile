FROM node:20-alpine

# 安装 Chromium 和必要的依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# 设置 Puppeteer 环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# 创建日志目录并设置权限
RUN mkdir -p /app/logs && \
    chown -R node:node /app/logs && \
    chmod 755 /app/logs

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# 确保所有文件的权限
RUN chown -R node:node /app && \
    chmod -R 755 /app/logs

# 切换到非 root 用户
USER node

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# 创建日志目录的数据卷
VOLUME ["/app/logs"]

# Run migrations and start application
CMD ["sh", "-c", "npm run migration:run && node dist/src/main.js"]
