FROM node:20-alpine AS base
WORKDIR /

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=api --include-workspace-root

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY /
WORKDIR /
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /
ENV NODE_ENV=production
COPY --from=builder /node_modules /node_modules
COPY --from=builder /dist ./dist
COPY --from=builder /prisma ./prisma
COPY --from=builder /package.json ./package.json
COPY --from=builder /package.json /package.json
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/main.js"]
