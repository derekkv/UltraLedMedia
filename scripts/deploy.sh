#!/usr/bin/env bash
# =============================================================================
#  deploy.sh — Despliega o actualiza Ultraled Media en la VPS
#  Uso:  ./scripts/deploy.sh
#  Requisitos en la VPS: git, docker, docker compose v2
# =============================================================================
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"
CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${CYAN}▶ $*${NC}"; }
ok()   { echo -e "${GREEN}✔ $*${NC}"; }
fail() { echo -e "${RED}✘ $*${NC}"; exit 1; }

# 1 — Comprueba que existe el archivo de entorno
[[ -f .env.prod ]] || fail "No existe .env.prod — copia .env.prod.example y edítalo primero."

# 2 — Actualiza el código
log "Actualizando código fuente…"
git pull origin main

# 3 — Construye las imágenes
log "Construyendo imágenes Docker…"
$COMPOSE build --no-cache

# 4 — Levanta la infra (postgres + redis)
log "Iniciando servicios de base de datos…"
$COMPOSE up -d postgres redis

# 5 — Espera a que estén healthy
log "Esperando a que postgres y redis estén listos…"
sleep 5
$COMPOSE exec -T postgres pg_isready -U "${POSTGRES_USER:-ultraled}" || fail "postgres no responde"
ok "Postgres listo"

# 6 — Migración + seed (idempotente)
log "Aplicando migraciones de base de datos…"
$COMPOSE run --rm api sh -c "cd /app/apps/api && node_modules/.bin/tsx node_modules/.bin/prisma migrate deploy"

log "Ejecutando seed (idempotente)…"
$COMPOSE run --rm api sh -c "cd /app/apps/api && node_modules/.bin/tsx prisma/seed.ts"

# 7 — Levanta api + web
log "Iniciando API y Web…"
$COMPOSE up -d api web

# 8 — Limpia imágenes huérfanas
docker image prune -f

ok "¡Despliegue completado!"
echo ""
echo "  Servicios corriendo:"
$COMPOSE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
