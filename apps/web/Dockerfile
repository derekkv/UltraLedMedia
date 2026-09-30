FROM node:22-alpine AS base
RUN npm install -g pnpm@latest-10

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages/shared/package.json  ./packages/shared/package.json
COPY apps/web/package.json         ./apps/web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── build ──────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/shared ./packages/shared
COPY apps/web        ./apps/web
WORKDIR /app/apps/web
# VITE_API_URL no es necesario en producción (el proxy nginx lo maneja)
RUN pnpm build

# ── runner: nginx sirve los archivos estáticos ────────────────────────────────
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
