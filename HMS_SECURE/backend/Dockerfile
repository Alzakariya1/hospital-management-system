FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=8s --start-period=30s --retries=3 CMD node scripts/health-check.js || exit 1
CMD ["node", "src/server.js"]
