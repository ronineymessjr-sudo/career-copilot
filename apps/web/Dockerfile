FROM node:22-alpine AS dependencies
WORKDIR /workspace
COPY package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY workers/scheduler/package.json ./workers/scheduler/package.json
RUN npm install --workspaces --include-workspace-root

FROM node:22-alpine AS builder
WORKDIR /workspace
COPY --from=dependencies /workspace/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --workspace apps/web run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /workspace/apps/web/.next/standalone ./
COPY --from=builder /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /workspace/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
